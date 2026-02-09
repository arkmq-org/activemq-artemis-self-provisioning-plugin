import {
  K8sResourceCommon,
  k8sGet,
  useK8sModel,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useState } from 'react';
import { AMQBrokerModel, IngressDomainModel } from './models';
import { BrokerCR, Ingress } from './types';

export const useGetIngressDomain = (): {
  clusterDomain: string;
  isLoading: boolean;
  error: string;
} => {
  const [domain, setDomain] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const k8sGetBroker = () => {
    setLoading(true);
    k8sGet({ model: IngressDomainModel, name: 'cluster' })
      .then((result) => {
        const ing = result as Ingress;
        setDomain(ing.spec?.domain ?? '');
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const [isFirstMount, setIsFirstMount] = useState(true);
  if (isFirstMount) {
    k8sGetBroker();
    setIsFirstMount(false);
  }

  return { clusterDomain: domain, isLoading: loading, error: error };
};

export const useGetBrokerCR = (
  brokerName: string,
  namespace: string,
): { brokerCr: BrokerCR; isLoading: boolean; error: string } => {
  const [brokers, loaded, loadError] = useK8sWatchResource<BrokerCR>({
    name: brokerName,
    namespace: namespace,
    groupVersionKind: {
      kind: AMQBrokerModel.kind,
      version: AMQBrokerModel.apiVersion,
      group: AMQBrokerModel.apiGroup,
    },
    isList: false,
  });

  return { brokerCr: brokers, isLoading: !loaded, error: loadError };
};

export const useHasCertManager = (): {
  hasCertManager: boolean;
  isLoading: boolean;
  error: string;
} => {
  const [isFirstMount, setIsFirstMount] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [hasCertManager, setHasCertManager] = useState(false);
  const [model] = useK8sModel({
    group: 'apiextensions.k8s.io',
    version: 'v1',
    kind: 'CustomResourceDefinition',
  });

  if (isFirstMount && model !== undefined) {
    k8sGet({
      model: model,
      name: 'certificates.cert-manager.io',
    })
      .then(
        () => {
          setHasCertManager(true);
        },
        (e) => {
          setError(e.message);
        },
      )
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
    setIsFirstMount(false);
  }
  return { hasCertManager: hasCertManager, isLoading: loading, error: error };
};

export const useGetServiceAccounts = (
  namespace: string,
): {
  serviceAccounts: K8sResourceCommon[];
  isLoading: boolean;
  error: string;
} => {
  const [sas, loaded, error] = useK8sWatchResource<K8sResourceCommon[]>({
    isList: true,
    groupVersionKind: {
      kind: 'ServiceAccount',
      version: 'v1',
    },
    namespaced: true,
    namespace: namespace,
  });
  return { serviceAccounts: sas, isLoading: !loaded, error: error };
};

/**
 * Watches for specific Kubernetes secrets in a namespace and returns the found secret name.
 * This hook declaratively tracks secret existence - when secret names change, it automatically
 * watches for the new names. Follows React best practices - no Effects needed!
 *
 * @param namespace - The Kubernetes namespace to watch
 * @param secretNames - Array of secret names to look for (checked in order, first match wins). Undefined/empty values are filtered out.
 * @returns The name of the found secret, or empty string if not found/not loaded yet
 */
export const useSecretWatcher = (
  namespace: string,
  secretNames: (string | undefined)[],
): string => {
  const [secrets, loaded] = useK8sWatchResource<K8sResourceCommon[]>({
    isList: true,
    groupVersionKind: {
      group: '',
      kind: 'Secret',
      version: 'v1',
    },
    namespaced: true,
    namespace: namespace,
  });

  // Filter out empty/undefined values - they're invalid secret names
  // This is a cheap operation, no need to memoize
  const validSecretNames = secretNames.filter(
    (name) => name && name.trim() !== '',
  );

  // Calculate during render - no Effect needed!
  if (!loaded || validSecretNames.length === 0) {
    return '';
  }

  // Find the first matching secret name from the list
  return (
    validSecretNames.find((name) =>
      secrets.some((s) => s.metadata?.name === name),
    ) || ''
  );
};
