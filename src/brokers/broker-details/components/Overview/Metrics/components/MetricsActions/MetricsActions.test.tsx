import { Dispatch } from 'react';
import { act, fireEvent, render, screen } from '@app/test-utils';
import { MetricsActions } from './MetricsActions';
import { MetricsState, MetricsAction, MetricsType } from '../../utils/types';

describe('MetricsActions', () => {
  const mockMetricsState: MetricsState = {
    name: 'ex-aao',
    namespace: 'test-namespace',
    size: 1,
    pollTime: '5m',
    span: '30m',
    metricsType: MetricsType.AllMetrics,
  };

  const mockDispatch: Dispatch<MetricsAction> = jest.fn();

  it('should render span dropdown items correctly', async () => {
    render(<MetricsActions state={mockMetricsState} dispatch={mockDispatch} />);
    expect(screen.getByText(/30m/i)).toBeInTheDocument();

    const last30MinutesItem = screen.getAllByText(/30m/i)[0];
    await act(async () => {
      fireEvent.click(last30MinutesItem);
    });
  });

  it('should render polling dropdown items correctly', async () => {
    render(<MetricsActions state={mockMetricsState} dispatch={mockDispatch} />);
    expect(screen.getByText(/5m/i)).toBeInTheDocument();

    const fiveMinutesItem = screen.getAllByText(/5m/i)[0];
    await act(async () => {
      fireEvent.click(fiveMinutesItem);
    });
  });
});
