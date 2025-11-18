import {
  ArtemisReducerGlobalOperations,
  EditorType,
  artemisCrReducer,
  newArtemisCR,
} from './reducer';
import { ArtemisReducerOperationsRestricted } from './restricted/reducer';
import { FormStateRestricted } from './restricted/import-types';

describe('test the 7.13 reducer', () => {
  it('test setBrokerVersion', () => {
    const initialState = newArtemisCR('namespace');
    const newState = artemisCrReducer(initialState, {
      operation: ArtemisReducerGlobalOperations.setBrokerVersion,
      payload: '7.12',
    });
    expect(newState.brokerVersion).toBe('7.12');
    const newState2 = artemisCrReducer(initialState, {
      operation: ArtemisReducerGlobalOperations.setBrokerVersion,
      payload: '7.13',
    });
    expect(newState2.brokerVersion).toBe('7.13');
  });

  it('test setEditorType', () => {
    const initialState = newArtemisCR('namespace');
    const newState = artemisCrReducer(initialState, {
      operation: ArtemisReducerGlobalOperations.setEditorType,
      payload: EditorType.BROKER,
    });
    expect(newState.editorType).toBe(EditorType.BROKER);
  });
  it('test setYamlHasUnsavedChanges,', () => {
    const initialState = newArtemisCR('namespace');
    const updatedState = artemisCrReducer(initialState, {
      operation: ArtemisReducerGlobalOperations.setYamlHasUnsavedChanges,
    });
    expect(updatedState.yamlHasUnsavedChanges).toBe(true);
    expect(updatedState.hasChanges).toBe(false);
  });
  it('test machine controlled model update resets the changed flags,', () => {
    const initialState = newArtemisCR('namespace');
    const updatedState = artemisCrReducer(initialState, {
      operation: ArtemisReducerGlobalOperations.setModel,
      payload: {
        model: initialState.cr,
        isSetByUser: false,
      },
    });
    expect(updatedState.yamlHasUnsavedChanges).toBe(false);
    expect(updatedState.hasChanges).toBe(false);
  });
  it('test user controlled model update updates the flags correctly', () => {
    const initialState = newArtemisCR('namespace');
    let updatedState = artemisCrReducer(initialState, {
      operation: ArtemisReducerGlobalOperations.setYamlHasUnsavedChanges,
    });
    expect(updatedState.hasChanges).toBe(false);
    updatedState = artemisCrReducer(updatedState, {
      operation: ArtemisReducerGlobalOperations.setModel,
      payload: {
        model: initialState.cr,
        isSetByUser: true,
      },
    });
    expect(updatedState.yamlHasUnsavedChanges).toBe(false);
    expect(updatedState.hasChanges).toBe(true);
  });
});

describe('test restricted mode in global reducer', () => {
  it('should enable restricted mode via global reducer and clear specific fields', () => {
    const initialState = newArtemisCR('namespace');
    initialState.cr.spec.adminUser = 'testuser';
    initialState.cr.spec.adminPassword = 'testpass';
    initialState.cr.spec.console = { expose: true };
    initialState.cr.spec.deploymentPlan.image = 'custom-image:latest';
    initialState.cr.spec.deploymentPlan.requireLogin = true;

    const newState = artemisCrReducer(initialState, {
      operation: ArtemisReducerOperationsRestricted.setIsRestrited,
      payload: true,
    });

    // Check that restricted mode is enabled
    expect(newState.cr.spec.restricted).toBe(true);

    // Check that specific fields are cleared
    expect(newState.cr.spec.adminUser).toBeUndefined();
    expect(newState.cr.spec.adminPassword).toBeUndefined();
    expect(newState.cr.spec.console).toBeUndefined();
    expect(newState.cr.spec.deploymentPlan.image).toBeUndefined();
    expect(newState.cr.spec.deploymentPlan.requireLogin).toBeUndefined();

    // Check that broker version is set to 7.13
    expect(newState.brokerVersion).toBe('7.13');
  });

  it('should preserve ingressDomain when enabling restricted mode', () => {
    const initialState = newArtemisCR('namespace');
    initialState.cr.spec.ingressDomain = 'apps.example.com';

    const newState = artemisCrReducer(initialState, {
      operation: ArtemisReducerOperationsRestricted.setIsRestrited,
      payload: true,
    });

    expect(newState.cr.spec.restricted).toBe(true);
    expect(newState.cr.spec.ingressDomain).toBe('apps.example.com');
  });

  it('should disable restricted mode via global reducer', () => {
    const initialState = newArtemisCR('namespace');
    // First enable restricted mode
    const stateWithRestricted = artemisCrReducer(initialState, {
      operation: ArtemisReducerOperationsRestricted.setIsRestrited,
      payload: true,
    });
    expect(stateWithRestricted.cr.spec.restricted).toBe(true);

    // Then disable it
    const newState = artemisCrReducer(stateWithRestricted, {
      operation: ArtemisReducerOperationsRestricted.setIsRestrited,
      payload: false,
    });

    expect(newState.cr.spec.restricted).toBe(false);
  });

  it('should reset the CR to initial state when toggling restricted mode', () => {
    const initialState = newArtemisCR('namespace');
    const initialCRName = initialState.cr.metadata.name;

    // Make some changes to the state
    initialState.cr.spec.deploymentPlan.size = 5;
    initialState.cr.spec.acceptors = [
      { name: 'test-acceptor', port: 5555, protocols: 'ALL' },
    ];

    // Enable restricted mode - this should reset the CR
    const newState = artemisCrReducer(initialState, {
      operation: ArtemisReducerOperationsRestricted.setIsRestrited,
      payload: true,
    });

    // The CR should be reset but metadata.name should be preserved
    expect(newState.cr.metadata.name).toBe(initialCRName);
    // Size should be back to default (1)
    expect(newState.cr.spec.deploymentPlan.size).toBe(1);
    // Acceptors should be undefined (not set in initial state)
    expect(newState.cr.spec.acceptors).toBeUndefined();
    // Restricted should be set
    expect(newState.cr.spec.restricted).toBe(true);
  });

  it('should set default secret names when enabling restricted mode', () => {
    const initialState = newArtemisCR('namespace');

    const newState = artemisCrReducer(initialState, {
      operation: ArtemisReducerOperationsRestricted.setIsRestrited,
      payload: true,
    }) as FormStateRestricted;

    // Check that default secret names are set
    expect(newState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME).toBe(
      'activemq-artemis-manager-ca',
    );
    expect(newState.BASE_PROMETHEUS_CERT_SECRET_NAME).toBe('prometheus-cert');
  });
});
