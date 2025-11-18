import { K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import {
  AMQ_BROKER_APIGROUP,
  API_VERSION,
  CERT_ISSUER_VERSION,
  CERT_MANAGER_APIGROUP,
  CERT_VERSION,
  SECRET_APIGROUP,
  SECRET_VERSION,
  TRUST_MANAGER_APIGROUP,
  TRUST_MANAGER_VERSION,
} from '@app/constants/constants';

export const AMQBrokerModel: K8sModel = {
  apiGroup: AMQ_BROKER_APIGROUP,
  apiVersion: API_VERSION,
  kind: 'ActiveMQArtemis',
  label: 'Broker',
  labelKey: 'Brokers',
  labelPlural: 'Brokers',
  labelPluralKey: 'activemqartemises',
  plural: 'activemqartemises',
  id: 'broker',
  abbr: 'B',
  namespaced: true,
  crd: true,
};

export const CertIssuerModel: K8sModel = {
  apiGroup: CERT_MANAGER_APIGROUP,
  apiVersion: CERT_ISSUER_VERSION,
  kind: 'Issuer',
  label: 'Issuer',
  labelKey: 'Issuers',
  labelPlural: 'Issuers',
  labelPluralKey: 'issuers',
  plural: 'issuers',
  id: 'issuer',
  abbr: 'I',
  namespaced: true,
  crd: true,
};

export const ClusterIssuerModel: K8sModel = {
  apiGroup: CERT_MANAGER_APIGROUP,
  apiVersion: CERT_ISSUER_VERSION,
  kind: 'ClusterIssuer',
  label: 'ClusterIssuer',
  labelKey: 'ClusterIssuers',
  labelPlural: 'ClusterIssuers',
  labelPluralKey: 'clusterissuers',
  plural: 'clusterissuers',
  id: 'clusterissuer',
  abbr: 'CI',
  namespaced: false,
  crd: true,
};

export const CertModel: K8sModel = {
  apiGroup: CERT_MANAGER_APIGROUP,
  apiVersion: CERT_VERSION,
  kind: 'Certificate',
  label: 'Certificate',
  labelKey: 'Certificate',
  labelPlural: 'Certificates',
  labelPluralKey: 'Certificates',
  plural: 'certificates',
  id: 'certificate',
  abbr: 'C',
  namespaced: true,
  crd: true,
};

export const SecretModel: K8sModel = {
  apiGroup: SECRET_APIGROUP,
  apiVersion: SECRET_VERSION,
  kind: 'SecretList',
  label: 'Secret',
  labelKey: 'Secret',
  labelPlural: 'Secrets',
  labelPluralKey: 'Secrets',
  plural: 'secrets',
  id: 'secret',
  abbr: 'S',
  namespaced: true,
  crd: true,
};

export const JaasConfigModule: K8sModel = {
  apiGroup: SECRET_APIGROUP,
  apiVersion: SECRET_VERSION,
  kind: 'SecretList',
  label: 'Secret',
  labelKey: 'Secret',
  labelPlural: 'Secrets',
  labelPluralKey: 'Secrets',
  plural: 'secrets',
  id: 'secret',
  abbr: 'S',
  namespaced: true,
  crd: true,
};

export const IngressDomainModel: K8sModel = {
  apiGroup: 'config.openshift.io',
  apiVersion: 'v1',
  kind: 'Ingress',
  label: 'ingress',
  plural: 'ingresses',
  labelPlural: 'ingresses',
  abbr: 'I',
  namespaced: true,
};

export const BundleModel: K8sModel = {
  apiGroup: TRUST_MANAGER_APIGROUP,
  apiVersion: TRUST_MANAGER_VERSION,
  kind: 'Bundle',
  label: 'Bundle',
  labelKey: 'Bundle',
  labelPlural: 'Bundles',
  labelPluralKey: 'Bundles',
  plural: 'bundles',
  id: 'bundle',
  abbr: 'BDL',
  namespaced: false,
  crd: true,
};
