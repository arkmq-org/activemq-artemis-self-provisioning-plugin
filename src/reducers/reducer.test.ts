import {
  ArtemisReducerGlobalOperations,
  EditorType,
  artemisCrReducer,
  newArtemisCR,
} from './reducer';

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
