import {
  generateMockPrometheusResponse,
  generateMockCPUData,
  generateMockMemoryData,
  generateEmptyPrometheusResponse,
  generateErrorPrometheusResponse,
  generateMultiSeriesData,
  generatePatternedData,
  generateDataWithGaps,
  generateExtremeValueData,
  generateZeroValueData,
  generateNegativeValueData,
} from './prometheus-mock-generator';

describe('Prometheus Mock Generator', () => {
  describe('generateMockPrometheusResponse', () => {
    it('should generate valid Prometheus response', () => {
      const response = generateMockPrometheusResponse({
        metricName: 'test_metric',
      });

      expect(response.status).toBe('success');
      expect(response.data.resultType).toBe('matrix');
      expect(response.data.result).toHaveLength(1);
      expect(response.data.result[0].metric.__name__).toBe('test_metric');
    });

    it('should generate specified number of data points', () => {
      const dataPoints = 30;
      const response = generateMockPrometheusResponse({
        metricName: 'test_metric',
        dataPoints,
      });

      expect(response.data.result[0].values).toHaveLength(dataPoints);
    });

    it('should include custom labels', () => {
      const labels = { pod: 'test-pod', namespace: 'test-ns' };
      const response = generateMockPrometheusResponse({
        metricName: 'test_metric',
        labels,
      });

      expect(response.data.result[0].metric.pod).toBe('test-pod');
      expect(response.data.result[0].metric.namespace).toBe('test-ns');
    });

    it('should generate values within specified range', () => {
      const valueRange: [number, number] = [10, 20];
      const response = generateMockPrometheusResponse({
        metricName: 'test_metric',
        valueRange,
        dataPoints: 100,
      });

      const result = response.data.result[0];
      expect(result).toBeDefined();
      expect(result?.values).toBeDefined();
      result?.values?.forEach(([, value]) => {
        const numValue = parseFloat(value);
        expect(numValue).toBeGreaterThanOrEqual(valueRange[0]);
        expect(numValue).toBeLessThanOrEqual(valueRange[1]);
      });
    });

    it('should generate timestamps in chronological order', () => {
      const response = generateMockPrometheusResponse({
        metricName: 'test_metric',
        dataPoints: 10,
      });

      const result = response.data.result[0];
      expect(result).toBeDefined();
      expect(result?.values).toBeDefined();
      const timestamps = result?.values?.map(([ts]) => ts) || [];
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }
    });
  });

  describe('generateMockCPUData', () => {
    it('should generate CPU data with correct metric name', () => {
      const response = generateMockCPUData();

      expect(response.data.result[0]?.metric.__name__).toBe(
        'container_cpu_usage_seconds_total',
      );
    });

    it('should include pod label', () => {
      const podName = 'test-pod-123';
      const response = generateMockCPUData(podName);

      expect(response.data.result[0]?.metric.pod).toBe(podName);
    });

    it('should generate CPU values in reasonable range', () => {
      const response = generateMockCPUData();
      const result = response.data.result[0];
      expect(result).toBeDefined();

      result?.values?.forEach(([, value]) => {
        const numValue = parseFloat(value);
        expect(numValue).toBeGreaterThanOrEqual(0);
        expect(numValue).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('generateMockMemoryData', () => {
    it('should generate memory data with correct metric name', () => {
      const response = generateMockMemoryData();

      expect(response.data.result[0]?.metric.__name__).toBe(
        'container_memory_working_set_bytes',
      );
    });

    it('should generate memory values in bytes range', () => {
      const response = generateMockMemoryData();
      const result = response.data.result[0];
      expect(result).toBeDefined();

      result?.values?.forEach(([, value]) => {
        const numValue = parseFloat(value);
        expect(numValue).toBeGreaterThanOrEqual(1073741824); // 1GB
        expect(numValue).toBeLessThanOrEqual(4294967296); // 4GB
      });
    });
  });

  describe('generateEmptyPrometheusResponse', () => {
    it('should generate response with empty result', () => {
      const response = generateEmptyPrometheusResponse();

      expect(response.status).toBe('success');
      expect(response.data.result).toHaveLength(0);
    });
  });

  describe('generateErrorPrometheusResponse', () => {
    it('should generate error response', () => {
      const errorMessage = 'Connection timeout';
      const response = generateErrorPrometheusResponse(errorMessage);

      expect(response.status).toBe('error');
      expect(response.error).toBe(errorMessage);
    });
  });

  describe('generateMultiSeriesData', () => {
    it('should generate data for multiple pods', () => {
      const podNames = ['pod-1', 'pod-2', 'pod-3'];
      const responses = generateMultiSeriesData(podNames, 'test_metric');

      expect(responses).toHaveLength(3);
      responses.forEach((response, index) => {
        expect(response.data.result[0].metric.pod).toBe(podNames[index]);
      });
    });
  });

  describe('generatePatternedData', () => {
    it('should generate increasing pattern', () => {
      const response = generatePatternedData('increasing', 10);
      const result = response.data.result[0];
      expect(result).toBeDefined();
      const values = result?.values?.map(([, v]) => parseFloat(v)) || [];

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
      }
    });

    it('should generate decreasing pattern', () => {
      const response = generatePatternedData('decreasing', 10);
      const result = response.data.result[0];
      expect(result).toBeDefined();
      const values = result?.values?.map(([, v]) => parseFloat(v)) || [];

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
      }
    });

    it('should generate flat pattern', () => {
      const response = generatePatternedData('flat', 10);
      const result = response.data.result[0];
      expect(result).toBeDefined();
      const values = result?.values?.map(([, v]) => parseFloat(v)) || [];

      const firstValue = values[0];
      values.forEach((value) => {
        expect(value).toBe(firstValue);
      });
    });

    it('should generate spike pattern', () => {
      const response = generatePatternedData('spike', 10);
      const result = response.data.result[0];
      expect(result).toBeDefined();
      const values = result?.values?.map(([, v]) => parseFloat(v)) || [];

      const maxValue = Math.max(...values);
      const spikeIndex = values.indexOf(maxValue);
      expect(spikeIndex).toBe(5); // Middle of 10 points
    });
  });

  describe('generateDataWithGaps', () => {
    it('should generate data with missing points', () => {
      const gapIndices = [5, 10, 15];
      const totalPoints = 20;
      const response = generateDataWithGaps(gapIndices, totalPoints);

      expect(response.data.result[0].values).toHaveLength(
        totalPoints - gapIndices.length,
      );
    });

    it('should have no gaps when empty array provided', () => {
      const totalPoints = 20;
      const response = generateDataWithGaps([], totalPoints);

      expect(response.data.result[0].values).toHaveLength(totalPoints);
    });
  });

  describe('generateExtremeValueData', () => {
    it('should generate data with very large values', () => {
      const response = generateExtremeValueData();
      const result = response.data.result[0];
      expect(result).toBeDefined();

      expect(result?.values?.length).toBeGreaterThan(0);
      result?.values?.forEach(([, value]) => {
        const numValue = parseFloat(value);
        expect(numValue).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('generateZeroValueData', () => {
    it('should generate all zero values', () => {
      const response = generateZeroValueData(10);
      const result = response.data.result[0];
      expect(result).toBeDefined();

      result?.values?.forEach(([, value]) => {
        expect(parseFloat(value)).toBe(0);
      });
    });
  });

  describe('generateNegativeValueData', () => {
    it('should generate negative values', () => {
      const response = generateNegativeValueData(10);
      const result = response.data.result[0];
      expect(result).toBeDefined();

      result?.values?.forEach(([, value]) => {
        expect(parseFloat(value)).toBeLessThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('should generate large datasets efficiently', () => {
      const startTime = performance.now();
      generateMockPrometheusResponse({
        metricName: 'test_metric',
        dataPoints: 1000,
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should generate multiple series efficiently', () => {
      const startTime = performance.now();
      generateMultiSeriesData(
        Array.from({ length: 10 }, (_, i) => `pod-${i}`),
        'test_metric',
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200); // Should complete in <200ms
    });
  });
});
