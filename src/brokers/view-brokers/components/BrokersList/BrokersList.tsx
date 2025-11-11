import { FC } from 'react';
import {
  ListPageHeader,
  ListPageBody,
  useListPageFilter,
  ListPageFilter,
  ListPageCreateLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { BrokerRowProps } from './BrokerRow';
import { useTranslation } from '@app/i18n/i18n';
import { BrokerCR } from '@app/k8s/types';
import { BrokersTable } from './BrokersTable';

export type BrokersListProps = Pick<
  BrokerRowProps,
  'onOpenModal' | 'onEditBroker'
> & {
  brokers: BrokerCR[];
  loaded: boolean;
  loadError: Error | null;
  namespace: string;
};

export const BrokersList: FC<BrokersListProps> = ({
  brokers,
  loaded,
  loadError,
  namespace,
  onOpenModal,
  onEditBroker,
}) => {
  const [data, filteredData, onFilterChange] = useListPageFilter(brokers);
  const { t } = useTranslation();

  return (
    <>
      <ListPageHeader title={t('Brokers')}>
        <ListPageCreateLink
          to={`/k8s/ns/${
            namespace || 'default'
          }/add-broker?returnUrl=${encodeURIComponent(location.pathname)}`}
        >
          {t('Create Broker')}
        </ListPageCreateLink>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
        />
        <BrokersTable
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={loadError}
          onEditBroker={onEditBroker}
          onOpenModal={onOpenModal}
        />
      </ListPageBody>
    </>
  );
};
