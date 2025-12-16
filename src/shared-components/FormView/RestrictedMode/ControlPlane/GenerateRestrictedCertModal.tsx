import { FC, useContext, useState } from 'react';
import {
  Alert,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormFieldGroup,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { useTranslation } from '@app/i18n/i18n';
import { BrokerCreationFormState } from '@app/reducers/reducer';
import { FormStateRestricted } from '@app/reducers/restricted/import-types';
import { SelectIssuerDrawer } from '../../SelectIssuerDrawer/SelectIssuerDrawer';
import { createRestrictedCert } from '@app/k8s/certManagerUtils';

interface GenerateRestrictedCertModalProps {
  /** Controls the visibility of the modal */
  isModalOpen: boolean;
  /** The state setter function to toggle the modal's visibility */
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * A modal component that allows users to generate broker certificates for restricted mode.
 * It provides a form to input the common name and select an issuer.
 *
 * @param props The properties for the modal.
 */
export const GenerateRestrictedCertModal: FC<
  GenerateRestrictedCertModalProps
> = ({ isModalOpen, setIsModalOpen }) => {
  const [error, setError] = useState('');
  const [commonName, setCommonName] = useState('');
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState) as FormStateRestricted;
  const { cr } = formState;
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [prevIsModalOpen, setPrevIsModalOpen] = useState(isModalOpen);

  const handleModalToggle = () => {
    setSelectedIssuer('');
    setCommonName('');
    setError('');
    setIsModalOpen(!isModalOpen);
  };

  // Get broker certificate details (always CR-specific)
  const getCertDetails = () => {
    if (!cr) {
      return null;
    }
    const brokerName = cr.metadata?.name;
    // Generate specific DNS names for each broker pod
    const dnsNames = [...Array(cr.spec?.deploymentPlan?.size).keys()].map(
      (i) =>
        `${brokerName}-ss-${i}.${brokerName}-hdls-svc.${cr.metadata?.namespace}.svc.cluster.local`,
    );

    const certSecretName = `${brokerName}-broker-cert`;

    return {
      certName: certSecretName,
      defaultCommonName: `${brokerName}-broker`,
      secretName: certSecretName,
      isCA: false,
      dnsNames,
      title: t('Generate Broker Certificate'),
      description: t(
        'This certificate will be used by the broker for TLS connections.',
      ),
    };
  };

  const certDetails = getCertDetails();

  // Adjust state during render: Set default common name when modal opens
  if (isModalOpen !== prevIsModalOpen) {
    setPrevIsModalOpen(isModalOpen);
    if (isModalOpen && certDetails && !commonName) {
      setCommonName(certDetails.defaultCommonName);
    }
  }

  const handleGenerateCertificate = async () => {
    if (!certDetails) {
      return;
    }
    if (selectedIssuer === '' || commonName === '') {
      return;
    }
    const namespace = cr?.metadata?.namespace;
    if (!namespace) {
      return;
    }

    try {
      // ALL certificates are created in the broker namespace
      // The operator reads secrets from the broker's namespace when connecting to that broker
      await createRestrictedCert(
        selectedIssuer,
        certDetails.certName,
        namespace,
        commonName,
        certDetails.secretName,
        certDetails.isCA,
        certDetails.dnsNames,
      );
      handleModalToggle();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate certificate',
      );
    }
  };

  if (!certDetails) {
    return null;
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      title={certDetails.title}
      isOpen={isModalOpen}
      onClose={handleModalToggle}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={handleGenerateCertificate}
          isDisabled={selectedIssuer === '' || commonName === ''}
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
          <Alert title={t('Certificate generation failed')} variant="danger">
            {error}
          </Alert>
        )}
        <FormHelperText>{certDetails.description}</FormHelperText>

        <DescriptionList
          columnModifier={{
            default: '2Col',
          }}
        >
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Certificate name')}</DescriptionListTerm>
            <DescriptionListDescription>
              {certDetails.certName}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
            <DescriptionListDescription>
              {cr.metadata?.namespace}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Secret name')}</DescriptionListTerm>
            <DescriptionListDescription>
              {certDetails.secretName}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {certDetails.dnsNames.map((dns, index) => (
            <DescriptionListGroup key={index}>
              <DescriptionListTerm>
                {t('DNS name {{index}}', { index })}
              </DescriptionListTerm>
              <DescriptionListDescription>{dns}</DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>

        <FormFieldGroup>
          <FormGroup
            label={t('Common Name (CN)')}
            isRequired
            fieldId="common-name-input"
          >
            <TextInput
              id="common-name-input"
              value={commonName}
              onChange={(_event, value) => setCommonName(value)}
              aria-label={t('Common Name')}
            />
          </FormGroup>

          <FormGroup label={t('Cluster Issuer')} isRequired>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t(
                    'Select a ClusterIssuer that is signed by the same CA as your operator trust bundle. If you are unsure which issuer to use, contact your administrator.',
                  )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <SelectIssuerDrawer
              selectedIssuer={selectedIssuer}
              setSelectedIssuer={setSelectedIssuer}
              clearIssuer={() => setSelectedIssuer('')}
              disableCreation={true}
              isClusterIssuer
            />
          </FormGroup>
        </FormFieldGroup>
      </Form>
    </Modal>
  );
};
