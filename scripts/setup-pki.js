/**
 * Shared PKI Setup Functions (OLM-Safe, cert-manager v1 compatible)
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Apply YAML via kubectl
 */
async function applyYaml(yaml) {
  const escapedYaml = yaml.replace(/'/g, "'\\''");

  const { stdout, stderr } = await execAsync(
    `echo '${escapedYaml}' | kubectl apply -f -`,
  );

  if (stderr && !stderr.includes('created') && !stderr.includes('configured')) {
    console.error('kubectl stderr:', stderr);
  }

  if (stdout) {
    console.log(stdout.trim());
  }
}

/**
 * Wait for ClusterIssuer readiness
 */
async function waitForClusterIssuerReady(name, timeoutMs = 120000) {
  console.log(`⏳ Waiting for ClusterIssuer ${name}...`);

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const { stdout } = await execAsync(
        `kubectl get clusterissuer ${name} -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'`,
      );

      if (stdout.trim() === 'True') {
        console.log(`✓ ClusterIssuer ${name} is Ready`);
        return;
      }
    } catch (_) {
      /* empty */
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`Timeout waiting for ClusterIssuer ${name}`);
}

/**
 * Wait for secret + CA data
 */
async function waitForSecret(namespace, secretName, timeoutMs = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const { stdout } = await execAsync(
        `kubectl get secret ${secretName} -n ${namespace} -o jsonpath='{.data.ca\\.crt}'`,
      );

      if (stdout && stdout.trim().length > 0) {
        console.log(`✓ Secret ${secretName} ready`);
        return;
      }
    } catch (_) {
      /* empty */
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`Timeout waiting for secret ${secretName}`);
}

const CERT_MANAGER_NAMESPACE = process.env.CERT_MANAGER_NAMESPACE;

if (!CERT_MANAGER_NAMESPACE) {
  throw new Error('CERT_MANAGER_NAMESPACE must be set');
}

console.log(`📍 Using namespace: ${CERT_MANAGER_NAMESPACE}`);

/**
 * PKI Infrastructure
 */
async function createClusterInfrastructure(prefix) {
  const ns = CERT_MANAGER_NAMESPACE;

  const names = {
    rootIssuer: `${prefix}-selfsigned-root-issuer`,
    rootCert: `${prefix}-root-ca`,
    rootSecret: `${prefix}-root-ca-secret`,
    caIssuer: `${prefix}-ca-issuer`,
  };

  await applyYaml(`
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${names.rootIssuer}
spec:
  selfSigned: {}
`);

  await waitForClusterIssuerReady(names.rootIssuer);

  await applyYaml(`
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${names.rootCert}
  namespace: ${ns}
spec:
  isCA: true
  commonName: ${prefix}.root.ca
  secretName: ${names.rootSecret}
  issuerRef:
    name: ${names.rootIssuer}
    kind: ClusterIssuer
`);

  await execAsync(
    `kubectl wait --for=condition=Ready certificate/${names.rootCert} -n ${ns} --timeout=120s`,
  );

  await waitForSecret(ns, names.rootSecret);

  await applyYaml(`
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${names.caIssuer}
spec:
  ca:
    secretName: ${names.rootSecret}
`);

  await waitForClusterIssuerReady(names.caIssuer);

  console.log('✅ PKI infrastructure ready');

  return names;
}

/**
 * TRUST + OPERATOR CERT
 */
async function createTrustBundleAndOperatorCert(
  rootSecret,
  caIssuer,
  operatorNamespace,
) {
  const bundle = 'artemis-ca-bundle';
  const cert = 'artemis-operator-cert';

  // ✅ FIXED: no selector, direct namespace target
  await applyYaml(`
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: ${bundle}
spec:
  sources:
  - secret:
      name: ${rootSecret}
      key: ca.crt
  target:
    secret:
      key: ca.crt
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: ${operatorNamespace}
`);

  await execAsync(
    `kubectl wait bundle ${bundle} --for=condition=Synced=True --timeout=180s`,
  );

  await waitForSecret(operatorNamespace, bundle);

  await applyYaml(`
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${cert}
  namespace: ${operatorNamespace}
spec:
  secretName: ${cert}
  commonName: artemis-operator
  issuerRef:
    name: ${caIssuer}
    kind: ClusterIssuer
`);

  await execAsync(
    `kubectl wait --for=condition=Ready certificate/${cert} -n ${operatorNamespace} --timeout=120s`,
  );

  console.log('✅ Trust + operator cert ready');

  return { bundle, operatorCert: cert };
}

/**
 * FULL SETUP
 */
async function setupCompletePKI(prefix, operatorNamespace = 'default') {
  const infra = await createClusterInfrastructure(prefix);

  const trust = await createTrustBundleAndOperatorCert(
    infra.rootSecret,
    infra.caIssuer,
    operatorNamespace,
  );

  return { ...infra, ...trust };
}

/**
 * Detect operator namespace
 */
async function detectOperatorNamespace(fallback = 'default') {
  try {
    const { stdout } = await execAsync(
      `kubectl get pods -A -l app.kubernetes.io/name=arkmq-org-broker-operator -o jsonpath='{.items[0].metadata.namespace}'`,
    );

    if (stdout.trim()) return stdout.trim();
  } catch (_) {
    /* empty */
  }

  return fallback;
}

module.exports = {
  applyYaml,
  waitForClusterIssuerReady,
  waitForSecret,
  createClusterInfrastructure,
  createTrustBundleAndOperatorCert,
  setupCompletePKI,
  detectOperatorNamespace,
  execAsync,
};
