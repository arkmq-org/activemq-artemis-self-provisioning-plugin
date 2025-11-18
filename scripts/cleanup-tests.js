#!/usr/bin/env node
/**
 * Test Environment Cleanup
 *
 * This script performs aggressive cleanup of ALL test-related resources including:
 * - ActiveMQ Artemis brokers
 * - Cert-manager certificates and issuers
 * - Trust bundles
 * - Test namespaces
 *
 * This is intended to be run before E2E tests to ensure a clean starting state.
 *
 * Usage:
 *   yarn cleanup-tests
 *   node scripts/cleanup-tests.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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
 * Helper: Delete namespaces matching a pattern
 */
async function deleteNamespacePattern(pattern) {
  try {
    await execAsync(
      `kubectl get namespaces -o name | grep "${pattern}" | xargs -r kubectl delete --ignore-not-found=true || true`,
    );
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Main cleanup function
 */
async function cleanupTests() {
  console.log('\n🔥 Starting test environment cleanup...\n');
  console.log(
    'This will delete ALL brokers, certificates, and test resources!\n',
  );

  try {
    // 1. Delete all ActiveMQ Artemis brokers
    console.log('  Deleting all ActiveMQ Artemis brokers...');
    await execAsync(
      "kubectl get activemqartemis -A -o json | jq -r '.items[] | \"\\(.metadata.namespace) \\(.metadata.name)\"' | xargs -r -L1 sh -c 'kubectl delete activemqartemis $1 -n $0 --ignore-not-found=true' || true",
    );

    // 2. Delete all cert-manager Certificates
    console.log('  Deleting all cert-manager Certificates...');
    await execAsync(
      "kubectl get certificates -A -o json | jq -r '.items[] | \"\\(.metadata.namespace) \\(.metadata.name)\"' | xargs -r -L1 sh -c 'kubectl delete certificate $1 -n $0 --ignore-not-found=true' || true",
    );

    // 3. Delete all cert-manager Issuers
    console.log('  Deleting all Issuers...');
    await execAsync(
      "kubectl get issuers -A -o json | jq -r '.items[] | \"\\(.metadata.namespace) \\(.metadata.name)\"' | xargs -r -L1 sh -c 'kubectl delete issuer $1 -n $0 --ignore-not-found=true' || true",
    );

    // 4. Delete all cert-manager ClusterIssuers
    console.log('  Deleting all ClusterIssuers...');
    await execAsync(
      'kubectl get clusterissuers -o name | xargs -r kubectl delete --ignore-not-found=true || true',
    );

    // 5. Delete all trust-manager Bundles
    console.log('  Deleting all Bundles...');
    await execAsync(
      'kubectl get bundles -o name | xargs -r kubectl delete --ignore-not-found=true || true',
    );

    // 6. Delete operator resources in default namespace
    console.log('  Deleting operator resources...');
    await execAsync(
      'kubectl delete certificate activemq-artemis-manager-cert -n default --ignore-not-found=true || true',
    );
    await execAsync(
      'kubectl delete secret activemq-artemis-manager-cert -n default --ignore-not-found=true || true',
    );

    // 7. Delete known secrets from all namespaces
    console.log('  Deleting known default secrets...');
    const defaultSecrets = [
      'activemq-artemis-manager-cert',
      'activemq-artemis-manager-ca',
      'prometheus-cert',
    ];

    for (const secret of defaultSecrets) {
      await deleteSecretPattern(secret);
    }

    // 8. Delete all broker certificates
    console.log('  Deleting all broker certificate secrets...');
    await deleteSecretPattern('broker-cert');
    await deleteCertificatePattern('broker-cert');

    // 9. Delete e2e-specific cert-manager resources
    console.log('  Deleting e2e cert-manager resources...');
    await execAsync(
      'kubectl delete certificate e2e-root-ca -n cert-manager --ignore-not-found=true || true',
    );
    await execAsync(
      'kubectl delete secret e2e-root-ca-secret -n cert-manager --ignore-not-found=true || true',
    );

    // 10. Delete all e2e test namespaces
    console.log('  Deleting e2e test namespaces...');
    await deleteNamespacePattern('e2e-');

    // Wait for resources to be fully deleted
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('\n✅ Test environment cleanup complete!\n');
  } catch (error) {
    console.warn('⚠️  Cleanup encountered errors:', error.message);
    console.warn('Some resources may not have been deleted.\n');
    // Don't exit with error - best effort cleanup
  }
}

// Run cleanup
cleanupTests().then(() => process.exit(0));
