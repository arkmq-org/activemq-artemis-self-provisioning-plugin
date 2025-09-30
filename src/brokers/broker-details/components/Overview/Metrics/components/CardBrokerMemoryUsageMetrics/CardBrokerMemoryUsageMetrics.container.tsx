import { FC, useState, useEffect, useMemo, useCallback } from 'react';
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

export type CardBrokerMemoryUsageMetricsContainerProps = {
  name: string;
  namespace: string;
  defaultSamples?: number;
  timespan?: number;
  fixedEndTime?: number;
  size: number;
  pollTime?: string;
  span?: string;
};

type AxisDomain = [number, number];

export const CardBrokerMemoryUsageMetricsContainer: FC<
  CardBrokerMemoryUsageMetricsContainerProps
> = ({
  name,
  namespace,
  defaultSamples = 300,
  timespan: span,
  size,
  pollTime,
}) => {
  const { t } = useTranslation();

  //states
  const [xDomain] = useState<AxisDomain>();
  // State to store the results from each MetricsPolling component.
  // The key is the index of the poller.
  const [results, setResults] = useState<{
    [key: number]: { result: PrometheusResponse; loaded: boolean };
  }>({});

  // Generate the Prometheus queries for each pod replica.
  const queries = useMemo(
    () => [...Array(size)].map((_, i) => memoryUsageQuery(name, namespace, i)),
    [size, name, namespace],
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

  // If we have both `timespan` and `defaultTimespan`, `timespan` takes precedence
  // Limit the number of samples so that the step size doesn't fall below minStep
  const maxSamplesForSpan = defaultSamples || getMaxSamplesForSpan(span);
  const [samples, setSamples] = useState(maxSamplesForSpan);
  //const [metricsResult, setMetricsResult] = useState<PrometheusResponse[]>();
  //const [loaded, setLoaded] = useState<boolean>(false);

  // Define this once for all queries so that they have exactly the same time range and X values
  const endTime = xDomain?.[1];

  // If provided, `timespan` overrides any existing span setting
  useEffect(() => {
    if (span) {
      //setSpan(timespan);
      setSamples(defaultSamples || getMaxSamplesForSpan(span));
    }
  }, [defaultSamples, span]);

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
          namespace={namespace}
          span={span}
          samples={samples}
          endTime={endTime}
          delay={parsePrometheusDuration(pollTime)}
          onResult={handleMetricResult}
        />
      ))}
      <CardQueryBrowser
        isInitialLoading={false}
        backendUnavailable={false}
        allMetricsSeries={metricsResult}
        span={span}
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
