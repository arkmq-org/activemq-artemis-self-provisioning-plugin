import { useTranslation } from '@app/i18n/i18n';
import { FC, useContext } from 'react';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import { ArtemisReducerOperationsRestricted } from '@app/reducers/restricted/reducer';
import { FormStateRestricted } from '@app/reducers/restricted/import-types';
import {
  Form,
  FormFieldGroup,
  FormGroup,
  Popover,
  Text,
  TextContent,
  TextInput,
  TextVariants,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import styles from '@patternfly/react-styles/css/components/Form/form';

export const OperatorConfiguration: FC = () => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState) as FormStateRestricted;
  const dispatch = useContext(BrokerCreationFormDispatch);

  const managerCaSecretName = formState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME;
  const prometheusCertSecretName = formState.BASE_PROMETHEUS_CERT_SECRET_NAME;
  const operatorNamespace = formState.OPERATOR_NAMESPACE;

  const handleManagerCaSecretChange = (value: string) => {
    dispatch({
      operation:
        ArtemisReducerOperationsRestricted.setACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME,
      payload: value,
    });
  };

  const handlePrometheusCertSecretChange = (value: string) => {
    dispatch({
      operation:
        ArtemisReducerOperationsRestricted.setBASE_PROMETHEUS_CERT_SECRET_NAME,
      payload: value,
    });
  };

  const handleOperatorNamespaceChange = (value: string) => {
    dispatch({
      operation: ArtemisReducerOperationsRestricted.setOPERATOR_NAMESPACE,
      payload: value,
    });
  };

  return (
    <>
      <TextContent>
        <Text component={TextVariants.p}>
          {t(
            'These configuration values must match how the operator was deployed. Ensure these settings reflect the environment variables configured in your operator deployment.',
          )}{' '}
          <a
            href="https://arkmq.org/docs/help/operator#operator-pki"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Learn more about operator configuration')}
          </a>
        </Text>
      </TextContent>
      <Form>
        <FormFieldGroup>
          <FormGroup
            label={t('ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME')}
            isRequired
            fieldId="activemq-artemis-manager-ca-secret-name"
            labelIcon={
              <Popover
                headerContent={
                  <div>
                    {t('ActiveMQ Artemis Manager CA Certificate Secret Name')}
                  </div>
                }
                bodyContent={
                  <div>
                    {t(
                      'The base name for the operator trust bundle secret. Defaults to "activemq-artemis-manager-ca".',
                    )}{' '}
                    <a
                      href="https://arkmq.org/docs/help/operator#operator-pki"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('Learn more')}
                    </a>
                  </div>
                }
              >
                <button
                  type="button"
                  aria-label="More info for ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME field"
                  onClick={(e) => e.preventDefault()}
                  aria-describedby="activemq-artemis-manager-ca-secret-name-info"
                  className={styles.formGroupLabelHelp}
                >
                  <HelpIcon />
                </button>
              </Popover>
            }
          >
            <TextInput
              value={managerCaSecretName}
              isRequired
              type="text"
              id="activemq-artemis-manager-ca-secret-name"
              name="activemq-artemis-manager-ca-secret-name"
              onChange={(_event, value: string) =>
                handleManagerCaSecretChange(value)
              }
            />
          </FormGroup>

          <FormGroup
            label={t('BASE_PROMETHEUS_CERT_SECRET_NAME')}
            isRequired
            fieldId="base-prometheus-cert-secret-name"
            labelIcon={
              <Popover
                headerContent={
                  <div>{t('Base Prometheus Certificate Secret Name')}</div>
                }
                bodyContent={
                  <div>
                    {t(
                      'The base name for the Prometheus certificate secret. The operator checks for a CR-specific secret [cr-name]-[base-name] first, then falls back to the shared [base-name] secret. Defaults to "prometheus-cert".',
                    )}{' '}
                    <a
                      href="https://arkmq.org/docs/help/operator#operator-pki"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('Learn more')}
                    </a>
                  </div>
                }
              >
                <button
                  type="button"
                  aria-label="More info for BASE_PROMETHEUS_CERT_SECRET_NAME field"
                  onClick={(e) => e.preventDefault()}
                  aria-describedby="base-prometheus-cert-secret-name-info"
                  className={styles.formGroupLabelHelp}
                >
                  <HelpIcon />
                </button>
              </Popover>
            }
          >
            <TextInput
              value={prometheusCertSecretName}
              isRequired
              type="text"
              id="base-prometheus-cert-secret-name"
              name="base-prometheus-cert-secret-name"
              onChange={(_event, value: string) =>
                handlePrometheusCertSecretChange(value)
              }
            />
          </FormGroup>
          <FormGroup
            label={t('OPERATOR_NAMESPACE')}
            isRequired
            fieldId="operator-namespace"
            labelIcon={
              <Popover
                headerContent={<div>{t('Operator Namespace')}</div>}
                bodyContent={
                  <div>
                    {t(
                      'The namespace where the ActiveMQ Artemis operator is running. Defaults to "default". This is needed to ensure operator certificates are distributed to the correct namespace.',
                    )}{' '}
                    <a
                      href="https://arkmq.org/docs/help/operator#operator-pki"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('Learn more')}
                    </a>
                  </div>
                }
              >
                <button
                  type="button"
                  aria-label="More info for OPERATOR_NAMESPACE field"
                  onClick={(e) => e.preventDefault()}
                  aria-describedby="operator-namespace-info"
                  className={styles.formGroupLabelHelp}
                >
                  <HelpIcon />
                </button>
              </Popover>
            }
          >
            <TextInput
              value={operatorNamespace}
              isRequired
              type="text"
              id="operator-namespace"
              name="operator-namespace"
              onChange={(_event, value: string) =>
                handleOperatorNamespaceChange(value)
              }
            />
          </FormGroup>
        </FormFieldGroup>
      </Form>
    </>
  );
};
