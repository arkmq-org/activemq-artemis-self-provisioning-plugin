import {
  Alert,
  AlertVariant,
  Checkbox,
  Divider,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Switch,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { FC, useContext, useState } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import {
  FormStateRestricted,
  RestrictedDataPlaneStatus,
} from '@app/reducers/restricted/import-types';
import {
  ArtemisReducerOperationsRestricted,
  getRestrictedDataPlaneDefaults,
} from '@app/reducers/restricted/reducer';
import {
  useCreateAmqpsPemSecret,
  useCreateJaasConfigPropertiesSecret,
} from './dataPlaneSecretHooks';

export const DataPlane: FC = () => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState) as FormStateRestricted;
  const dispatch = useContext(BrokerCreationFormDispatch);

  const dataPlane =
    formState.restrictedDataPlane || getRestrictedDataPlaneDefaults();
  const [prevRestrictedDataPlane, setPrevRestrictedDataPlane] = useState(
    formState.restrictedDataPlane,
  );

  if (prevRestrictedDataPlane !== formState.restrictedDataPlane) {
    setPrevRestrictedDataPlane(formState.restrictedDataPlane);
    if (!formState.restrictedDataPlane) {
      dispatch({
        operation:
          ArtemisReducerOperationsRestricted.initRestrictedDataPlaneState,
      });
    }
  }

  const brokerName = formState.cr.metadata.name;
  const namespace = formState.cr.metadata.namespace;
  const jaasSecretName = `${brokerName}-jaas-config-bp`;
  const amqpsSecretName = 'amqps-pem';
  const jaasSecretHref = `/k8s/ns/${namespace}/secrets/${jaasSecretName}`;
  const amqpsSecretHref = `/k8s/ns/${namespace}/secrets/${amqpsSecretName}`;

  const acceptorEnabled = dataPlane.securedAcceptor.enabled;
  const acceptorPort = dataPlane.securedAcceptor.port || '';
  const securityDomain = dataPlane.securedAcceptor.securityDomain || '';
  const addressName = dataPlane.address.name || '';
  const routingType = dataPlane.address.routingType || 'ANYCAST';
  const roleName = dataPlane.role.name || '';
  const clientCN = dataPlane.clientCN || '';
  const [jaasConsentTrigger, setJaasConsentTrigger] = useState(0);

  const isPortValid = isValidPort(acceptorPort);

  const { amqpsSecretStatus } = useCreateAmqpsPemSecret({
    amqpsEnabled: acceptorEnabled,
    brokerName,
    namespace,
  });

  const { jaasSecretStatus } = useCreateJaasConfigPropertiesSecret({
    jaasEnabled: acceptorEnabled,
    jaasConsent: dataPlane.consent || false,
    jaasConsentTrigger,
    securityDomain,
    roleName,
    clientCN,
    namespace,
    jaasSecretName,
  });

  const [prevAmqpsSecretStatus, setPrevAmqpsSecretStatus] =
    useState(amqpsSecretStatus);
  const [prevJaasSecretStatus, setPrevJaasSecretStatus] =
    useState(jaasSecretStatus);

  if (prevAmqpsSecretStatus !== amqpsSecretStatus) {
    setPrevAmqpsSecretStatus(amqpsSecretStatus);
    if (
      amqpsSecretStatus &&
      (dataPlane.amqpsSecretStatus?.status !== amqpsSecretStatus.status ||
        dataPlane.amqpsSecretStatus?.message !== amqpsSecretStatus.message)
    ) {
      dispatch({
        operation:
          ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAmqpsStatus,
        payload: amqpsSecretStatus,
      });
    }
  }

  if (prevJaasSecretStatus !== jaasSecretStatus) {
    setPrevJaasSecretStatus(jaasSecretStatus);
    if (
      jaasSecretStatus &&
      (dataPlane.jaasSecretStatus?.status !== jaasSecretStatus.status ||
        dataPlane.jaasSecretStatus?.message !== jaasSecretStatus.message)
    ) {
      dispatch({
        operation:
          ArtemisReducerOperationsRestricted.setRestrictedDataPlaneJaasStatus,
        payload: jaasSecretStatus,
      });
    }
  }

  return (
    <>
      <Title headingLevel="h2">{t('Data plane')}</Title>

      <Title headingLevel="h3" size="lg">
        {t('Secured AMQPS acceptor')}
      </Title>
      <FormGroup>
        <Switch
          id="restricted-acceptor-enabled"
          label={t('Enabled')}
          labelOff={t('Disabled')}
          isChecked={acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorEnabled,
              payload: value,
            })
          }
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'Enable an AMQPS acceptor with mutual TLS for restricted mode clients.',
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>

      <FormGroup
        label={t('Port')}
        fieldId="restricted-acceptor-port"
        isRequired
      >
        <TextInput
          id="restricted-acceptor-port"
          value={acceptorPort}
          type="number"
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorPort,
              payload: value,
            })
          }
        />
        {!isPortValid && acceptorEnabled && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">
                {t('Enter a valid port between 1 and 65535.')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup
        label={t('Security domain')}
        fieldId="restricted-acceptor-domain"
        isRequired
      >
        <TextInput
          id="restricted-acceptor-domain"
          value={securityDomain}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorSecurityDomain,
              payload: value,
            })
          }
        />
      </FormGroup>

      {renderSecretStatus(
        t('amqps-pem secret'),
        amqpsSecretStatus?.status ?? dataPlane.amqpsSecretStatus?.status,
        amqpsSecretStatus?.message ?? dataPlane.amqpsSecretStatus?.message,
        amqpsSecretHref,
        t('Open secret'),
      )}

      <Divider className="pf-u-my-md" />

      <Title headingLevel="h3" size="lg">
        {t('Address and roles')}
      </Title>
      <FormGroup
        label={t('Address name')}
        fieldId="restricted-address-name"
        isRequired
      >
        <TextInput
          id="restricted-address-name"
          value={addressName}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAddressName,
              payload: value,
            })
          }
        />
      </FormGroup>

      <FormGroup
        label={t('Routing type')}
        fieldId="restricted-address-routing"
        isRequired
      >
        <FormSelect
          id="restricted-address-routing"
          value={routingType}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAddressRoutingType,
              payload: value as 'ANYCAST' | 'MULTICAST',
            })
          }
        >
          <FormSelectOption label="ANYCAST" value="ANYCAST" />
          <FormSelectOption label="MULTICAST" value="MULTICAST" />
        </FormSelect>
      </FormGroup>

      <FormGroup
        label={t('Role name')}
        fieldId="restricted-role-name"
        isRequired
      >
        <TextInput
          id="restricted-role-name"
          value={roleName}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRoleName,
              payload: value,
            })
          }
        />
      </FormGroup>

      <FormGroup label={t('Role permissions')} isRequired>
        <Checkbox
          id="restricted-role-browse"
          label={t('Browse')}
          isChecked={dataPlane.role.permissions.browse}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRolePermission,
              payload: { permission: 'browse', value },
            })
          }
        />
        <Checkbox
          id="restricted-role-consume"
          label={t('Consume')}
          isChecked={dataPlane.role.permissions.consume}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRolePermission,
              payload: { permission: 'consume', value },
            })
          }
        />
        <Checkbox
          id="restricted-role-send"
          label={t('Send')}
          isChecked={dataPlane.role.permissions.send}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRolePermission,
              payload: { permission: 'send', value },
            })
          }
        />
        <Checkbox
          id="restricted-role-view"
          label={t('View')}
          isChecked={dataPlane.role.permissions.view}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRolePermission,
              payload: { permission: 'view', value },
            })
          }
        />
      </FormGroup>

      <Divider className="pf-u-my-md" />

      <Title headingLevel="h3" size="lg">
        {t('Client mapping')}
      </Title>
      <FormGroup
        label={t('Client Common Name (CN)')}
        fieldId="restricted-client-cn"
        isRequired
      >
        <TextInput
          id="restricted-client-cn"
          value={clientCN}
          isDisabled={!acceptorEnabled}
          onChange={(_event, value) =>
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneClientCN,
              payload: value,
            })
          }
        />
      </FormGroup>

      <FormGroup label={t('JAAS broker properties secret')} isRequired>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'Secret name: {{secretName}}. This secret stores _cert-users, _cert-roles, and jaas-config-bp.properties.',
                { secretName: jaasSecretName },
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        {renderSecretStatus(
          t('JAAS BP secret'),
          jaasSecretStatus?.status ?? dataPlane.jaasSecretStatus?.status,
          jaasSecretStatus?.message ?? dataPlane.jaasSecretStatus?.message,
          jaasSecretHref,
          t('Open secret'),
        )}
      </FormGroup>

      <FormGroup fieldId="restricted-jaas-consent" isRequired>
        <Checkbox
          id="restricted-jaas-consent"
          label={t(
            'I understand that {{secretName}} is auto-managed and may be overwritten.',
            { secretName: jaasSecretName },
          )}
          isChecked={dataPlane.consent || false}
          onChange={(_event, value) => {
            if (value) {
              setJaasConsentTrigger((prev) => prev + 1);
            }
            dispatch({
              operation:
                ArtemisReducerOperationsRestricted.setRestrictedDataPlaneConsent,
              payload: value,
            });
          }}
        />
      </FormGroup>
    </>
  );
};

const renderSecretStatus = (
  label: string,
  status?: RestrictedDataPlaneStatus,
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

const isValidPort = (port?: string) => {
  if (!port) {
    return false;
  }
  const parsed = Number(port);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535;
};
