import { BrokerCR } from '@app/k8s/types';
import { BaseFormState, EditorType } from '../reducer';

export interface FormState712 extends BaseFormState {
  shouldShowYAMLMessage?: boolean;
  editorType?: EditorType;
  yamlHasUnsavedChanges?: boolean;
  hasChanges?: boolean;
  cr?: BrokerCR;
}
