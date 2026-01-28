import { useTranslation } from '@app/i18n/i18n';
import { BrokerCR, IssuerResource, SecretResource } from '@app/k8s/types';
import {
  k8sCreate,
  k8sDelete,
  K8sModel,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  CodeBlock,
  CodeBlockCode,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  PageSection,
  Spinner,
  Text,
  TextContent,
  TextVariants,
  TextInput,
  Title,
  Wizard,
  WizardStep,
} from '@patternfly/react-core';
import { TypeaheadSelect } from '@patternfly/react-templates';
import { FC, useMemo, useState } from 'react';
import { CertModel, JobModel, SecretModel } from '@app/k8s/models';

type ConnectivityTesterProps = {
  cr: BrokerCR;
};

type ActionState = {
  status: 'idle' | 'working' | 'ready' | 'error';
  message?: string;
};

type JobResource = {
  metadata?: {
    name?: string;
  };
  status?: {
    succeeded?: number;
    failed?: number;
    active?: number;
  };
};

type PodResource = {
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
  };
};

type IssuerOption = {
  value: string;
  name: string;
  label: string;
  kind: 'Issuer' | 'ClusterIssuer';
};

const getSecretDataValue = (
  secret: SecretResource | undefined,
  key: string,
) => {
  const data = secret?.data as Record<string, string> | undefined;
  if (!data?.[key]) {
    return '';
  }
  try {
    return atob(data[key]);
  } catch {
    return '';
  }
};

const parseClientCN = (raw: string) => {
  const match = raw.match(/^([^=]+)=/);
  return match ? match[1].trim() : '';
};

const parseAmqpsPort = (brokerProperties?: string[]) => {
  if (!brokerProperties) {
    return '';
  }
  const line = brokerProperties.find((entry) =>
    entry.startsWith('acceptorConfigurations."amqps".params.port='),
  );
  if (!line) {
    return '';
  }
  return line.split('=')[1]?.trim() || '';
};

const renderActionStatus = (state: ActionState, t: (key: string) => string) => {
  if (state.status === 'idle') {
    return null;
  }
  if (state.status === 'working') {
    return (
      <Alert variant={AlertVariant.info} isInline title={t('Working')}>
        {state.message || t('Applying changes...')}
      </Alert>
    );
  }
  if (state.status === 'ready') {
    return (
      <Alert variant={AlertVariant.success} isInline title={t('Ready')}>
        {state.message}
      </Alert>
    );
  }
  return (
    <Alert variant={AlertVariant.danger} isInline title={t('Error')}>
      {state.message}
    </Alert>
  );
};

const getJobStatusVariant = (status: string) => {
  switch (status) {
    case 'succeeded':
      return AlertVariant.success;
    case 'failed':
      return AlertVariant.danger;
    case 'running':
      return AlertVariant.info;
    default:
      return AlertVariant.info;
  }
};

const jobStatusLabel = (job?: JobResource) => {
  if (!job) {
    return 'idle';
  }
  if (job.status?.succeeded) {
    return 'succeeded';
  }
  if (job.status?.failed) {
    return 'failed';
  }
  if (job.status?.active) {
    return 'running';
  }
  return 'pending';
};

const formatJobStatusLine = (
  t: (key: string, options?: Record<string, string>) => string,
  status: string,
  podName?: string,
) => {
  const base = t('Job status: {{status}}', { status });
  if (!podName) {
    return base;
  }
  return `${base} `;
};

type DeleteOptions = {
  propagationPolicy?: 'Background' | 'Foreground' | 'Orphan';
};

const deleteResource = async (
  model: K8sModel,
  name: string,
  namespace: string,
  options?: DeleteOptions,
) => {
  const deleteOptions = options?.propagationPolicy
    ? {
        kind: 'DeleteOptions',
        apiVersion: 'v1',
        propagationPolicy: options.propagationPolicy,
      }
    : undefined;
  try {
    await k8sDelete({
      model,
      resource: { metadata: { name, namespace } },
      json: deleteOptions,
    });
  } catch (error) {
    const statusCode = error?.code || error?.response?.status;
    if (statusCode !== 404) {
      throw error;
    }
  }
};

