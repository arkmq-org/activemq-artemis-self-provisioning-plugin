import { FC } from 'react';
import {
  ListPageHeader,
  ListPageBody,
  useListPageFilter,
  ListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from '@app/i18n/i18n';
import { BrokerCR } from '@app/k8s/types';
import { PodsTable } from './PodsTable';

export type PodsListProps = {
  brokerPods: BrokerCR[];
  loaded: boolean;
  loadError: Error | null;
};

export const PodsList: FC<PodsListProps> = ({
  brokerPods,
  loaded,
  loadError,
}) => {
  const { t } = useTranslation();
  const [data, filteredData, onFilterChange] = useListPageFilter(brokerPods);

  return (
    <>
      <ListPageHeader title={t('Pods')} />
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
        />
        <PodsTable
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={loadError}
        />
      </ListPageBody>
    </>
  );
};
