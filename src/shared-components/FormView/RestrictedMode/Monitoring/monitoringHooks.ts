import { useCallback, useRef, useState } from 'react';
import {
  k8sCreate,
  k8sDelete,
  k8sGet,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';
import type { K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import {
  CertModel,
  NamespaceModel,
  ServiceModel,
  ServiceMonitorModel,
} from '@app/k8s/models';
import { useTranslation } from '@app/i18n/i18n';

export type MonitoringStatus = 'idle' | 'syncing' | 'ready' | 'error';

type MonitoringResourceStatus = {
  status: MonitoringStatus;
  message?: string;
};

type MonitoringParams = {
  enabled?: boolean;
  brokerName: string;
  namespace: string;
};

const PROMETHEUS_CERT_NAME = 'prometheus-cert';
const METRICS_PORT = 8888;

export const useCreateMonitoringResources = ({
  enabled,
  brokerName,
  namespace,
}: MonitoringParams) => {
  const { t } = useTranslation();
  const [certStatus, setCertStatus] = useState<MonitoringResourceStatus>();
  const [serviceStatus, setServiceStatus] =
    useState<MonitoringResourceStatus>();
  const [serviceMonitorStatus, setServiceMonitorStatus] =
    useState<MonitoringResourceStatus>();
  const [namespaceStatus, setNamespaceStatus] =
    useState<MonitoringResourceStatus>();
  const reconcileRunRef = useRef(0);
  const prevSignatureRef = useRef<string>('');
  const prevEnabledRef = useRef<boolean>(enabled ?? false);

  const updateStatus = useCallback(
    (
      setter: (status: MonitoringResourceStatus) => void,
      status: MonitoringStatus,
      message?: string,
    ) => {
      setter({ status, message });
    },
    [],
  );

  type ErrorWithStatus = {
    code?: number;
    response?: { status?: number };
    message?: string;
  };
  const getStatusCode = (error: unknown) => {
    const err = error as ErrorWithStatus | null | undefined;
    return err?.code ?? err?.response?.status;
  };
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    const err = error as ErrorWithStatus | null | undefined;
    return err?.message || t('Unexpected error.');
  };
  const isNotFoundError = (error: unknown) => getStatusCode(error) === 404;

  const reconcile = async (runId: number, forceRecreateCert: boolean) => {
    const namespaceLabelKey = 'openshift.io/user-monitoring';
    const metricsServiceName = `${brokerName}-metrics`;
    const serviceMonitorName = `${brokerName}-metrics`;
    const brokerHost = `${brokerName}-ss-0.${brokerName}-hdls-svc.${namespace}.svc.cluster.local`;
    const deleteResource = async (
      model: K8sModel,
      name: string,
      statusSetter: (status: MonitoringResourceStatus) => void,
      removingMessage: string,
      removedMessage: string,
      errorMessage: string,
    ) => {
      updateStatus(statusSetter, 'syncing', removingMessage);
      try {
        await k8sDelete({
          model,
          resource: { metadata: { name, namespace } },
        });
        if (reconcileRunRef.current === runId) {
          updateStatus(statusSetter, 'idle', removedMessage);
        }
      } catch (error) {
        if (!isNotFoundError(error)) {
          if (reconcileRunRef.current === runId) {
            updateStatus(
              statusSetter,
              'error',
              getErrorMessage(error) || errorMessage,
            );
          }
          throw error;
        }
        if (reconcileRunRef.current === runId) {
          updateStatus(statusSetter, 'idle', removedMessage);
        }
      }
    };

    if (enabled === undefined) {
      updateStatus(
        setCertStatus,
        'syncing',
        t('Checking Prometheus certificate...'),
      );
      updateStatus(
        setServiceStatus,
        'syncing',
        t('Checking metrics service...'),
      );
      updateStatus(
        setServiceMonitorStatus,
        'syncing',
        t('Checking ServiceMonitor...'),
      );
      updateStatus(
        setNamespaceStatus,
        'syncing',
        t('Checking namespace label...'),
      );

      try {
        await k8sGet({
          model: CertModel,
          name: PROMETHEUS_CERT_NAME,
          ns: namespace,
        });
        if (reconcileRunRef.current === runId) {
          updateStatus(
            setCertStatus,
            'ready',
            t('Prometheus certificate is ready.'),
          );
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          if (reconcileRunRef.current === runId) {
            updateStatus(
              setCertStatus,
              'idle',
              t('Prometheus certificate not found.'),
            );
          }
        } else if (reconcileRunRef.current === runId) {
          updateStatus(
            setCertStatus,
            'error',
            getErrorMessage(error) ||
              t('Failed to check Prometheus certificate.'),
          );
        }
      }

      try {
        await k8sGet({
          model: ServiceModel,
          name: metricsServiceName,
          ns: namespace,
        });
        if (reconcileRunRef.current === runId) {
          updateStatus(
            setServiceStatus,
            'ready',
            t('Metrics service is ready.'),
          );
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          if (reconcileRunRef.current === runId) {
            updateStatus(
              setServiceStatus,
              'idle',
              t('Metrics service not found.'),
            );
          }
        } else if (reconcileRunRef.current === runId) {
          updateStatus(
            setServiceStatus,
            'error',
            getErrorMessage(error) || t('Failed to check metrics service.'),
          );
        }
      }

      try {
        await k8sGet({
          model: ServiceMonitorModel,
          name: serviceMonitorName,
          ns: namespace,
        });
        if (reconcileRunRef.current === runId) {
          updateStatus(
            setServiceMonitorStatus,
            'ready',
            t('ServiceMonitor is ready.'),
          );
        }
      } catch (error) {
        if (isNotFoundError(error)) {
          if (reconcileRunRef.current === runId) {
            updateStatus(
              setServiceMonitorStatus,
              'idle',
              t('ServiceMonitor not found.'),
            );
          }
        } else if (reconcileRunRef.current === runId) {
          updateStatus(
            setServiceMonitorStatus,
            'error',
            getErrorMessage(error) || t('Failed to check ServiceMonitor.'),
          );
        }
      }

      try {
        const ns = await k8sGet({
          model: NamespaceModel,
          name: namespace,
        });
        const labels = { ...(ns.metadata?.labels || {}) };
        if (labels[namespaceLabelKey] === 'true') {
          if (reconcileRunRef.current === runId) {
            updateStatus(
              setNamespaceStatus,
              'ready',
              t('Namespace is labeled for user monitoring.'),
            );
          }
        } else if (reconcileRunRef.current === runId) {
          updateStatus(
            setNamespaceStatus,
            'idle',
            t('Namespace is not labeled for monitoring.'),
          );
        }
      } catch (error) {
        if (reconcileRunRef.current === runId) {
          updateStatus(
            setNamespaceStatus,
            'error',
            getErrorMessage(error) || t('Failed to check namespace label.'),
          );
        }
      }
      return;
    }

    if (!enabled) {
      updateStatus(
        setNamespaceStatus,
        'syncing',
        t('Removing namespace label for user monitoring...'),
      );

      try {
        await deleteResource(
          ServiceMonitorModel,
          serviceMonitorName,
          setServiceMonitorStatus,
          t('Removing ServiceMonitor...'),
          t('ServiceMonitor removed.'),
          t('Failed to remove ServiceMonitor.'),
        );
      } catch {
        // error handled in deleteResource
      }
      try {
        await deleteResource(
          ServiceModel,
          metricsServiceName,
          setServiceStatus,
          t('Removing metrics service...'),
          t('Metrics service removed.'),
          t('Failed to remove metrics service.'),
        );
      } catch {
        // error handled in deleteResource
      }
      try {
        await deleteResource(
          CertModel,
          PROMETHEUS_CERT_NAME,
          setCertStatus,
          t('Removing Prometheus certificate...'),
          t('Prometheus certificate removed.'),
          t('Failed to remove Prometheus certificate.'),
        );
      } catch {
        // error handled in deleteResource
      }

      try {
        const ns = await k8sGet({
          model: NamespaceModel,
          name: namespace,
        });
        const labels = { ...(ns.metadata?.labels || {}) };
        if (labels[namespaceLabelKey]) {
          delete labels[namespaceLabelKey];
          await k8sUpdate({
            model: NamespaceModel,
            data: { ...ns, metadata: { ...ns.metadata, labels } },
          });
        }
        if (reconcileRunRef.current === runId) {
          updateStatus(
            setNamespaceStatus,
            'idle',
            t('Namespace is not labeled for monitoring.'),
          );
        }
      } catch (error) {
        if (reconcileRunRef.current === runId) {
          updateStatus(
            setNamespaceStatus,
            'error',
            getErrorMessage(error) || t('Failed to remove namespace label.'),
          );
        }
      }
      return;
    }

    updateStatus(
      setCertStatus,
      'syncing',
      t('Ensuring Prometheus certificate...'),
    );
    updateStatus(setServiceStatus, 'syncing', t('Ensuring metrics service...'));
    updateStatus(
      setServiceMonitorStatus,
      'syncing',
      t('Ensuring ServiceMonitor...'),
    );
    updateStatus(
      setNamespaceStatus,
      'syncing',
      t('Ensuring namespace label for user monitoring...'),
    );

    try {
      const ns = await k8sGet({
        model: NamespaceModel,
        name: namespace,
      });
      const labels = { ...(ns.metadata?.labels || {}) };
      if (labels[namespaceLabelKey] !== 'true') {
        labels[namespaceLabelKey] = 'true';
        await k8sUpdate({
          model: NamespaceModel,
          data: { ...ns, metadata: { ...ns.metadata, labels } },
        });
      }
      if (reconcileRunRef.current === runId) {
        updateStatus(
          setNamespaceStatus,
          'ready',
          t('Namespace is labeled for user monitoring.'),
        );
      }
    } catch (error) {
      if (reconcileRunRef.current === runId) {
        updateStatus(
          setNamespaceStatus,
          'error',
          getErrorMessage(error) ||
            t('Failed to label namespace for monitoring.'),
        );
      }
    }

    try {
      if (forceRecreateCert) {
        try {
          await k8sDelete({
            model: CertModel,
            resource: { metadata: { name: PROMETHEUS_CERT_NAME, namespace } },
          });
        } catch (error) {
          if (!isNotFoundError(error)) {
            throw error;
          }
        }
      } else {
        try {
          await k8sGet({
            model: CertModel,
            name: PROMETHEUS_CERT_NAME,
            ns: namespace,
          });
          if (reconcileRunRef.current === runId) {
            updateStatus(
              setCertStatus,
              'ready',
              t('Prometheus certificate is ready.'),
            );
          }
        } catch (error) {
          if (!isNotFoundError(error)) {
            throw error;
          }
          await k8sCreate({
            model: CertModel,
            data: {
              apiVersion: 'cert-manager.io/v1',
              kind: 'Certificate',
              metadata: {
                name: PROMETHEUS_CERT_NAME,
                namespace,
              },
              spec: {
                secretName: PROMETHEUS_CERT_NAME,
                secretTemplate: {
                  labels: {
                    'openshift.io/user-monitoring': 'true',
                  },
                },
                commonName: 'prometheus',
                issuerRef: {
                  name: 'dev-ca-issuer',
                  kind: 'ClusterIssuer',
                },
              },
            },
          });
          if (reconcileRunRef.current === runId) {
            updateStatus(
              setCertStatus,
              'ready',
              t('Prometheus certificate is ready.'),
            );
          }
        }
      }

      if (forceRecreateCert) {
        await k8sCreate({
          model: CertModel,
          data: {
            apiVersion: 'cert-manager.io/v1',
            kind: 'Certificate',
            metadata: {
              name: PROMETHEUS_CERT_NAME,
              namespace,
            },
            spec: {
              secretName: PROMETHEUS_CERT_NAME,
              secretTemplate: {
                labels: {
                  'openshift.io/user-monitoring': 'true',
                },
              },
              commonName: 'prometheus',
              issuerRef: {
                name: 'dev-ca-issuer',
                kind: 'ClusterIssuer',
              },
            },
          },
        });

        if (reconcileRunRef.current === runId) {
          updateStatus(
            setCertStatus,
            'ready',
            t('Prometheus certificate is ready.'),
          );
        }
      }
    } catch (error) {
      if (reconcileRunRef.current === runId) {
        updateStatus(
          setCertStatus,
          'error',
          getErrorMessage(error) ||
            t('Failed to create Prometheus certificate.'),
        );
      }
    }

    try {
      try {
        await k8sGet({
          model: ServiceModel,
          name: metricsServiceName,
          ns: namespace,
        });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
        await k8sCreate({
          model: ServiceModel,
          data: {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
              name: metricsServiceName,
              namespace,
              labels: {
                app: brokerName,
              },
            },
            spec: {
              selector: {
                ActiveMQArtemis: brokerName,
              },
              ports: [
                {
                  name: 'metrics',
                  port: METRICS_PORT,
                  targetPort: METRICS_PORT,
                  protocol: 'TCP',
                },
              ],
            },
          },
        });
      }

      if (reconcileRunRef.current === runId) {
        updateStatus(setServiceStatus, 'ready', t('Metrics service is ready.'));
      }
    } catch (error) {
      if (reconcileRunRef.current === runId) {
        updateStatus(
          setServiceStatus,
          'error',
          getErrorMessage(error) || t('Failed to create metrics service.'),
        );
      }
    }

    try {
      try {
        await k8sGet({
          model: ServiceMonitorModel,
          name: serviceMonitorName,
          ns: namespace,
        });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
        await k8sCreate({
          model: ServiceMonitorModel,
          data: {
            apiVersion: 'monitoring.coreos.com/v1',
            kind: 'ServiceMonitor',
            metadata: {
              name: serviceMonitorName,
              namespace,
              labels: {
                app: brokerName,
              },
            },
            spec: {
              selector: {
                matchLabels: {
                  app: brokerName,
                },
              },
              endpoints: [
                {
                  port: 'metrics',
                  scheme: 'https',
                  path: '/metrics',
                  tlsConfig: {
                    serverName: brokerHost,
                    ca: {
                      secret: {
                        name: 'activemq-artemis-manager-ca',
                        key: 'ca.pem',
                      },
                    },
                    cert: {
                      secret: {
                        name: PROMETHEUS_CERT_NAME,
                        key: 'tls.crt',
                      },
                    },
                    keySecret: {
                      name: PROMETHEUS_CERT_NAME,
                      key: 'tls.key',
                    },
                  },
                },
              ],
            },
          },
        });
      }

      if (reconcileRunRef.current === runId) {
        updateStatus(
          setServiceMonitorStatus,
          'ready',
          t('ServiceMonitor is ready.'),
        );
      }
    } catch (error) {
      if (reconcileRunRef.current === runId) {
        updateStatus(
          setServiceMonitorStatus,
          'error',
          getErrorMessage(error) || t('Failed to create ServiceMonitor.'),
        );
      }
    }
  };

  const signature = JSON.stringify({
    enabled,
    brokerName,
    namespace,
  });
  if (!brokerName || !namespace) {
    prevSignatureRef.current = signature;
    return {
      certStatus,
      serviceStatus,
      serviceMonitorStatus,
      namespaceStatus,
    };
  }
  if (prevSignatureRef.current !== signature) {
    prevSignatureRef.current = signature;
    reconcileRunRef.current += 1;
    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = enabled ?? false;
    const forceRecreateCert = (enabled ?? false) && !wasEnabled;
    void reconcile(reconcileRunRef.current, forceRecreateCert);
  }

  return {
    certStatus,
    serviceStatus,
    serviceMonitorStatus,
    namespaceStatus,
  };
};
