import { render } from '@testing-library/react';
import { MetricsPolling } from './MetricsPolling';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  usePrometheusPoll: jest.fn(),
  PrometheusEndpoint: {
    QUERY_RANGE: 'QUERY_RANGE',
  },
}));

const usePrometheusPollMock = usePrometheusPoll as jest.Mock;

describe('MetricsPolling', () => {
  it('should call onResult with the fetched data', () => {
    const mockResult = { data: 'test-data' };
    const mockLoaded = true;
    usePrometheusPollMock.mockReturnValue([mockResult, mockLoaded]);

    const onResultMock = jest.fn();

    render(
      <MetricsPolling
        query="test-query"
        namespace="test-namespace"
        index={0}
        onResult={onResultMock}
      />,
    );

    expect(usePrometheusPollMock).toHaveBeenCalledWith({
      endpoint: 'QUERY_RANGE',
      query: 'test-query',
      namespace: 'test-namespace',
      endTime: undefined,
      timeout: '60s',
      timespan: undefined,
      samples: undefined,
      delay: undefined,
    });

    expect(onResultMock).toHaveBeenCalledWith(0, mockResult, mockLoaded);
  });
});
