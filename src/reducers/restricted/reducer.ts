import { ArtemisReducerActions713, reducer713 } from '../7.13/reducer';
import {
  FormStateRestricted,
  RestrictedDataPlanePermissions,
  RestrictedDataPlaneState,
  RestrictedDataPlaneStatus,
} from './import-types';

// Mandatory secrets to watch for validation
export enum MandatorySecretsToWatchFor {
  OPERATOR_CA = 'OPERATOR_CA',
  BROKER_CERT = 'BROKER_CERT',
}

// Optional secrets to watch for validation
export enum OptionalSecretsToWatchFor {
  PROMETHEUS_CERT = 'PROMETHEUS_CERT',
}

// Union type for all secrets to watch
export type SecretsToWatchFor =
  | MandatorySecretsToWatchFor
  | OptionalSecretsToWatchFor;

// Operations for Restricted start at number 4000
export enum ArtemisReducerOperationsRestricted {
  setIsRestrited = 4000,
  setACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME,
  setBASE_PROMETHEUS_CERT_SECRET_NAME,
  setOPERATOR_NAMESPACE,
  secretsWatchingResult,
  // Initialize UI-only restricted data plane state with defaults.
  initRestrictedDataPlaneState,
  setRestrictedMonitoringEnabled,
  setRestrictedDataPlaneAcceptorEnabled,
  setRestrictedDataPlaneAcceptorPort,
  setRestrictedDataPlaneAcceptorSecurityDomain,
  setRestrictedDataPlaneAddressName,
  setRestrictedDataPlaneAddressRoutingType,
  setRestrictedDataPlaneRoleName,
  setRestrictedDataPlaneRolePermission,
  setRestrictedDataPlaneClientCN,
  setRestrictedDataPlaneConsent,
  setRestrictedDataPlaneJaasStatus,
  setRestrictedDataPlaneAmqpsStatus,
}

export type ReducerActionBase = {
  operation: ArtemisReducerOperationsRestricted;
};

interface SetIsRestricted extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setIsRestrited;
  /** set to true if the deployment is in restricted mode*/
  payload: boolean;
}

interface SetACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME;
  /** set the secret name for the ActiveMQ Artemis Manager CA certificate*/
  payload: string;
}

interface SetBASE_PROMETHEUS_CERT_SECRET_NAME extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setBASE_PROMETHEUS_CERT_SECRET_NAME;
  /** set the secret name for the Base Prometheus certificate*/
  payload: string;
}

interface SetOPERATOR_NAMESPACE extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setOPERATOR_NAMESPACE;
  /** set the namespace where the operator is running*/
  payload: string;
}

interface SecretsWatchingResult extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.secretsWatchingResult;
  /** set the validation result for a secret */
  payload: {
    flag: SecretsToWatchFor;
    actualSecretName: string;
  };
}

interface InitRestrictedDataPlaneState extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.initRestrictedDataPlaneState;
}

interface SetRestrictedMonitoringEnabled extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedMonitoringEnabled;
  payload: boolean;
}

interface SetRestrictedDataPlaneAcceptorEnabled extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorEnabled;
  payload: boolean;
}

interface SetRestrictedDataPlaneAcceptorPort extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorPort;
  payload: string;
}

interface SetRestrictedDataPlaneAcceptorSecurityDomain
  extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorSecurityDomain;
  payload: string;
}

interface SetRestrictedDataPlaneAddressName extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAddressName;
  payload: string;
}

interface SetRestrictedDataPlaneAddressRoutingType extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAddressRoutingType;
  payload: 'ANYCAST' | 'MULTICAST';
}

interface SetRestrictedDataPlaneRoleName extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRoleName;
  payload: string;
}

interface SetRestrictedDataPlaneRolePermission extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRolePermission;
  payload: {
    permission: keyof RestrictedDataPlanePermissions;
    value: boolean;
  };
}

interface SetRestrictedDataPlaneClientCN extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneClientCN;
  payload: string;
}

interface SetRestrictedDataPlaneConsent extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneConsent;
  payload: boolean;
}

