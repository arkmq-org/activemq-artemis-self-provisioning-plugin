import { useCallback, useRef, useState } from 'react';
import { k8sCreate, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { SecretModel } from '@app/k8s/models';
import { RestrictedDataPlaneStatus } from '@app/reducers/restricted/import-types';
import { useTranslation } from '@app/i18n/i18n';

type AmqpsSecretParams = {
  amqpsEnabled: boolean;
  brokerName: string;
  namespace: string;
};

type JaasSecretParams = {
  jaasEnabled: boolean;
  jaasConsent: boolean;
  jaasConsentTrigger?: number;
  securityDomain: string;
  roleName: string;
  clientCN: string;
  namespace: string;
  jaasSecretName: string;
};

export const useCreateAmqpsPemSecret = ({
  amqpsEnabled,
  brokerName,
  namespace,
}: AmqpsSecretParams) => {
  const { t } = useTranslation();
  const [amqpsSecretStatus, setAmqpsSecretStatus] = useState<
    { status: RestrictedDataPlaneStatus; message?: string } | undefined
  >(undefined);
  const prevAmqpsSignatureRef = useRef<string>('');
  const reconcileRunRef = useRef(0);

  const updateAmqpsStatus = useCallback(
    (status: RestrictedDataPlaneStatus, message?: string) => {
      setAmqpsSecretStatus({ status, message });
    },
    [],
  );

  const amqpsSignature = JSON.stringify({
    enabled: amqpsEnabled,
    brokerName,
    namespace,
  });

  const reconcileAmqps = async (runId: number) => {
    if (!amqpsEnabled) {
      updateAmqpsStatus(
        'idle',
        t('Enable the secured acceptor to create the amqps-pem secret.'),
      );
      return;
    }

    updateAmqpsStatus('syncing', t('Ensuring amqps-pem secret...'));

    try {
      const brokerCertSecretName = brokerName
        ? `${brokerName}-broker-cert`
        : 'broker-cert';
      const desiredPemCfg =
        `source.key=/amq/extra/secrets/${brokerCertSecretName}/tls.key\n` +
        `source.cert=/amq/extra/secrets/${brokerCertSecretName}/tls.crt`;

      try {
        await k8sDelete({
          model: SecretModel,
          resource: { metadata: { name: 'amqps-pem', namespace } },
        });
      } catch (error) {
        const statusCode = error?.code || error?.response?.status;
        if (statusCode !== 404) {
          throw error;
        }
      }

      await k8sCreate({
        model: SecretModel,
        data: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: 'amqps-pem',
            namespace,
          },
          type: 'Opaque',
          stringData: {
            '_amqps.pemcfg': desiredPemCfg,
          },
        },
      });

      if (reconcileRunRef.current === runId) {
        updateAmqpsStatus('ready', t('amqps-pem secret is ready.'));
      }
    } catch (error) {
      if (reconcileRunRef.current === runId) {
        updateAmqpsStatus(
          'error',
          error?.message || t('Failed to manage amqps-pem secret.'),
        );
      }
    }
  };

  if (prevAmqpsSignatureRef.current !== amqpsSignature) {
    prevAmqpsSignatureRef.current = amqpsSignature;
    reconcileRunRef.current += 1;
    void reconcileAmqps(reconcileRunRef.current);
  }

  return { amqpsSecretStatus };
};

export const useCreateJaasConfigPropertiesSecret = ({
  jaasEnabled,
  jaasConsent,
  jaasConsentTrigger,
  securityDomain,
  roleName,
  clientCN,
  namespace,
  jaasSecretName,
}: JaasSecretParams) => {
  const { t } = useTranslation();
  const [jaasSecretStatus, setJaasSecretStatus] = useState<
    { status: RestrictedDataPlaneStatus; message?: string } | undefined
  >(undefined);
  const prevJaasSignatureRef = useRef<string>('');
  const reconcileRunRef = useRef(0);

  const updateJaasStatus = useCallback(
    (status: RestrictedDataPlaneStatus, message?: string) => {
      setJaasSecretStatus({ status, message });
    },
    [],
  );

  const jaasSignature = JSON.stringify({
    enabled: jaasEnabled,
    consent: jaasConsent,
    consentTrigger: jaasConsentTrigger ?? 0,
    securityDomain: securityDomain.trim(),
    roleName: roleName.trim(),
    clientCN: clientCN.trim(),
    namespace,
    jaasSecretName,
  });

  const reconcileJaas = async (runId: number) => {
    if (!jaasEnabled) {
      updateJaasStatus(
        'idle',
        t('Enable the secured acceptor to generate JAAS configuration.'),
      );
      return;
    }
    if (!jaasConsent) {
      updateJaasStatus(
        'idle',
        t('Acknowledge the warning to manage the JAAS secret.'),
      );
      return;
    }
    if (!securityDomain.trim() || !roleName.trim() || !clientCN.trim()) {
      updateJaasStatus(
        'idle',
        t('Fill the security domain, role name, and client CN.'),
      );
      return;
    }

    updateJaasStatus('syncing', t('Ensuring JAAS BP secret...'));

    try {
      const certUsers = `${clientCN}=/.*${clientCN}.*/`;
      const certRoles = `${roleName}=${clientCN}`;
      const { expectedLines } = buildJaasConfigEntries(
        securityDomain.trim(),
        jaasSecretName,
      );

      try {
        await k8sDelete({
          model: SecretModel,
          resource: { metadata: { name: jaasSecretName, namespace } },
        });
      } catch (error) {
        const statusCode = error?.code || error?.response?.status;
        if (statusCode !== 404) {
          throw error;
        }
      }

      await k8sCreate({
        model: SecretModel,
        data: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: jaasSecretName,
            namespace,
          },
          type: 'Opaque',
          stringData: {
            '_cert-users': certUsers,
            '_cert-roles': certRoles,
            'jaas-config-bp.properties': expectedLines.join('\n'),
          },
        },
      });

      if (reconcileRunRef.current === runId) {
        updateJaasStatus('ready', t('JAAS BP secret is ready.'));
      }
    } catch (error) {
      if (reconcileRunRef.current === runId) {
        updateJaasStatus(
          'error',
          error?.message || t('Failed to manage JAAS secret.'),
        );
      }
    }
  };

  if (prevJaasSignatureRef.current !== jaasSignature) {
    prevJaasSignatureRef.current = jaasSignature;
    reconcileRunRef.current += 1;
    void reconcileJaas(reconcileRunRef.current);
  }

  return { jaasSecretStatus };
};

const buildJaasConfigEntries = (securityDomain: string, secretName: string) => {
  const baseDir = `/amq/extra/secrets/${secretName}`;
  const entries: [string, string][] = [
    [
      `jaasConfigs."${securityDomain}".modules.cert.loginModuleClass`,
      'org.apache.activemq.artemis.spi.core.security.jaas.TextFileCertificateLoginModule',
    ],
    [`jaasConfigs."${securityDomain}".modules.cert.controlFlag`, 'required'],
    [`jaasConfigs."${securityDomain}".modules.cert.params.debug`, 'true'],
    [
      `jaasConfigs."${securityDomain}".modules.cert.params."org.apache.activemq.jaas.textfiledn.role"`,
      '_cert-roles',
    ],
    [
      `jaasConfigs."${securityDomain}".modules.cert.params."org.apache.activemq.jaas.textfiledn.user"`,
      '_cert-users',
    ],
    [`jaasConfigs."${securityDomain}".modules.cert.params.baseDir`, baseDir],
  ];
  return {
    expectedEntries: new Map(entries),
    expectedLines: entries.map(([key, value]) => `${key}=${value}`),
  };
};
