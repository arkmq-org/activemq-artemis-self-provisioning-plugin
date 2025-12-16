import { FC, useState, useMemo, useCallback } from 'react';
import { parsePrometheusDuration } from '../../../../Overview/Metrics/utils/prometheus';
import { getMaxSamplesForSpan, formatNumber } from '../../utils/format';
import { pendingMessagesQuery } from '../../utils/queries';
import { MetricsPolling } from '../MetricsPolling/MetricsPolling';
import { useTranslation } from '@app/i18n/i18n';
import { CardQueryBrowser } from '../CardQueryBrowser/CardQueryBrowser';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { MetricsState } from '../../utils/types';
import { MetricsErrorBoundary } from '../../MetricsErrorBoundary';

type CardBrokerPendingMessagesMetricsContainerProps = {
  state: MetricsState;
};

type AxisDomain = [number, number];

const getDefaultXDomain = (span: number): AxisDomain => {
  const endTime = Date.now();
  return [endTime - span, endTime];
};

export const CardBrokerPendingMessagesMetricsContainer: FC<
  CardBrokerPendingMessagesMetricsContainerProps
> = ({ state }) => {
  const { t } = useTranslation();
  const span = parsePrometheusDuration(state.span);

  const [xDomain] = useState<AxisDomain>(() => getDefaultXDomain(span));
  const [results, setResults] = useState<{
    [key: number]: {
      result: PrometheusResponse | null;
      loaded: boolean;
      loadError: unknown | null;
    };
  }>({});

  const queries = useMemo(
    () =>
      [...Array(state.size)].map((_, i) =>
        pendingMessagesQuery(state.name, state.namespace, i),
      ),
    [state.size, state.name, state.namespace],
  );

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

  const { metricsResult, loaded, errorObject } = useMemo(() => {
    const resultsArray = Object.values(results);

    const loaded =
      queries.length > 0 &&
      resultsArray.length === queries.length &&
      resultsArray.every((r) => r.loaded);

    const errorObject =
      resultsArray.find((r) => r.loadError)?.loadError || null;

    const metricsResult = resultsArray
      .map((r) => r.result)
      .filter((res): res is PrometheusResponse => !!res);

    return { metricsResult, loaded, errorObject };
  }, [results, queries]);

  const samples = getMaxSamplesForSpan(parsePrometheusDuration(state.span));
  const endTime = xDomain?.[1];

  const yTickFormat = useCallback(
    (tick: number) => formatNumber(String(tick)),
    [],
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
      <MetricsErrorBoundary>
        <CardQueryBrowser
          isInitialLoading={false}
          backendUnavailable={false}
          allMetricsSeries={metricsResult}
          span={parsePrometheusDuration(state.span)}
          isLoading={!loaded}
          fixedXDomain={xDomain}
          samples={samples}
          formatSeriesTitle={(labels) => labels.pod}
          title={t('Pending Messages')}
          helperText={t('Pending Messages')}
          dataTestId={'metrics-broker-pending-messages'}
          yTickFormat={yTickFormat}
          label={'\n\n\n\n' + t('Messages')}
          ariaTitle={t('Pending Messages')}
          error={errorObject}
        />
      </MetricsErrorBoundary>
    </>
  );
};
