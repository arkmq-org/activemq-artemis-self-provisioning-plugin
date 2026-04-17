import { render, screen, waitForI18n } from '@app/test-utils';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { ChartMemoryUsage, ChartMemoryUsageProps } from './ChartMemoryUsage';
import memoryUsageData from '../../dummy-data/memory-usage.json';

// Mock the useChartWidth hook
jest.mock('../../hooks/useChartWidth', () => ({
  useChartWidth: () => [jest.fn(), 800],
}));

const mockPrometheusResponse = [
  memoryUsageData as unknown as PrometheusResponse,
];

const defaultProps: ChartMemoryUsageProps = {
  allMetricsSeries: mockPrometheusResponse,
  span: 1800000, // 30 minutes
  isLoading: false,
  fixedXDomain: [Date.now() - 1800000, Date.now()],
  samples: 60,
};

describe('ChartMemoryUsage', () => {
  it('should render loading state when isLoading is true', async () => {
    const comp = render(
      <ChartMemoryUsage {...defaultProps} isLoading={true} />,
    );
    await waitForI18n(comp);

    expect(screen.getByText('Metrics data is loading')).toBeInTheDocument();
  });

  it('should render empty state when no metrics data', async () => {
    const emptyData = [
      { status: 'success', data: { result: [] } },
    ] as unknown as PrometheusResponse[];
    const comp = render(
      <ChartMemoryUsage {...defaultProps} allMetricsSeries={emptyData} />,
    );
    await waitForI18n(comp);

    expect(screen.getByText('Data unavailable')).toBeInTheDocument();
  });

  it('should render chart with data', async () => {
    const comp = render(<ChartMemoryUsage {...defaultProps} />);
    await waitForI18n(comp);

    // Chart should be rendered (not loading or empty state)
    expect(
      screen.queryByText('Metrics data is loading'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
  });

  it('should handle custom formatSeriesTitle', async () => {
    const formatSeriesTitle = jest.fn((_metric, index) => `Series ${index}`);
    const comp = render(
      <ChartMemoryUsage
        {...defaultProps}
        formatSeriesTitle={formatSeriesTitle}
      />,
    );
    await waitForI18n(comp);

    expect(formatSeriesTitle).toHaveBeenCalled();
  });

  it('should handle multiple series', async () => {
    const multiSeriesData = [
      memoryUsageData,
      {
        ...memoryUsageData,
        data: {
          ...memoryUsageData.data,
          result: [
            {
              ...memoryUsageData.data.result[0],
              metric: {
                ...memoryUsageData.data.result[0].metric,
                pod: 'ex-aao-ss-1',
              },
            },
          ],
        },
      },
    ] as unknown as PrometheusResponse[];

    const comp = render(
      <ChartMemoryUsage {...defaultProps} allMetricsSeries={multiSeriesData} />,
    );
    await waitForI18n(comp);

    expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
  });

  it('should handle zero memory values', async () => {
    const zeroData = [
      {
        status: 'success',
        data: {
          result: [
            {
              metric: { pod: 'test-pod' },
              values: [
                [Date.now() / 1000, '0'],
                [Date.now() / 1000 + 60, '0'],
              ],
            },
          ],
        },
      },
    ] as unknown as PrometheusResponse[];

    const comp = render(
      <ChartMemoryUsage {...defaultProps} allMetricsSeries={zeroData} />,
    );
    await waitForI18n(comp);

    expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
  });

  it('should handle different span values', async () => {
    const spans = [300000, 1800000, 3600000]; // 5min, 30min, 1hr

    for (const span of spans) {
      const comp = render(<ChartMemoryUsage {...defaultProps} span={span} />);
      await waitForI18n(comp);
      expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
      comp.unmount();
    }
  });

  it('should handle large memory values', async () => {
    const largeData = [
      {
        status: 'success',
        data: {
          result: [
            {
              metric: { pod: 'test-pod' },
              values: [
                [Date.now() / 1000, '10737418240'], // 10 GB
                [Date.now() / 1000 + 60, '21474836480'], // 20 GB
              ],
            },
          ],
        },
      },
    ] as unknown as PrometheusResponse[];

    const comp = render(
      <ChartMemoryUsage {...defaultProps} allMetricsSeries={largeData} />,
    );
    await waitForI18n(comp);

    expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
  });
});
