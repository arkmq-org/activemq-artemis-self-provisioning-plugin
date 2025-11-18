import { FormState713 } from '../7.13/import-types';

export interface FormStateRestricted extends FormState713 {
  ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME?: string;
  BASE_PROMETHEUS_CERT_SECRET_NAME?: string;
  OPERATOR_NAMESPACE?: string;
  // Map of validation flag to found secret name
  // Empty string or undefined = not found
  secretValidationResults?: Record<string, string>;
}
