import { useTranslation } from '@app/i18n/i18n';
import { FC, useContext } from 'react';
import { BrokerCreationFormState } from '@app/reducers/reducer';
import { FormStateRestricted } from '@app/reducers/restricted/import-types';
import { MandatorySecretsToWatchFor } from '@app/reducers/restricted/reducer';
import {
  Form,
  FormFieldGroup,
  TextContent,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { CertSecretFinder } from './CertSecretFinder';

export const ControlPlane: FC = () => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState) as FormStateRestricted;
  const { cr } = formState;

  return (
    <Form>
      <TextContent>
        <Text component={TextVariants.p}>
          {t(
            'In restricted mode, the operator authenticates to the broker using mutual TLS (mTLS), requiring a PKI setup with two certificates:',
          )}
        </Text>
        <Text component={TextVariants.small}>
          <strong>{t('1. Operator Trust Bundle (CA)')}</strong>
          {' - '}
          {t('To verify broker certificates')}
          <br />
          <strong>{t('2. Broker Certificate')}</strong>
          {' - '}
          {t('To authenticate the broker to the operator')}
        </Text>
        <Text component={TextVariants.p}>
          {t(
            'The operator trust bundle must be provided by your administrator in order for the broker to trust the operator certificate.',
          )}
        </Text>
        <Text component={TextVariants.small}>
          <a
            href="https://arkmq.org/docs/help/operator#operator-pki"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Operator PKI Documentation')} <ExternalLinkAltIcon />
          </a>
          {' · '}
          <a
            href="https://arkmq.org/docs/tutorials/prometheus_locked_down#create-certificate-authority-and-issue"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Certificate Authority Tutorial')} <ExternalLinkAltIcon />
          </a>
        </Text>
      </TextContent>

      <FormFieldGroup>
        <CertSecretFinder
          expectedSecretNames={[
            formState.ACTIVEMQ_ARTEMIS_MANAGER_CA_SECRET_NAME || '',
          ]}
          validationFlag={MandatorySecretsToWatchFor.OPERATOR_CA}
          label={t('Operator Trust Bundle')}
          fieldId="operator-ca-secret"
          helpText={t(
            'The operator uses this CA bundle to verify broker certificates.',
          )}
          showGenerateButton={false}
          secretDataKey="ca.pem"
        />

        <CertSecretFinder
          expectedSecretNames={[
            `${cr.metadata?.name}-broker-cert`,
            'broker-cert',
          ]}
          validationFlag={MandatorySecretsToWatchFor.BROKER_CERT}
          label={t('Broker Certificate')}
          fieldId="broker-cert-secret"
          helpText={t(
            'The broker uses this certificate for secure mTLS communication.',
          )}
        />
      </FormFieldGroup>
    </Form>
  );
};
