import { exec } from 'child_process';
import { promisify } from 'util';
import {
  createClusterInfrastructure,
  createTrustBundleAndOperatorCert,
  waitForSecret,
} from '../../scripts/setup-pki.js';

const execAsync = promisify(exec);

/**
 * Creates a namespace if it doesn't exist
 */
export async function ensureNamespace(namespace: string): Promise<void> {
  try {
    await execAsync(`kubectl create namespace ${namespace}`);
  } catch (error) {
    // Namespace might already exist, ignore error
  }
}

/**
 * Deletes a namespace
 */
export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    await execAsync(
      `kubectl delete namespace ${namespace} --ignore-not-found=true`,
    );
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Scorched earth cleanup - removes ALL test-related resources
 * Delegates to the cleanup-tests.js script
 */
export async function scorchedEarthCleanup(): Promise<void> {
  try {
    await execAsync('node scripts/cleanup-tests.js');
  } catch (error) {
    console.warn('⚠️  Test cleanup encountered errors');
    // Don't throw - we want tests to proceed even if cleanup has issues
  }
}

/**
 * Creates the cluster-level cert-manager infrastructure for e2e tests
 * Uses shared setup-pki module with "e2e" prefix
 */
export async function createE2EClusterInfrastructure(): Promise<void> {
  await createClusterInfrastructure('e2e');
}

/**
 * Creates trust bundle and operator certificate for a specific namespace
 * Uses shared setup-pki module
 */
export async function createE2ETrustBundleAndOperatorCert(
  namespace: string,
): Promise<void> {
  // Create trust bundle and operator cert in the operator namespace (default)
  await createTrustBundleAndOperatorCert(
    'e2e-root-ca-secret',
    'e2e-ca-issuer',
    'default',
  );

  // Wait for the CA secret to appear in the broker namespace
  console.log(`⏳ Waiting for CA secret in broker namespace ${namespace}...`);
  await waitForSecret(namespace, 'activemq-artemis-manager-ca', 60000);
  console.log(`✓ CA secret available in broker namespace (${namespace})`);
}

/**
 * Cleans up cluster-level e2e infrastructure
 * Delegates to the unified chain-of-trust.js script
 */
export async function cleanupE2EClusterInfrastructure(): Promise<void> {
  try {
    // Use the cleanup command with e2e prefix
    await execAsync(
      'node scripts/chain-of-trust.js cleanup --prefix e2e --namespace default',
    );
  } catch (error) {
    console.warn('⚠️  Error during e2e cleanup');
    // Don't throw - cleanup errors shouldn't fail tests
  }
}
