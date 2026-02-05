import { FC, useCallback } from 'react';
import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLegend,
  ChartLine,
  ChartThemeColor,
  ChartVoronoiContainer,
  ChartVoronoiContainerProps,
} from '@patternfly/react-charts';
import {
  PrometheusLabels,
  PrometheusResponse,
  PrometheusResult,
} from '@openshift-console/dynamic-plugin-sdk';
import { ChartSkeletonLoader } from '../ChartSkeletonLoader/ChartSkeletonLoader';
import { EmptyStateNoMetricsData } from '../EmptyStateNoMetricsData/EmptyStateNoMetricsData';
import { chartHeight, chartPadding } from '@app/constants/constants';
import { useChartWidth } from '../../hooks/useChartWidth';
import { useTranslation } from '@app/i18n/i18n';
import { chartTheme } from '../../utils/chart-theme';
import {
  valueFormatter,
  formatSeriesValues,
  xAxisTickFormat,
} from '../../utils/format';
import {
  AxisDomain,
  FormatSeriesTitle,
  GraphSeries,
  GraphDataPoint,
  Series,
} from '../../utils/types';

const colors = chartTheme.line?.colorScale;

export type ChartCPUUsageProps = {
  allMetricsSeries: PrometheusResponse[];
  span: number;
  isLoading: boolean;
  defaultSamples?: number;
  fixedXDomain: AxisDomain;
  samples: number;
  formatSeriesTitle?: FormatSeriesTitle;
};

export const ChartCPUUsage: FC<ChartCPUUsageProps> = ({
  allMetricsSeries,
  span,
  isLoading,
  fixedXDomain,
  samples,
  formatSeriesTitle,
}) => {
  const { t } = useTranslation();
  const [containerRef, width] = useChartWidth();
  // const [xDomain, setXDomain] = useState(fixedXDomain || getXDomain(Date.now(), span));

  const data: GraphSeries[] = [];
  const tooltipSeriesNames: string[] = [];
  const tooltipSeriesLabels: PrometheusLabels[] = [];
  const legendData: { name: string }[] = [];
  const domain = { x: fixedXDomain, y: fixedXDomain };
  const xAxisTickCount = Math.round(width / 100);
  const yTickFormat = valueFormatter('');

  const xTickFormat = useCallback(
    (tick) => {
      const tickFormat = xAxisTickFormat(span);
      return tickFormat(tick);
    },
    [xAxisTickFormat, span],
  );

  const newResult = allMetricsSeries.map((series) => series.data.result);
  const hasMetrics = newResult.some((r) => (r && r.length) > 0);

  // Only update X-axis if the time range (fixedXDomain or span) or graph data (allSeries) change
  // useEffect(() => {
  //   setXDomain(fixedXDomain || getXDomain(Date.now(), span));
  // }, [allMetricsSeries, span, fixedXDomain]);

  const newGraphData = newResult.map((result: PrometheusResult[]) => {
    return result.map(({ metric, values = [] }): Series => {
      return [metric, formatSeriesValues(values, samples, span)];
    });
  });

  newGraphData.forEach((series, i) => {
    series.forEach(([metric, values = []]) => {
      data.push(values);
      if (formatSeriesTitle && metric) {
        const name = formatSeriesTitle(metric, i);
        legendData.push({ name });
        tooltipSeriesNames.push(name);
      } else if (metric) {
        tooltipSeriesLabels.push(metric);
      }
    });
  });

  // Set a reasonable Y-axis range based on the min and max values in the data
  const findMin = (series: GraphSeries): GraphDataPoint | undefined => {
    if (!series.length) return undefined;
    return series.reduce((min, point) => (point.y < min.y ? point : min));
  };
  const findMax = (series: GraphSeries): GraphDataPoint | undefined => {
    if (!series.length) return undefined;
    return series.reduce((max, point) => (point.y > max.y ? point : max));
  };

  const isGraphPoint = (
    point: GraphDataPoint | undefined,
  ): point is GraphDataPoint => point !== undefined;

  const minPoints = data.map(findMin).filter(isGraphPoint);
  const maxPoints = data.map(findMax).filter(isGraphPoint);

  let minY: number = findMin(minPoints)?.y ?? 0;
  let maxY: number = findMax(maxPoints)?.y ?? 0;
  if (minY === 0 && maxY === 0) {
    minY = 0;
    maxY = 1;
  } else if (minY > 0 && maxY > 0) {
    minY = 0;
  } else if (minY < 0 && maxY < 0) {
    maxY = 0;
  }

  domain.y = [minY, maxY];

  return (
    <div ref={containerRef} style={{ height: '500px' }}>
      {(() => {
        switch (true) {
          case isLoading:
            return <ChartSkeletonLoader />;
          case !hasMetrics:
            return <EmptyStateNoMetricsData />;
          default: {
            const labels: ChartVoronoiContainerProps['labels'] = ({
              datum,
            }) => {
              const time = xTickFormat(datum.x);

              return `${datum?.style?.labels?.name}: ${yTickFormat(
                datum.y,
              )} at ${time}`;
            };

            return (
              <Chart
                ariaTitle={t('Memory Usage')}
                // containerComponent={graphContainer}
                containerComponent={
                  <ChartVoronoiContainer
                    labels={labels}
                    constrainToVisibleArea
                  />
                }
                legendComponent={<ChartLegend data={legendData} />}
                legendAllowWrap={true}
                legendPosition="bottom-left"
                scale={{ x: 'time', y: 'linear' }}
                domain={domain}
                height={chartHeight}
                padding={chartPadding}
                domainPadding={{ y: 20 }}
                width={width}
                themeColor={ChartThemeColor.multiUnordered}
              >
                <ChartAxis
                  label={'\n' + t('Time')}
                  tickCount={xAxisTickCount}
                  tickFormat={xTickFormat}
                />
                <ChartAxis
                  crossAxis={false}
                  tickCount={6}
                  dependentAxis
                  tickFormat={yTickFormat}
                />
                <ChartGroup>
                  {data.map((values, index) => {
                    if (values === null) {
                      return null;
                    }

                    const color =
                      colors && colors.length > 0
                        ? colors[index % colors.length]
                        : undefined;

                    const style = {
                      data: { stroke: color },
                      labels: {
                        fill: color,
                        labels: tooltipSeriesLabels[index],
                        name: tooltipSeriesNames[index],
                      },
                    };

                    return (
                      <ChartLine
                        key={`chart-line-${index}`}
                        data={values}
                        groupComponent={<g />}
                        name={`series-${index}`}
                        style={style}
                      />
                    );
                  })}
                </ChartGroup>
              </Chart>
            );
          }
        }
      })()}
    </div>
  );
};
