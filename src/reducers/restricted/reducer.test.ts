import { newArtemisCR } from '../reducer';
import {
  ArtemisReducerOperationsRestricted,
  reducerRestricted,
  areMandatoryValuesSetRestricted,
  MandatorySecretsToWatchFor,
} from './reducer';
import { FormStateRestricted, RestrictedDataPlaneState } from './import-types';

describe('Restricted reducer tests', () => {
  const getValidRestrictedDataPlane = (): RestrictedDataPlaneState => ({
    securedAcceptor: {
      enabled: true,
      port: '61617',
      securityDomain: 'activemq',
    },
    address: {
      name: 'APP_JOBS',
      routingType: 'ANYCAST',
    },
    role: {
      name: 'messaging',
      permissions: {
        browse: true,
        consume: true,
        send: true,
        view: true,
      },
    },
    clientCN: 'messaging-client',
    consent: true,
    jaasSecretStatus: {
      status: 'ready',
    },
    amqpsSecretStatus: {
      status: 'ready',
    },
  });
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
    initialState.cr.spec.restricted = true;

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(false);
  });

  it('should return true for areMandatoryValuesSetRestricted when restricted mode is disabled', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    delete initialState.cr.spec.restricted;

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(true);
  });

  it('should set ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME when provided a value', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;

    const result = reducerRestricted(initialState, {
      operation:
        ArtemisReducerOperationsRestricted.setACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME,
      payload: 'test-manager-ca-secret',
    });

    expect(result.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME).toBe(
      'test-manager-ca-secret',
    );
  });

  it('should delete ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME when provided empty payload', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME =
      'existing-manager-ca-secret';

    const result = reducerRestricted(initialState, {
      operation:
        ArtemisReducerOperationsRestricted.setACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME,
      payload: '',
    });

    expect(result.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME).toBeUndefined();
  });

  it('should set BASE_PROMETHEUS_CERT_SECRET_NAME when provided a value', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;

    const result = reducerRestricted(initialState, {
      operation:
        ArtemisReducerOperationsRestricted.setBASE_PROMETHEUS_CERT_SECRET_NAME,
      payload: 'test-prometheus-secret',
    });

    expect(result.BASE_PROMETHEUS_CERT_SECRET_NAME).toBe(
      'test-prometheus-secret',
    );
  });

  it('should delete BASE_PROMETHEUS_CERT_SECRET_NAME when provided empty payload', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.BASE_PROMETHEUS_CERT_SECRET_NAME =
      'existing-prometheus-secret';

    const result = reducerRestricted(initialState, {
      operation:
        ArtemisReducerOperationsRestricted.setBASE_PROMETHEUS_CERT_SECRET_NAME,
      payload: '',
    });

    expect(result.BASE_PROMETHEUS_CERT_SECRET_NAME).toBeUndefined();
  });

  it('should set secret validation result', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;

    const result = reducerRestricted(initialState, {
      operation: ArtemisReducerOperationsRestricted.secretsWatchingResult,
      payload: {
        flag: MandatorySecretsToWatchFor.OPERATOR_CA,
        actualSecretName: 'activemq-artemis-manager-ca',
      },
    });

    expect(result.secretValidationResults).toBeDefined();
    expect(
      result.secretValidationResults?.[MandatorySecretsToWatchFor.OPERATOR_CA],
    ).toBe('activemq-artemis-manager-ca');
  });

  it('should update existing secret validation results', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.secretValidationResults = {
      [MandatorySecretsToWatchFor.OPERATOR_CA]: 'old-ca',
    };

    const result = reducerRestricted(initialState, {
      operation: ArtemisReducerOperationsRestricted.secretsWatchingResult,
      payload: {
        flag: MandatorySecretsToWatchFor.BROKER_CERT,
        actualSecretName: 'broker-cert-secret',
      },
    });

    expect(
      result.secretValidationResults?.[MandatorySecretsToWatchFor.OPERATOR_CA],
    ).toBe('old-ca');
    expect(
      result.secretValidationResults?.[MandatorySecretsToWatchFor.BROKER_CERT],
    ).toBe('broker-cert-secret');
  });

  it('should set empty string for secret validation when not found', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;

    const result = reducerRestricted(initialState, {
      operation: ArtemisReducerOperationsRestricted.secretsWatchingResult,
      payload: {
        flag: MandatorySecretsToWatchFor.BROKER_CERT,
        actualSecretName: '',
      },
    });

    expect(
      result.secretValidationResults?.[MandatorySecretsToWatchFor.BROKER_CERT],
    ).toBe('');
  });

  it('should return false when secrets are not validated in restricted mode', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.cr.spec.restricted = true;
    initialState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME =
      'activemq-artemis-manager-ca';
    initialState.BASE_PROMETHEUS_CERT_SECRET_NAME = 'prometheus-cert';
    // Configuration is set but secrets don't exist yet

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(false);
  });

  it('should return true when all configuration and secrets are validated in restricted mode', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.cr.spec.restricted = true;
    initialState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME =
      'activemq-artemis-manager-ca';
    initialState.BASE_PROMETHEUS_CERT_SECRET_NAME = 'prometheus-cert';
    initialState.restrictedDataPlane = getValidRestrictedDataPlane();
    initialState.secretValidationResults = {
      [MandatorySecretsToWatchFor.OPERATOR_CA]: 'activemq-artemis-manager-ca',
      [MandatorySecretsToWatchFor.BROKER_CERT]: 'my-broker-broker-cert',
    };

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(true);
  });

  it('should return true when data plane is disabled but control plane is valid', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.cr.spec.restricted = true;
    initialState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME =
      'activemq-artemis-manager-ca';
    initialState.BASE_PROMETHEUS_CERT_SECRET_NAME = 'prometheus-cert';
    initialState.restrictedDataPlane = {
      ...getValidRestrictedDataPlane(),
      securedAcceptor: {
        ...getValidRestrictedDataPlane().securedAcceptor,
        enabled: false,
      },
    };
    initialState.secretValidationResults = {
      [MandatorySecretsToWatchFor.OPERATOR_CA]: 'activemq-artemis-manager-ca',
      [MandatorySecretsToWatchFor.BROKER_CERT]: 'my-broker-broker-cert',
    };

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(true);
  });

  it('should return false when one secret validation is missing', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.cr.spec.restricted = true;
    initialState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME =
      'activemq-artemis-manager-ca';
    initialState.BASE_PROMETHEUS_CERT_SECRET_NAME = 'prometheus-cert';
    initialState.restrictedDataPlane = getValidRestrictedDataPlane();
    initialState.secretValidationResults = {
      [MandatorySecretsToWatchFor.OPERATOR_CA]: 'activemq-artemis-manager-ca',
      // BROKER_CERT is missing
    };

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(false);
  });

  it('should return false when secret validation result is empty string', () => {
    const initialState = newArtemisCR('namespace') as FormStateRestricted;
    initialState.cr.spec.restricted = true;
    initialState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME =
      'activemq-artemis-manager-ca';
    initialState.BASE_PROMETHEUS_CERT_SECRET_NAME = 'prometheus-cert';
    initialState.restrictedDataPlane = getValidRestrictedDataPlane();
    initialState.secretValidationResults = {
      [MandatorySecretsToWatchFor.OPERATOR_CA]: '', // Empty string = not found
      [MandatorySecretsToWatchFor.BROKER_CERT]: 'broker-cert',
    };

    const result = areMandatoryValuesSetRestricted(initialState);
    expect(result).toBe(false);
  });
});
