import { FC, useState, useMemo, useCallback } from 'react';
import { parsePrometheusDuration } from '../../../../Overview/Metrics/utils/prometheus';
import { getMaxSamplesForSpan, valueFormatter } from '../../utils/format';
import { cpuUsageQuery } from '../../utils/queries';
import { MetricsPolling } from '../MetricsPolling/MetricsPolling';
import { useTranslation } from '@app/i18n/i18n';
import { CardQueryBrowser } from '../CardQueryBrowser/CardQueryBrowser';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { MetricsState } from '../../utils/types';
import { MetricsErrorBoundary } from '../../MetricsErrorBoundary';

type CardBrokerCPUUsageMetricsContainerProps = {
  state: MetricsState;
};

type AxisDomain = [number, number];

export const CardBrokerCPUUsageMetricsContainer: FC<
  CardBrokerCPUUsageMetricsContainerProps
> = ({ state }) => {
  const { t } = useTranslation();

  const [xDomain] = useState<AxisDomain>();
  // State to store the results from each MetricsPolling component.
  // The key is the index of the poller.
  const [results, setResults] = useState<{
    [key: number]: {
      result: PrometheusResponse | null;
      loaded: boolean;
      loadError: unknown | null;
    };
  }>({});

  // Generate the Prometheus queries for each pod replica.
  const queries = useMemo(
    () =>
      [...Array(state.size)].map((_, i) =>
        cpuUsageQuery(state.name, state.namespace, i),
      ),
    [state.size, state.name, state.namespace],
  );

  // Callback to handle results from the MetricsPolling components.
  const handleMetricResult = useCallback(
    (
      index: number,
      result: PrometheusResponse | null,
      loaded: boolean,
      loadError: unknown | null,
    ) => {
      setResults((prev) => ({
        ...prev,
        [index]: { result, loaded, loadError },
      }));
    },
    [],
  );

  // Memoized aggregation of results from all pollers.
  const { result, loaded, errorObject } = useMemo(() => {
    const resultsArray = Object.values(results);

    const loaded =
      queries.length > 0 &&
      resultsArray.length === queries.length &&
      resultsArray.every((r) => r.loaded);

    const errorObject =
      resultsArray.find((r) => r.loadError)?.loadError || null;

    const result = resultsArray
      .map((r) => r.result)
      .filter((res): res is PrometheusResponse => !!res);

    return { result, loaded, errorObject };
  }, [results, queries]);

  const samples = getMaxSamplesForSpan(parsePrometheusDuration(state.span));

  // Define this once for all queries so that they have exactly the same time range and X values
  const endTime = xDomain?.[1];

  const yTickFormat = valueFormatter('');

  return (
    <>
      {queries.map((query, i) => (
        <MetricsPolling
          key={i}
          query={query}
          index={i}
          namespace={state.namespace}
          span={parsePrometheusDuration(state.span)}
          samples={samples}
          endTime={endTime}
          delay={parsePrometheusDuration(state.pollTime)}
          onResult={handleMetricResult}
        />
      ))}
      <MetricsErrorBoundary>
        <CardQueryBrowser
          isInitialLoading={false}
          backendUnavailable={false}
          allMetricsSeries={result}
          span={parsePrometheusDuration(state.span)}
          isLoading={!loaded}
          fixedXDomain={xDomain}
          samples={samples}
          formatSeriesTitle={(labels) => labels.pod}
          title={t('CPU Usage')}
          helperText={t('CPU Usage')}
          dataTestId={'metrics-broker-cpu-usage'}
          yTickFormat={yTickFormat}
          ariaTitle={t('CPU Usage')}
          error={errorObject}
        />
      </MetricsErrorBoundary>
    </>
  );
};
