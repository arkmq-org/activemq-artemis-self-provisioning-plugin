import { render, screen } from '@app/test-utils';
import { BrokersTable } from './BrokersTable';
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

jest.mock('./BrokerRow', () => ({
  BrokerRow: jest.fn(() => (
    <div data-testid="broker-row">BrokerRow Component</div>
  )),
}));

describe('BrokersTable', () => {
  const mockData: BrokerCR[] = [
    {
      apiVersion: 'broker.amq.io/v1beta1',
      kind: 'ActiveMQArtemis',
      metadata: {
        name: 'test-broker',
        namespace: 'default',
        creationTimestamp: '2025-11-14T12:05:09Z',
      },
      spec: {
        deploymentPlan: {
          image: 'placeholder',
          requireLogin: false,
          size: 1,
        },
      },
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'True',
          },
        ],
      },
    },
  ];

  const onOpenModal = jest.fn();
  const onEditBroker = jest.fn();

  it('should renders VirtualizedTable and BrokerRow', () => {
    render(
      <BrokersTable
        data={mockData}
        unfilteredData={mockData}
        loaded={true}
        loadError={null}
        onOpenModal={onOpenModal}
        onEditBroker={onEditBroker}
      />,
    );

    expect(screen.getByTestId('virtualized-table')).toBeInTheDocument();
    expect(screen.getByText('BrokerRow Component')).toBeInTheDocument();
  });
});
