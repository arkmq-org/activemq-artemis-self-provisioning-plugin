import { FC } from 'react';
import {
  VirtualizedTable,
  TableColumn,
} from '@openshift-console/dynamic-plugin-sdk';
import { PodRow } from './PodRow';
import { BrokerCR } from '@app/k8s/types';

export type PodsTableProps = {
  data: BrokerCR[];
  unfilteredData: BrokerCR[];
  loaded: boolean;
  loadError: Error | null;
};

export const PodsTable: FC<PodsTableProps> = ({
  data,
  unfilteredData,
  loaded,
  loadError,
}) => {
  const columns: TableColumn<BrokerCR>[] = [
    {
      title: 'Name',
      id: 'name',
    },
    {
      title: 'Status',
      id: 'status',
    },
    {
      title: 'Ready',
      id: 'ready',
    },
    {
      title: 'Restarts',
      id: 'restarts',
    },
    {
      title: 'Created',
      id: 'created',
    },
  ];

  return (
    <VirtualizedTable<BrokerCR>
      data={data}
      unfilteredData={unfilteredData}
      loaded={loaded}
      loadError={loadError}
      columns={columns}
      Row={({ obj, activeColumnIDs, rowData }) => (
        <PodRow
          obj={obj}
          rowData={rowData}
          activeColumnIDs={activeColumnIDs}
          columns={columns}
        />
      )}
    />
  );
};
