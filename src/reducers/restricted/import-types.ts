import { FormState713 } from '../7.13/import-types';

export type RestrictedDataPlaneStatus = 'idle' | 'syncing' | 'ready' | 'error';

export type RestrictedDataPlanePermissions = {
  browse: boolean;
  consume: boolean;
  send: boolean;
  view: boolean;
};

export type RestrictedDataPlaneState = {
  securedAcceptor: {
    enabled: boolean;
    port?: string;
    securityDomain?: string;
  };
  address: {
    name?: string;
    routingType?: 'ANYCAST' | 'MULTICAST';
  };
  role: {
    name?: string;
    permissions: RestrictedDataPlanePermissions;
  };
  clientCN?: string;
  consent?: boolean;
  jaasSecretStatus?: {
    status: RestrictedDataPlaneStatus;
    message?: string;
  };
  amqpsSecretStatus?: {
    status: RestrictedDataPlaneStatus;
    message?: string;
  };
};

export interface FormStateRestricted extends FormState713 {
  ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME?: string;
  BASE_PROMETHEUS_CERT_SECRET_NAME?: string;
  OPERATOR_NAMESPACE?: string;
  restrictedDataPlane?: RestrictedDataPlaneState;
  // Map of validation flag to found secret name
  // Empty string or undefined = not found
  secretValidationResults?: Record<string, string>;
}
