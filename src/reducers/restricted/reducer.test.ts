import { newArtemisCR } from '../reducer';
import {
  ArtemisReducerOperationsRestricted,
  reducerRestricted,
  areMandatoryValuesSetRestricted,
} from './reducer';
import { FormStateRestricted } from './import-types';

describe('Restricted reducer tests', () => {
  it('should throw an error when setIsRestrited is called directly on restricted reducer', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    expect(() => {
      reducerRestricted(initialState, {
        operation: ArtemisReducerOperationsRestricted.setIsRestrited,
        payload: true,
      });
    }).toThrow(
      'setIsRestrited should be handled by the global reducer, not the restricted reducer',
    );
  });

  it('should return false for areMandatoryValuesSetRestricted when restricted mode is enabled', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    const spec = initialState.cr.spec;
    if (!spec) return;
    spec.restricted = true;

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(false);
  });

  it('should return true for areMandatoryValuesSetRestricted when restricted mode is disabled', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    const spec = initialState.cr.spec;
    if (!spec) return;
    delete spec.restricted;

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(true);
  });
});