export const ConnectivityTester: FC<ConnectivityTesterProps> = ({ cr }) => {
  const { t } = useTranslation();
  const brokerName = cr.metadata.name;
  const namespace = cr.metadata.namespace;
  const jaasSecretName = `${brokerName}-jaas-config-bp`;
  const producerJobName = `${brokerName}-producer`;
  const consumerJobName = `${brokerName}-consumer`;
  const brokerVersion = cr.status?.version?.brokerVersion || '';
  const detectedEndpoint =
    brokerName && namespace
      ? `${brokerName}-ss-0.${brokerName}-hdls-svc.${namespace}.svc.cluster.local`
      : '';

  const [isOpen, setIsOpen] = useState(false);
  const [clientCertStatus, setClientCertStatus] = useState<ActionState>({
    status: 'idle',
  });
  const [pemcfgStatus, setPemcfgStatus] = useState<ActionState>({
    status: 'idle',
  });
  const [producerStatus, setProducerStatus] = useState<ActionState>({
    status: 'idle',
  });
  const [consumerStatus, setConsumerStatus] = useState<ActionState>({
    status: 'idle',
  });
  const [cleanupStatus, setCleanupStatus] = useState<ActionState>({
    status: 'idle',
  });

  const [issuers, issuersLoaded, issuersError] = useK8sWatchResource<
    IssuerResource[]
  >({
    groupVersionKind: {
      group: 'cert-manager.io',
      version: 'v1',
      kind: 'Issuer',
    },
    isList: true,
    namespace,
  });

  const [clusterIssuers, clusterIssuersLoaded, clusterIssuersError] =
    useK8sWatchResource<IssuerResource[]>({
      groupVersionKind: {
        group: 'cert-manager.io',
        version: 'v1',
        kind: 'ClusterIssuer',
      },
      isList: true,
    });

  const [secrets, secretsLoaded, secretsError] = useK8sWatchResource<
    SecretResource[]
  >({
    groupVersionKind: {
      version: 'v1',
      kind: 'Secret',
    },
    isList: true,
    namespace,
  });

  const [jobs, jobsLoaded, jobsError] = useK8sWatchResource<JobResource[]>({
    groupVersionKind: {
      group: 'batch',
      version: 'v1',
      kind: 'Job',
    },
    isList: true,
    namespace,
  });

  const [certificates, certificatesLoaded, certificatesError] =
    useK8sWatchResource<{ metadata?: { name?: string } }[]>({
      groupVersionKind: {
        group: 'cert-manager.io',
        version: 'v1',
        kind: 'Certificate',
      },
      isList: true,
      namespace,
    });

  const [pods] = useK8sWatchResource<PodResource[]>({
    groupVersionKind: {
      version: 'v1',
      kind: 'Pod',
    },
    isList: true,
    namespace,
  });

  const issuerOptions = useMemo<IssuerOption[]>(() => {
    const issuerEntries =
      issuers?.map((issuer) => ({
        value: `Issuer:${issuer.metadata.name}`,
        name: issuer.metadata.name,
        label: `${issuer.metadata.name} (Issuer)`,
        kind: 'Issuer' as const,
      })) || [];
    const clusterIssuerEntries =
      clusterIssuers?.map((issuer) => ({
        value: `ClusterIssuer:${issuer.metadata.name}`,
        name: issuer.metadata.name,
        label: `${issuer.metadata.name} (ClusterIssuer)`,
        kind: 'ClusterIssuer' as const,
      })) || [];
    return [...issuerEntries, ...clusterIssuerEntries].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [clusterIssuers, issuers]);

  const [selectedIssuer, setSelectedIssuer] = useState<
    IssuerOption | undefined
  >(undefined);

  const jaasSecret = secrets?.find(
    (secret) => secret.metadata?.name === jaasSecretName,
  );
  const existingPemcfgSecret = secrets?.find(
    (secret) => secret.metadata?.name === 'cert-pemcfg',
  );
  const certUsersRaw = getSecretDataValue(jaasSecret, '_cert-users');
  const detectedClientCN = parseClientCN(certUsersRaw);
  const detectedPort = parseAmqpsPort(cr.spec?.brokerProperties);

  const [prevDetectedCN, setPrevDetectedCN] = useState(detectedClientCN);
  const [clientCN, setClientCN] = useState(
    detectedClientCN || 'messaging-client',
  );
  if (detectedClientCN && detectedClientCN !== prevDetectedCN) {
    setPrevDetectedCN(detectedClientCN);
    setClientCN(detectedClientCN);
  }

  const [prevDetectedPort, setPrevDetectedPort] = useState(detectedPort);
  const [amqpsPort, setAmqpsPort] = useState(detectedPort || '61617');
  if (detectedPort && detectedPort !== prevDetectedPort) {
    setPrevDetectedPort(detectedPort);
    setAmqpsPort(detectedPort);
  }

  const [prevDetectedEndpoint, setPrevDetectedEndpoint] =
    useState(detectedEndpoint);
  const [brokerEndpoint, setBrokerEndpoint] = useState(detectedEndpoint || '');
  if (detectedEndpoint && detectedEndpoint !== prevDetectedEndpoint) {
    setPrevDetectedEndpoint(detectedEndpoint);
    setBrokerEndpoint(detectedEndpoint);
  }

  const issuerError = issuersError || clusterIssuersError;
  const issuersReady = issuersLoaded && clusterIssuersLoaded;

  const producerJob = jobs?.find(
    (job) => job.metadata?.name === producerJobName,
  );
  const consumerJob = jobs?.find(
    (job) => job.metadata?.name === consumerJobName,
  );
  const existingClientCert = certificates?.find(
    (cert) => cert.metadata?.name === 'messaging-client-cert',
  );
  const hasClientCert =
    Boolean(existingClientCert) || clientCertStatus?.status === 'ready';
  const producerPod = pods?.find(
    (pod) => pod.metadata?.labels?.['job-name'] === producerJobName,
  );
  const consumerPod = pods?.find(
    (pod) => pod.metadata?.labels?.['job-name'] === consumerJobName,
  );
  const producerPodHref = producerPod?.metadata?.name
    ? `/k8s/ns/${namespace}/pods/${producerPod.metadata.name}`
    : '';
  const consumerPodHref = consumerPod?.metadata?.name
    ? `/k8s/ns/${namespace}/pods/${consumerPod.metadata.name}`
    : '';

  const handleCreateClientCert = async () => {
    if (!selectedIssuer) {
      setClientCertStatus({
        status: 'error',
        message: t('Select an issuer to generate the client certificate.'),
      });
      return;
    }
    if (!clientCN.trim()) {
      setClientCertStatus({
        status: 'error',
        message: t('Client CN is required.'),
      });
      return;
    }
    setClientCertStatus({ status: 'working' });
    setPemcfgStatus({ status: 'working' });

    try {
      await deleteResource(CertModel, 'messaging-client-cert', namespace);
      await deleteResource(SecretModel, 'messaging-client-cert', namespace);
      await k8sCreate({
        model: CertModel,
        data: {
          apiVersion: 'cert-manager.io/v1',
          kind: 'Certificate',
          metadata: {
            name: 'messaging-client-cert',
            namespace,
          },
          spec: {
            secretName: 'messaging-client-cert',
            commonName: clientCN.trim(),
            issuerRef: {
              name: selectedIssuer.name,
              kind: selectedIssuer.kind,
              group: 'cert-manager.io',
            },
          },
        },
      });
      setClientCertStatus({
        status: 'ready',
        message: t('messaging-client-cert certificate created.'),
      });
    } catch (error) {
      setClientCertStatus({
        status: 'error',
        message: error?.message || t('Failed to create messaging-client-cert.'),
      });
    }

    try {
      await deleteResource(SecretModel, 'cert-pemcfg', namespace);
      await k8sCreate({
        model: SecretModel,
        data: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'cert-pemcfg',
            namespace,
          },
          type: 'Opaque',
          stringData: {
            'tls.pemcfg':
              'source.key=/app/tls/client/tls.key\n' +
              'source.cert=/app/tls/client/tls.crt',
            'java.security':
              'security.provider.6=de.dentrassi.crypto.pem.PemKeyStoreProvider',
          },
        },
      });
      setPemcfgStatus({
        status: 'ready',
        message: t('cert-pemcfg secret created.'),
      });
    } catch (error) {
      setPemcfgStatus({
        status: 'error',
        message: error?.message || t('Failed to create cert-pemcfg secret.'),
      });
    }
  };

  const createJobSpec = (name: string, command: string) => {
    return {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name,
        namespace,
      },
      spec: {
        template: {
          spec: {
            restartPolicy: 'Never',
            containers: [
              {
                name,
                image: `quay.io/arkmq-org/activemq-artemis-broker-kubernetes:artemis.${brokerVersion}`,
                command: ['/bin/sh', '-c', command],
                env: [
                  {
                    name: 'JDK_JAVA_OPTIONS',
                    value:
                      '-Djava.security.properties=/app/tls/pem/java.security',
                  },
                ],
                volumeMounts: [
                  { name: 'trust', mountPath: '/app/tls/ca' },
                  { name: 'cert', mountPath: '/app/tls/client' },
                  { name: 'pem', mountPath: '/app/tls/pem' },
                ],
              },
            ],
            volumes: [
              {
                name: 'trust',
                secret: { secretName: 'activemq-artemis-manager-ca' },
              },
              {
                name: 'cert',
                secret: { secretName: 'messaging-client-cert' },
              },
              {
                name: 'pem',
                secret: { secretName: 'cert-pemcfg' },
              },
            ],
          },
        },
      },
    };
  };

  const runJob = async (
    name: string,
    command: string,
    setStatus: (s: ActionState) => void,
  ) => {
    if (!brokerVersion) {
      setStatus({
        status: 'error',
        message: t('Broker version is not available yet.'),
      });
      return;
    }
    setStatus({ status: 'working' });
    try {
      await deleteResource(JobModel, name, namespace, {
        propagationPolicy: 'Background',
      });
      await k8sCreate({
        model: JobModel,
        data: createJobSpec(name, command),
      });
      setStatus({
        status: 'ready',
        message: t('{{job}} job started.', { job: name }),
      });
    } catch (error) {
      setStatus({
        status: 'error',
        message:
          error?.message || t('Failed to start {{job}} job.', { job: name }),
      });
    }
  };

  const producerCommand =
    'exec java -classpath /opt/amq/lib/*:/opt/amq/lib/extra/* ' +
    'org.apache.activemq.artemis.cli.Artemis producer ' +
    `--protocol=AMQP --url 'amqps://${brokerEndpoint}:${amqpsPort}?` +
    'transport.trustStoreType=PEMCA&transport.trustStoreLocation=/app/tls/ca/ca.pem&' +
    'transport.keyStoreType=PEMCFG&transport.keyStoreLocation=/app/tls/pem/tls.pemcfg' +
    `' --message-count 10000 --destination queue://APP_JOBS`;

  const consumerCommand =
    'exec java -classpath /opt/amq/lib/*:/opt/amq/lib/extra/* ' +
    'org.apache.activemq.artemis.cli.Artemis consumer ' +
    `--protocol=AMQP --url 'amqps://${brokerEndpoint}:${amqpsPort}?` +
    'transport.trustStoreType=PEMCA&transport.trustStoreLocation=/app/tls/ca/ca.pem&' +
    'transport.keyStoreType=PEMCFG&transport.keyStoreLocation=/app/tls/pem/tls.pemcfg' +
    `' --message-count 10000 --destination queue://APP_JOBS --receive-timeout 30000`;

  const handleRunProducer = () => {
    void runJob(producerJobName, producerCommand, setProducerStatus);
  };

  const handleRunConsumer = () => {
    void runJob(consumerJobName, consumerCommand, setConsumerStatus);
  };

  const handleCleanup = async () => {
    setCleanupStatus({ status: 'working' });
    try {
      await deleteResource(JobModel, producerJobName, namespace, {
        propagationPolicy: 'Background',
      });
      await deleteResource(JobModel, consumerJobName, namespace, {
        propagationPolicy: 'Background',
      });
      await deleteResource(SecretModel, 'cert-pemcfg', namespace);
      await deleteResource(CertModel, 'messaging-client-cert', namespace);
      await deleteResource(SecretModel, 'messaging-client-cert', namespace);
      setClientCertStatus({ status: 'idle' });
      setPemcfgStatus({ status: 'idle' });
      setProducerStatus({ status: 'idle' });
      setConsumerStatus({ status: 'idle' });
      setCleanupStatus({
        status: 'ready',
        message: t('Connectivity test resources deleted.'),
      });
    } catch (error) {
      setCleanupStatus({
        status: 'error',
        message: error?.message || t('Failed to clean up resources.'),
      });
    }
  };

  const issuerSelectOptions = issuerOptions.map((option) => ({
    value: option.value,
    content: option.label,
  }));
  const selectedIssuerValue = selectedIssuer?.value || '';

  const wizardSteps = [
    {
      name: t('Required secrets'),
      footer: { isNextDisabled: !hasClientCert },
      component: (
        <Form>
          <FormSection title={t('PEMCFG')}>
            {existingPemcfgSecret && pemcfgStatus?.status !== 'ready' && (
              <Alert
                variant={AlertVariant.info}
                isInline
                title={t('PEMCFG secret already exists')}
              >
                {t('cert-pemcfg is already present in the namespace.')}
              </Alert>
            )}
            {!existingPemcfgSecret && (
              <Alert
                variant={AlertVariant.warning}
                isInline
                title={t('PEMCFG secret missing')}
              >
                {t(
                  'The PEMCFG secret will be created together with the client certificate when you generate it below.',
                )}
              </Alert>
            )}
            {renderActionStatus(pemcfgStatus, t)}
          </FormSection>
          <FormSection title={t('Certificate')}>
            <FormGroup label={t('Client Common Name (CN)')} isRequired>
              <TextInput
                value={clientCN}
                onChange={(_event, value) => setClientCN(value)}
              />
              {!secretsLoaded && <Spinner size="sm" />}
              {!certificatesLoaded && <Spinner size="sm" />}
              <HelperText>
                <HelperTextItem>
                  {detectedClientCN
                    ? t('Detected from {{secretName}}.', {
                        secretName: jaasSecretName,
                      })
                    : t('Provide the CN mapped in the JAAS secret.')}
                </HelperTextItem>
              </HelperText>
            </FormGroup>
            <FormGroup label={t('Issuer')} isRequired>
              {!issuersReady && <Spinner size="sm" />}
              {issuerError && (
                <Alert
                  variant={AlertVariant.warning}
                  isInline
                  title={t('Unable to load issuers')}
                >
                  {issuerError}
                </Alert>
              )}
              {certificatesError && (
                <Alert
                  variant={AlertVariant.warning}
                  isInline
                  title={t('Unable to load certificates')}
                >
                  {certificatesError}
                </Alert>
              )}
              {secretsError && (
                <Alert
                  variant={AlertVariant.warning}
                  isInline
                  title={t('Unable to load secrets')}
                >
                  {secretsError}
                </Alert>
              )}
              {existingClientCert && clientCertStatus?.status !== 'ready' && (
                <Alert
                  variant={AlertVariant.info}
                  isInline
                  title={t('Client certificate already exists')}
                >
                  {t(
                    'messaging-client-cert is already present in the namespace.',
                  )}
                </Alert>
              )}
              <TypeaheadSelect
                id="connectivity-issuer-select"
                placeholder={t('Select issuer')}
                selectOptions={issuerSelectOptions}
                selected={selectedIssuerValue}
                onClearSelection={() => setSelectedIssuer(undefined)}
                onSelect={(_event, value) => {
                  const selection = String(value);
                  setSelectedIssuer(
                    issuerOptions.find((option) => option.value === selection),
                  );
                }}
              />
            </FormGroup>
            {renderActionStatus(clientCertStatus, t)}
            <Button
              variant={ButtonVariant.primary}
              onClick={handleCreateClientCert}
              isDisabled={
                !selectedIssuer || clientCertStatus.status === 'working'
              }
            >
              {clientCertStatus.status === 'working' && <Spinner size="sm" />}{' '}
              {t('Generate client certificate')}
            </Button>
          </FormSection>
        </Form>
      ),
    },
    {
      name: t('Broker endpoint'),
      isDisabled: !hasClientCert,
      component: (
        <Form>
          <FormGroup label={t('Broker endpoint')} isRequired>
            <TextInput
              value={brokerEndpoint}
              onChange={(_event, value) => setBrokerEndpoint(value)}
            />
            <HelperText>
              <HelperTextItem>
                {detectedEndpoint
                  ? t('Detected using the broker headless service.')
                  : t('Provide the broker host to reach the AMQPS acceptor.')}
              </HelperTextItem>
            </HelperText>
          </FormGroup>
          <FormGroup label={t('AMQPS port')} isRequired>
            <TextInput
              value={amqpsPort}
              onChange={(_event, value) => setAmqpsPort(value)}
            />
            <HelperText>
              <HelperTextItem>
                {detectedPort
                  ? t('Detected from broker properties.')
                  : t('Provide the port configured for the AMQPS acceptor.')}
              </HelperTextItem>
            </HelperText>
          </FormGroup>
        </Form>
      ),
    },
    {
      name: t('Run jobs'),
      isDisabled: !hasClientCert,
      component: (
        <Form>
          <FormSection title={t('Producer')}>
            <CodeBlock>
              <CodeBlockCode>{producerCommand}</CodeBlockCode>
            </CodeBlock>
            <Alert
              variant={getJobStatusVariant(jobStatusLabel(producerJob))}
              isInline
              title={t('Producer status')}
            >
              {jobsLoaded && !jobsError ? (
                <>
                  {formatJobStatusLine(
                    t,
                    jobStatusLabel(producerJob),
                    producerPod?.metadata?.name,
                  )}
                  {producerPod?.metadata?.name && (
                    <Button
                      component="a"
                      href={producerPodHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant={ButtonVariant.link}
                      isInline
                    >
                      {producerPod.metadata.name}
                    </Button>
                  )}
                </>
              ) : (
                t('Waiting for job status...')
              )}
            </Alert>
            <Button
              variant={ButtonVariant.primary}
              onClick={handleRunProducer}
              isDisabled={producerStatus.status === 'working'}
            >
              {producerStatus.status === 'working' && <Spinner size="sm" />}{' '}
              {t('Run producer job')}
            </Button>
          </FormSection>
          <FormSection title={t('Consumer')}>
            <CodeBlock>
              <CodeBlockCode>{consumerCommand}</CodeBlockCode>
            </CodeBlock>
            <Alert
              variant={getJobStatusVariant(jobStatusLabel(consumerJob))}
              isInline
              title={t('Consumer status')}
            >
              {jobsLoaded && !jobsError ? (
                <>
                  {formatJobStatusLine(
                    t,
                    jobStatusLabel(consumerJob),
                    consumerPod?.metadata?.name,
                  )}
                  {consumerPod?.metadata?.name && (
                    <Button
                      component="a"
                      href={consumerPodHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant={ButtonVariant.link}
                      isInline
                    >
                      {consumerPod.metadata.name}
                    </Button>
                  )}
                </>
              ) : (
                t('Waiting for job status...')
              )}
            </Alert>
            <Button
              variant={ButtonVariant.primary}
              onClick={handleRunConsumer}
              isDisabled={consumerStatus.status === 'working'}
            >
              {consumerStatus.status === 'working' && <Spinner size="sm" />}{' '}
              {t('Run consumer job')}
            </Button>
          </FormSection>
        </Form>
      ),
    },
    {
      name: t('Cleanup'),
      isDisabled: !hasClientCert,
      component: (
        <>
          <Alert variant={AlertVariant.warning} isInline title={t('Cleanup')}>
            {t(
              'This deletes the connectivity test resources created by the wizard.',
            )}
          </Alert>
          <Button
            variant={ButtonVariant.danger}
            onClick={handleCleanup}
            isDisabled={cleanupStatus.status === 'working'}
          >
            {cleanupStatus.status === 'working' && <Spinner size="sm" />}{' '}
            {t('Delete test resources')}
          </Button>
          {renderActionStatus(cleanupStatus, t)}
        </>
      ),
    },
  ];

  return (
    <>
      <PageSection>
        <Title headingLevel="h2">{t('Connectivity')}</Title>
        <Card>
          <>
            <CardTitle>{t('Test the brokers configuration')}</CardTitle>
            <CardBody>
              <TextContent>
                <Text component={TextVariants.p}>
                  {t(
                    'Validate the broker data plane by creating a client certificate, generating PEMCFG configuration, and running producer/consumer jobs.',
                  )}
                </Text>
                <Button
                  variant={ButtonVariant.primary}
                  onClick={() => setIsOpen(true)}
                >
                  {t('Open connectivity tester')}
                </Button>
              </TextContent>
            </CardBody>
          </>
        </Card>
      </PageSection>
      <Modal
        title={t('Connectivity tester')}
        variant={ModalVariant.large}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        hasNoBodyWrapper
      >
        <Wizard onClose={() => setIsOpen(false)} isVisitRequired>
          {wizardSteps.map((step, index) => (
            <WizardStep
              key={step.name}
              id={`connectivity-step-${index}`}
              name={step.name}
              isDisabled={step.isDisabled}
              footer={step.footer}
            >
              {step.component}
            </WizardStep>
          ))}
        </Wizard>
      </Modal>
    </>
  );
};
