import { FC } from 'react';
import {
  RowProps,
  TableData,
  TableColumn,
  Timestamp,
  GreenCheckCircleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { BrokerCR } from '@app/k8s/types';
import { useTranslation } from '@app/i18n/i18n';
import { Link } from 'react-router-dom-v5-compat';

export type ResourceRowProps = RowProps<BrokerCR> & {
  columns: TableColumn<BrokerCR>[];
};

export const ResourcesRow: FC<ResourceRowProps> = ({
  obj,
  activeColumnIDs,
  columns,
}) => {
  const {
    metadata: { name, creationTimestamp, namespace },
    kind,
  } = obj;
  const isDataFetched = name && kind && creationTimestamp;
  const { t } = useTranslation();

  const getResourceBasePath = (resourceKind: string) => {
    switch (resourceKind) {
      case 'Secret':
        return 'secrets';
      case 'Service':
        return 'services';
      case 'StatefulSet':
        return 'statefulsets';
      default:
        return '';
    }
  };

  const resourceBasePath = getResourceBasePath(kind);

  return (
    <>
      <TableData id={columns[0].id} activeColumnIDs={activeColumnIDs}>
        {resourceBasePath ? (
          <Link to={`/k8s/ns/${namespace}/${resourceBasePath}/${name}`}>
            {name}
          </Link>
        ) : (
          name
        )}
      </TableData>
      <TableData id={columns[1].id} activeColumnIDs={activeColumnIDs}>
        {kind}
      </TableData>
      <TableData id={columns[2].id} activeColumnIDs={activeColumnIDs}>
        {isDataFetched ? (
          <span>
            <GreenCheckCircleIcon /> {t('Created')}
          </span>
        ) : (
          <span>{t('Loading')}</span>
        )}
      </TableData>
      <TableData id={columns[3].id} activeColumnIDs={activeColumnIDs}>
        <Timestamp timestamp={creationTimestamp} />
      </TableData>
    </>
  );
};