interface SetRestrictedDataPlaneJaasStatus extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneJaasStatus;
  payload: {
    status: RestrictedDataPlaneStatus;
    message?: string;
  };
}

interface SetRestrictedDataPlaneAmqpsStatus extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAmqpsStatus;
  payload: {
    status: RestrictedDataPlaneStatus;
    message?: string;
  };
}

// Restricted is 7.13 + extras
export type ArtemisReducerActionsRestricted =
  | ArtemisReducerActions713
  | SetIsRestricted
  | SetACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME
  | SetBASE_PROMETHEUS_CERT_SECRET_NAME
  | SetOPERATOR_NAMESPACE
  | SecretsWatchingResult
  | InitRestrictedDataPlaneState
  | SetRestrictedMonitoringEnabled
  | SetRestrictedDataPlaneAcceptorEnabled
  | SetRestrictedDataPlaneAcceptorPort
  | SetRestrictedDataPlaneAcceptorSecurityDomain
  | SetRestrictedDataPlaneAddressName
  | SetRestrictedDataPlaneAddressRoutingType
  | SetRestrictedDataPlaneRoleName
  | SetRestrictedDataPlaneRolePermission
  | SetRestrictedDataPlaneClientCN
  | SetRestrictedDataPlaneConsent
  | SetRestrictedDataPlaneJaasStatus
  | SetRestrictedDataPlaneAmqpsStatus;

export const reducerRestricted: React.Reducer<
  FormStateRestricted,
  ArtemisReducerActionsRestricted
> = (prevFormState, action) => {
  const formState = { ...prevFormState };

  switch (action.operation) {
    case ArtemisReducerOperationsRestricted.setIsRestrited:
      // This case should never be reached as it's handled by the global reducer
      // in reducer.ts (lines 136-148) before delegating to this reducer
      throw new Error(
        'setIsRestrited should be handled by the global reducer, not the restricted reducer',
      );
    case ArtemisReducerOperationsRestricted.setACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME:
      if (!action.payload) {
        delete formState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME;
      } else {
        formState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME = action.payload;
      }
      return formState;
    case ArtemisReducerOperationsRestricted.setBASE_PROMETHEUS_CERT_SECRET_NAME:
      if (!action.payload) {
        delete formState.BASE_PROMETHEUS_CERT_SECRET_NAME;
      } else {
        formState.BASE_PROMETHEUS_CERT_SECRET_NAME = action.payload;
      }
      return formState;
    case ArtemisReducerOperationsRestricted.setOPERATOR_NAMESPACE:
      if (!action.payload) {
        delete formState.OPERATOR_NAMESPACE;
      } else {
        formState.OPERATOR_NAMESPACE = action.payload;
      }
      return formState;
    case ArtemisReducerOperationsRestricted.secretsWatchingResult:
      if (!formState.secretValidationResults) {
        formState.secretValidationResults = {};
      }
      formState.secretValidationResults[action.payload.flag] =
        action.payload.actualSecretName;
      return formState;
    case ArtemisReducerOperationsRestricted.initRestrictedDataPlaneState:
      formState.restrictedDataPlane = getRestrictedDataPlaneDefaults();
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedMonitoringEnabled:
      formState.restrictedMonitoringEnabled = action.payload;
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorEnabled:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.securedAcceptor.enabled = action.payload;
      applyRestrictedDataPlaneConfig(formState);
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorPort:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.securedAcceptor.port = action.payload;
      applyRestrictedDataPlaneConfig(formState);
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAcceptorSecurityDomain:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.securedAcceptor.securityDomain =
        action.payload;
      applyRestrictedDataPlaneConfig(formState);
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAddressName:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.address.name = action.payload;
      applyRestrictedDataPlaneConfig(formState);
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAddressRoutingType:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.address.routingType = action.payload;
      applyRestrictedDataPlaneConfig(formState);
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRoleName:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.role.name = action.payload;
      applyRestrictedDataPlaneConfig(formState);
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneRolePermission:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.role.permissions[
        action.payload.permission
      ] = action.payload.value;
      applyRestrictedDataPlaneConfig(formState);
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneClientCN:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.clientCN = action.payload;
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneConsent:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.consent = action.payload;
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneJaasStatus:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.jaasSecretStatus = action.payload;
      return formState;
    case ArtemisReducerOperationsRestricted.setRestrictedDataPlaneAmqpsStatus:
      ensureRestrictedDataPlane(formState);
      formState.restrictedDataPlane!.amqpsSecretStatus = action.payload;
      return formState;
    default:
      return reducer713(
        formState,
        action as ArtemisReducerActions713,
      ) as FormStateRestricted;
  }
};

