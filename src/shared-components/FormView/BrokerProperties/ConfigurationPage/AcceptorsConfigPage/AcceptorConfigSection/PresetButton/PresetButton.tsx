import {
  Button,
  ButtonVariant,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormFieldGroup,
  FormFieldGroupHeader,
  FormGroup,
  Modal,
  ModalVariant,
  SimpleList,
  SimpleListGroup,
} from '@patternfly/react-core';
import { CSSProperties, FC, useContext, useState } from 'react';

import { useTranslation } from '../../../../../../../i18n/i18n';
import { Acceptor } from '../../../../../../../k8s';
import {
  ArtemisReducerOperations,
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
  getCertManagerResourceTemplateFromAcceptor,
} from '../../../../../../../reducers/7.12/reducer';
import { SelectIssuerDrawer } from '../SelectIssuerDrawer/SelectIssuerDrawer';
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
      operation: ArtemisReducerOperations.activatePEMGenerationForAcceptor,
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
  return (
    <Modal
      variant={ModalVariant.medium}
      title={t('Add an annotation')}
      isOpen={isModalOpen}
      onClose={handleModalToggle}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={createAnnotation}
          isDisabled={selectedIssuer === '' || selectedAcceptor === ''}
        >
          {t('confirm')}
        </Button>,
        <Button key="cancel" variant="link" onClick={handleModalToggle}>
          {t('cancel')}
        </Button>,
      ]}
    >
      <Form isWidthLimited>
        <FormFieldGroup
          header={
            <FormFieldGroupHeader
              titleText={{
                text: t('select_annotation'),
                id: 'nested-field-groupcard',
              }}
              titleDescription={t('select_annotation_help')}
            />
          }
        >
          <Card
            id="selectable-first-card"
            onClick={() => {
              if (hasACertManagerAnnotation) {
                return;
              }
              setShowCertManagerForm(!showCertManagerForm);
            }}
            isSelectableRaised
            isSelected={showCertManagerForm}
            hasSelectableInput
            isCompact
            style={{ 'max-width': '100%' } as CSSProperties}
            isDisabledRaised={hasACertManagerAnnotation}
          >
            <CardTitle>{t('Annotate_an_acceptor_with_an_issuer')}</CardTitle>
            <br />
            <CardBody>
              <SimpleListGroup title="Effects:">
                <SimpleList>
                  <li>
                    Makes the acceptor receive a generated ssl certificate at
                    runtime. The certificate is signed by the issuer and is
                    generated by cert-manager.
                  </li>
                  <li>
                    Creates an ingress to expose the acceptor using the same
                    certificate to secure the connection
                  </li>
                  <li>
                    Makes the issuer certificate available for download on the
                    broker details page (when the broker is running).
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
                  text: t('cert_manager_annotation'),
                  id: 'nested-field-certmanager',
                }}
              />
            }
          >
            <FormGroup
              label={t('select_issuer')}
              helperText={t('select_an_issuer_help')}
              isRequired
            >
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
        {t('apply_preset')}
      </Button>
    </>
  );
};
