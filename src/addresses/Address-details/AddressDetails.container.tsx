import { FC } from 'react';
import { Title } from '@patternfly/react-core';
import { useTranslation } from '@app/i18n/i18n';
import { AddressDetails } from './AddressDetails.component';
import { AddressDetailsBreadcrumb } from './AddressDetailsBreadcrumb/AddressDetailsBreadcrumb';
import { useParams } from 'react-router-dom-v5-compat';
import { JolokiaAuthentication } from '@app/jolokia/components/JolokiaAuthentication';
import { useGetBrokerCR } from '@app/k8s/customHooks';
import { Loading } from '@app/shared-components/Loading/Loading';
import { ErrorState } from '@app/shared-components/ErrorState/ErrorState';

export const AddressDetailsPage: FC = () => {
  const { t } = useTranslation();

  const {
    name,
    ns: namespace,
    podName: podName,
  } = useParams<{
    ns?: string;
    name?: string;
    podName?: string;
  }>();

  const brokerName = podName?.match(/(.*)-ss-\d+/)?.[1] ?? '';

  const {
    brokerCr: brokerDetails,
    isLoading,
    error,
  } = useGetBrokerCR(brokerName, namespace);

  const podOrdinal = parseInt(podName.replace(brokerName + '-ss-', ''));

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorState />;
  }

  return (
    <JolokiaAuthentication brokerCR={brokerDetails} podOrdinal={podOrdinal}>
      <>
        <div className="pf-u-mt-md pf-u-ml-md pf-u-mb-md">
          <AddressDetailsBreadcrumb
            name={name}
            namespace={namespace}
            brokerName={brokerName}
            podName={podName}
          />
          <Title headingLevel="h2">
            {t('Address')} {name}
          </Title>
        </div>
        <AddressDetails name={name} />
      </>
    </JolokiaAuthentication>
  );
};

export const App: FC = () => {
  return <AddressDetailsPage />;
};
