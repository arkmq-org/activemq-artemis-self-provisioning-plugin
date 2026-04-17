/**
 * Shared PKI Setup Functions
 *
 * This module provides reusable functions for setting up cert-manager PKI infrastructure
 * for ActiveMQ Artemis restricted mode. It's used by:
 * - scripts/chain-of-trust.js (user-facing development setup/cleanup)
 * - playwright/fixtures/k8s.ts (e2e test setup)
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Apply YAML content using kubectl
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
 * Wait for a ClusterIssuer to be Ready
 */
async function waitForClusterIssuerReady(issuerName, timeoutMs = 120000) {
  console.log(`⏳ Waiting for ClusterIssuer ${issuerName} to be Ready...`);
  const startTime = Date.now();
  let lastStatus = '';
  let lastMessage = '';

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Get the Ready condition status
      const { stdout: status } = await execAsync(
        `kubectl get clusterissuer ${issuerName} -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'`,
      );

      // Get the Ready condition message
      const { stdout: message } = await execAsync(
        `kubectl get clusterissuer ${issuerName} -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'`,
      );

      const currentStatus = status.trim();
      const currentMessage = message.trim();

      // Log status changes
      if (currentStatus !== lastStatus || currentMessage !== lastMessage) {
        console.log(`  Status: ${currentStatus || 'Unknown'}`);
        if (currentMessage) {
          console.log(`  Message: ${currentMessage}`);
        }
        lastStatus = currentStatus;
        lastMessage = currentMessage;
      }

      if (currentStatus === 'True') {
        console.log(`✓ ClusterIssuer ${issuerName} is Ready`);
        return;
      }
    } catch (error) {
      // Issuer might not exist yet
      if (lastStatus !== 'NotFound') {
        console.log(`  Status: NotFound (waiting for creation...)`);
        lastStatus = 'NotFound';
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Before throwing, dump the full ClusterIssuer YAML for debugging
  try {
    console.log('\n❌ ClusterIssuer failed to become Ready. Full status:');
    const { stdout: fullYaml } = await execAsync(
      `kubectl get clusterissuer ${issuerName} -o yaml`,
    );
    console.log(fullYaml);
  } catch (error) {
    console.log('  (Could not retrieve ClusterIssuer details)');
  }

  throw new Error(
    `Timeout waiting for ClusterIssuer ${issuerName} to be Ready. Last message: ${
      lastMessage || 'none'
    }`,
  );
}

/**
 * Wait for a secret to exist in a namespace
 */
async function waitForSecret(namespace, secretName, timeoutMs = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      await execAsync(`kubectl get secret ${secretName} -n ${namespace}`);
      return; // Secret exists
    } catch (error) {
      // Secret doesn't exist yet
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error(
    `Timeout waiting for secret ${secretName} in namespace ${namespace}`,
  );
}

/**
 * Creates the cluster-level cert-manager infrastructure
 * This includes:
 * - Self-signed root ClusterIssuer
 * - Root CA Certificate in cert-manager namespace
 * - CA ClusterIssuer (signed by root CA)
 *
 * @param {string} prefix - Prefix for resource names (e.g., "dev", "e2e")
 * @returns {Promise<object>} Resource names that were created
 */
async function createClusterInfrastructure(prefix) {
  console.log(`📦 Creating cluster infrastructure with prefix: ${prefix}...`);

  const resourceNames = {
    rootIssuer: `${prefix}-selfsigned-root-issuer`,
    rootCert: `${prefix}-root-ca`,
    rootSecret: `${prefix}-root-ca-secret`,
    caIssuer: `${prefix}-ca-issuer`,
  };

  // Step 1: Create self-signed root issuer
  console.log('📦 Step 1: Creating self-signed root ClusterIssuer...');
  const rootIssuerYaml = `
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${resourceNames.rootIssuer}
spec:
  selfSigned: {}
`;
  await applyYaml(rootIssuerYaml);
  await waitForClusterIssuerReady(resourceNames.rootIssuer);

  // Step 2: Create root CA certificate
  console.log('📦 Step 2: Creating root CA certificate...');
  const rootCACertYaml = `
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${resourceNames.rootCert}
  namespace: cert-manager
spec:
  isCA: true
  commonName: ${prefix}.artemis.root.ca
  secretName: ${resourceNames.rootSecret}
  privateKey:
    rotationPolicy: Always
  issuerRef:
    name: ${resourceNames.rootIssuer}
    kind: ClusterIssuer
    group: cert-manager.io
`;
  await applyYaml(rootCACertYaml);

  // Wait for certificate to be ready
  console.log(
    `⏳ Waiting for certificate ${resourceNames.rootCert} to be ready...`,
  );
  await execAsync(
    `kubectl wait --for=condition=Ready certificate/${resourceNames.rootCert} -n cert-manager --timeout=60s`,
  );
  console.log(`✓ Certificate ${resourceNames.rootCert} is Ready`);

  // Step 3: Create CA issuer
  console.log('📦 Step 3: Creating CA-signed ClusterIssuer...');
  const caIssuerYaml = `
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: ${resourceNames.caIssuer}
spec:
  ca:
    secretName: ${resourceNames.rootSecret}
`;
  await applyYaml(caIssuerYaml);
  await waitForClusterIssuerReady(resourceNames.caIssuer);

  console.log('✅ Cluster infrastructure created successfully');
  return resourceNames;
}

/**
 * Creates trust bundle and operator certificate
 *
 * @param {string} rootSecretName - Name of the root CA secret (from createClusterInfrastructure)
 * @param {string} caIssuerName - Name of the CA issuer (from createClusterInfrastructure)
 * @param {string} operatorNamespace - Namespace where operator runs (default: "default")
 * @returns {Promise<object>} Resource names that were created
 */
async function createTrustBundleAndOperatorCert(
  rootSecretName,
  caIssuerName,
  operatorNamespace = 'default',
) {
  console.log(
    `📦 Creating trust bundle and operator cert for namespace: ${operatorNamespace}...`,
  );

  const bundleName = 'activemq-artemis-manager-ca';
  const operatorCertName = 'activemq-artemis-manager-cert';

  // Step 1: Create trust bundle
  console.log('📦 Step 1: Creating trust bundle...');
  const bundleYaml = `
apiVersion: trust.cert-manager.io/v1alpha1
kind: Bundle
metadata:
  name: ${bundleName}
spec:
  sources:
  - secret:
      name: ${rootSecretName}
      key: "ca.crt"
  target:
    secret:
      key: "ca.pem"
`;
  await applyYaml(bundleYaml);
  console.log('✓ Trust bundle created (will distribute to all namespaces)');

  // Step 2: Wait for the CA secret to appear in the operator namespace
  console.log(
    `⏳ Waiting for CA secret to be distributed to namespace ${operatorNamespace}...`,
  );
  await waitForSecret(operatorNamespace, bundleName);
  console.log(`✓ CA secret available in namespace ${operatorNamespace}`);

  // Step 3: Create operator certificate
  console.log('📦 Step 2: Creating operator certificate...');
  const operatorCertYaml = `
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${operatorCertName}
  namespace: ${operatorNamespace}
spec:
  secretName: ${operatorCertName}
  commonName: activemq-artemis-operator
  privateKey:
    rotationPolicy: Always
  issuerRef:
    name: ${caIssuerName}
    kind: ClusterIssuer
`;
  await applyYaml(operatorCertYaml);

  // Wait for certificate to be ready
  console.log(`⏳ Waiting for operator certificate to be ready...`);
  await execAsync(
    `kubectl wait --for=condition=Ready certificate/${operatorCertName} -n ${operatorNamespace} --timeout=120s`,
  );
  console.log(`✓ Operator certificate ready in namespace ${operatorNamespace}`);

  console.log('✅ Trust bundle and operator certificate created successfully');

  return {
    bundle: bundleName,
    operatorCert: operatorCertName,
  };
}

/**
 * Creates the complete PKI infrastructure (cluster infra + trust bundle + operator cert)
 * This is a convenience function that combines createClusterInfrastructure and createTrustBundleAndOperatorCert
 *
 * @param {string} prefix - Prefix for resource names (e.g., "dev", "e2e")
 * @param {string} operatorNamespace - Namespace where operator runs (default: "default")
 * @returns {Promise<object>} All created resource names
 */
async function setupCompletePKI(prefix, operatorNamespace = 'default') {
  const clusterResources = await createClusterInfrastructure(prefix);
  const trustResources = await createTrustBundleAndOperatorCert(
    clusterResources.rootSecret,
    clusterResources.caIssuer,
    operatorNamespace,
  );

  return {
    ...clusterResources,
    ...trustResources,
  };
}

const OPERATOR_POD_LABEL = 'app.kubernetes.io/name=arkmq-org-broker-operator';

/**
 * Auto-detect the namespace where the ActiveMQ Artemis operator is running
 * by querying for pods with the operator's well-known label.
 *
 * @param {string} [fallback='default'] - Namespace to return if detection fails
 * @returns {Promise<string>} The detected operator namespace
 */
async function detectOperatorNamespace(fallback = 'default') {
  try {
    const { stdout } = await execAsync(
      `kubectl get pods -A -l ${OPERATOR_POD_LABEL} -o jsonpath='{.items[0].metadata.namespace}'`,
    );
    const ns = stdout.trim().replace(/^'|'$/g, '');
    if (ns) {
      console.log(`✓ Detected operator namespace: ${ns}`);
      return ns;
    }
  } catch (error) {
    // Log the error for debugging
    console.error(`Error querying operator pods: ${error.message}`);
  }

  // If we reach here, no operator was found
  console.error(
    `❌ Could not detect operator namespace using label: ${OPERATOR_POD_LABEL}`,
  );
  console.error(
    `⚠️  Falling back to "${fallback}" - this may cause issues if the operator is not in this namespace`,
  );

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
