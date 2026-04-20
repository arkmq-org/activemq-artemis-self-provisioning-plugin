import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';

export type MockMetricConfig = {
  metricName: string;
  labels?: Record<string, string>;
  valueRange?: [number, number];
  dataPoints?: number;
  timeSpanMs?: number;
  startTime?: number;
};

/**
 * Generate mock Prometheus response data for testing
 */
export const generateMockPrometheusResponse = (
  config: MockMetricConfig,
): PrometheusResponse => {
  const {
    metricName,
    labels = {},
    valueRange = [0, 100],
    dataPoints = 60,
    timeSpanMs = 1800000, // 30 minutes
    startTime = Date.now() - timeSpanMs,
  } = config;

  const values: [number, string][] = [];
  const interval = timeSpanMs / dataPoints;

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = (startTime + i * interval) / 1000; // Convert to seconds
    const value =
      Math.random() * (valueRange[1] - valueRange[0]) + valueRange[0];
    values.push([timestamp, value.toFixed(2)]);
  }

  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            __name__: metricName,
            ...labels,
          },
          values,
        },
      ],
    },
  } as unknown as PrometheusResponse;
};

/**
 * Generate mock CPU usage data
 */
export const generateMockCPUData = (
  podName = 'ex-aao-ss-0',
  dataPoints = 60,
): PrometheusResponse => {
  return generateMockPrometheusResponse({
    metricName: 'container_cpu_usage_seconds_total',
    labels: {
      pod: podName,
      container: 'ex-aao-container',
      namespace: 'test-namespace',
    },
    valueRange: [0, 4], // 0-4 cores
    dataPoints,
  });
};

/**
 * Generate mock memory usage data
 */
export const generateMockMemoryData = (
  podName = 'ex-aao-ss-0',
  dataPoints = 60,
): PrometheusResponse => {
  return generateMockPrometheusResponse({
    metricName: 'container_memory_working_set_bytes',
    labels: {
      pod: podName,
      container: 'ex-aao-container',
      namespace: 'test-namespace',
    },
    valueRange: [1073741824, 4294967296], // 1GB - 4GB
    dataPoints,
  });
};

/**
 * Generate empty Prometheus response (no data)
 */
export const generateEmptyPrometheusResponse = (): PrometheusResponse => {
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [],
    },
  } as unknown as PrometheusResponse;
};

/**
 * Generate error Prometheus response
 */
export const generateErrorPrometheusResponse = (
  errorMessage = 'Query timeout',
): PrometheusResponse => {
  return {
    status: 'error',
    errorType: 'timeout',
    error: errorMessage,
  } as unknown as PrometheusResponse;
};

/**
 * Generate multiple series data (for multiple pods)
 */
export const generateMultiSeriesData = (
  podNames: string[],
  metricName: string,
  valueRange: [number, number] = [0, 100],
): PrometheusResponse[] => {
  return podNames.map((podName) =>
    generateMockPrometheusResponse({
      metricName,
      labels: { pod: podName },
      valueRange,
    }),
  );
};

/**
 * Generate data with specific pattern (increasing, decreasing, flat, spike)
 */
export const generatePatternedData = (
  pattern: 'increasing' | 'decreasing' | 'flat' | 'spike',
  dataPoints = 60,
): PrometheusResponse => {
  const startTime = Date.now() - 1800000;
  const values: [number, string][] = [];
  const interval = 1800000 / dataPoints;

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = (startTime + i * interval) / 1000;
    let value: number;

    switch (pattern) {
      case 'increasing':
        value = (i / dataPoints) * 100;
        break;
      case 'decreasing':
        value = ((dataPoints - i) / dataPoints) * 100;
        break;
      case 'flat':
        value = 50;
        break;
      case 'spike':
        value = i === Math.floor(dataPoints / 2) ? 100 : 20;
        break;
    }

    values.push([timestamp, value.toFixed(2)]);
  }

  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { __name__: 'test_metric' },
          values,
        },
      ],
    },
  } as unknown as PrometheusResponse;
};

/**
 * Generate data with gaps (missing data points)
 */
export const generateDataWithGaps = (
  gapIndices: number[],
  totalPoints = 60,
): PrometheusResponse => {
  const startTime = Date.now() - 1800000;
  const values: [number, string][] = [];
  const interval = 1800000 / totalPoints;

  for (let i = 0; i < totalPoints; i++) {
    if (!gapIndices.includes(i)) {
      const timestamp = (startTime + i * interval) / 1000;
      const value = Math.random() * 100;
      values.push([timestamp, value.toFixed(2)]);
    }
  }

  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: { __name__: 'test_metric' },
          values,
        },
      ],
    },
  } as unknown as PrometheusResponse;
};

/**
 * Generate data with extreme values
 */
export const generateExtremeValueData = (): PrometheusResponse => {
  return generateMockPrometheusResponse({
    metricName: 'test_metric',
    valueRange: [0, Number.MAX_SAFE_INTEGER],
    dataPoints: 10,
  });
};

/**
 * Generate data with zero values
 */
export const generateZeroValueData = (dataPoints = 60): PrometheusResponse => {
  return generateMockPrometheusResponse({
    metricName: 'test_metric',
    valueRange: [0, 0],
    dataPoints,
  });
};

/**
 * Generate data with negative values
 */
export const generateNegativeValueData = (
  dataPoints = 60,
): PrometheusResponse => {
  return generateMockPrometheusResponse({
    metricName: 'test_metric',
    valueRange: [-100, -10],
    dataPoints,
  });
};
