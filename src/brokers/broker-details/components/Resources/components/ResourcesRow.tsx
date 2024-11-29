import { FC } from 'react';
import {
  Timestamp,
  GreenCheckCircleIcon,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { BrokerCR } from '@app/k8s/types';
import { useTranslation } from '@app/i18n/i18n';
import { Td, Tr } from '@patternfly/react-table';

type ResourcesRowProps = {
  obj: BrokerCR;
};

export const ResourcesRow: FC<ResourcesRowProps> = ({ obj }) => {
  const {
    metadata: { name, creationTimestamp },
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
    <Tr>
      <Td>
        {resourceBasePath ? (
          <ResourceLink
            kind={kind}
            name={obj.metadata.name}
            namespace={obj.metadata.namespace}
          />
        ) : (
          name
        )}
      </Td>
      <Td>{kind}</Td>
      <Td>
        {isDataFetched ? (
          <span>
            <GreenCheckCircleIcon /> {t('Created')}
          </span>
        ) : (
          <span>{t('Loading')}</span>
        )}
      </Td>
      <Td>
        <Timestamp timestamp={creationTimestamp} />
      </Td>
    </Tr>
  );
};
