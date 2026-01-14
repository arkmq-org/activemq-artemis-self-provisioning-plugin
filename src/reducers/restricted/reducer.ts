import { ArtemisReducerActions713, reducer713 } from '../7.13/reducer';
import { FormStateRestricted } from './import-types';

// Operations for Restricted start at number 4000
export enum ArtemisReducerOperationsRestricted {
  setIsRestrited = 4000,
}

export type ReducerActionBase = {
  operation: ArtemisReducerOperationsRestricted;
};

interface SetIsRestricted extends ReducerActionBase {
  operation: ArtemisReducerOperationsRestricted.setIsRestrited;
  /** set to true if the deployment is in restricted mode*/
  payload: boolean;
}

// Restricted is 7.13 + extras
export type ArtemisReducerActionsRestricted =
  | ArtemisReducerActions713
  | SetIsRestricted;

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
  const spec = formState.cr.spec;
  if (!spec) return;
  // if the user wants restricted mode, ensure everything is correctly defined
  if (spec.restricted) {
    // for now, forbid a restricted deployment
    return false;
  }
  return true;
};
