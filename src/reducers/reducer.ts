import { createContext } from 'react';
import {
  ArtemisReducerActions712,
  areMandatoryValuesSet712,
  newBroker712CR,
  reducer712 as reducer712,
} from './7.12/reducer';
import {
  ArtemisReducerActions713,
  ArtemisReducerOperations713,
  areMandatoryValuesSet713,
  reducer713 as reducer713,
} from './7.13/reducer';
import {
  ArtemisReducerActionsRestricted,
  ArtemisReducerOperationsRestricted,
  areMandatoryValuesSetRestricted,
  reducerRestricted,
} from './restricted/reducer';
import { FormState712 } from './7.12/import-types';
import { FormState713 } from './7.13/import-types';
import { FormStateRestricted } from './restricted/import-types';
import { BrokerCR } from '@app/k8s/types';

export enum EditorType {
  BROKER = 'broker',
  YAML = 'yaml',
}

export const BrokerCreationFormState = createContext<FormState>({});
export const BrokerCreationFormDispatch =
  createContext<React.Dispatch<ReducerActions>>(null);

export interface BaseFormState {
  brokerVersion?: '7.12' | '7.13';
}

export type FormState = FormState712 | FormState713 | FormStateRestricted;

// Global operation start at number 0
export enum ArtemisReducerGlobalOperations {
  setBrokerVersion = 0,
  /**
   * Tells that the yaml editor has unsaved changes, when the setModel is
   * invoked, the flag is reset to false.
   */
  setYamlHasUnsavedChanges,
  /** set the editor to use in the UX*/
  setEditorType,
  /** updates the whole model */
  setModel,
}

export type ArtemisReducerActionBase = {
  operation: ArtemisReducerGlobalOperations;
};

interface SetBrokerVersionAction extends ArtemisReducerActionBase {
  operation: ArtemisReducerGlobalOperations.setBrokerVersion;
  payload: '7.12' | '7.13';
}

interface SetEditorTypeAction extends ArtemisReducerActionBase {
  operation: ArtemisReducerGlobalOperations.setEditorType;
  /* What editor the user wants to use */
  payload: EditorType;
}

interface SetYamlHasUnsavedChanges extends ArtemisReducerActionBase {
  operation: ArtemisReducerGlobalOperations.setYamlHasUnsavedChanges;
}

interface SetModelAction extends ArtemisReducerActionBase {
  operation: ArtemisReducerGlobalOperations.setModel;
  payload: {
    model: BrokerCR;
    /** setting this to true means that form state will get considered as
     * modified, setting to false reset that status.*/
    isSetByUser?: boolean;
  };
}

export const newArtemisCR = (namespace: string): FormState => {
  const state = newBroker712CR(namespace);
  state.brokerVersion = '7.13';
  return state;
};

export type ReducerActions =
  | ArtemisReducerActions712
  | ArtemisReducerActions713
  | ArtemisReducerActionsRestricted
  | SetEditorTypeAction
  | SetYamlHasUnsavedChanges
  | SetModelAction
  | SetBrokerVersionAction;

export const artemisCrReducer: React.Reducer<FormState, ReducerActions> = (
  prevFormState,
  action,
) => {
  const formState = { ...prevFormState };
  if (
    action.operation !== ArtemisReducerGlobalOperations.setEditorType &&
    action.operation !== ArtemisReducerGlobalOperations.setYamlHasUnsavedChanges
  ) {
    formState.hasChanges = true;
  }
  const ingressDomain = formState.cr.spec.ingressDomain;
  switch (action.operation) {
    case ArtemisReducerGlobalOperations.setBrokerVersion:
      formState.brokerVersion = action.payload;
      // when switching back to 7.12, we need to make sure we don't leave config
      // set for 7.13
      if (action.payload === '7.12') {
        return reducer713(formState as FormState713, {
          operation: ArtemisReducerOperations713.isUsingToken,
          payload: false,
        });
      }
      return formState;
    case ArtemisReducerGlobalOperations.setYamlHasUnsavedChanges:
      formState.yamlHasUnsavedChanges = true;
      return formState;
    case ArtemisReducerGlobalOperations.setEditorType:
      formState.editorType = action.payload;
      if (formState.editorType === EditorType.BROKER) {
        formState.yamlHasUnsavedChanges = false;
      }
      return formState;
    case ArtemisReducerGlobalOperations.setModel:
      formState.cr = action.payload.model;
      formState.yamlHasUnsavedChanges = false;
      formState.hasChanges = action.payload.isSetByUser;
      return formState;
    case ArtemisReducerOperationsRestricted.setIsRestrited:
      formState.cr = newArtemisCR(formState.cr.metadata.namespace).cr;
      formState.cr.spec.ingressDomain = ingressDomain;
      if (action.payload) {
        delete formState.cr.spec.adminUser;
        delete formState.cr.spec.adminPassword;
        delete formState.cr.spec.console;
        delete formState.cr.spec.deploymentPlan.image;
        delete formState.cr.spec.deploymentPlan.requireLogin;
        formState.brokerVersion = '7.13';
        (
          formState as FormStateRestricted
        ).ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME =
          'activemq-artemis-manager-ca';
        (formState as FormStateRestricted).BASE_PROMETHEUS_CERT_SECRET_NAME =
          'prometheus-cert';
        (formState as FormStateRestricted).OPERATOR_NAMESPACE = 'default';
      }
      formState.cr.spec.restricted = action.payload;
      return formState;
  }
  if (formState.cr.spec.restricted) {
    return reducerRestricted(
      formState as FormStateRestricted,
      action as ArtemisReducerActionsRestricted,
    );
  }
  switch (formState.brokerVersion) {
    case '7.13':
      return reducer713(
        formState as FormState713,
        action as ArtemisReducerActions713,
      );
    default:
    case '7.12':
      return reducer712(
        formState as FormState712,
        action as ArtemisReducerActions712,
      );
  }
};

export const getBrokerVersion = (formState: FormState) => {
  return formState.brokerVersion;
};

export const areMandatoryValuesSet = (formState: FormState) => {
  if (formState.cr.spec.restricted) {
    return areMandatoryValuesSetRestricted(formState);
  }
  switch (formState.brokerVersion) {
    case '7.13':
      return areMandatoryValuesSet713(formState);
    case '7.12':
      return areMandatoryValuesSet712(formState);
  }
};
