import { reducer712, ArtemisReducerActions712 } from '../7.12/reducer';
import { FormState713 } from './import-types';

// Operations for 7.13 start at number 2000
export enum ArtemisReducerOperations713 {}

export type ReducerActionBase = {
  operation: ArtemisReducerOperations713;
};

// 7.13 is 7.12 + extras
export type ArtemisReducerActions713 = ArtemisReducerActions712;

export const reducer713: React.Reducer<
  FormState713,
  ArtemisReducerActions713
> = (prevFormState, action) => {
  const formState = { ...prevFormState };

  // set the individual fields
  switch (action.operation) {
    default:
      return reducer712(
        formState,
        action as ArtemisReducerActions712,
      ) as FormState713;
  }

  return formState;
};
