import {
  FormFieldGroupExpandable,
  FormFieldGroupHeader,
  FormGroup,
} from '@patternfly/react-core';
import { FC, useContext } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import { Acceptor } from '@app/k8s/types';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import {
  ArtemisReducerOperations712,
  getAcceptorFromCertManagerResourceTemplate,
  getCertManagerResourceTemplateFromAcceptor,
} from '@app/reducers/7.12/reducer';
import { ResourceTemplate } from '@app/k8s/types';
import { SelectIssuerDrawer } from '../../../../../../SelectIssuerDrawer/SelectIssuerDrawer';
import { ConfirmDeleteModal } from '../../ConfirmDeleteModal/ConfirmDeleteModal';
import { GenericError } from '@app/shared-components/GenericError/GenericError';
type ResourceTemplateProps = {
  resourceTemplate: ResourceTemplate;
};

const CertManagerPreset: FC<ResourceTemplateProps> = ({ resourceTemplate }) => {
  const { cr } = useContext(BrokerCreationFormState);
  const { t } = useTranslation();
  const dispatch = useContext(BrokerCreationFormDispatch);
  if (!cr) return <GenericError />;
  const acceptor = getAcceptorFromCertManagerResourceTemplate(
    cr,
    resourceTemplate,
  );

  if (!acceptor || !acceptor.name) {
    return <GenericError />;
  }

  const acceptorName = acceptor.name;

  return (
    <FormFieldGroupExpandable
      isExpanded
      toggleAriaLabel="Details"
      header={
        <FormFieldGroupHeader
          titleText={{
            text: t('Cert-Manager issuer & Ingress exposure'),
            id: 'nested-field-cert-manager-annotation-id' + acceptorName,
          }}
          titleDescription={t('Configuration items for the preset')}
          actions={
            <ConfirmDeleteModal
              subject="preset"
              action={() =>
                dispatch({
                  operation:
                    ArtemisReducerOperations712.deletePEMGenerationForAcceptor,
                  payload: acceptorName,
                })
              }
            />
          }
        />
      }
    >
      <FormGroup label={t('Issuer')} isRequired>
        <SelectIssuerDrawer
          selectedIssuer={
            resourceTemplate.annotations?.['cert-manager.io/issuer'] ?? ''
          }
          setSelectedIssuer={(issuer: string) => {
            dispatch({
              operation: ArtemisReducerOperations712.updateAnnotationIssuer,
              payload: {
                acceptorName: acceptorName,
                newIssuer: issuer,
              },
            });
          }}
          clearIssuer={() => {
            dispatch({
              operation: ArtemisReducerOperations712.updateAnnotationIssuer,
              payload: {
                acceptorName: acceptorName,
                newIssuer: '',
              },
            });
          }}
        />
      </FormGroup>
    </FormFieldGroupExpandable>
  );
};

type ListPresetsProps = {
  acceptor: Acceptor;
};

export const ListPresets: FC<ListPresetsProps> = ({ acceptor }) => {
  const { cr } = useContext(BrokerCreationFormState);
  if (!cr) return <GenericError />;
  const certManagerRt = getCertManagerResourceTemplateFromAcceptor(
    cr,
    acceptor,
  );
  if (!certManagerRt) {
    return null;
  }
  return <CertManagerPreset resourceTemplate={certManagerRt} />;
};
