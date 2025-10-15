import { PrometheusLabels } from '@openshift-console/dynamic-plugin-sdk';

export type HumanizeResult = {
  string: string;
  value: number;
  unit: string;
};

export type Humanize = {
  (
    v: React.ReactText,
    initialUnit?: string,
    preferredUnit?: string,
  ): HumanizeResult;
};

export enum ByteDataTypes {
  BinaryBytes = 'binaryBytes',
  BinaryBytesWithoutB = 'binaryBytesWithoutB',
  DecimalBytes = 'decimalBytes',
  DecimalBytesWithoutB = 'decimalBytesWithoutB',
}

export type TimeSeriesMetrics = { [timestamp: string]: number };
export type GraphDataPoint = {
  x: Date;
  y: number;
};
export type FormatSeriesTitle = (
  labels: PrometheusLabels,
  i?: number,
) => string;
export type GraphSeries = GraphDataPoint[];
export type AxisDomain = [number, number];
export type Series = [PrometheusLabels, GraphDataPoint[]] | [];

export type QueryInput = {
  name: string;
  namespace: string;
  span: number;
  samples: number;
  endTime?: number;
  timeout?: string;
  delay?: number;
};

export enum MetricsType {
  AllMetrics = 'all',
  MemoryUsage = 'memory',
  CPUUsage = 'cpu',
}

export const metricsOptions = [
  MetricsType.AllMetrics,
  MetricsType.MemoryUsage,
  MetricsType.CPUUsage,
] as const;

export const pollTimeOptions = [
  '0',
  '15s',
  '30s',
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '6h',
  '1d',
  '2d',
  '1w',
  '2w',
] as const;
export const spanOptions = [
  '5m',
  '15m',
  '30m',
  '1h',
  '6h',
  '12h',
  '1d',
  '2d',
  '1w',
  '2w',
] as const;

export type PollTime = (typeof pollTimeOptions)[number];
export type Span = (typeof spanOptions)[number];
export type metricsOption = (typeof metricsOptions)[number];

export type MetricsState = {
  name: string;
  namespace: string;
  size: number;
  pollTime: PollTime;
  span: Span;
  metricsType: MetricsType;
};

export type MetricsAction =
  | { type: 'SET_POLL_TIME'; payload: PollTime }
  | { type: 'SET_SPAN'; payload: Span }
  | { type: 'SET_METRICS_TYPE'; payload: MetricsType };
