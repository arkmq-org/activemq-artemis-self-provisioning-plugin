import { FC, useReducer } from 'react';
import {
  CardBrokerMemoryUsageMetricsContainer,
  CardBrokerMemoryUsageMetricsContainerProps,
} from './components/CardBrokerMemoryUsageMetrics/CardBrokerMemoryUsageMetrics.container';
import { MetricsActions } from './components/MetricsActions/MetricsActions';
import { CardBrokerCPUUsageMetricsContainer } from './components/CardBrokerCPUUsageMetrics/CardBrokerCPUUsageMetrics.container';
import { parsePrometheusDuration } from '../Metrics/utils/prometheus';
import { MetricsType } from './utils/types';
import { MetricsLayout } from './components/MetricsLayout/MetricsLayout';

export type MetricsProps = CardBrokerMemoryUsageMetricsContainerProps;

export const Metrics: FC<MetricsProps> = ({ name, namespace, size }) => {
  type MetricsState = {
    pollTime: string;
    span: string;
    metricsType: MetricsType;
  };

  type MetricsAction =
    | { type: 'SET_POLL_TIME'; payload: string }
    | { type: 'SET_SPAN'; payload: string }
    | { type: 'SET_METRICS_TYPE'; payload: MetricsType };

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
    pollTime: '0',
    span: '30m',
    metricsType: MetricsType.AllMetrics,
  };

  const [state, dispatch] = useReducer(metricsReducer, initialState);

  return (
    <MetricsLayout
      metricsType={state.metricsType}
      metricsMemoryUsage={
        <CardBrokerMemoryUsageMetricsContainer
          name={name}
          namespace={namespace}
          size={size}
          pollTime={state.pollTime}
          timespan={parsePrometheusDuration(state.span)}
        />
      }
      metricsCPUUsage={
        <CardBrokerCPUUsageMetricsContainer
          name={name}
          namespace={namespace}
          size={size}
          pollTime={state.pollTime}
          timespan={parsePrometheusDuration(state.span)}
        />
      }
      metricsActions={
        <MetricsActions
          pollingTime={state.pollTime}
          span={state.span}
          metricsType={state.metricsType}
          onSelectOptionPolling={(value) =>
            dispatch({ type: 'SET_POLL_TIME', payload: value })
          }
          onSelectOptionSpan={(value) =>
            dispatch({ type: 'SET_SPAN', payload: value })
          }
          onSelectOptionChart={(value) =>
            dispatch({ type: 'SET_METRICS_TYPE', payload: value })
          }
        />
      }
    />
  );
};
