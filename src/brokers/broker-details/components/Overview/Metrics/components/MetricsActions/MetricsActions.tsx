import { Dispatch, FC } from 'react';
import { Card, CardHeader } from '@patternfly/react-core';
import { useTranslation } from '@app/i18n/i18n';
import {
  MetricsType,
  MetricsState,
  MetricsAction,
  PollTime,
  Span,
  pollTimeOptions,
  spanOptions,
  metricsOptions,
  metricsOption,
} from '../../utils/types';
import {
  DropdownWithToggle,
  IDropdownOption,
} from '../DropDownWithToggle/DropdownWithToggle';

export type MetricsActionProps = {
  state: MetricsState;
  dispatch: Dispatch<MetricsAction>;
};
export const MetricsActions: FC<MetricsActionProps> = ({ state, dispatch }) => {
  const { t } = useTranslation();

  const { pollTime, span, metricsType } = state;

  const spanDropdownItems: IDropdownOption<Span>[] = spanOptions.map(
    (span) => ({
      key: span,
      value: span,
      label: t(`${span}_last`),
      isDisabled: false,
    }),
  );

  const pollingDropdownItems: IDropdownOption<PollTime>[] = pollTimeOptions.map(
    (time) => ({
      key: time,
      value: time,
      label: t(time),
      isDisabled: false,
    }),
  );

  const chartsDropdownItems: IDropdownOption<metricsOption>[] =
    metricsOptions.map((metric) => ({
      key: metric,
      value: metric,
      label:
        metric === MetricsType.AllMetrics
          ? t('All Metrics')
          : metric === MetricsType.MemoryUsage
          ? t('Memory Usage Metrics')
          : metric === MetricsType.CPUUsage
          ? t('CPU Usage Metrics')
          : t('Broker Metrics'),
      isDisabled: false,
    }));

  return (
    <Card isFullHeight>
      <CardHeader
        actions={{
          actions: (
            <>
              <DropdownWithToggle
                id="metrics-list-dropdown"
                toggleId="metrics-list-dropdowntoggle"
                items={chartsDropdownItems}
                value={metricsType}
                onSelectOption={(value) =>
                  dispatch({
                    type: 'SET_METRICS_TYPE',
                    payload: value,
                  })
                }
                isLabelAndValueNotSame={true}
              />
              <DropdownWithToggle
                id="span-dropdown"
                toggleId="span-dropdowntoggle"
                items={spanDropdownItems}
                value={span}
                onSelectOption={(value) =>
                  dispatch({ type: 'SET_SPAN', payload: value })
                }
                isLabelAndValueNotSame={true}
              />
              <DropdownWithToggle
                id="polling-dropdown"
                toggleId="polling-dropdowntoggle"
                items={pollingDropdownItems}
                value={pollTime}
                onSelectOption={(value) =>
                  dispatch({
                    type: 'SET_POLL_TIME',
                    payload: value,
                  })
                }
                isLabelAndValueNotSame={true}
              />
            </>
          ),
          hasNoOffset: false,
          className: undefined,
        }}
      ></CardHeader>
    </Card>
  );
};
