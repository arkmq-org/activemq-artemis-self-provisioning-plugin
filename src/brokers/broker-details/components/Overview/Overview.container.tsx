import {
  useAnnotationsModal,
  useK8sWatchResource,
  useLabelsModal,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Label,
  LabelGroup,
  List,
  ListItem,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { FC, useState } from 'react';
import {
  getIssuerForAcceptor,
  getIssuerIngressHostForAcceptor,
} from '@app/reducers/7.12/reducer';
import {
  Acceptor,
  IssuerResource,
  BrokerCR,
  SecretResource,
} from '@app/k8s/types';
import { Metrics } from './Metrics/Metrics';
import { useTranslation } from '@app/i18n/i18n';
import { ConditionsContainer } from '@app/brokers/broker-details/components/Overview/Conditions/Conditions.container';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import { Loading } from '@app/shared-components/Loading/Loading';
import { ErrorState } from '@app/shared-components/ErrorState/ErrorState';
import { useGetBrokerCR } from '@app/k8s/customHooks';

const useGetIssuerCa = (
  cr: BrokerCR,
  acceptor: Acceptor,
): [string, boolean, string] => {
  const acceptorIssuer = getIssuerForAcceptor(cr, acceptor);
  const [issuer, loadedIssuers, loadErrorIssuers] =
    useK8sWatchResource<IssuerResource>({
      groupVersionKind: {
        group: 'cert-manager.io',
        version: 'v1',
        kind: 'Issuer',
      },
      namespace: cr.metadata.namespace,
      name: acceptorIssuer,
    });
  if (!loadedIssuers || loadErrorIssuers) {
    return ['', loadedIssuers, loadErrorIssuers];
  }
  const secret = issuer.spec?.ca?.secretName ? issuer.spec.ca.secretName : '';
  return [secret, loadedIssuers, loadErrorIssuers];
};

const useGetTlsSecret = (cr: BrokerCR, acceptor: Acceptor) => {
  const [secretName, hasSecretName] = useGetIssuerCa(cr, acceptor);
  const [secrets, loaded, loadError] = useK8sWatchResource<SecretResource[]>({
    groupVersionKind: {
      version: 'v1',
      kind: 'Secret',
    },
    name: secretName,
    isList: true,
    namespace: cr.metadata.namespace,
  });

  const secret = secrets.find((secret) => secret.metadata?.name === secretName);

  if ((hasSecretName && !secretName) || !secrets) {
    return [undefined, loaded, loadError];
  }

  if (!(secret && secret.data && secret.data['tls.crt'])) {
    return [undefined, loaded, loadError];
  }
  return [secret, loaded, loadError];
};

type SecretDownloadLinkProps = {
  secret: SecretResource;
};

const SecretDownloadLink: FC<SecretDownloadLinkProps> = ({ secret }) => {
  return (
    <a
      href={
        'data:application/pem-certificate-chain;base64,' +
        secret.data['tls.crt']
      }
      download={secret.metadata.name + '.pem'}
    >
      {secret.metadata.name + '.pem'}
    </a>
  );
};

type IssuerSecretsDownloaderProps = {
  cr: BrokerCR;
};

type HelperConnectAcceptorProps = {
  cr: BrokerCR;
  acceptor: Acceptor;
};

const HelpConnectAcceptor: FC<HelperConnectAcceptorProps> = ({
  cr,
  acceptor,
}) => {
  const { t } = useTranslation();
  const [secret, loaded, loadError] = useGetTlsSecret(cr, acceptor);
  const ingressHost = getIssuerIngressHostForAcceptor(cr, acceptor, 0);
  const [copied, setCopied] = useState(false);
  const isSecuredByToken = cr.spec.adminUser === undefined;

  const clipboardCopyFunc = (text: string) => {
    navigator.clipboard.writeText(text.toString());
  };

  const onClick = (_event: any, text: string) => {
    clipboardCopyFunc(text);
    setCopied(true);
  };
  if (!loaded || !secret) {
    return (
      <Bullseye>
        <Spinner size="lg" />
      </Bullseye>
    );
  }
  if (loadError) {
    return (
      <Alert variant={AlertVariant.danger} title={t('Error loading secrets')}>
        {loadError}
      </Alert>
    );
  }

  const code =
    "./artemis check queue --name TEST --produce 10 --browse 10 --consume 10 --url 'tcp://" +
    ingressHost +
    ':443?sslEnabled=true&trustStorePath=/tmp/' +
    secret.metadata.name +
    ".pem&trustStoreType=PEM&useTopologyForLoadBalancing=false' --verbose";
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>
        {t('Test the connection to')} {acceptor.name}
      </DescriptionListTerm>
      <DescriptionListDescription>
        <List>
          <ListItem>
            {t('Download the cert:')} <SecretDownloadLink secret={secret} />
          </ListItem>
          {isSecuredByToken && (
            <ListItem>
              {t(
                'Your setup requires having a username and password for connecting to the acceptor',
              )}
              <Button
                variant="link"
                onClick={() =>
                  window.open(
                    'ns/' +
                      cr.metadata.namespace +
                      '/secrets/' +
                      cr.spec.deploymentPlan.extraMounts.secrets[0],
                  )
                }
              >
                {t(
                  'find one in the extra-users.properties entry of the jaas-config',
                )}
              </Button>
            </ListItem>
          )}
          <ListItem>
            {t(
              'Run the command below (it assumes that the cert is stored in /tmp)',
            )}
            <CodeBlock
              actions={
                <CodeBlockAction>
                  <ClipboardCopyButton
                    id="basic-copy-button"
                    textId="code-content"
                    aria-label={t('Copy to clipboard')}
                    onClick={(e) => onClick(e, code)}
                    exitDelay={copied ? 1500 : 600}
                    maxWidth="110px"
                    variant="plain"
                    onTooltipHidden={() => setCopied(false)}
                  >
                    {copied
                      ? t('Successfully copied to clipboard!')
                      : t('Copy to clipboard')}
                  </ClipboardCopyButton>
                </CodeBlockAction>
              }
            >
              <CodeBlockCode>{code}</CodeBlockCode>
            </CodeBlock>
          </ListItem>
        </List>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

const ConnectivityHelper: FC<IssuerSecretsDownloaderProps> = ({ cr }) => {
  const { t } = useTranslation();
  const oneAcceptorHasGeneratedSecrets = cr.spec?.acceptors
    ? cr.spec.acceptors
        .map((acceptor) =>
          acceptor.sslSecret ? acceptor.sslSecret.endsWith('-ptls') : false,
        )
        .reduce((acc, hasGeneratedSecrets) => acc || hasGeneratedSecrets, false)
    : false;
  if (!oneAcceptorHasGeneratedSecrets) {
    return <></>;
  }
  return (
    <PageSection>
      <Title headingLevel="h2">{t('Connectivity')}</Title>
      <Card>
        <>
          <CardTitle>{t('Connect using Artemis')}</CardTitle>
          <CardBody>
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Get Artemis')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {t('Download the')}{' '}
                  <a href="https://activemq.apache.org/components/artemis/download/">
                    {t('latest release')}
                  </a>{' '}
                  {t(
                    'of ActiveMQ Artemis, decompress the tarball and locate the artemis executable.',
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {cr.spec.acceptors.map((acceptor) => (
                <HelpConnectAcceptor
                  cr={cr}
                  acceptor={acceptor}
                  key={acceptor.name}
                />
              ))}
            </DescriptionList>
          </CardBody>
        </>
      </Card>
    </PageSection>
  );
};

const Annotations: FC<IssuerSecretsDownloaderProps> = ({ cr }) => {
  const { t } = useTranslation();
  const launchAnnotationModal = useAnnotationsModal(cr);
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{t('Annotations')}</DescriptionListTerm>
      <DescriptionListDescription>
        <LabelGroup
          categoryName={t('Annotations')}
          addLabelControl={
            <Button variant="link" onClick={launchAnnotationModal}>
              {t('Edit')}
            </Button>
          }
        >
          {cr.metadata.annotations ? (
            Object.entries(cr.metadata.annotations).map(
              (annotations, index) => (
                <Label key={index} variant="filled">
                  {annotations[1] ? annotations.join('=') : annotations[0]}
                </Label>
              ),
            )
          ) : (
            <Label isCompact>{t('No annotations')}</Label>
          )}
        </LabelGroup>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

const Labels: FC<IssuerSecretsDownloaderProps> = ({ cr }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const launchLabelsModal = useLabelsModal(cr);
  return (
    <DescriptionListGroup>
      <DescriptionListTerm> {t('Labels')}</DescriptionListTerm>
      <DescriptionListDescription>
        <LabelGroup
          categoryName={t('Labels')}
          addLabelControl={
            <Button variant="link" onClick={launchLabelsModal}>
              {t('Edit')}
            </Button>
          }
        >
          {cr.metadata.labels ? (
            Object.entries(cr.metadata.labels).map((label, index) => (
              <Label
                key={index}
                onClick={() =>
                  navigate(
                    label[1]
                      ? '/search?kind=broker.amq.io~v1beta1~ActiveMQArtemis&q=' +
                          encodeURI(label.join('='))
                      : '/search?kind=broker.amq.io~v1beta1~ActiveMQArtemis&q=' +
                          encodeURI(label[0]),
                  )
                }
              >
                {label[1] ? label.join('=') : label[0]}
              </Label>
            ))
          ) : (
            <Label isCompact>{t('No labels')}</Label>
          )}
        </LabelGroup>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export const OverviewContainer: FC = () => {
  const { t } = useTranslation();
  const { ns: namespace, name } = useParams<{ ns?: string; name?: string }>();

  const { brokerCr: cr, isLoading, error } = useGetBrokerCR(name, namespace);
  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorState />;
  }

  return (
    <PageSection type="tabs">
      <PageSection>
        <Title headingLevel="h2">{t('Details')}</Title>
        <br />
        <Card>
          <CardBody>
            <DescriptionList>
              <Labels cr={cr} />
              <Annotations cr={cr} />
            </DescriptionList>
          </CardBody>
        </Card>
      </PageSection>
      <Divider />
      <Metrics
        name={name}
        namespace={namespace}
        size={cr.spec?.deploymentPlan?.size}
      />
      <Divider />
      <ConnectivityHelper cr={cr} />
      <ConditionsContainer cr={cr} />
    </PageSection>
  );
};
