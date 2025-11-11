import { FC } from 'react';
import { BrokerRow, BrokerRowProps } from './BrokerRow';
import { useTranslation } from '@app/i18n/i18n';
import { BrokerCR } from '@app/k8s/types';
import {
  TableColumn,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';

type BrokersTableProps = Pick<
  BrokerRowProps,
  'onOpenModal' | 'onEditBroker'
> & {
  data: BrokerCR[];
  unfilteredData: BrokerCR[];
  loaded: boolean;
  loadError: Error | null;
};

export const BrokersTable: FC<BrokersTableProps> = ({
  data,
  unfilteredData,
  loaded,
  loadError,
  onOpenModal,
  onEditBroker,
}) => {
  const { t } = useTranslation();

  const columns: TableColumn<BrokerCR>[] = [
    {
      title: t('Name'),
      id: 'name',
    },
    {
      title: t('Ready'),
      id: 'ready',
    },
    {
      title: t('Conditions'),
      id: 'conditions',
    },
    {
      title: t('Size'),
      id: 'Size',
    },
    {
      title: t('Create'),
      id: 'created',
    },
    {
      title: '',
      id: 'action',
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
        <BrokerRow
          obj={obj}
          rowData={rowData}
          activeColumnIDs={activeColumnIDs}
          columns={columns}
          onOpenModal={onOpenModal}
          onEditBroker={onEditBroker}
        />
      )}
    />
  );
};
