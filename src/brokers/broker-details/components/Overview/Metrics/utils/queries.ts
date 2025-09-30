/**
 * Generates a Prometheus query for memory usage of a specific pod replica.
 * @param name - The name of the stateful set.
 * @param namespace - The namespace of the pod.
 * @param replica - The replica number of the pod.
 * @returns The Prometheus query string.
 */
export const memoryUsageQuery = (
  name: string,
  namespace: string,
  replica = 0,
): string => {
  if (!namespace) {
    return `sum(container_memory_working_set_bytes{pod='${
      name + '-ss-' + replica
    }', container='',}) BY (pod, namspace)`;
  }

  return `sum(container_memory_working_set_bytes{pod='${
    name + '-ss-' + replica
  }', namespace='${namespace}', container='',}) BY (pod, namspace)`;
};

/**
 * Generates a Prometheus query for CPU usage of a specific pod replica.
 * @param name - The name of the stateful set.
 * @param namespace - The namespace of the pod.
 * @param replica - The replica number of the pod.
 * @returns The Prometheus query string.
 */
export const cpuUsageQuery = (
  name: string,
  namespace: string,
  replica = 0,
): string => {
  if (!namespace) {
    return `pod:container_cpu_usage:sum{pod='${name + '-ss-' + replica}'}`;
  }

  return `pod:container_cpu_usage:sum{pod='${
    name + '-ss-' + replica
  }',namespace='${namespace}'}`;
};
