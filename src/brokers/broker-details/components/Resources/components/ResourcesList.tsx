import { FC } from 'react';
import {
  ListPageBody,
  VirtualizedTable,
  useListPageFilter,
  ListPageFilter,
  TableColumn,
  ListPageHeader,
} from '@openshift-console/dynamic-plugin-sdk';
import { BrokerCR } from '@app/k8s/types';
import { ResourcesRow } from './ResourcesRow';
import { useTranslation } from '@app/i18n/i18n';

type ResourcesTableProps = {
  data: BrokerCR[];
  unfilteredData: BrokerCR[];
  loaded: boolean;
  loadError: any;
};

const ResourcesTable: FC<ResourcesTableProps> = ({
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
      title: 'Kind',
      id: 'kind',
    },
    {
      title: 'Status',
      id: 'status',
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
        <ResourcesRow
          obj={obj}
          rowData={rowData}
          activeColumnIDs={activeColumnIDs}
          columns={columns}
        />
      )}
    />
  );
};

export type ResourcesListProps = {
  brokerResources: BrokerCR[];
  loaded: boolean;
  loadError: any;
};

const ResourcesList: FC<ResourcesListProps> = ({
  brokerResources,
  loaded,
  loadError,
}) => {
  const { t } = useTranslation();
  const [data, filteredData, onFilterChange] =
    useListPageFilter(brokerResources);

  return (
    <>
      <ListPageHeader title={t('Resources')} />
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
        />
        <ResourcesTable
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={loadError}
        />
      </ListPageBody>
    </>
  );
};

export { ResourcesList };
