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
 * Wait for a secret to exist in a namespace AND have valid CA data
 */
async function waitForSecret(namespace, secretName, timeoutMs = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check if secret exists
      await execAsync(`kubectl get secret ${secretName} -n ${namespace}`);

      // Verify it has ca.crt data (critical for ClusterIssuer)
      const { stdout } = await execAsync(
        `kubectl get secret ${secretName} -n ${namespace} -o jsonpath='{.data.ca\\.crt}'`,
      );

      if (stdout && stdout.trim().length > 0) {
        console.log(
          `  ✓ Secret has ca.crt data (${stdout.trim().length} bytes)`,
        );
        return; // Secret exists with valid data
      }

      console.log(`  ⏳ Secret exists but ca.crt data not ready yet...`);
    } catch (error) {
      // Secret doesn't exist yet or error reading it
      console.log(`  ⏳ Secret not found yet, retrying...`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(
    `Timeout waiting for secret ${secretName} with valid ca.crt data in namespace ${namespace}`,
  );
}

/**
 * Hard-coded cert-manager namespace - single source of truth
 * ClusterIssuers ALWAYS look for secrets in this namespace
 */
const CERT_MANAGER_NAMESPACE = 'cert-manager';

/**
 * Creates the cluster-level cert-manager infrastructure
 * This includes:
 * - Self-signed root ClusterIssuer
 * - Root CA Certificate in detected cluster resource namespace
 * - CA ClusterIssuer (signed by root CA)
 *
 * @param {string} prefix - Prefix for resource names (e.g., "dev", "e2e")
 * @returns {Promise<object>} Resource names that were created
 */
async function createClusterInfrastructure(prefix) {
  console.log(`📦 Creating cluster infrastructure with prefix: ${prefix}...`);
  console.log(`  Using cert-manager namespace: ${CERT_MANAGER_NAMESPACE}`);

  // SAFETY CHECK: Verify cert-manager is actually running
  console.log('🔍 Verifying cert-manager is running...');
  try {
    const { stdout } = await execAsync(
      `kubectl get pods -A | grep cert-manager || true`,
    );
    if (!stdout || stdout.trim() === '') {
      throw new Error(
        'cert-manager pods not found in cluster. Please install cert-manager first.',
      );
    }
    console.log('✓ cert-manager pods found');
  } catch (error) {
    throw new Error(`Failed to verify cert-manager: ${error.message}`);
  }

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

  // Step 2: Create root CA certificate in cert-manager namespace
  console.log(
    `📦 Step 2: Creating root CA certificate in ${CERT_MANAGER_NAMESPACE} namespace...`,
  );
  const rootCACertYaml = `
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${resourceNames.rootCert}
  namespace: ${CERT_MANAGER_NAMESPACE}
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
    `kubectl wait --for=condition=Ready certificate/${resourceNames.rootCert} -n ${CERT_MANAGER_NAMESPACE} --timeout=120s`,
  );
  console.log(`✓ Certificate ${resourceNames.rootCert} is Ready`);

  // Wait for secret to exist and be ready
  console.log(
    `⏳ Waiting for secret ${resourceNames.rootSecret} to exist in ${CERT_MANAGER_NAMESPACE} namespace...`,
  );
  await waitForSecret(CERT_MANAGER_NAMESPACE, resourceNames.rootSecret, 120000);
  console.log(
    `✓ Secret ${resourceNames.rootSecret} exists in ${CERT_MANAGER_NAMESPACE}`,
  );

  // CRITICAL: Verify secret is in correct namespace
  console.log('🔍 Verifying CA secret location...');
  const { stdout: secretNs } = await execAsync(
    `kubectl get secret ${resourceNames.rootSecret} -n ${CERT_MANAGER_NAMESPACE} -o jsonpath='{.metadata.namespace}'`,
  );
  console.log(`✓ CA secret confirmed in namespace: ${secretNs}`);

  // ROBUST: Wait for secret data to be populated (OpenShift-compatible)
  console.log('⏳ Waiting for secret to be fully populated...');
  await execAsync(`
    for i in {1..30}; do
      DATA=$(kubectl get secret ${resourceNames.rootSecret} -n ${CERT_MANAGER_NAMESPACE} -o jsonpath='{.data.ca\\.crt}' 2>/dev/null || true)
      if [ -n "$DATA" ]; then
        echo "✓ Secret fully populated"
        exit 0
      fi
      echo "⏳ Waiting for CA data... (attempt $i/30)"
      sleep 2
    done
    echo "❌ Timeout waiting for CA data"
    exit 1
  `);

  // CRITICAL FIX: Wait for secret to be fully CA-ready (not just populated)
  console.log('🔒 Waiting for CA secret to be fully usable for signing...');
  await execAsync(`
    for i in {1..30}; do
      # Verify BOTH tls.key and ca.crt exist (required for CA issuer)
      TLS_KEY=$(kubectl get secret ${resourceNames.rootSecret} -n ${CERT_MANAGER_NAMESPACE} -o jsonpath='{.data.tls\\.key}' 2>/dev/null || true)
      CA_CRT=$(kubectl get secret ${resourceNames.rootSecret} -n ${CERT_MANAGER_NAMESPACE} -o jsonpath='{.data.ca\\.crt}' 2>/dev/null || true)
      
      if [ -n "$TLS_KEY" ] && [ -n "$CA_CRT" ]; then
        echo "✓ Secret is fully CA-ready (has both tls.key and ca.crt)"
        exit 0
      fi
      
      echo "⏳ Secret not CA-ready yet... retry $i/30"
      sleep 3
    done
    
    echo "❌ Secret never became CA-ready"
    kubectl get secret ${resourceNames.rootSecret} -n ${CERT_MANAGER_NAMESPACE} -o yaml
    exit 1
  `);

  // CRITICAL FIX: Hard delay to let cert-manager stabilize internal cache
  console.log('⏱️  Stabilization delay (10s) for cert-manager cache...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Step 3: Create CA issuer (delete first to ensure clean state)
  console.log('📦 Step 3: Creating CA-signed ClusterIssuer...');
  console.log(
    `  Cleaning up any existing ClusterIssuer ${resourceNames.caIssuer}...`,
  );
  try {
    await execAsync(
      `kubectl delete clusterissuer ${resourceNames.caIssuer} --ignore-not-found=true`,
    );
    // Small buffer for deletion (don't over-engineer)
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('  Cleanup complete');
  } catch (error) {
    // Ignore errors - issuer might not exist
  }

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

  // CRITICAL FIX: Use kubectl wait for proper event-driven readiness
  console.log('⏳ Waiting for CA issuer to be ready (event-driven)...');
  await execAsync(`
    kubectl wait --for=jsonpath='{.data.ca\\.crt}' \
      secret/${resourceNames.rootSecret} \
      -n ${CERT_MANAGER_NAMESPACE} \
      --timeout=120s
  `);

  await waitForClusterIssuerReady(resourceNames.caIssuer);

  console.log('✅ Cluster infrastructure created successfully');
  return resourceNames;
}

/**
 * Creates trust bundle and operator certificate
 *
 * @param {string} rootSecretName - Name of the root CA secret (from createClusterInfrastructure)
 * @param {string} caIssuerName - Name of the CA issuer (from createClusterInfrastructure)
 * @param {string} operatorNamespace - Namespace where operator runs (default: "cert-manager")
 * @returns {Promise<object>} Resource names that were created
 */
async function createTrustBundleAndOperatorCert(
  rootSecretName,
  caIssuerName,
  operatorNamespace = 'cert-manager',
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
