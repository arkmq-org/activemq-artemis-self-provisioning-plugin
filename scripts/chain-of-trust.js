#!/usr/bin/env node
/**
 * Chain of Trust Management
 *
 * This script manages PKI infrastructure for the ActiveMQ Artemis
 * self-provisioning plugin in restricted mode.
 *
 * Usage:
 *   yarn chain-of-trust setup [options]
 *   yarn chain-of-trust cleanup [options]
 *
 * Commands:
 *   setup     Create PKI infrastructure
 *   cleanup   Remove PKI infrastructure
 *
 * Options:
 *   --namespace <name>    Target namespace for operator cert (default: "default")
 *   --prefix <name>       Prefix for resource names (default: "dev")
 *   --help                Show this help message
 */

const { setupCompletePKI } = require('./setup-pki');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
let namespace = 'default';
let prefix = 'dev';

function showHelp() {
  console.log(`
Chain of Trust Management

This script manages PKI infrastructure for the ActiveMQ Artemis
self-provisioning plugin in restricted mode.

Usage:
  yarn chain-of-trust setup [options]
  yarn chain-of-trust cleanup [options]

Commands:
  setup     Create PKI infrastructure
  cleanup   Remove PKI infrastructure

Options:
  --namespace <name>    Target namespace for operator cert (default: "default")
  --prefix <name>       Prefix for resource names (default: "dev")
  --help                Show this help message

Examples:
  yarn chain-of-trust setup
  yarn chain-of-trust setup --namespace my-namespace --prefix test
  yarn chain-of-trust cleanup
  yarn chain-of-trust cleanup --namespace my-namespace --prefix test

Note: For aggressive test cleanup (including brokers and test namespaces),
      use 'yarn cleanup-tests' instead.
`);
  process.exit(0);
}

// Parse options
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--namespace' && args[i + 1]) {
    namespace = args[i + 1];
    i++;
  } else if (args[i] === '--prefix' && args[i + 1]) {
    prefix = args[i + 1];
    i++;
  } else if (args[i] === '--help') {
    showHelp();
  }
}

if (!command || (command !== 'setup' && command !== 'cleanup')) {
  console.error('Error: Please specify a command (setup or cleanup)');
  showHelp();
}

const resourceNames = {
  rootIssuer: `${prefix}-selfsigned-root-issuer`,
  rootCert: `${prefix}-root-ca`,
  rootSecret: `${prefix}-root-ca-secret`,
  caIssuer: `${prefix}-ca-issuer`,
  bundle: 'activemq-artemis-manager-ca',
  operatorCert: 'activemq-artemis-manager-cert',
};

/**
 * Helper: Delete certificates matching a pattern across all namespaces
 */