export const areMandatoryValuesSetRestricted = (
  formState: FormStateRestricted,
): boolean => {
  const spec = formState.cr.spec;
  if (!spec) return false;
  // if the user wants restricted mode, ensure everything is correctly defined
  if (spec.restricted) {
    // Check that all mandatory operator configuration fields are set
    if (!formState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME) {
      return false;
    }
    // Note: BASE_PROMETHEUS_CERT_SECRET_NAME is optional, not mandatory

    // Check that the required secrets actually exist in the cluster
    if (
      !formState.secretValidationResults?.[
        MandatorySecretsToWatchFor.OPERATOR_CA
      ]
    ) {
      return false;
    }
    if (
      !formState.secretValidationResults?.[
        MandatorySecretsToWatchFor.BROKER_CERT
      ]
    ) {
      return false;
    }

    const dataPlane = formState.restrictedDataPlane;
    if (!dataPlane?.securedAcceptor?.enabled) {
      return true;
    }
    if (
      !isValidPort(dataPlane.securedAcceptor.port) ||
      !dataPlane.securedAcceptor.securityDomain?.trim()
    ) {
      return false;
    }
    if (!dataPlane.address?.name?.trim() || !dataPlane.address.routingType) {
      return false;
    }
    if (!dataPlane.role?.name?.trim()) {
      return false;
    }
    if (!dataPlane.clientCN?.trim()) {
      return false;
    }
    if (!dataPlane.consent) {
      return false;
    }
    if (dataPlane.jaasSecretStatus?.status !== 'ready') {
      return false;
    }
    if (dataPlane.amqpsSecretStatus?.status !== 'ready') {
      return false;
    }
  }
  return true;
};

export const getRestrictedDataPlaneDefaults = (): RestrictedDataPlaneState => ({
  securedAcceptor: {
    enabled: false,
    port: '61617',
    securityDomain: 'activemq',
  },
  address: {
    name: 'APP_JOBS',
    routingType: 'ANYCAST',
  },
  role: {
    name: 'messaging',
    permissions: {
      browse: true,
      consume: true,
      send: true,
      view: true,
    },
  },
  clientCN: 'messaging-client',
  consent: false,
  jaasSecretStatus: {
    status: 'idle',
  },
  amqpsSecretStatus: {
    status: 'idle',
  },
});

const ensureRestrictedDataPlane = (formState: FormStateRestricted) => {
  if (!formState.restrictedDataPlane) {
    formState.restrictedDataPlane = getRestrictedDataPlaneDefaults();
  }
};

const isValidPort = (port?: string) => {
  if (!port) {
    return false;
  }
  const value = Number(port);
  return Number.isInteger(value) && value > 0 && value <= 65535;
};

