import { FC, useState, useMemo, useCallback } from 'react';
import { parsePrometheusDuration } from '../../../Metrics/utils/prometheus';
import { getMaxSamplesForSpan } from '../../utils/format';
import { humanizeBinaryBytes } from '../../utils/units';
import { ByteDataTypes, GraphSeries } from '../../utils/types';
import { processFrame } from '../../utils/data-utils';
import { memoryUsageQuery } from '../../utils/queries';
import { MetricsPolling } from '../MetricsPolling/MetricsPolling';
import { useTranslation } from '@app/i18n/i18n';
import { CardQueryBrowser } from '../CardQueryBrowser/CardQueryBrowser';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { MetricsState } from '../../utils/types';

type CardBrokerMemoryUsageMetricsContainerProps = {
  state: MetricsState;
};

type AxisDomain = [number, number];

export const CardBrokerMemoryUsageMetricsContainer: FC<
  CardBrokerMemoryUsageMetricsContainerProps
> = ({ state }) => {
  const { t } = useTranslation();

  const [xDomain] = useState<AxisDomain>();
  // State to store the results from each MetricsPolling component.
  // The key is the index of the poller.
  const [results, setResults] = useState<{
    [key: number]: { result: PrometheusResponse; loaded: boolean };
  }>({});

  // Generate the Prometheus queries for each pod replica.
  const queries = useMemo(
    () =>
      [...Array(state.size)].map((_, i) =>
        memoryUsageQuery(state.name, state.namespace, i),
      ),
    [state.size, state.name, state.namespace],
  );

  // Callback to handle results from the MetricsPolling components.
  const handleMetricResult = useCallback(
    (index: number, result: PrometheusResponse, loaded: boolean) => {
      setResults((prev) => ({
        ...prev,
        [index]: { result, loaded },
      }));
    },
    [],
  );

  // Memoized aggregation of results from all pollers.
  const { metricsResult, loaded } = useMemo(() => {
    const resultsArray = Object.values(results);
    const loaded =
      queries.length > 0 && resultsArray.length === queries.length
        ? resultsArray.every((r) => r.loaded)
        : false;
    const metricsResult = resultsArray
      .map((r) => r.result)
      .filter((res): res is PrometheusResponse => !!res);
    return { metricsResult, loaded };
  }, [results, queries]);

  const samples = getMaxSamplesForSpan(parsePrometheusDuration(state.span));

  // Define this once for all queries so that they have exactly the same time range and X values
  const endTime = xDomain?.[1];

  const { processedData, unit } = useMemo(() => {
    const data: GraphSeries[] = [];
    const nonEmptyDataSets = data.filter((dataSet) => dataSet?.length);
    return processFrame(nonEmptyDataSets, ByteDataTypes.BinaryBytes);
  }, []);

  const yTickFormat = useCallback(
    (tick) => `${humanizeBinaryBytes(tick, unit, unit).string}`,
    [unit],
  );

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
      <CardQueryBrowser
        isInitialLoading={false}
        backendUnavailable={false}
        allMetricsSeries={metricsResult}
        span={parsePrometheusDuration(state.span)}
        isLoading={!loaded}
        fixedXDomain={xDomain}
        samples={samples}
        formatSeriesTitle={(labels) => labels.pod}
        title={t('Memory Usage')}
        helperText={t('Memory usage')}
        dataTestId={'metrics-broker-memory-usage'}
        yTickFormat={yTickFormat}
        processedData={processedData}
        label={'\n\n\n\n' + t('Bytes')}
        ariaTitle={t('Memory Usage')}
      />
    </>
  );
};
