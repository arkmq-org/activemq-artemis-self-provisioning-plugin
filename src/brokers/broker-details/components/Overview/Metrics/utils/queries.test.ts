import { memoryUsageQuery, cpuUsageQuery } from './queries';

describe('Query Functions', () => {
  const name = 'my-broker';
  const namespace = 'my-namespace';

  describe('memoryUsageQuery', () => {
    it('should generate a memory usage query with a namespace', () => {
      const query = memoryUsageQuery(name, namespace, 0);
      expect(query).toBe(
        `sum(container_memory_working_set_bytes{pod='my-broker-ss-0', namespace='my-namespace', container='',}) BY (pod, namspace)`,
      );
    });

    it('should generate a memory usage query without a namespace', () => {
      const query = memoryUsageQuery(name, '', 0);
      expect(query).toBe(
        `sum(container_memory_working_set_bytes{pod='my-broker-ss-0', container='',}) BY (pod, namspace)`,
      );
    });

    it('should generate a memory usage query for a different replica', () => {
      const query = memoryUsageQuery(name, namespace, 2);
      expect(query).toBe(
        `sum(container_memory_working_set_bytes{pod='my-broker-ss-2', namespace='my-namespace', container='',}) BY (pod, namspace)`,
      );
    });
  });

  describe('cpuUsageQuery', () => {
    it('should generate a CPU usage query with a namespace', () => {
      const query = cpuUsageQuery(name, namespace, 0);
      expect(query).toBe(
        `pod:container_cpu_usage:sum{pod='my-broker-ss-0',namespace='my-namespace'}`,
      );
    });

    it('should generate a CPU usage query without a namespace', () => {
      const query = cpuUsageQuery(name, '', 0);
      expect(query).toBe(`pod:container_cpu_usage:sum{pod='my-broker-ss-0'}`);
    });

    it('should generate a CPU usage query for a different replica', () => {
      const query = cpuUsageQuery(name, namespace, 1);
      expect(query).toBe(
        `pod:container_cpu_usage:sum{pod='my-broker-ss-1',namespace='my-namespace'}`,
      );
    });
  });
});
