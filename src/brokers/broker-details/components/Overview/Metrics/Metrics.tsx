import { FC, useReducer } from 'react';
import { CardBrokerMemoryUsageMetricsContainer } from './components/CardBrokerMemoryUsageMetrics/CardBrokerMemoryUsageMetrics.container';
import { MetricsActions } from './components/MetricsActions/MetricsActions';
import { CardBrokerCPUUsageMetricsContainer } from './components/CardBrokerCPUUsageMetrics/CardBrokerCPUUsageMetrics.container';
import { MetricsType, MetricsState, MetricsAction } from './utils/types';
import { MetricsLayout } from './components/MetricsLayout/MetricsLayout';

export const Metrics: FC<{ name: string; namespace: string; size: number }> = ({
  name,
  namespace,
  size,
}) => {
  const metricsReducer = (
    state: MetricsState,
    action: MetricsAction,
  ): MetricsState => {
    switch (action.type) {
      case 'SET_POLL_TIME':
        return { ...state, pollTime: action.payload };
      case 'SET_SPAN':
        return { ...state, span: action.payload };
      case 'SET_METRICS_TYPE':
        return { ...state, metricsType: action.payload };
      default:
        return state;
    }
  };

  const initialState: MetricsState = {
    name: name,
    namespace: namespace,
    size: size,
    pollTime: '0',
    span: '30m',
    metricsType: MetricsType.AllMetrics,
  };

  const [state, dispatch] = useReducer(metricsReducer, initialState);

  return (
    <MetricsLayout
      metricsType={state.metricsType}
      metricsMemoryUsage={
        <CardBrokerMemoryUsageMetricsContainer state={state} />
      }
      metricsCPUUsage={<CardBrokerCPUUsageMetricsContainer state={state} />}
      metricsActions={<MetricsActions state={state} dispatch={dispatch} />}
    />
  );
};
