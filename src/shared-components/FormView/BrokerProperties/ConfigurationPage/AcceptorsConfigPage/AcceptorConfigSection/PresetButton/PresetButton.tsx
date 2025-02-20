import {
  Button,
  ButtonVariant,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormFieldGroup,
  FormFieldGroupHeader,
  FormGroup,
  FormHelperText,
  Modal,
  ModalVariant,
  SimpleList,
  SimpleListGroup,
} from '@patternfly/react-core';
import { CSSProperties, FC, useContext, useState } from 'react';

import { useTranslation } from '@app/i18n/i18n';
import { Acceptor } from '@app/k8s/types';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import {
  ArtemisReducerOperations712,
  getCertManagerResourceTemplateFromAcceptor,
} from '@app/reducers/7.12/reducer';
import { SelectIssuerDrawer } from '../SelectIssuerDrawer/SelectIssuerDrawer';
import { useHasCertManager } from '@app/k8s/customHooks';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
type PreconfigurationButtonProps = {
  acceptor: Acceptor;
};

export type WithAcceptorProps = {
  acceptor?: Acceptor;
};

interface AddIssuerAnnotationModalProps extends WithAcceptorProps {
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddPresetModal: FC<AddIssuerAnnotationModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  acceptor: initialAcceptor,
}) => {
  const { t } = useTranslation();
  const handleModalToggle = () => {
    setIsModalOpen(!isModalOpen);
  };
  const dispatch = useContext(BrokerCreationFormDispatch);
  const [selectedIssuer, setSelectedIssuer] = useState<string>('');
  const [selectedAcceptor, setSelectedAcceptor] = useState<string>(
    initialAcceptor ? initialAcceptor.name : '',
  );
  const [prevInitialAcceptor, setPrevInitialAcceptor] =
    useState(initialAcceptor);
  if (prevInitialAcceptor !== initialAcceptor) {
    setSelectedAcceptor(initialAcceptor ? initialAcceptor.name : '');
    setPrevInitialAcceptor(initialAcceptor);
  }

  const createAnnotation = () => {
    if (selectedIssuer === '' || selectedAcceptor === '') {
      return;
    }
    dispatch({
      operation: ArtemisReducerOperations712.activatePEMGenerationForAcceptor,
      payload: {
        acceptor: selectedAcceptor,
        issuer: selectedIssuer,
      },
    });
    setShowCertManagerForm(false);
    setSelectedIssuer('');
    handleModalToggle();
  };

  const { cr } = useContext(BrokerCreationFormState);
  const hasACertManagerAnnotation =
    getCertManagerResourceTemplateFromAcceptor(cr, initialAcceptor) !==
    undefined;
  const [showCertManagerForm, setShowCertManagerForm] = useState(false);
  const { hasCertManager, isLoading: isLoadingCertManagerAvailability } =
    useHasCertManager();
  const isCertMangerDependencySatisfied =
    hasCertManager && !isLoadingCertManagerAvailability;
  const onChange = (event: React.FormEvent<HTMLInputElement>) => {
    if (event.currentTarget.id === 'certmanagerandingress') {
      if (!isCertMangerDependencySatisfied) {
        return;
      }
      if (hasACertManagerAnnotation) {
        return;
      }
      setShowCertManagerForm(!showCertManagerForm);
    }
  };
  return (
    <Modal
      variant={ModalVariant.medium}
      title={t('Select a preset')}
      isOpen={isModalOpen}
      onClose={handleModalToggle}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={createAnnotation}
          isDisabled={selectedIssuer === '' || selectedAcceptor === ''}
        >
          {t('Confirm')}
        </Button>,
        <Button key="cancel" variant="link" onClick={handleModalToggle}>
          {t('Cancel')}
        </Button>,
      ]}
    >
      <Form isWidthLimited>
        <FormFieldGroup
          header={
            <FormFieldGroupHeader
              titleText={{
                text: t('Choose a preset'),
                id: 'nested-field-groupcard',
              }}
              titleDescription={t(
                'Choose a preset in the available cards. A disabled card means that the preset is already applied onto the current acceptor.',
              )}
            />
          }
        >
          <Card
            id="selectable-first-card"
            isSelectable
            isSelected={showCertManagerForm}
            isCompact
            style={{ 'max-width': '100%' } as CSSProperties}
            isDisabled={!isCertMangerDependencySatisfied}
          >
            <CardHeader
              selectableActions={{
                selectableActionId: 'certmanagerandingress',
                name: 'certmanagerandingress',
                variant: 'multiple',
                onChange,
              }}
            >
              <CardTitle>
                {t('Cert-Manager issuer & Ingress exposure')}{' '}
              </CardTitle>
              {!isCertMangerDependencySatisfied && (
                <CardFooter>
                  <>
                    <ExclamationTriangleIcon />
                    {t('Preset disabled as CertManager is missing')}
                  </>
                </CardFooter>
              )}
            </CardHeader>
            <CardBody>
              <SimpleListGroup title="Effects:">
                <SimpleList>
                  <li>
                    {t(
                      'Makes the acceptor receive a generated ssl certificate at runtime. The certificate is signed by the issuer and is generated by cert-manager.',
                    )}
                  </li>
                  <li>
                    {t(
                      'Creates an ingress to expose the acceptor using the same certificate to secure the connection',
                    )}
                  </li>
                  <li>
                    {t(
                      'Makes the issuer certificate available for download on the broker details page (when the broker is running).',
                    )}
                  </li>
                </SimpleList>
              </SimpleListGroup>
            </CardBody>
          </Card>
        </FormFieldGroup>
        {showCertManagerForm && (
          <FormFieldGroup
            header={
              <FormFieldGroupHeader
                titleText={{
                  text: t('Cert-Manager issuer & Ingress exposure'),
                  id: 'nested-field-certmanager',
                }}
              />
            }
          >
            <FormGroup label={t('Issuer')} isRequired>
              <FormHelperText>
                {t(
                  'Only issuer part of a chain of trust do qualify (i.e the issuer must have a CA). Proceed to create a new chain of trust if needed..',
                )}
              </FormHelperText>
              <SelectIssuerDrawer
                selectedIssuer={selectedIssuer}
                setSelectedIssuer={setSelectedIssuer}
                clearIssuer={() => setSelectedIssuer('')}
              />
            </FormGroup>
          </FormFieldGroup>
        )}
      </Form>
    </Modal>
  );
};

export const PresetButton: FC<PreconfigurationButtonProps> = ({ acceptor }) => {
  const { t } = useTranslation();
  const [showPresetModal, setShowPresetModal] = useState(false);
  return (
    <>
      <AddPresetModal
        isModalOpen={showPresetModal}
        setIsModalOpen={setShowPresetModal}
        acceptor={acceptor}
      />
      <Button
        variant={ButtonVariant.link}
        onClick={() => setShowPresetModal(true)}
      >
        {t('Apply preset')}
      </Button>
    </>
  );
};
