import { render, screen } from '@app/test-utils';
import { PodsTable } from './PodsTable';
import { BrokerCR } from '@app/k8s/types';
import { TableColumn } from '@openshift-console/dynamic-plugin-sdk';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  VirtualizedTable: jest.fn(({ Row, data, columns }) => (
    <div data-testid="virtualized-table">
      {data.map((item: BrokerCR, index: number) => (
        <Row
          key={index}
          obj={item}
          activeColumnIDs={columns.map((col: TableColumn<BrokerCR>) => col.id)}
          rowData={item}
        />
      ))}
    </div>
  )),
}));

jest.mock('./PodRow', () => ({
  PodRow: jest.fn(() => <div data-testid="pod-row">PodRow component</div>),
}));

describe('PodsTable', () => {
  const mockData: BrokerCR[] = [
    {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: 'test-1',
        namespace: 'default',
        creationTimestamp: '2025-11-14T00:00:00Z',
      },
      status: {
        phase: 'Running',
      },
    },
  ];

  it('should renders VirtualizedTable and PodRow', () => {
    render(
      <PodsTable
        data={mockData}
        unfilteredData={mockData}
        loaded={true}
        loadError={null}
      />,
    );

    expect(screen.getByTestId('virtualized-table')).toBeInTheDocument();
    expect(screen.getByText('PodRow component')).toBeInTheDocument();
  });
});
