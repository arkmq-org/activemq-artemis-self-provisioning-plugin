/**
 * Utility functions for Playwright tests
 */

/**
 * Determines if the test is running against a remote OpenShift cluster
 * (as opposed to a local CRC instance or localhost)
 *
 * @returns true if running against a remote cluster, false for localhost/CRC
 */
export function isRemoteCluster(): boolean {
  const consoleUrl = process.env.CONSOLE_URL || 'http://localhost:9000';

  return (
    consoleUrl.startsWith('https://') &&
    consoleUrl.includes('console-openshift')
  );
}
