import { FC, useContext, useRef, useState } from 'react';
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
import {
  Select,
  SelectGroup,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
} from '@patternfly/react-core/deprecated';
import base64 from 'base-64';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { CertificateDetailsModal } from './CertificateDetailsModal/CertificateDetailsModal';
import { PresetAlertPopover } from '../AcceptorsConfigPage/AcceptorConfigSection/AcceptorConfigPage/PresetAlertPopover/PresetAlertPopover';
import { ConfigType } from '../ConfigurationPage';
import { useHasCertManager } from '../../../../../k8s/customHooks';
import { useTranslation } from '@app/i18n/i18n';
import { SelectIssuerDrawer } from '../AcceptorsConfigPage/AcceptorConfigSection/SelectIssuerDrawer/SelectIssuerDrawer';

/**
 * This function will generate a certificate for the targeted configType with
 * correctly populated dnsNames.
 * The cert generation will require having access to a cluster issuer
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
interface GenerateCertModalProps {
  configType: ConfigType;
  configName: string;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
const GenerateConsoleCertModal: FC<GenerateCertModalProps> = ({
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
  const createAnnotation = () => {
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
            secret: {
              toString() {
                return cr.metadata.name + '-' + configType + '-cert-secret';
              },
            },
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
          onClick={createAnnotation}
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

const useCreateSecretOptions = ({
  customOptions,
  certManagerSecrets,
  legacySecrets,
  configType,
  configName,
  isCa,
}: CreateSecretOptionsPropTypes) => {
  const filteredCustomOptions = customOptions.filter(
    (option) =>
      !certManagerSecrets.find((s) => s.metadata.name.startsWith(option)) &&
      !legacySecrets.find((s) => s.metadata.name.startsWith(option)),
  );
  const ptlsSecrets = certManagerSecrets.filter((secret) => {
    return secret.metadata.name.endsWith('-ptls');
  });
  const nonptlsSecrets = certManagerSecrets.filter((secret) => {
    return !secret.metadata.name.endsWith('-ptls');
  });
  const { t } = useTranslation();
  return [
    filteredCustomOptions.length > 0 && (
      <SelectGroup
        label={t('Custom secret name"')}
        key={'customOptions' + configType + configName + isCa}
      >
        {filteredCustomOptions.map((secret, index) => (
          <SelectOption key={'cO' + index} value={secret} label={secret} />
        ))}
      </SelectGroup>
    ),
    nonptlsSecrets.length > 0 && (
      <SelectGroup
        label={t('Cert manager certs')}
        key={'cert-manager-certs' + configType + configName + isCa}
      >
        {nonptlsSecrets.map((secret, index) => (
          <SelectOption
            key={'cm' + index}
            value={secret.metadata.name}
            label={secret.metadata.name}
          />
        ))}
      </SelectGroup>
    ),
    legacySecrets.length > 0 && (
      <SelectGroup
        label={t('Legacy certs')}
        key={'legacy-certs' + configType + configName + isCa}
      >
        {legacySecrets.map((secret, index) => (
          <SelectOption
            key={'lg' + index}
            value={secret.metadata.name}
            label={secret.metadata.name}
          />
        ))}
      </SelectGroup>
    ),
    ptlsSecrets.length > 0 && (
      <SelectGroup
        label={t('Reserved -plts secrets')}
        key={'reserved-certs' + configType + configName + isCa}
      >
        {ptlsSecrets.map((secret, index) => (
          <SelectOption
            isDisabled
            key={'cm' + index}
            value={secret.metadata.name}
            label={secret.metadata.name}
          />
        ))}
      </SelectGroup>
    ),
  ];
};

type CreateSecretOptionsPropTypes = {
  customOptions?: string[];
  certManagerSecrets: K8sResourceCommonWithData[];
  legacySecrets: K8sResourceCommonWithData[];
  configType: ConfigType;
  configName: string;
  isCa: boolean;
};
type CertSecretSelectorProps = {
  namespace: string;
  isCa: boolean;
  configType: ConfigType;
  configName: string;
  canSetCustomNames?: boolean;
};

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

  const [secrets] = useK8sWatchResource<K8sResourceCommonWithData[]>({
    isList: true,
    groupVersionKind: secretGroupVersionKind,
    namespaced: true,
    namespace: namespace,
  });

  const selectedSecret = getConfigSecret(cr, configType, configName, isCa);

  const [isOpen, setIsOpen] = useState(false);

  const onToggle = (isOpen: boolean) => {
    setIsOpen(isOpen);
  };

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
    setIsOpen(false);
  };

  const onSelect = (
    _event: React.MouseEvent | React.ChangeEvent,
    value: SelectOptionObject,
    isPlaceholder: boolean,
  ) => {
    if (isPlaceholder) {
      clearSelection();
    } else {
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
      setIsOpen(false);
    }
  };

  //Cert_annotation_key   = "cert-manager.io/issuer-name"
  //Bundle_annotation_key = "trust.cert-manager.io/hash"
  const isCertSecret = (secret: K8sResourceCommonWithData): boolean => {
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

  const hasKey = (data: any, key: string): boolean => {
    if (data instanceof Object) {
      return key in data;
    }
    return false;
  };

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

  const parseSecrets = (): {
    certManagerSecrets: K8sResourceCommonWithData[];
    legacySecrets: K8sResourceCommonWithData[];
  } => {
    const certSecrets = secrets.filter((x) => {
      return isCertSecret(x);
    });
    const legacySecrets = secrets.filter((x) => {
      return isLegacySecret(x);
    });
    return { certManagerSecrets: certSecrets, legacySecrets: legacySecrets };
  };

  const { certManagerSecrets, legacySecrets } = parseSecrets();

  const [isCertDetailsModalOpen, setIsCertDetailsModalOpen] = useState(false);
  const [certsToShow, setCertsToShow] = useState<x509.X509Certificate[]>([]);
  const [certsToShowSecret, setCertsToShowSecret] = useState<string>('');
  const [sertsToShowPem, setCertsToShowPem] = useState<string>('');
  const [showPresetModal, setShowPresetModal] = useState(false);

  const onCloseCertDetailsModel = () => {
    setIsCertDetailsModalOpen(false);
  };

  const { hasCertManager, isLoading: isLoadingCertMgrPresence } =
    useHasCertManager();
  const certMgrFound = hasCertManager && !isLoadingCertMgrPresence;

  const [customOptions, setCustomOptions] = useState<string[]>([
    selectedSecret.toString(),
  ]);
  const secretOptions = useCreateSecretOptions({
    customOptions,
    certManagerSecrets,
    legacySecrets,
    configType,
    configName,
    isCa,
  });

  const isSelectCertSecret = (): boolean => {
    const theSecret = certManagerSecrets.filter((value) => {
      return value.metadata.name === selectedSecret.toString();
    });
    return theSecret.length === 1;
  };

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

  const showCertInfo = () => {
    const theSecret = certManagerSecrets.filter((value) => {
      return value.metadata.name === selectedSecret.toString();
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
  const showCertTooltipRef = useRef<HTMLButtonElement>(null);
  const rt = getCertManagerResourceTemplateFromAcceptor(
    cr,
    getAcceptor(cr, configName),
  );
  const stringSelectedSecret = selectedSecret ? selectedSecret.toString() : '';
  return (
    <FormGroup
      label={isCa ? 'Trust Secrets' : 'Cert Secrets'}
      fieldId={'horizontal-form-secret' + configType + configName + isCa}
      key={(isCa ? 'trust-secrets' : 'cert-secrets') + configType + configName}
      labelIcon={
        <>
          {rt && !isCa && configType === ConfigType.acceptors && (
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
        pem={sertsToShowPem}
        onCloseModal={onCloseCertDetailsModel}
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
          <Select
            id={'select-secrets' + isCa + configType + configName}
            key={'key-select-secrets' + isCa + configType + configName}
            variant={SelectVariant.typeahead}
            typeAheadAriaLabel="Select a secret"
            onToggle={(_event, isOpen: boolean) => onToggle(isOpen)}
            onSelect={onSelect}
            onClear={clearSelection}
            selections={selectedSecret}
            isOpen={isOpen}
            aria-labelledby={'grouped-typeahead-select-id'}
            placeholderText="Select a Secret"
            isGrouped
            menuAppendTo={() => document.body}
            isCreatable={canSetCustomNames}
            createText="override with custom name:"
            onCreateOption={(v) => setCustomOptions([...customOptions, v])}
          >
            {secretOptions}
          </Select>
        </InputGroupItem>
        <InputGroupItem>
          <Button
            variant="secondary"
            aria-label="View cert"
            onClick={showCertInfo}
            ref={showCertTooltipRef}
            isDisabled={stringSelectedSecret === '' || !isSelectCertSecret()}
          >
            <Icon size="sm">
              <InfoCircleIcon />
            </Icon>
          </Button>
        </InputGroupItem>
        {!isCa && (
          <>
            {certMgrFound ? (
              <>
                <GenerateConsoleCertModal
                  isModalOpen={showPresetModal}
                  setIsModalOpen={setShowPresetModal}
                  configName={configName}
                  configType={configType}
                />
                <Button
                  variant={ButtonVariant.secondary}
                  onClick={() => setShowPresetModal(true)}
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