async function deleteCertificatePattern(pattern) {
  try {
    await execAsync(
      `kubectl get certificates -A -o json 2>/dev/null | jq -r '.items[] | select(.metadata.name | contains("${pattern}")) | "\\(.metadata.namespace) \\(.metadata.name)"' | xargs -r -L1 sh -c 'kubectl delete certificate $1 -n $0 --ignore-not-found=true' || true`,
    );
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Helper: Delete secrets matching a pattern across all namespaces
 */
async function deleteSecretPattern(pattern) {
  try {
    await execAsync(
      `kubectl get secrets -A -o json 2>/dev/null | jq -r '.items[] | select(.metadata.name | contains("${pattern}")) | "\\(.metadata.namespace) \\(.metadata.name)"' | xargs -r -L1 sh -c 'kubectl delete secret $1 -n $0 --ignore-not-found=true' || true`,
    );
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Setup function - creates PKI infrastructure
 */
async function setup() {
  console.log('\n🔐 Setting up Chain of Trust for ActiveMQ Artemis\n');
  console.log(`Configuration:`);
  console.log(`  - Namespace: ${namespace}`);
  console.log(`  - Prefix: ${prefix}\n`);

  try {
    const createdResources = await setupCompletePKI(prefix, namespace);

    // Success summary
    console.log('\n✅ Chain of Trust Setup Complete!\n');
    console.log('Created resources:');
    console.log(
      `  ✓ ClusterIssuer: ${createdResources.rootIssuer} (self-signed)`,
    );
    console.log(
      `  ✓ Certificate: ${createdResources.rootCert} (in cert-manager namespace)`,
    );
    console.log(`  ✓ ClusterIssuer: ${createdResources.caIssuer} (CA-signed)`);
    console.log(
      `  ✓ Bundle: ${createdResources.bundle} (distributes to all namespaces)`,
    );
    console.log(
      `  ✓ Certificate: ${createdResources.operatorCert} (in ${namespace} namespace)`,
    );
    console.log('\nYou can now:');
    console.log(`  1. Create a broker in restricted mode`);
    console.log(
      `  2. Use the "${createdResources.caIssuer}" ClusterIssuer to generate broker certificates`,
    );
    console.log(
      `  3. The trust bundle "${createdResources.bundle}" will automatically appear in your broker namespace\n`,
    );
  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.error('\nMake sure you have:');
    console.error('  - kubectl configured and connected to your cluster');
    console.error('  - cert-manager installed in your cluster');
    console.error('  - trust-manager installed in your cluster');
    console.error(
      '  - Appropriate permissions to create cluster-wide resources\n',
    );
    process.exit(1);
  }
}

/**
 * Cleanup function - removes PKI infrastructure
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up Chain of Trust Resources\n');
  console.log(`Configuration:`);
  console.log(`  - Namespace: ${namespace}`);
  console.log(`  - Prefix: ${prefix}\n`);

  try {
    // Delete Bundle
    console.log('  Deleting Bundle...');
    await execAsync(
      `kubectl delete bundle ${resourceNames.bundle} --ignore-not-found=true`,
    );

    // Delete operator certificate
    console.log(`  Deleting operator certificate from ${namespace}...`);
    await execAsync(
      `kubectl delete certificate ${resourceNames.operatorCert} -n ${namespace} --ignore-not-found=true`,
    );
    await execAsync(
      `kubectl delete secret ${resourceNames.operatorCert} -n ${namespace} --ignore-not-found=true`,
    );

    // Delete all broker certificates (both generic and CR-specific)
    console.log('  Deleting all broker certificates...');
    await deleteCertificatePattern('broker-cert');
    await deleteSecretPattern('broker-cert');

    // Delete ClusterIssuers
    console.log('  Deleting ClusterIssuers...');
    await execAsync(
      `kubectl delete clusterissuer ${resourceNames.rootIssuer} ${resourceNames.caIssuer} --ignore-not-found=true`,
    );

    // Delete root CA certificate and secret
    console.log('  Deleting root CA resources...');
    await execAsync(
      `kubectl delete certificate ${resourceNames.rootCert} -n cert-manager --ignore-not-found=true`,
    );
    await execAsync(
      `kubectl delete secret ${resourceNames.rootSecret} -n cert-manager --ignore-not-found=true`,
    );

    console.log('\n✅ Cleanup complete!\n');
    console.log('Removed resources:');
    console.log(`  ✓ Bundle: ${resourceNames.bundle}`);
    console.log(
      `  ✓ Certificate: ${resourceNames.operatorCert} (from ${namespace})`,
    );
    console.log(
      `  ✓ All broker certificates and secrets (pattern: *broker-cert*)`,
    );
    console.log(
      `  ✓ ClusterIssuers: ${resourceNames.rootIssuer}, ${resourceNames.caIssuer}`,
    );
    console.log(
      `  ✓ Certificate: ${resourceNames.rootCert} (from cert-manager)`,
    );
    console.log(
      `  ✓ Secret: ${resourceNames.rootSecret} (from cert-manager)\n`,
    );
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    console.error(
      '\nSome resources may not have been deleted. Check manually with kubectl.\n',
    );
    process.exit(1);
  }
}

// Run the appropriate command
if (command === 'setup') {
  setup();
} else if (command === 'cleanup') {
  cleanup();
}
