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
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.adminUser).toBe(undefined);
    expect(spec.env?.[0].name).toBe('JAVA_ARGS_APPEND');
    expect(spec.env?.[0].value).toBe('-Dhawtio.realm=token');
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: false,
    });
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.adminUser).toBe('admin');
    expect(spec2.deploymentPlan?.extraMounts).toBe(undefined);
    expect(spec2.deploymentPlan?.podSecurity).toBe(undefined);
    expect(spec.env).toBe(undefined);
  });

  it('test enabling token over an existing env', () => {
    const initialState = newArtemisCR('namespace');
    const spec = initialState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');

    spec.env = [
      { name: 'JAVA_ARGS_APPEND', value: '-Dtest=true' },
      { name: 'OTHERPROP', value: 'TEST' },
    ];
    const newState = reducer713(initialState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: true,
    });
    const spec2 = newState.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.adminUser).toBe(undefined);
    expect(spec2.env?.[0].name).toBe('JAVA_ARGS_APPEND');
    expect(spec2.env?.[0].value).toBe('-Dtest=true -Dhawtio.realm=token');
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: false,
    });
    const spec3 = newState2.cr.spec;
    if (!spec3) throw new Error('spec3 should not be undefined');
    expect(spec3.adminUser).toBe('admin');
    expect(spec3.deploymentPlan?.extraMounts).toBe(undefined);
    expect(spec3.deploymentPlan?.podSecurity).toBe(undefined);
    expect(spec3.env?.[0].name).toBe('JAVA_ARGS_APPEND');
    expect(spec3.env?.[0].value).toBe('-Dtest=true');
    expect(spec3.env?.[1].name).toBe('OTHERPROP');
    expect(spec3.env?.[1].value).toBe('TEST');
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
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.deploymentPlan?.extraMounts?.secrets?.[0]).toBe('something');
    expect(spec.brokerProperties?.length).toBe(0);
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.setJaasExtraConfig,
      payload: 'something',
    });
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.deploymentPlan?.extraMounts?.secrets?.[0]).toBe('something');
    expect(spec2.brokerProperties?.length).toBe(0);
  });

  it('test setting service account', () => {
    const initialState = newArtemisCR('namespace');
    const newState = reducer713(initialState, {
      operation: ArtemisReducerOperations713.setServiceAccount,
      payload: 'something',
    });
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.deploymentPlan?.podSecurity?.serviceAccountName).toBe(
      'something',
    );
    const newState2 = reducer713(newState, {
      operation: ArtemisReducerOperations713.setServiceAccount,
      payload: '',
    });
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.deploymentPlan?.podSecurity).toBe(undefined);
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
    const spec = newState.cr.spec;
    if (!spec) throw new Error('spec should not be undefined');
    expect(spec.adminUser).toBe(undefined);
    const newState2 = reducer713(newState1, {
      operation: ArtemisReducerOperations713.setJaasExtraConfig,
      payload: 'something',
    });
    const spec2 = newState2.cr.spec;
    if (!spec2) throw new Error('spec2 should not be undefined');
    expect(spec2.deploymentPlan?.extraMounts?.secrets?.[0]).toBe('something');
    const newState3 = reducer713(newState2, {
      operation: ArtemisReducerOperations713.setJaasExtraConfig,
      payload: '',
    });
    const newState4 = reducer713(newState3, {
      operation: ArtemisReducerOperations713.setServiceAccount,
      payload: 'something',
    });
    const spec3 = newState4.cr.spec;
    if (!spec3) throw new Error('spec3 should not be undefined');
    expect(spec3.deploymentPlan?.podSecurity?.serviceAccountName).toBe(
      'something',
    );
    const newState5 = artemisCrReducer(newState4, {
      operation: ArtemisReducerGlobalOperations.setBrokerVersion,
      payload: '7.12',
    });
    const spec4 = newState5.cr.spec;
    if (!spec4) throw new Error('spec4 should not be undefined');
    expect(spec4.deploymentPlan?.podSecurity).toBe(undefined);
    expect(spec4.deploymentPlan?.extraMounts).toBe(undefined);
    expect(spec4.env).toBe(undefined);
    expect(spec4.adminUser).toBe('admin');
    expect(spec4.brokerProperties?.length).toBe(1);
    expect(spec4.brokerProperties?.[0]).toBe('something=else');
  });
});
