import { render, screen, waitFor } from '@testing-library/react';
import { CardBrokerCPUUsageMetricsContainer } from './CardBrokerCPUUsageMetrics.container';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk';
import '@testing-library/jest-dom';

jest.mock('../CardQueryBrowser/CardQueryBrowser', () => ({
  CardQueryBrowser: ({
    allMetricsSeries,
    isLoading,
  }: {
    allMetricsSeries: unknown[];
    isLoading: boolean;
  }) => (
    <div data-testid="card-query-browser">
      <span data-testid="metrics-count">{allMetricsSeries.length}</span>
      <span data-testid="loading-status">{isLoading.toString()}</span>
    </div>
  ),
}));

const usePrometheusPollMock = usePrometheusPoll as jest.Mock;

describe('CardBrokerCPUUsageMetricsContainer', () => {
  beforeEach(() => {
    usePrometheusPollMock.mockClear();
  });

  it('should render the CardQueryBrowser with aggregated metrics', async () => {
    const mockResult1 = { data: 'test-data-1' };
    const mockResult2 = { data: 'test-data-2' };
    usePrometheusPollMock
      .mockReturnValueOnce([mockResult1, true, undefined])
      .mockReturnValueOnce([mockResult2, true, undefined]);

    render(
      <CardBrokerCPUUsageMetricsContainer
        name="my-broker"
        namespace="my-namespace"
        size={2}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('false');
      expect(screen.getByTestId('metrics-count').textContent).toBe('2');
    });
  });
});