const applyRestrictedDataPlaneConfig = (formState: FormStateRestricted) => {
  const dataPlane = formState.restrictedDataPlane;
  if (!dataPlane?.securedAcceptor) {
    return;
  }

  const existingBrokerProperties = formState.cr.spec?.brokerProperties || [];
  const filteredBrokerProperties = existingBrokerProperties.filter(
    (property) => !isRestrictedDataPlaneProperty(property),
  );

  const newBrokerProperties: string[] = [];
  if (dataPlane.securedAcceptor.enabled) {
    newBrokerProperties.push('messageCounterSamplePeriod=500');

    const addressName = dataPlane.address?.name?.trim();
    const routingType = dataPlane.address?.routingType;
    if (addressName && routingType) {
      newBrokerProperties.push(
        `addressConfigurations.${addressName}.routingTypes=${routingType}`,
      );
      newBrokerProperties.push(
        `addressConfigurations.${addressName}.queueConfigs.${addressName}.routingType=${routingType}`,
      );
    }

    const roleName = dataPlane.role?.name?.trim();
    if (addressName && roleName && dataPlane.role?.permissions) {
      const permissions = dataPlane.role.permissions;
      if (permissions.browse) {
        newBrokerProperties.push(
          `securityRoles.${addressName}.${roleName}.browse=true`,
        );
      }
      if (permissions.consume) {
        newBrokerProperties.push(
          `securityRoles.${addressName}.${roleName}.consume=true`,
        );
      }
      if (permissions.send) {
        newBrokerProperties.push(
          `securityRoles.${addressName}.${roleName}.send=true`,
        );
      }
      if (permissions.view) {
        newBrokerProperties.push(
          `securityRoles.${addressName}.${roleName}.view=true`,
        );
      }
    }

    const acceptorPort = dataPlane.securedAcceptor.port?.trim();
    const securityDomain = dataPlane.securedAcceptor.securityDomain?.trim();
    if (acceptorPort && securityDomain) {
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".factoryClassName=org.apache.activemq.artemis.core.remoting.impl.netty.NettyAcceptorFactory',
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.host=${HOSTNAME}',
      );
      newBrokerProperties.push(
        `acceptorConfigurations."amqps".params.port=${acceptorPort}`,
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.protocols=amqp',
      );
      newBrokerProperties.push(
        `acceptorConfigurations."amqps".params.securityDomain=${securityDomain}`,
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.sslEnabled=true',
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.needClientAuth=true',
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.saslMechanisms=EXTERNAL',
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.keyStoreType=PEMCFG',
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.keyStorePath=/amq/extra/secrets/amqps-pem/_amqps.pemcfg',
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.trustStoreType=PEMCA',
      );
      newBrokerProperties.push(
        'acceptorConfigurations."amqps".params.trustStorePath=/amq/extra/secrets/activemq-artemis-manager-ca/ca.pem',
      );
    }
  }

  if (!formState.cr.spec) return;

  if (newBrokerProperties.length > 0) {
    formState.cr.spec.brokerProperties = [
      ...filteredBrokerProperties,
      ...newBrokerProperties,
    ];
  } else if (filteredBrokerProperties.length > 0) {
    formState.cr.spec.brokerProperties = filteredBrokerProperties;
  } else {
    delete formState.cr.spec.brokerProperties;
  }

  const brokerName = formState.cr?.metadata?.name;
  const jaasSecretName = brokerName
    ? `${brokerName}-jaas-config-bp`
    : 'artemis-broker-jaas-config-bp';
  const managedSecrets = [jaasSecretName, 'amqps-pem'];
  const requiredSecrets = dataPlane.securedAcceptor.enabled
    ? managedSecrets
    : [];
  updateExtraMountSecrets(formState, requiredSecrets, managedSecrets);
};

const isRestrictedDataPlaneProperty = (property: string) => {
  return (
    property.startsWith('messageCounterSamplePeriod=') ||
    property.startsWith('addressConfigurations.') ||
    property.startsWith('securityRoles.') ||
    property.startsWith('acceptorConfigurations."amqps".')
  );
};

const updateExtraMountSecrets = (
  formState: FormStateRestricted,
  requiredSecrets: string[],
  managedSecrets: string[],
) => {
  const deploymentPlan = formState.cr?.spec?.deploymentPlan;
  if (!deploymentPlan) {
    return;
  }
  const existingExtraMounts = deploymentPlan.extraMounts || {};
  const existingSecrets = existingExtraMounts.secrets || [];
  const filteredSecrets = existingSecrets.filter(
    (secret) => !managedSecrets.includes(secret),
  );
  const mergedSecrets = [...filteredSecrets, ...requiredSecrets];

  if (mergedSecrets.length > 0) {
    deploymentPlan.extraMounts = {
      ...existingExtraMounts,
      secrets: mergedSecrets,
    };
  } else if (Object.keys(existingExtraMounts).length > 0) {
    const { secrets: _secrets, ...rest } = existingExtraMounts;
    void _secrets;
    if (Object.keys(rest).length > 0) {
      deploymentPlan.extraMounts = rest;
    } else {
      delete deploymentPlan.extraMounts;
    }
  } else {
    delete deploymentPlan.extraMounts;
  }
};
