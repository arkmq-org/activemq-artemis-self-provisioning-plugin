import { render, screen, waitForI18n } from '@app/test-utils';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { ChartCPUUsage, ChartCPUUsageProps } from './ChartCPUUsage';
import cpuUsageData from '../../dummy-data/cpu-usage.json';

// Mock the useChartWidth hook
jest.mock('../../hooks/useChartWidth', () => ({
  useChartWidth: () => [jest.fn(), 800],
}));

const mockPrometheusResponse = [cpuUsageData as unknown as PrometheusResponse];

const defaultProps: ChartCPUUsageProps = {
  allMetricsSeries: mockPrometheusResponse,
  span: 1800000, // 30 minutes
  isLoading: false,
  fixedXDomain: [Date.now() - 1800000, Date.now()],
  samples: 60,
};

describe('ChartCPUUsage', () => {
  it('should render loading state when isLoading is true', async () => {
    const comp = render(<ChartCPUUsage {...defaultProps} isLoading={true} />);
    await waitForI18n(comp);

    expect(screen.getByText('Metrics data is loading')).toBeInTheDocument();
  });

  it('should render empty state when no metrics data', async () => {
    const emptyData = [
      { status: 'success', data: { result: [] } },
    ] as unknown as PrometheusResponse[];
    const comp = render(
      <ChartCPUUsage {...defaultProps} allMetricsSeries={emptyData} />,
    );
    await waitForI18n(comp);

    expect(screen.getByText('Data unavailable')).toBeInTheDocument();
  });

  it('should render chart with data', async () => {
    const comp = render(<ChartCPUUsage {...defaultProps} />);
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
      <ChartCPUUsage {...defaultProps} formatSeriesTitle={formatSeriesTitle} />,
    );
    await waitForI18n(comp);

    expect(formatSeriesTitle).toHaveBeenCalled();
  });

  it('should handle multiple series', async () => {
    const multiSeriesData = [
      cpuUsageData,
      {
        ...cpuUsageData,
        data: {
          ...cpuUsageData.data,
          result: [
            {
              ...cpuUsageData.data.result[0],
              metric: {
                ...cpuUsageData.data.result[0].metric,
                pod: 'ex-aao-ss-1',
              },
            },
          ],
        },
      },
    ] as unknown as PrometheusResponse[];

    const comp = render(
      <ChartCPUUsage {...defaultProps} allMetricsSeries={multiSeriesData} />,
    );
    await waitForI18n(comp);

    expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
  });

  it('should handle zero values correctly', async () => {
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
      <ChartCPUUsage {...defaultProps} allMetricsSeries={zeroData} />,
    );
    await waitForI18n(comp);

    expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
  });

  it.each([300000, 1800000, 3600000])(
    'should render with span %i ms',
    async (span) => {
      const comp = render(<ChartCPUUsage {...defaultProps} span={span} />);
      await waitForI18n(comp);
      expect(screen.queryByText('Data unavailable')).not.toBeInTheDocument();
    },
  );
});
