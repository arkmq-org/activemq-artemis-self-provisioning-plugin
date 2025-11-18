import { ArtemisReducerActions713, reducer713 } from '../7.13/reducer';
import { FormStateRestricted } from './import-types';

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

// Restricted is 7.13 + extras
export type ArtemisReducerActionsRestricted =
  | ArtemisReducerActions713
  | SetIsRestricted
  | SetACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME
  | SetBASE_PROMETHEUS_CERT_SECRET_NAME
  | SetOPERATOR_NAMESPACE
  | SecretsWatchingResult;

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
    default:
      return reducer713(
        formState,
        action as ArtemisReducerActions713,
      ) as FormStateRestricted;
  }
};

export const areMandatoryValuesSetRestricted = (
  formState: FormStateRestricted,
) => {
  // if the user wants restricted mode, ensure everything is correctly defined
  if (formState.cr.spec.restricted) {
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
  }
  return true;
};
