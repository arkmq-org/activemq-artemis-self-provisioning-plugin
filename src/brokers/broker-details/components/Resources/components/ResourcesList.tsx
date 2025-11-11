import { FC, useMemo, useState } from 'react';
import { Table, Tbody, Th, Thead, Tr, ThProps } from '@patternfly/react-table';
import { BrokerCR } from '@app/k8s/types';
import { ResourcesRow } from './ResourcesRow';
import { useTranslation } from '@app/i18n/i18n';
import {
  ListPageBody,
  useListPageFilter,
  ListPageFilter,
  ListPageHeader,
} from '@openshift-console/dynamic-plugin-sdk';

type ResourcesTableProps = {
  data: BrokerCR[];
};

export const ResourcesTable: FC<ResourcesTableProps> = ({ data }) => {
  const { t } = useTranslation();

  const columns = [
    { title: t('Name'), id: 'name' },
    { title: t('Kind'), id: 'kind' },
    { title: t('Status'), id: 'status' },
    { title: t('Created'), id: 'created' },
  ];

  const [activeSortIndex, setActiveSortIndex] = useState<number | null>(null);
  const [activeSortDirection, setActiveSortDirection] = useState<
    'asc' | 'desc' | null
  >(null);

  const getSortableRowValues = (
    broker: BrokerCR,
  ): (string | number | undefined)[] => {
    const {
      metadata: { name, creationTimestamp },
      kind,
    } = broker;
    const status = name && kind && creationTimestamp ? 'Created' : 'Loading';
    return [name, kind, status, creationTimestamp];
  };

  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      const aValue = getSortableRowValues(a)[activeSortIndex || 0];
      const bValue = getSortableRowValues(b)[activeSortIndex || 0];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return (activeSortDirection || 'asc') === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return (activeSortDirection || 'asc') === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return sorted;
  }, [data, activeSortIndex, activeSortDirection]);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
      defaultDirection: 'asc',
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  return (
    <Table aria-label="Resources Table" variant="compact">
      <Thead>
        <Tr>
          {columns.map((column, index) => (
            <Th key={index} sort={getSortParams(index)}>
              {column.title}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {sortedData.map((obj, index) => (
          <ResourcesRow key={index} obj={obj} />
        ))}
      </Tbody>
    </Table>
  );
};

type ResourcesListProps = {
  brokerResources: BrokerCR[];
  loaded: boolean;
  loadError: Error | null;
};

const ResourcesList: FC<ResourcesListProps> = ({ brokerResources, loaded }) => {
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
        <ResourcesTable data={filteredData} />
      </ListPageBody>
    </>
  );
};

export { ResourcesList };
