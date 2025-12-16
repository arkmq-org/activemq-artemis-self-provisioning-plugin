import { FC, useContext, useState } from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  InputGroup,
  InputGroupItem,
  Popover,
  Spinner,
  TextInput,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { HelpIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { useTranslation } from '@app/i18n/i18n';
import { BrokerCreationFormState } from '@app/reducers/reducer';
import { FormStateRestricted } from '@app/reducers/restricted/import-types';
import {
  MandatorySecretsToWatchFor,
  SecretsToWatchFor,
} from '@app/reducers/restricted/reducer';
import styles from '@patternfly/react-styles/css/components/Form/form';
import { GenerateRestrictedCertModal } from './GenerateRestrictedCertModal';
import { CertificateDetailsModal } from '@app/shared-components/FormView/BrokerProperties/ConfigurationPage/CertSecretSelector/CertificateDetailsModal/CertificateDetailsModal';
import * as x509 from '@peculiar/x509';
import {
  k8sGet,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { SecretModel } from '@app/k8s/models';

interface K8sSecret extends K8sResourceCommon {
  data?: Record<string, string>;
}

type CertSecretFinderProps = {
  /** The expected secret names (for placeholder display only) */
  expectedSecretNames: string[];
  /** The validation flag to read from formState.secretValidationResults */
  validationFlag: SecretsToWatchFor;
  /** The label for the form field */
  label: string;
  /** The field ID for accessibility */
  fieldId: string;
  /** Optional help text for the label icon */
  helpText?: string;
  /** Whether to show the Generate button (default: true) */
  showGenerateButton?: boolean;
  /** The secret key to read certificate data from (default: 'tls.crt') */
  secretDataKey?: 'tls.crt' | 'ca.pem';
};

/**
 * A component that displays the validation status of Kubernetes secrets.
 * It reads from formState.secretValidationResults to show which secret was found.
 * The actual watching is done at a higher level (RestrictedConfiguration) to ensure
 * validation works regardless of which tab the user is viewing.
 *
 * @param props The properties for the component.
 */
export const CertSecretFinder: FC<CertSecretFinderProps> = ({
  expectedSecretNames,
  validationFlag,
  label,
  fieldId,
  helpText,
  showGenerateButton = true,
  secretDataKey = 'tls.crt',
}) => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState) as FormStateRestricted;
  const [parseError, setParseError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCertDetailsModalOpen, setIsCertDetailsModalOpen] = useState(false);
  const [certDetails, setCertDetails] = useState<{
    certs: x509.X509Certificate[];
    pem: string;
  } | null>(null);
  const namespace = formState.cr.metadata?.namespace;

  /**
   * Read the validation result from formState (set by useSecretWatcher at top level)
   * undefined = still loading, empty string = secret not found, non-empty = found secret name
   */
  const validationResult = formState.secretValidationResults?.[validationFlag];
  const isLoading = validationResult === undefined;
  const secretName = validationResult || '';
  const exists = secretName !== '';

  // Check if operator CA exists - needed for broker cert generation
  const operatorCaExists =
    !!formState.secretValidationResults?.[
      MandatorySecretsToWatchFor.OPERATOR_CA
    ];

  // Disable broker cert generation if operator CA is missing
  // Only broker certs use this modal, so check if this is a broker cert field
  const isBrokerCertField =
    validationFlag === MandatorySecretsToWatchFor.BROKER_CERT;
  const isGenerateDisabled = isBrokerCertField && !operatorCaExists;

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  /**
   * Fetch and parse certificate details from the Kubernetes secret
   */
  const handleViewCertificate = async () => {
    if (!secretName || !namespace) {
      return;
    }

    try {
      // Fetch the secret from Kubernetes
      const secret = await k8sGet<K8sSecret>({
        model: SecretModel,
        name: secretName,
        ns: namespace,
      });

      // Extract the certificate data from the secret
      // Certificates are in 'tls.crt' for TLS secrets, 'ca.pem' for CA bundles
      const certData = secret.data?.[secretDataKey];
      if (!certData) {
        setParseError(
          t('Certificate data not found in secret (key: {{key}})', {
            key: secretDataKey,
          }),
        );
        return;
      }

      // Decode base64
      const pemData = atob(certData);

      // Parse the certificate(s)
      const certs: x509.X509Certificate[] = [];
      const certMatches = pemData.match(
        /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
      );

      if (certMatches) {
        for (const certPem of certMatches) {
          const cert = new x509.X509Certificate(certPem);
          certs.push(cert);
        }
      }

      if (certs.length === 0) {
        setParseError(t('No valid certificates found in secret'));
        return;
      }

      // Store the certificate details and open the modal
      setCertDetails({ certs, pem: pemData });
      setIsCertDetailsModalOpen(true);
      setParseError(null);
    } catch (error) {
      setParseError(
        t('Failed to load certificate: {{error}}', {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  };

  return (
    <FormGroup
      label={label}
      fieldId={fieldId}
      isRequired
      labelIcon={
        helpText ? (
          <Popover
            headerContent={<div>{label}</div>}
            bodyContent={<div>{helpText}</div>}
          >
            <button
              type="button"
              aria-label={`More info for ${label} field`}
              onClick={(e) => e.preventDefault()}
              aria-describedby={`${fieldId}-info`}
              className={styles.formGroupLabelHelp}
            >
              <HelpIcon />
            </button>
          </Popover>
        ) : undefined
      }
    >
      {parseError && (
        <Alert
          variant="danger"
          title={parseError}
          isInline
          actionClose={
            <AlertActionCloseButton onClose={() => setParseError(null)} />
          }
        />
      )}
      <InputGroup>
        <InputGroupItem isFill>
          <TextInput
            value={secretName}
            type="text"
            id={fieldId}
            name={fieldId}
            isDisabled
            validated={
              exists ? ValidatedOptions.success : ValidatedOptions.error
            }
            placeholder={
              exists
                ? ''
                : t('Secret missing: {{names}}', {
                    names: expectedSecretNames.join(' or '),
                  })
            }
          />
        </InputGroupItem>
        <InputGroupItem>
          <Tooltip
            content={
              <div>
                {isLoading
                  ? t('Checking for certificate...')
                  : exists
                  ? t('View certificate details')
                  : t('No certificate found')}
              </div>
            }
          >
            <Button
              variant="secondary"
              aria-label="View cert"
              isDisabled={!exists || isLoading}
              onClick={handleViewCertificate}
            >
              {isLoading ? (
                <Spinner size="sm" aria-label="Checking for certificate" />
              ) : (
                <Icon size="sm">
                  <InfoCircleIcon />
                </Icon>
              )}
            </Button>
          </Tooltip>
        </InputGroupItem>
        {showGenerateButton && (
          <InputGroupItem>
            <Tooltip
              content={
                <div>
                  {isGenerateDisabled
                    ? t(
                        'Operator Trust Bundle is required before generating a broker certificate',
                      )
                    : t('Generate certificate')}
                </div>
              }
            >
              <span>
                <Button
                  variant="secondary"
                  onClick={handleOpenModal}
                  isDisabled={isGenerateDisabled}
                >
                  {t('Generate')}
                </Button>
              </span>
            </Tooltip>
          </InputGroupItem>
        )}
      </InputGroup>

      {!exists && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
              {showGenerateButton
                ? t(
                    'Required certificate missing in the {{namespace}} namespace. Either import or generate one.',
                    { namespace: formState.cr.metadata?.namespace },
                  )
                : t(
                    'Required certificate missing in the {{namespace}} namespace. Please import one.',
                    { namespace: formState.cr.metadata?.namespace },
                  )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}

      {/* Certificate Generation Modal */}
      {isBrokerCertField && (
        <GenerateRestrictedCertModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
        />
      )}

      {/* Certificate Details Modal */}
      {certDetails && (
        <CertificateDetailsModal
          isModalOpen={isCertDetailsModalOpen}
          certs={certDetails.certs}
          secretName={secretName}
          pem={certDetails.pem}
          onCloseModal={() => setIsCertDetailsModalOpen(false)}
        />
      )}
    </FormGroup>
  );
};
