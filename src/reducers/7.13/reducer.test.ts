import {
  ArtemisReducerGlobalOperations,
  artemisCrReducer,
  newArtemisCR,
} from '../reducer';
import { ArtemisReducerOperations713, reducer713 } from './reducer';

describe('test the creation broker reducer', () => {
  it('test enabling auth via token', () => {
    const initialState = newArtemisCR('namespace');
    const newState = reducer713(initialState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: true,
    });
    expect(newState.cr?.spec?.adminUser).toBe(undefined);
    expect(newState.cr?.spec?.env?.[0].name).toBe('JAVA_ARGS_APPEND');
    expect(newState.cr?.spec?.env?.[0].value).toBe('-Dhawtio.realm=token');
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: false,
    });
    expect(newState2.cr?.spec?.adminUser).toBe('admin');
    expect(newState2.cr?.spec?.deploymentPlan?.extraMounts).toBe(undefined);
    expect(newState2.cr?.spec?.deploymentPlan?.podSecurity).toBe(undefined);
    expect(newState2.cr?.spec?.env).toBe(undefined);
  });

  it('test enabling token over an existing env', () => {
    const initialState = newArtemisCR('namespace');
    if (!initialState.cr?.spec) throw new Error('spec should not be undefined');
    initialState.cr.spec.env = [
      { name: 'JAVA_ARGS_APPEND', value: '-Dtest=true' },
      { name: 'OTHERPROP', value: 'TEST' },
    ];
    const newState = reducer713(initialState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: true,
    });
    expect(newState.cr?.spec?.adminUser).toBe(undefined);
    expect(newState.cr?.spec?.env?.[0].name).toBe('JAVA_ARGS_APPEND');
    expect(newState.cr?.spec?.env?.[0].value).toBe(
      '-Dtest=true -Dhawtio.realm=token',
    );
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: false,
    });
    expect(newState2.cr?.spec?.adminUser).toBe('admin');
    expect(newState2.cr?.spec?.deploymentPlan?.extraMounts).toBe(undefined);
    expect(newState2.cr?.spec?.deploymentPlan?.podSecurity).toBe(undefined);
    expect(newState.cr?.spec?.env?.[0].name).toBe('JAVA_ARGS_APPEND');
    expect(newState.cr?.spec?.env?.[0].value).toBe('-Dtest=true');
    expect(newState.cr?.spec?.env?.[1].name).toBe('OTHERPROP');
    expect(newState.cr?.spec?.env?.[1].value).toBe('TEST');
  });

  it('test setting jaas config', () => {
    const initialState = newArtemisCR('namespace');
    const newState0 = reducer713(initialState, {
      operation: ArtemisReducerOperations713.setSecurityRoles,
      payload: new Map([['securityRoles.test', 'true']]),
    });
    const newState = reducer713(newState0, {
      operation: ArtemisReducerOperations713.setJaasExtraConfig,
      payload: 'something',
    });
    expect(newState.cr?.spec?.deploymentPlan?.extraMounts?.secrets?.[0]).toBe(
      'something',
    );
    expect(newState.cr?.spec?.brokerProperties?.length).toBe(0);
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.setJaasExtraConfig,
      payload: undefined,
    });
    expect(newState2.cr?.spec?.deploymentPlan?.extraMounts).toBe(undefined);
    expect(newState.cr?.spec?.brokerProperties?.length).toBe(0);
  });

  it('test setting service account', () => {
    const initialState = newArtemisCR('namespace');
    const newState = reducer713(initialState, {
      operation: ArtemisReducerOperations713.setServiceAccount,
      payload: 'something',
    });
    expect(
      newState.cr?.spec?.deploymentPlan?.podSecurity?.serviceAccountName,
    ).toBe('something');
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.setServiceAccount,
      payload: undefined,
    });
    expect(newState2.cr?.spec?.deploymentPlan?.podSecurity).toBe(undefined);
  });

  it('test resetting to 7.12 after setting 7.13 settings', () => {
    const initialState = newArtemisCR('namespace');
    const newState = reducer713(initialState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: true,
    });
    // use the setSecurityRoles method to set a security role and also another
    // generic broker property
    const newState1 = reducer713(newState, {
      operation: ArtemisReducerOperations713.setSecurityRoles,
      payload: new Map([
        ['something', 'else'],
        ['securityRoles.test', 'true'],
      ]),
    });
    expect(newState.cr?.spec?.adminUser).toBe(undefined);
    const newState2 = reducer713(newState1, {
      operation: ArtemisReducerOperations713.setJaasExtraConfig,
      payload: 'something',
    });
    expect(newState2.cr?.spec?.deploymentPlan?.extraMounts?.secrets?.[0]).toBe(
      'something',
    );
    const newState3 = reducer713(newState2, {
      operation: ArtemisReducerOperations713.setJaasExtraConfig,
      payload: undefined,
    });
    const newState4 = reducer713(newState3, {
      operation: ArtemisReducerOperations713.setServiceAccount,
      payload: 'something',
    });
    expect(
      newState4.cr?.spec?.deploymentPlan?.podSecurity?.serviceAccountName,
    ).toBe('something');
    const newState5 = artemisCrReducer(newState4, {
      operation: ArtemisReducerGlobalOperations.setBrokerVersion,
      payload: '7.12',
    });
    expect(newState5.cr?.spec?.deploymentPlan?.podSecurity).toBe(undefined);
    expect(newState5.cr?.spec?.deploymentPlan?.extraMounts).toBe(undefined);
    expect(newState5.cr?.spec?.env).toBe(undefined);
    expect(newState5.cr?.spec?.adminUser).toBe('admin');
    expect(newState5.cr?.spec?.brokerProperties?.length).toBe(1);
    expect(newState5.cr?.spec?.brokerProperties?.[0]).toBe('something=else');
  });
});
