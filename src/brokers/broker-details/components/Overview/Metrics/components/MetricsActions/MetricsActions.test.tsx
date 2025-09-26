import { fireEvent, render, screen, act, waitForPopper } from '@app/test-utils';
import { MetricsActions } from './MetricsActions';

describe('MetricsActions', () => {
  const pollingTime = '5m';
  const span = '30m';
  const onSelectOptionPolling = jest.fn();
  const onSelectOptionSpan = jest.fn();
  const onSelectOptionChart = jest.fn();

  it('should render span dropdown items correctly', async () => {
    render(
      <MetricsActions
        pollingTime={pollingTime}
        span={span}
        metricsType="MemoryUsage"
        onSelectOptionPolling={onSelectOptionPolling}
        onSelectOptionSpan={onSelectOptionSpan}
        onSelectOptionChart={onSelectOptionChart}
      />,
    );
    expect(screen.getByText(/Last 30 minutes/i)).toBeInTheDocument();

    const last30MinutesItem = screen.getAllByText(/Last 30 minutes/i)[0];
    let spanDropdownItemsClickable;
    await act(async () => {
      spanDropdownItemsClickable = fireEvent.click(last30MinutesItem);
    });
    await waitForPopper();
    expect(spanDropdownItemsClickable).toBe(true);
  });

  it('should render polling dropdown items correctly', async () => {
    render(
      <MetricsActions
        pollingTime={pollingTime}
        span={span}
        metricsType="MemoryUsage"
        onSelectOptionPolling={onSelectOptionPolling}
        onSelectOptionSpan={onSelectOptionSpan}
        onSelectOptionChart={onSelectOptionChart}
      />,
    );
    expect(screen.getByText(/5 minutes/i)).toBeInTheDocument();

    const fiveMinutesItem = screen.getAllByText(/5 minutes/i)[0];
    let pollingDropdownItemsClickable;
    await act(async () => {
      pollingDropdownItemsClickable = fireEvent.click(fiveMinutesItem);
    });
    await waitForPopper();
    expect(pollingDropdownItemsClickable).toBe(true);
  });
});
