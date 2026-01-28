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

/**
 * Generates a Prometheus query for pending messages of a specific pod replica.
 * @param name - The name of the stateful set.
 * @param namespace - The namespace of the pod.
 * @param replica - The replica number of the pod.
 * @returns The Prometheus query string.
 */
export const pendingMessagesQuery = (
  name: string,
  namespace: string,
  replica = 0,
): string => {
  const podName = `${name}-ss-${replica}`;
  if (!namespace) {
    return `artemis_total_pending_message_count{pod='${podName}'}`;
  }
  return `artemis_total_pending_message_count{pod='${podName}',namespace='${namespace}'}`;
};

/**
 * Generates a Prometheus query for total produced messages of a specific pod replica.
 * @param name - The name of the stateful set.
 * @param namespace - The namespace of the pod.
 * @param replica - The replica number of the pod.
 * @returns The Prometheus query string.
 */
export const totalProducedQuery = (
  name: string,
  namespace: string,
  replica = 0,
): string => {
  const podName = `${name}-ss-${replica}`;
  if (!namespace) {
    return `artemis_total_produced_message_count_total{pod='${podName}'}`;
  }
  return `artemis_total_produced_message_count_total{pod='${podName}',namespace='${namespace}'}`;
};

/**
 * Generates a Prometheus query for produced message throughput of a specific pod replica.
 * @param name - The name of the stateful set.
 * @param namespace - The namespace of the pod.
 * @param replica - The replica number of the pod.
 * @returns The Prometheus query string.
 */
export const throughputQuery = (
  name: string,
  namespace: string,
  replica = 0,
): string => {
  const podName = `${name}-ss-${replica}`;
  if (!namespace) {
    return `rate(artemis_total_produced_message_count_total{pod='${podName}'}[1m])`;
  }
  return `rate(artemis_total_produced_message_count_total{pod='${podName}',namespace='${namespace}'}[1m])`;
};
