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
 * Detect the cert-manager cluster resource namespace
 * This is the namespace where ClusterIssuers look for secrets
 */
async function detectCertManagerNamespace() {
  try {
    // Try to get the cert-manager deployment and check its --cluster-resource-namespace flag
    const { stdout } = await execAsync(
      `kubectl get deployment cert-manager -n cert-manager -o jsonpath='{.spec.template.spec.containers[0].args}'`,
    );

    // Look for --cluster-resource-namespace flag
    const match = stdout.match(
      /--cluster-resource-namespace[=\s]+([^\s,\]"]+)/,
    );
    if (match && match[1]) {
      let namespace = match[1].trim();

      // If it's an environment variable reference like $(POD_NAMESPACE), resolve it
      if (namespace.startsWith('$(') && namespace.endsWith(')')) {
        const envVar = namespace.slice(2, -1); // Extract POD_NAMESPACE from $(POD_NAMESPACE)
        console.log(`  ⚠ Found environment variable reference: ${envVar}`);

        // Try to get the actual value from a running pod
        try {
          const { stdout: podNamespace } = await execAsync(
            `kubectl get pod -n cert-manager -l app=cert-manager -o jsonpath='{.items[0].metadata.namespace}'`,
          );
          if (podNamespace && podNamespace.trim()) {
            namespace = podNamespace.trim();
            console.log(`  ✓ Resolved to pod namespace: ${namespace}`);
            return namespace;
          }
        } catch (e) {
          console.log(
            `  ⚠ Could not resolve environment variable, using cert-manager namespace`,
          );
        }
      } else {
        console.log(`  ✓ Detected cluster resource namespace: ${namespace}`);
        return namespace;
      }
    }
  } catch (error) {
    console.log(
      '  ⚠ Could not detect cluster resource namespace from deployment args',
    );
  }

  // Default to cert-manager namespace if not specified
  console.log('  ✓ Using default namespace: cert-manager');
  return 'cert-manager';
}

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

  // Detect the namespace where cert-manager looks for cluster resources
  console.log('🔍 Detecting cert-manager cluster resource namespace...');
  const clusterResourceNamespace = await detectCertManagerNamespace();

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

  // Step 2: Create root CA certificate in the detected cluster resource namespace
  console.log(
    `📦 Step 2: Creating root CA certificate in ${clusterResourceNamespace} namespace...`,
  );
  const rootCACertYaml = `
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${resourceNames.rootCert}
  namespace: ${clusterResourceNamespace}
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
    `kubectl wait --for=condition=Ready certificate/${resourceNames.rootCert} -n ${clusterResourceNamespace} --timeout=120s`,
  );
  console.log(`✓ Certificate ${resourceNames.rootCert} is Ready`);

  // CRITICAL FIX: Wait for secret to exist in the cluster resource namespace
  console.log(
    `⏳ Waiting for secret ${resourceNames.rootSecret} to exist in ${clusterResourceNamespace} namespace...`,
  );
  await waitForSecret(
    clusterResourceNamespace,
    resourceNames.rootSecret,
    120000,
  );
  console.log(
    `✓ Secret ${resourceNames.rootSecret} exists in ${clusterResourceNamespace}`,
  );
  console.log('⏳ Waiting for cert-manager to reconcile secret...');
  await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s buffer
  console.log('✓ cert-manager reconciliation buffer complete');

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
