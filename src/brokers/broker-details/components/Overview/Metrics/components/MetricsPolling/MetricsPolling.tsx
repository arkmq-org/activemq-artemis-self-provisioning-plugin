import { useEffect } from 'react';
import {
  PrometheusResponse,
  usePrometheusPoll,
  PrometheusEndpoint,
} from '@openshift-console/dynamic-plugin-sdk';

type MetricsPollingProps = {
  /** The Prometheus query string. */
  query: string;
  /** The namespace for the query. */
  namespace: string;
  /** The index of this polling component, used to identify results. */
  index: number;
  /** The time span for the query. */
  span?: number;
  /** The number of samples to fetch. */
  samples?: number;
  /** The end time for the query range. */
  endTime?: number;
  /** The timeout for the query. */
  timeout?: string;
  /** The polling delay. */
  delay?: number;
  /** Callback function to handle results. */
  onResult: (
    index: number,
    result: PrometheusResponse,
    loaded: boolean,
  ) => void;
};

/**
 * A component that polls Prometheus for a given query and returns the result.
 * This component renders nothing to the DOM. It is used to encapsulate the
 * `usePrometheusPoll` hook and allow it to be used in a loop without violating
 * React's rules of hooks.
 */
export const MetricsPolling: React.FC<MetricsPollingProps> = ({
  query,
  namespace,
  index,
  span,
  samples,
  endTime,
  timeout,
  delay,
  onResult,
}) => {
  const [result, loaded] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY_RANGE,
    query,
    namespace,
    endTime,
    timeout: timeout || '60s',
    timespan: span,
    samples,
    delay,
  });

  useEffect(() => {
    onResult(index, result, loaded);
  }, [index, result, loaded, onResult]);

  return null;
};
