import { FC } from 'react';
import { Title, Divider } from '@patternfly/react-core';
import { useTranslation } from '@app/i18n/i18n';
import { BrokerDetailsBreadcrumb } from './components/BrokerDetailsBreadcrumb/BrokerDetailsBreadcrumb';
import { OverviewContainer } from './components/Overview/Overview.container';
import { PodsContainer } from '@app/brokers/broker-details/components/broker-pods/PodsList.container';
import { ResourcesContainer } from './components/Resources/Resources.container';
import { useParams } from 'react-router-dom-v5-compat';
import { useGetBrokerCR } from '@app/k8s/customHooks';
import { BrokerCR } from '@app/k8s/types';
import {
  HorizontalNav,
  ResourceIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { YamlContainer } from './components/yaml/Yaml.container';
import { ErrorState } from '@app/shared-components/ErrorState/ErrorState';
import { Loading } from '@app/shared-components/Loading/Loading';

type AuthenticatedPageContentPropType = {
  brokerCr: BrokerCR;
  name: string;
  namespace: string;
};
const AuthenticatedPageContent: FC<AuthenticatedPageContentPropType> = ({
  brokerCr,
  name,
  namespace,
}) => {
  const { t } = useTranslation();

  const pages = [
    {
      href: '',
      name: t('Overview'),
      component: OverviewContainer,
    },
    {
      href: 'pods',
      name: t('Pods'),
      component: PodsContainer,
    },
    {
      href: 'yaml',
      name: t('YAML'),
      component: YamlContainer,
    },
    {
      href: 'resources',
      name: t('Resources'),
      component: ResourcesContainer,
    },
  ];

  return (
    <>
      <BrokerDetailsBreadcrumb name={name} namespace={namespace} />
      <Title headingLevel="h1" className="pf-u-ml-md">
        <ResourceIcon kind="broker.amq.io~v1beta1~ActiveMQArtemis" /> {name}
      </Title>
      <br />
      <Divider inset={{ default: 'insetXs' }} />
      <HorizontalNav resource={brokerCr} pages={pages} />
    </>
  );
};

export const BrokerDetailsPage: FC = () => {
  const { ns: namespace, name } = useParams<{ ns?: string; name?: string }>();

  const { brokerCr, isLoading, error } = useGetBrokerCR(name, namespace);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorState />;
  }

  return (
    <>
      <AuthenticatedPageContent
        brokerCr={brokerCr}
        name={name}
        namespace={namespace}
      />
    </>
  );
};

export const App: FC = () => {
  return <BrokerDetailsPage />;
};
