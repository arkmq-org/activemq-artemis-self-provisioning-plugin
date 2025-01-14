import { createContext } from 'react';
import { newBroker712CR, reducer712 as reducer712 } from './7.12/reducer';
import { reducer713 as reducer713 } from './7.13/reducer';
import { FormState712 } from './7.12/import-types';
import { FormState713 } from './7.13/import-types';
import { ArtemisReducerActions712 } from './7.12/reducer';
import { ArtemisReducerActions713 } from './7.13/reducer';
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

export type FormState = FormState712 | FormState713;

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

// 7.13 is 7.12 + extras
export type ReducerActions =
  | ArtemisReducerActions712
  | ArtemisReducerActions713
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
  switch (action.operation) {
    case ArtemisReducerGlobalOperations.setBrokerVersion:
      formState.brokerVersion = action.payload;
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
