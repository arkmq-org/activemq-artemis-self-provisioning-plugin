import {
  Form,
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';
import { CSSProperties, FC, useContext, useState } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import {
  BrokerCreationFormState,
  BrokerCreationFormDispatch,
} from '@app/reducers/reducer';
import { FormStateRestricted } from '@app/reducers/restricted/import-types';
import {
  MandatorySecretsToWatchFor,
  OptionalSecretsToWatchFor,
  ArtemisReducerOperationsRestricted,
} from '@app/reducers/restricted/reducer';
import { useSecretWatcher } from '@app/k8s/customHooks';
import { ControlPlane } from './ControlPlane/ControlPlane';
import { DataPlane } from './DataPlane/DataPlane';
import { Monitoring } from './Monitoring/Monitoring';
import { OperatorConfiguration } from './OperatorConfiguration/OperatorConfiguration';

enum ConfigEntry {
  controlPlane = 'controlplane',
  dataPlane = 'dataplane',
  monitoring = 'monitoring',
  operatorConfiguration = 'operatorconfiguration',
}

export const RestrictedConfiguration: FC = () => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState) as FormStateRestricted;
  const dispatch = useContext(BrokerCreationFormDispatch);
  const [currentConfigItem, setCurrentConfigItem] = useState<ConfigEntry>(
    ConfigEntry.controlPlane,
  );
  const entries = Object.values(ConfigEntry);

  const labels: Record<ConfigEntry, string> = {
    [ConfigEntry.controlPlane]: t('Control plane'),
    [ConfigEntry.dataPlane]: t('Data plane'),
    [ConfigEntry.monitoring]: t('Monitoring'),
    [ConfigEntry.operatorConfiguration]: t('Operator configuration'),
  };

  const namespace = formState.cr.metadata?.namespace;
  const brokerName = formState.cr.metadata?.name;

  // Watch for required secrets - hooks return the found secret name or empty string
  // These are calculated during render, no cascading updates!
  // Note: Trust-manager Bundles automatically create secrets in namespaces, so we just watch for the secret itself
  const operatorCaSecret = useSecretWatcher(namespace ?? '', [
    formState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME,
  ]);
  const brokerCertSecret = useSecretWatcher(namespace ?? '', [
    `${brokerName ?? ''}-broker-cert`,
    'broker-cert',
  ]);
  const prometheusCertSecret = useSecretWatcher(namespace ?? '', [
    formState.BASE_PROMETHEUS_CERT_SECRET_NAME,
  ]);

  const [prevOperatorCaSecret, setPrevOperatorCaSecret] =
    useState(operatorCaSecret);
  if (operatorCaSecret !== prevOperatorCaSecret) {
    setPrevOperatorCaSecret(operatorCaSecret);
    dispatch({
      operation: ArtemisReducerOperationsRestricted.secretsWatchingResult,
      payload: {
        flag: MandatorySecretsToWatchFor.OPERATOR_CA,
        actualSecretName: operatorCaSecret,
      },
    });
  }

  const [prevBrokerCertSecret, setPrevBrokerCertSecret] =
    useState(brokerCertSecret);
  if (brokerCertSecret !== prevBrokerCertSecret) {
    setPrevBrokerCertSecret(brokerCertSecret);
    dispatch({
      operation: ArtemisReducerOperationsRestricted.secretsWatchingResult,
      payload: {
        flag: MandatorySecretsToWatchFor.BROKER_CERT,
        actualSecretName: brokerCertSecret,
      },
    });
  }

  const [prevPrometheusCertSecret, setPrevPrometheusCertSecret] =
    useState(prometheusCertSecret);
  if (prometheusCertSecret !== prevPrometheusCertSecret) {
    setPrevPrometheusCertSecret(prometheusCertSecret);
    dispatch({
      operation: ArtemisReducerOperationsRestricted.secretsWatchingResult,
      payload: {
        flag: OptionalSecretsToWatchFor.PROMETHEUS_CERT,
        actualSecretName: prometheusCertSecret,
      },
    });
  }

  if (!namespace || !brokerName) {
    return null;
  }

  return (
    <Sidebar hasBorder>
      <SidebarPanel variant="sticky">
        <JumpLinks isVertical aria-label={t('config-entries')}>
          {entries.map((entry, i) => {
            return (
              <JumpLinksItem
                key={t('links') + i}
                onClick={() => setCurrentConfigItem(entry)}
                isActive={currentConfigItem === entry}
                style={
                  {
                    listStyle: 'none' /* reset to patternfly default value*/,
                  } as CSSProperties
                }
              >
                {labels[entry]}
              </JumpLinksItem>
            );
          })}
        </JumpLinks>
      </SidebarPanel>
      <SidebarContent hasPadding>
        <Form isWidthLimited>
          <>
            {currentConfigItem === ConfigEntry.controlPlane && <ControlPlane />}
            {currentConfigItem === ConfigEntry.dataPlane && <DataPlane />}
            {currentConfigItem === ConfigEntry.monitoring && <Monitoring />}
            {currentConfigItem === ConfigEntry.operatorConfiguration && (
              <OperatorConfiguration />
            )}
          </>
        </Form>
      </SidebarContent>
    </Sidebar>
  );
};
