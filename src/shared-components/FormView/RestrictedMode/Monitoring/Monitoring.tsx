import {
  Alert,
  AlertVariant,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Switch,
  Title,
} from '@patternfly/react-core';
import { FC, useContext, useState } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import { BrokerCreationFormState } from '@app/reducers/reducer';
import { FormStateRestricted } from '@app/reducers/restricted/import-types';
import {
  useCreateMonitoringResources,
  MonitoringStatus,
} from './monitoringHooks';

export const Monitoring: FC = () => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState) as FormStateRestricted;
  const brokerName = formState.cr?.metadata?.name || '';
  const namespace = formState.cr?.metadata?.namespace || '';
  const [requestedMonitoringEnabled, setRequestedMonitoringEnabled] = useState<
    boolean | undefined
  >(undefined);

  const { certStatus, serviceStatus, serviceMonitorStatus, namespaceStatus } =
    useCreateMonitoringResources({
      enabled: requestedMonitoringEnabled,
      brokerName,
      namespace,
    });
  const isSwitchChecked = certStatus?.status === 'ready';
  const isSwitchDisabled = certStatus?.status === 'syncing';

  const metricsServiceName = `${brokerName}-metrics`;
  const serviceMonitorName = `${brokerName}-metrics`;
  const namespaceHref = `/k8s/cluster/namespaces/${namespace}`;
  const metricsServiceHref = `/k8s/ns/${namespace}/services/${metricsServiceName}`;
  const serviceMonitorHref = `/k8s/ns/${namespace}/monitoring.coreos.com~v1~ServiceMonitor/${serviceMonitorName}`;

  return (
    <>
      <Title headingLevel="h2">{t('Monitoring')}</Title>
      <Alert
        variant={AlertVariant.info}
        isInline
        title={t('Monitoring prerequisites')}
      >
        {t(
          'User workload monitoring must be enabled cluster-wide. The namespace must be labeled to allow scraping.',
        )}
      </Alert>
      <FormGroup>
        <Switch
          id="restricted-monitoring-enabled"
          label={t('Enabled')}
          labelOff={t('Disabled')}
          isChecked={isSwitchChecked}
          isDisabled={isSwitchDisabled}
          onChange={(_event, value) => {
            setRequestedMonitoringEnabled(value);
          }}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'Enable monitoring to create a Prometheus client certificate, metrics service, and ServiceMonitor.',
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      {renderStatus(
        t('Prometheus certificate'),
        certStatus?.status,
        certStatus?.message,
      )}

      {renderStatus(
        t('Metrics service'),
        serviceStatus?.status,
        serviceStatus?.message,
        metricsServiceHref,
        t('Open service'),
      )}

      {renderStatus(
        t('ServiceMonitor'),
        serviceMonitorStatus?.status,
        serviceMonitorStatus?.message,
        serviceMonitorHref,
        t('Open ServiceMonitor'),
      )}

      {renderStatus(
        t('User monitoring label'),
        namespaceStatus?.status,
        namespaceStatus?.message,
        namespaceHref,
        t('Open namespace'),
      )}
    </>
  );
};

const renderStatus = (
  label: string,
  status?: MonitoringStatus,
  message?: string,
  linkHref?: string,
  linkLabel?: string,
) => {
  if (!status) {
    return null;
  }
  if (status === 'ready') {
    return (
      <Alert variant={AlertVariant.success} isInline title={label}>
        {message}
        {linkHref && linkLabel && (
          <>
            {' '}
            <a href={linkHref} target="_blank" rel="noopener noreferrer">
              {linkLabel}
            </a>
          </>
        )}
      </Alert>
    );
  }
  if (status === 'syncing') {
    return (
      <Alert variant={AlertVariant.info} isInline title={label}>
        {message}
      </Alert>
    );
  }
  if (status === 'error') {
    return (
      <Alert variant={AlertVariant.danger} isInline title={label}>
        {message}
      </Alert>
    );
  }
  return (
    <Alert variant={AlertVariant.info} isInline title={label}>
      {message}
    </Alert>
  );
};
