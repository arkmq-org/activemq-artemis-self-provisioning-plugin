import { FC, useReducer, useState } from 'react';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { AddBroker } from './AddBroker.component';
import { AMQBrokerModel } from '@app/k8s/models';
import { BrokerCR } from '@app/k8s/types';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
  artemisCrReducer,
  newArtemisCR,
} from '@app/reducers/reducer';
import { ArtemisReducerOperations712 } from '@app/reducers/7.12/reducer';
import { FormState712 } from '@app/reducers/7.12/import-types';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import { useGetIngressDomain } from '@app/k8s/customHooks';
import { ArtemisReducerOperationsRestricted } from '@app/reducers/restricted/reducer';
import { ErrorCircleOIcon } from '@patternfly/react-icons';
import { useTranslation } from '@app/i18n/i18n';

export interface AddBrokerProps {
  initialValues: FormState712;
}

export const AddBrokerPage: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ns: namespace } = useParams<{ ns?: string }>();
  const initialValues = newArtemisCR(namespace ?? '');

  //states
  const [brokerModel, dispatch] = useReducer(artemisCrReducer, initialValues);
  const [_hasBrokerUpdated, setHasBrokerUpdated] = useState(false);
  const [alert, setAlert] = useState('');
  const [prevNamespace, setPrevNamespace] = useState(namespace);
  const { clusterDomain, isLoading } = useGetIngressDomain();
  const [isDomainSet, setIsDomainSet] = useState(false);

  // Early return after all hooks
  if (!namespace) {
    return (
      <EmptyState>
        <EmptyStateHeader
          titleText={t('Missing required parameters')}
          icon={<EmptyStateIcon icon={ErrorCircleOIcon} />}
          headingLevel="h4"
        />
        <EmptyStateBody>{t('Namespace is required.')}</EmptyStateBody>
      </EmptyState>
    );
  }

  const params = new URLSearchParams(location.search);
  const returnUrl = params.get('returnUrl');

  const handleRedirect = () => {
    if (returnUrl) {
      navigate(returnUrl);
    } else {
      navigate(-1);
    }
  };

  const k8sCreateBroker = (content: BrokerCR) => {
    k8sCreate({ model: AMQBrokerModel, data: content })
      .then(
        () => {
          setAlert('');
          setHasBrokerUpdated(true);
          handleRedirect();
        },
        (reason: Error) => {
          setAlert(reason.message);
        },
      )
      .catch((e) => {
        setAlert(e.message);
      });
  };

  if (prevNamespace !== namespace) {
    dispatch({
      operation: ArtemisReducerOperations712.setNamespace,
      payload: namespace,
    });
    setPrevNamespace(namespace);
  }

  if (!isLoading && !isDomainSet) {
    dispatch({
      operation: ArtemisReducerOperations712.setIngressDomain,
      payload: {
        ingressUrl: clusterDomain,
        isSetByUser: false,
      },
    });
    // Restricted is the new default
    dispatch({
      operation: ArtemisReducerOperationsRestricted.setIsRestrited,
      payload: true,
    });
    setIsDomainSet(true);
  }

  return (
    <BrokerCreationFormState.Provider value={brokerModel}>
      <BrokerCreationFormDispatch.Provider value={dispatch}>
        {alert !== '' && (
          <Alert
            title={alert}
            variant={AlertVariant.danger}
            isInline
            actionClose
            className="pf-u-mt-md pf-u-mx-md"
          />
        )}
        <AddBroker
          onSubmit={() => k8sCreateBroker(brokerModel.cr)}
          onCancel={handleRedirect}
        />
      </BrokerCreationFormDispatch.Provider>
    </BrokerCreationFormState.Provider>
  );
};
