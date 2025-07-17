import { FC, useContext, useMemo, useRef, useState } from 'react';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import {
  ArtemisReducerOperations712,
  getAcceptor,
  getCertManagerResourceTemplateFromAcceptor,
  getConfigSecret,
} from '@app/reducers/7.12/reducer';
import { CertModel } from '@app/k8s/models';
import { K8sResourceCommonWithData } from '@app/k8s/types';
import {
  k8sCreate,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as x509 from '@peculiar/x509';
import {
  Alert,
  Button,
  FormGroup,
  InputGroup,
  Tooltip,
  InputGroupItem,
  Icon,
  Modal,
  ModalVariant,
  Form,
  FormFieldGroup,
  ButtonVariant,
  FormHelperText,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import base64 from 'base-64';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { CertificateDetailsModal } from './CertificateDetailsModal/CertificateDetailsModal';
import { PresetAlertPopover } from '../AcceptorsConfigPage/AcceptorConfigSection/AcceptorConfigPage/PresetAlertPopover/PresetAlertPopover';
import { ConfigType } from '../ConfigurationPage';
import { useHasCertManager } from '../../../../../k8s/customHooks';
import { useTranslation } from '@app/i18n/i18n';
import { SelectIssuerDrawer } from '../AcceptorsConfigPage/AcceptorConfigSection/SelectIssuerDrawer/SelectIssuerDrawer';
import {
  TypeaheadSelect,
  TypeaheadSelectOption,
} from '@patternfly/react-templates';

/**
 * This function will generate a certificate for the targeted configType with
 * correctly populated dnsNames.
 * The cert generation will require having access to a cluster issuer
 * @param clusterIssuer The name of the ClusterIssuer.
 * @param certName The name of the Certificate resource.
 * @param namespace The namespace to create the Certificate in.
 * @param commonName The common name for the certificate.
 * @param secretName The name of the secret to store the certificate in.
 * @param dnsNames An array of DNS names for the certificate.
 * @returns A promise that resolves with the created Certificate resource.
 */
const createCert = async (
  clusterIssuer: string,
  certName: string,
  namespace: string,
  commonName: string,
  secretName: string,
  dnsNames: string[],
) => {
  // The dns names must have an entry for every replicas of the brokers.
  const issuerCa = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'Certificate',
    metadata: {
      name: certName,
      namespace: namespace,
    },
    spec: {
      commonName: commonName,
      dnsNames: dnsNames,
      secretName: secretName,
      privateKey: {
        algorithm: 'RSA',
        encoding: 'PKCS1',
        size: 2048,
      },
      isCA: false,
      issuerRef: {
        name: clusterIssuer,
        kind: 'ClusterIssuer',
        group: 'cert-manager.io',
      },
    },
  };

  return await k8sCreate({ model: CertModel, data: issuerCa });
};

interface GenerateCertificateModalProps {
  /** The type of configuration (e.g., acceptor, connector). */
  configType: ConfigType;
  /** The name of the specific configuration instance. */
  configName: string;
  /** Controls the visibility of the modal. */
  isModalOpen: boolean;
  /** The state setter function to toggle the modal's visibility. */
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * A modal component that allows users to generate a certificate for the console
 * or acceptors/connectors. It provides a form to input the necessary details
 * and submit the request to create the certificate.
 *
 * @param props The properties for the modal.
 */
const GenerateCertificateModal: FC<GenerateCertificateModalProps> = ({
  configType,
  configName,
  isModalOpen,
  setIsModalOpen,
}) => {
  const [error, setError] = useState('');
  const { t } = useTranslation();
  const handleModalToggle = () => {
    setSelectedIssuer('');
    setError('');
    setIsModalOpen(!isModalOpen);
  };
  const dispatch = useContext(BrokerCreationFormDispatch);
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const { cr } = useContext(BrokerCreationFormState);

  const isConsole = !(
    configType === ConfigType.acceptors || configType === ConfigType.connectors
  );
  const dnsNames = [].concat(
    ...[...Array(cr.spec.deploymentPlan.size).keys()].map((i) =>
      isConsole
        ? [
            cr.metadata.name +
              '-wconsj-' +
              i +
              '-svc-rte-' +
              cr.metadata.namespace +
              '.' +
              cr.spec.ingressDomain,
            cr.metadata.name +
              '-wconsj-' +
              i +
              '-svc-ing-' +
              cr.metadata.namespace +
              '.' +
              cr.spec.ingressDomain,
            cr.metadata.name + '-wconsj-' + i + '-svc.' + cr.metadata.namespace,
          ]
        : [
            cr.metadata.name +
              '-ss-' +
              i +
              '.' +
              cr.metadata.name +
              '-hdls-svc.' +
              cr.metadata.namespace +
              '.svc.cluster.local',
          ],
    ),
  );
  const certName = cr.metadata.name + '-' + configType + '-cert';
  const commonName = cr.metadata.name + '-' + configType;
  const secretName = cr.metadata.name + '-' + configType + '-cert-secret';
  const handleGenerateCertificate = () => {
    if (selectedIssuer === '') {
      return;
    }
    createCert(
      selectedIssuer,
      certName,
      cr.metadata.namespace,
      commonName,
      secretName,
      dnsNames,
    )
      .then(() => {
        let operation = ArtemisReducerOperations712.setConsoleSecret;
        if (configType === ConfigType.acceptors) {
          operation = ArtemisReducerOperations712.setAcceptorSecret;
        }
        if (configType === ConfigType.connectors) {
          operation = ArtemisReducerOperations712.setConnectorSecret;
        }
        dispatch({
          operation: operation,
          payload: {
            name: configName,
            secret: cr.metadata.name + '-' + configType + '-cert-secret',
            isCa: false,
          },
        });
        handleModalToggle();
      })
      .catch((error) => setError(error.message));
  };
  return (
    <Modal
      variant={ModalVariant.medium}
      title={t('Generate a certificate')}
      isOpen={isModalOpen}
      onClose={handleModalToggle}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={handleGenerateCertificate}
          isDisabled={selectedIssuer === ''}
        >
          {t('Confirm')}
        </Button>,
        <Button key="cancel" variant="link" onClick={handleModalToggle}>
          {t('Cancel')}
        </Button>,
      ]}
    >
      <Form isWidthLimited isHorizontal>
        {error && (
          <Alert title={t('Cert generation failed')} variant="danger">
            {error}
          </Alert>
        )}
        <FormHelperText>
          {t('Generate a cert with the following information')}
        </FormHelperText>
        <DescriptionList
          columnModifier={{
            default: '2Col',
          }}
        >
          <DescriptionListGroup>
            <DescriptionListTerm>{t('name')}</DescriptionListTerm>
            <DescriptionListDescription>{certName}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('namespace')}</DescriptionListTerm>
            <DescriptionListDescription>
              {cr.metadata.namespace}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('common name (cn)')}</DescriptionListTerm>
            <DescriptionListDescription>
              {commonName}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('secret name')}</DescriptionListTerm>
            <DescriptionListDescription>
              {secretName}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {dnsNames.map((dns, index) => (
            <DescriptionListGroup key={index}>
              <DescriptionListTerm>
                {t('dns name') + index + ' (dn)'}
              </DescriptionListTerm>
              <DescriptionListDescription>{dns}</DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>
        <FormFieldGroup>
          <FormGroup label={t('Cluster Issuer')} isRequired>
            <SelectIssuerDrawer
              selectedIssuer={selectedIssuer}
              setSelectedIssuer={setSelectedIssuer}
              clearIssuer={() => setSelectedIssuer('')}
              disableCreation
              isClusterIssuer
            />
          </FormGroup>
        </FormFieldGroup>
      </Form>
    </Modal>
  );
};

const secretGroupVersionKind = {
  group: 'core',
  kind: 'Secret',
  version: 'v1',
};

/**
 * Checks if a given key exists in the data object of a secret.
 * @param data The object to check.
 * @param key The key to look for.
 * @returns True if the key exists, false otherwise.
 */
const hasKey = (data: object, key: string): boolean => {
  if (data instanceof Object) {
    return key in data;
  }
  return false;
};

type CreateSecretOptionsPropTypes = {
  /** An array of custom secret names to include in the options list. */
  customOptions?: string[];
  /** An array of secrets managed by cert-manager. */
  certManagerSecrets: K8sResourceCommonWithData[];
  /** An array of legacy secrets. */
  legacySecrets: K8sResourceCommonWithData[];
};

/**
 * A custom hook that generates a list of options for a typeahead select component.
 * It filters out secrets that are not relevant for the current context,
 * including those that are legacy or already included in the custom options.
 * It returns a list of TypeaheadSelectOption objects that can be used in an
 * autocomplete or typeahead input.
 *
 * @param props The properties for the hook.
 * @returns A list of options for the typeahead select.
 */
const useCreateSecretOptions = ({
  customOptions,
  certManagerSecrets,
  legacySecrets,
}: CreateSecretOptionsPropTypes): TypeaheadSelectOption[] => {
  const nonptlsSecrets = certManagerSecrets
    .filter((secret) => {
      return !secret.metadata.name.endsWith('-ptls');
    })
    .map((option) => option.metadata.name);
  const filteredCustomOptions = customOptions.filter(
    (option) =>
      !nonptlsSecrets.find((s) => s === option) &&
      !legacySecrets.find((s) => s.metadata.name.startsWith(option)),
  );
  const options = [
    ...filteredCustomOptions,
    ...nonptlsSecrets,
    ...legacySecrets.map((option) => option.metadata.name),
  ];
  return options.map((option) => {
    return { content: option, value: option };
  });
};

/**
 * Checks if a given secret is a legacy secret.
 * A legacy secret is defined as one that does not have the
 * 'aa-spp-generated' annotation and contains specific keys in its data.
 * It checks for the presence of keys like 'broker.ks', 'keyStorePassword',
 * 'client.ts', and 'trustStorePassword'.
 * @param secret - The secret to check.
 * @returns Returns true if the secret is a legacy secret, false
 * otherwise.
 */
const isLegacySecret = (secret: K8sResourceCommonWithData): boolean => {
  return (
    !(
      secret.metadata?.annotations &&
      'aa-spp-generated' in secret.metadata.annotations
    ) &&
    hasKey(secret.data, 'broker.ks') &&
    hasKey(secret.data, 'keyStorePassword') &&
    hasKey(secret.data, 'client.ts') &&
    hasKey(secret.data, 'trustStorePassword')
  );
};

/**
 * Checks if a secret is a cert-manager secret.
 * For a CA, it checks for the 'trust.cert-manager.io/hash' annotation.
 * For a regular cert, it checks for the 'cert-manager.io/issuer-name' annotation.
 * @param secret The Kubernetes secret resource.
 * @param isCa Whether to check for a CA bundle secret.
 * @returns True if the secret is a cert-manager secret, false otherwise.
 */
const isCertSecret = (
  secret: K8sResourceCommonWithData,
  isCa: boolean,
): boolean => {
  if (!secret.metadata || !secret.metadata.annotations) {
    return false;
  }
  if (isCa) {
    if (
      secret.metadata.annotations &&
      'trust.cert-manager.io/hash' in secret.metadata.annotations
    ) {
      return true;
    }
  } else if (
    secret.metadata.annotations &&
    'cert-manager.io/issuer-name' in secret.metadata.annotations
  ) {
    return true;
  }
  return false;
};

/**
 * Checks if the selected secret is a valid cert-manager secret. It filters the list of
 * cert-manager secrets to find one that matches the selected secret name.
 *
 * @param selectedSecret The name of the selected secret.
 * @param certManagerSecrets An array of cert-manager secrets.
 * @returns Returns true if the selected secret is found in the
 * certManagerSecrets array, false otherwise.
 */
const isKnownCertManagerSecret = (
  selectedSecret: string,
  certManagerSecrets: K8sResourceCommonWithData[],
): boolean => {
  const theSecret = certManagerSecrets.filter((value) => {
    return value.metadata.name === selectedSecret;
  });
  return theSecret.length === 1;
};

/**
 * Takes a PEM formatted string and extracts X.509 certificates from it.
 * It splits the PEM string into individual certificates, removes the header
 * and footer, and creates an X.509 certificate object for each one.
 *
 * @param pem The PEM formatted string containing one or more
 * certificates.
 * @returns An array of X.509 certificate objects
 * parsed from the PEM string.
 */
const parseCertsFromPem = (pem: string): x509.X509Certificate[] => {
  const certs: x509.X509Certificate[] = [];
  let certPems = pem.split(
    /-----BEGIN CERTIFICATE-----\n|-----END CERTIFICATE-----\n/g,
  );
  certPems = certPems.filter((value) => {
    return value !== '';
  });
  for (let i = 0; i < certPems.length; i++) {
    const pemStr = certPems[i].replace(/\n/g, '');
    const cert = new x509.X509Certificate(pemStr);
    certs.push(cert);
  }
  return certs;
};

/**
 * Custom hook that parses a list of secrets and categorizes them.
 * It separates secrets managed by cert-manager from legacy secrets.
 *
 * @param secrets The list of Kubernetes secret resources.
 * @param isCa Indicates if the secrets are for a Certificate Authority.
 * @returns An object containing two arrays: `certManagerSecrets` and `legacySecrets`.
 */
const useParseSecrets = (
  secrets: K8sResourceCommonWithData[],
  isCa: boolean,
): {
  certManagerSecrets: K8sResourceCommonWithData[];
  legacySecrets: K8sResourceCommonWithData[];
} => {
  const certSecrets = secrets.filter((x) => {
    return isCertSecret(x, isCa);
  });
  const legacySecrets = secrets.filter((x) => {
    return isLegacySecret(x);
  });
  return { certManagerSecrets: certSecrets, legacySecrets: legacySecrets };
};

/**
 * Props for the CertSecretSelector component.
 */
type CertSecretSelectorProps = {
  /** The namespace in which the secrets are located. */
  namespace: string;
  /** Indicates if the secrets are for a Certificate Authority (CA). */
  isCa: boolean;
  /** The type of configuration being managed (acceptors, connectors, console). */
  configType: ConfigType;
  /** The name of the configuration for which the secret is being selected. */
  configName: string;
  /** Indicates if the user can set custom names for the secrets. */
  canSetCustomNames?: boolean;
};

/**
 * A component for selecting a Kubernetes secret that contains a certificate.
 *
 * This component provides a typeahead select input to choose from existing secrets.
 * It can differentiate between secrets managed by cert-manager and legacy secrets.
 * It also provides functionality to:
 * - View certificate details.
 * - Generate a new certificate using cert-manager if it's available.
 * - Override the selected secret with a custom name if allowed.
 *
 * @param props The properties for the component.
 * @returns The `CertSecretSelector` component.
 */
export const CertSecretSelector: FC<CertSecretSelectorProps> = ({
  namespace,
  isCa,
  configType,
  configName,
  canSetCustomNames,
}) => {
  const { cr } = useContext(BrokerCreationFormState);
  const { t } = useTranslation();
  const dispatch = useContext(BrokerCreationFormDispatch);

  /**
   * Watches for Kubernetes Secret resources in the specified namespace.
   * The list of secrets is automatically updated when changes occur in the cluster.
   */
  const [secrets] = useK8sWatchResource<K8sResourceCommonWithData[]>({
    isList: true,
    groupVersionKind: secretGroupVersionKind,
    namespaced: true,
    namespace: namespace,
  });

  /**
   * Split the watched secrets into two categories: those managed by cert-manager
   * and legacy secrets.
   */
  const { certManagerSecrets, legacySecrets } = useParseSecrets(secrets, isCa);
  /** Controls the visibility of the certificate details modal. */
  const [isCertDetailsModalOpen, setIsCertDetailsModalOpen] = useState(false);
  /**
   * Holds the parsed X.509 certificate objects to be displayed
   * in the details modal.
   */
  const [certsToShow, setCertsToShow] = useState<x509.X509Certificate[]>([]);
  /**
   * Holds the name of the secret whose certificate details are being shown.
   */
  const [certsToShowSecret, setCertsToShowSecret] = useState<string>('');
  /**
   * Holds the raw PEM content of the certificate being shown.
   */
  const [certsToShowPem, setCertsToShowPem] = useState<string>('');
  /**
   * Controls the visibility of the certificate generation modal.
   * `true` if the modal is open, `false` otherwise.
   */
  const [isGenerateCertModalOpen, setIsGenerateCertModalOpen] = useState(false);
  /**
   * Custom hook to check if cert-manager is installed in the cluster.
   * `hasCertManager` is true if it's found, `isLoadingCertMgrPresence` is true
   * while the check is in progress.
   */
  const { hasCertManager, isLoading: isLoadingCertMgrPresence } =
    useHasCertManager();
  /**
   * A boolean flag indicating if cert-manager is installed and the check is complete.
   */
  const isCertMgrFound = hasCertManager && !isLoadingCertMgrPresence;

  /**
   * Retrieves the currently selected secret name from the form state for the
   * given configuration.
   */
  const selectedSecret = getConfigSecret(cr, configType, configName, isCa);
  const customOptions = selectedSecret ? [selectedSecret] : [];
  /**
   * Generates the list of selectable options for the typeahead input by combining
   * custom options, cert-manager secrets, and legacy secrets.
   */
  const options = useCreateSecretOptions({
    customOptions,
    certManagerSecrets,
    legacySecrets,
  });
  /**
   * The string representation of the currently selected secret.
   * This is an empty string if no secret is selected.
   */
  const stringSelectedSecret = selectedSecret ? selectedSecret.toString() : '';
  /**
   * Memoized and sorted list of options for the `TypeaheadSelect` component.
   * This prevents re-sorting on every render.
   */
  const selectOptions = useMemo<TypeaheadSelectOption[]>(
    () =>
      options
        .map((o) => ({ ...o }))
        .sort((a, b) => String(a.content).localeCompare(String(b.content))),
    [options],
  );

  /**
   * Clears the selected secret for the current configuration in the form state.
   * It dispatches an action to update the reducer with an undefined secret value.
   */
  const clearSelection = () => {
    if (configType === ConfigType.acceptors) {
      dispatch({
        operation: ArtemisReducerOperations712.setAcceptorSecret,
        payload: {
          secret: undefined,
          name: configName,
          isCa: isCa,
        },
      });
    }
    if (configType === ConfigType.connectors) {
      dispatch({
        operation: ArtemisReducerOperations712.setConnectorSecret,
        payload: {
          secret: undefined,
          name: configName,
          isCa: isCa,
        },
      });
    }
    if (configType === ConfigType.console) {
      dispatch({
        operation: ArtemisReducerOperations712.setConsoleSecret,
        payload: {
          secret: undefined,
          name: configName,
          isCa: isCa,
        },
      });
    }
  };

  /**
   * Saves the selected secret for the current configuration in the form state.
   * It dispatches an action to update the reducer with the new secret name.
   * @param value The name of the secret to save.
   */
  const saveSelection = (value: string) => {
    if (configType === ConfigType.acceptors) {
      dispatch({
        operation: ArtemisReducerOperations712.setAcceptorSecret,
        payload: {
          secret: value,
          name: configName,
          isCa: isCa,
        },
      });
    }
    if (configType === ConfigType.connectors) {
      dispatch({
        operation: ArtemisReducerOperations712.setConnectorSecret,
        payload: {
          secret: value,
          name: configName,
          isCa: isCa,
        },
      });
    }
    if (configType === ConfigType.console) {
      dispatch({
        operation: ArtemisReducerOperations712.setConsoleSecret,
        payload: {
          secret: value,
          name: configName,
          isCa: isCa,
        },
      });
    }
  };

  /**
   * A ref to the button that shows the certificate info, used for positioning the tooltip.
   */
  const showCertTooltipRef = useRef<HTMLButtonElement>(null);
  /**
   * Fetches and parses the certificate details from the selected secret and opens
   * the details modal. It handles both CA and regular TLS secrets.
   */
  const showCertInfo = () => {
    const theSecret = certManagerSecrets.filter((value) => {
      return value.metadata.name === selectedSecret;
    });
    if (theSecret.length !== 1) {
      <Alert
        variant="info"
        title={t('only support tls format secret from cert-manager')}
      />;
    }
    let pem: string;
    try {
      if (isCa) {
        Object.keys(theSecret[0].data).forEach((key) => {
          pem = base64.decode(theSecret[0].data[key]);
        });
      } else {
        pem = base64.decode(theSecret[0].data['tls.crt']);
      }
      setCertsToShow(parseCertsFromPem(pem));
      setCertsToShowSecret(theSecret[0].metadata.name);
      setCertsToShowPem(pem);
      setIsCertDetailsModalOpen(true);
    } catch (err) {
      <Alert variant="danger" title={err.message} />;
    }
  };
  const onCloseCertDetailsModal = () => {
    setIsCertDetailsModalOpen(false);
  };

  /**
   * Retrieves the cert-manager resource template from the acceptor configuration.
   * This is used to determine if a preset alert should be shown.
   */
  const certManagerResourceTemplate =
    getCertManagerResourceTemplateFromAcceptor(cr, getAcceptor(cr, configName));

  return (
    <FormGroup
      label={isCa ? 'Trust Secrets' : 'Cert Secrets'}
      fieldId={'horizontal-form-secret' + configType + configName + isCa}
      key={(isCa ? 'trust-secrets' : 'cert-secrets') + configType + configName}
      labelIcon={
        <>
          {certManagerResourceTemplate &&
            !isCa &&
            configType === ConfigType.acceptors && (
              <PresetAlertPopover
                configName={configName}
                configType={configType}
                kind="warning"
              />
            )}
        </>
      }
    >
      <CertificateDetailsModal
        isModalOpen={isCertDetailsModalOpen}
        certs={certsToShow}
        secretName={certsToShowSecret}
        pem={certsToShowPem}
        onCloseModal={onCloseCertDetailsModal}
      ></CertificateDetailsModal>
      <Tooltip
        content={
          <>
            {stringSelectedSecret ? (
              <div>
                {t('Show cert details of')} {stringSelectedSecret}
              </div>
            ) : (
              <div>{t('Select a secret to see its details')}</div>
            )}
          </>
        }
        triggerRef={showCertTooltipRef}
      />
      <InputGroup>
        <InputGroupItem>
          <TypeaheadSelect
            selectOptions={selectOptions}
            placeholder={
              isCa ? t('Select a Trust bundle') : t('select a certificate')
            }
            noOptionsFoundMessage={(filter) =>
              `No state was found for "${filter}"`
            }
            onClearSelection={() => clearSelection()}
            onSelect={(_ev, selectedValue) => {
              const selection = String(selectedValue);
              saveSelection(selection);
            }}
            selected={selectedSecret}
            isCreatable={canSetCustomNames}
            isCreateOptionOnTop={true}
          />
        </InputGroupItem>
        <InputGroupItem>
          <Button
            variant="secondary"
            aria-label="View cert"
            onClick={showCertInfo}
            ref={showCertTooltipRef}
            isDisabled={
              stringSelectedSecret === '' ||
              !isKnownCertManagerSecret(selectedSecret, certManagerSecrets)
            }
          >
            <Icon size="sm">
              <InfoCircleIcon />
            </Icon>
          </Button>
        </InputGroupItem>
        {!isCa && (
          <>
            {isCertMgrFound ? (
              <>
                <GenerateCertificateModal
                  isModalOpen={isGenerateCertModalOpen}
                  setIsModalOpen={setIsGenerateCertModalOpen}
                  configName={configName}
                  configType={configType}
                />
                <Button
                  variant={ButtonVariant.secondary}
                  onClick={() => setIsGenerateCertModalOpen(true)}
                >
                  {t('Generate')}
                </Button>
              </>
            ) : (
              <Tooltip content={t('Generation disabled: Install CertManager')}>
                <Button isAriaDisabled variant="secondary">
                  {t('Generate')}
                </Button>
              </Tooltip>
            )}
          </>
        )}
      </InputGroup>
    </FormGroup>
  );
};
