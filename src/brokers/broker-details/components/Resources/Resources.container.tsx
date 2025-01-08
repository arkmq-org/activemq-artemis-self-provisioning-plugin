import { FC, useEffect, useState } from 'react';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from '@app/i18n/i18n';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  PageSection,
  PageSectionVariants,
  Spinner,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { useParams } from 'react-router-dom-v5-compat';
import { ResourcesList } from './components/ResourcesList';
import { ErrorCircleOIcon, SearchIcon } from '@patternfly/react-icons';
import { K8sResourceCommonWithData } from '@app/k8s/types';

export const ResourcesContainer: FC = () => {
  //states
  const { t } = useTranslation();
  const { ns: namespace, name } = useParams<{ ns?: string; name?: string }>();
  const [filteredResources, setFilteredResources] = useState<
    K8sResourceCommonWithData[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch Secrets
  const [secrets, secretsLoaded, secretsLoadError] = useK8sWatchResource<
    K8sResourceCommon[]
  >({
    groupVersionKind: {
      version: 'v1',
      kind: 'Secret',
    },
    isList: true,
    namespaced: true,
    namespace: namespace,
  });

  // Fetch Services
  const [services, servicesLoaded, servicesLoadError] = useK8sWatchResource<
    K8sResourceCommon[]
  >({
    groupVersionKind: {
      version: 'v1',
      kind: 'Service',
    },
    isList: true,
    namespaced: true,
    namespace: namespace,
  });

  // Fetch StatefulSet
  const [statefulsets, statefulsetsLoaded, statefulsetsLoadError] =
    useK8sWatchResource<K8sResourceCommon[]>({
      groupVersionKind: {
        version: 'v1',
        kind: 'StatefulSet',
      },
      isList: true,
      namespaced: true,
      namespace: namespace,
    });

  // Filter Resources
  const filterBrokerResources = (
    resources: K8sResourceCommon[],
    brokerName: string,
  ) => {
    return resources.filter((resource) =>
      resource.metadata?.ownerReferences?.some(
        (ownerRef) => ownerRef.name === brokerName,
      ),
    );
  };

  useEffect(() => {
    if (
      secretsLoaded &&
      servicesLoaded &&
      statefulsetsLoaded &&
      !secretsLoadError &&
      !servicesLoadError &&
      !statefulsetsLoadError
    ) {
      setLoading(false);
      const filteredBrokerSecrets = filterBrokerResources(secrets, name);
      const filteredBrokerServices = filterBrokerResources(services, name);
      const filteredBrokerStatefulSets = filterBrokerResources(
        statefulsets,
        name,
      );
      setFilteredResources([
        ...filteredBrokerSecrets,
        ...filteredBrokerServices,
        ...filteredBrokerStatefulSets,
      ]);
    }
  }, [
    secrets,
    services,
    statefulsets,
    name,
    secretsLoaded,
    servicesLoaded,
    secretsLoadError,
    servicesLoadError,
    statefulsetsLoaded,
    statefulsetsLoadError,
  ]);

  return (
    <>
      <PageSection
        variant={PageSectionVariants.light}
        padding={{ default: 'noPadding' }}
        className="pf-c-page__main-tabs"
      >
        {servicesLoadError && (
          <EmptyState>
            <EmptyStateHeader
              titleText={t('Error while retrieving the resources list.')}
              icon={<EmptyStateIcon icon={ErrorCircleOIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>{t('No results match.')}</EmptyStateBody>
          </EmptyState>
        )}
        {loading && !servicesLoadError && (
          <EmptyState>
            <EmptyStateHeader
              titleText={t('Loading')}
              icon={<EmptyStateIcon icon={Spinner} />}
              headingLevel="h4"
            />
          </EmptyState>
        )}
        {!loading && !servicesLoadError && filteredResources.length === 0 && (
          <EmptyState>
            <EmptyStateHeader
              titleText={t(
                'No results found. Check the status of the deployment.',
              )}
              icon={<EmptyStateIcon icon={SearchIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>{t('No results match.')}</EmptyStateBody>
          </EmptyState>
        )}
        {!loading && !servicesLoadError && filteredResources.length > 0 && (
          <ResourcesList
            brokerResources={filteredResources}
            loadError={servicesLoadError}
            loaded={!loading}
          />
        )}
      </PageSection>
    </>
  );
};
