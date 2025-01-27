import { FC } from 'react';
import {
  Tabs,
  Tab,
  TabTitleText,
  Title,
  Divider,
} from '@patternfly/react-core';
import { useTranslation } from '@app/i18n/i18n';
import { ClientsContainer } from './components/Clients/Clients.container';
import { BrokerDetailsBreadcrumb } from './components/BrokerDetailsBreadcrumb/BrokerDetailsBreadcrumb';
import {
  JolokiaAcceptorDetails,
  JolokiaAddressDetails,
  JolokiaBrokerDetails,
  JolokiaQueueDetails,
  JolokiaTestPanel,
} from './components/JolokiaDevComponents';
import { OverviewContainer } from './components/Overview/Overview.container';
import { PodsContainer } from '@app/brokers/broker-details/components/broker-pods/PodsList.container';
import { ResourcesContainer } from './components/Resources/Resources.container';
import { useParams } from 'react-router-dom-v5-compat';
import { JolokiaAuthentication } from '@app/jolokia/components/JolokiaAuthentication';
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
      component: () => (
        <OverviewContainer name={name} namespace={namespace} cr={brokerCr} />
      ),
    },
    {
      href: 'clients',
      name: t('Clients'),
      component: ClientsContainer,
    },
    {
      href: 'pods',
      name: t('Pods'),
      component: PodsContainer,
    },
    {
      href: 'yaml',
      name: t('YAML'),
      component: () => <YamlContainer brokerCr={brokerCr} />,
    },
    {
      href: 'resources',
      name: t('Resources'),
      component: ResourcesContainer,
    },
  ];

  if (process.env.NODE_ENV === 'development') {
    pages.push(
      {
        href: 'jolokiaTestPanel',
        name: t('check-jolokia'),
        component: () => <JolokiaTestPanel />,
      },
      {
        href: 'jolokia-details',
        name: t('jolokia-details'),
        component: () => (
          <Tabs defaultActiveKey={0}>
            <Tab
              eventKey={0}
              title={<TabTitleText>{t('broker')}</TabTitleText>}
            >
              <JolokiaBrokerDetails />
            </Tab>
            <Tab
              eventKey={1}
              title={<TabTitleText>{t('addresses')}</TabTitleText>}
            >
              <JolokiaAddressDetails />
            </Tab>
            <Tab
              eventKey={2}
              title={<TabTitleText>{t('acceptors')}</TabTitleText>}
            >
              <JolokiaAcceptorDetails />
            </Tab>
            <Tab
              eventKey={3}
              title={<TabTitleText>{t('queues')}</TabTitleText>}
            >
              <JolokiaQueueDetails />
            </Tab>
          </Tabs>
        ),
      },
    );
  }

  return (
    <>
        <BrokerDetailsBreadcrumb name={name} namespace={namespace} />
        <Title headingLevel="h1" className="pf-u-ml-md">
          <ResourceIcon kind="broker.amq.io~v1beta1~ActiveMQArtemis" /> {name}
        </Title>
        <br />
      <Divider inset={{ default: 'insetXs' }} />
      <HorizontalNav pages={pages} />
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
      <JolokiaAuthentication brokerCR={brokerCr} podOrdinal={0}>
        <AuthenticatedPageContent
          brokerCr={brokerCr}
          name={name}
          namespace={namespace}
        />
      </JolokiaAuthentication>
    </>
  );
};

export const App: FC = () => {
  return <BrokerDetailsPage />;
};
