import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import {
  CertIssuerModel,
  ClusterIssuerModel,
  CertModel,
  BundleModel,
} from './models';

/**
 * Creates a complete chain of trust for ClusterIssuers:
 * 1. Self-signed root ClusterIssuer
 * 2. Root CA Certificate in cert-manager namespace
 * 3. Final ClusterIssuer that uses the root CA
 *
 * Note: Trust bundle creation is handled separately by administrators
 *
 * @param name The base name for the issuer (will be used for the final ClusterIssuer)
 * @param ingressDomain The ingress domain for DNS names
 * @returns A promise that resolves when all resources are created
 */
export const createClusterIssuerChainOfTrust = async (
  name: string,
  ingressDomain: string,
) => {
  const rootIssuerName = name + '-root-issuer';
  // Step 1: Create self-signed root ClusterIssuer
  const rootIssuer = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'ClusterIssuer',
    metadata: {
      name: rootIssuerName,
    },
    spec: {
      selfSigned: {},
    },
  };

  // Step 2: Create root CA Certificate in cert-manager namespace
  const rootCACertName = name + 'cert';
  const rootCACertSecretName = name + '-cert-secret';
  const rootCACert = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'Certificate',
    metadata: {
      name: rootCACertName,
      namespace: 'cert-manager',
    },
    spec: {
      isCA: true,
      commonName: name,
      dnsNames: ['issuer.' + ingressDomain],
      secretName: rootCACertSecretName,
      privateKey: {
        algorithm: 'RSA',
        encoding: 'PKCS1',
        size: 2048,
      },
      issuerRef: {
        name: rootIssuerName,
        kind: 'ClusterIssuer',
        group: 'cert-manager.io',
      },
    },
  };

  // Step 3: Create the final ClusterIssuer using the root CA
  const clusterIssuer = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'ClusterIssuer',
    metadata: {
      name: name,
    },
    spec: {
      ca: {
        secretName: rootCACertSecretName,
      },
    },
  };

  // Create resources in sequence
  try {
    // Check if root issuer already exists, if not create it
    try {
      await k8sCreate({ model: ClusterIssuerModel, data: rootIssuer });
    } catch (error) {
      // If it already exists, that's fine
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('already exists')) {
        throw error;
      }
    }

    // Create root CA certificate
    try {
      await k8sCreate({ model: CertModel, data: rootCACert });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('already exists')) {
        throw error;
      }
    }

    // Create the final ClusterIssuer
    await k8sCreate({ model: ClusterIssuerModel, data: clusterIssuer });

    return clusterIssuer;
  } catch (error) {
    throw new Error(
      `Failed to create ClusterIssuer chain of trust: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

/**
 * Creates a namespace-scoped chain of trust (existing functionality).
 * This creates: root Issuer -> CA Certificate -> final Issuer
 *
 * @param name The base name for the issuer
 * @param namespace The namespace to create resources in
 * @param ingressDomain The ingress domain for DNS names
 * @returns A promise that resolves when all resources are created
 */
export const createIssuerChainOfTrust = async (
  name: string,
  namespace: string,
  ingressDomain: string,
) => {
  const rootIssuer = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'Issuer',
    metadata: {
      name: name + '-root-issuer',
      namespace: namespace,
    },
    spec: {
      selfSigned: {},
    },
  };

  const issuerCa = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'Certificate',
    metadata: {
      name: name + 'cert',
      namespace: namespace,
    },
    spec: {
      isCA: true,
      commonName: name,
      dnsNames: ['issuer.' + ingressDomain],
      secretName: name + '-cert-secret',
      privateKey: {
        algorithm: 'ECDSA',
        size: 256,
      },
      issuerRef: {
        name: rootIssuer.metadata.name,
        kind: 'Issuer',
      },
    },
  };

  const content = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'Issuer',
    metadata: {
      name: name,
      namespace: namespace,
    },
    spec: {
      ca: {
        secretName: issuerCa.spec.secretName,
      },
    },
  };

  return await k8sCreate({ model: CertIssuerModel, data: rootIssuer }).then(
    async () => {
      return await k8sCreate({ model: CertModel, data: issuerCa }).then(
        async () => {
          return await k8sCreate({ model: CertIssuerModel, data: content });
        },
      );
    },
  );
};

/**
 * Creates a restricted mode certificate.
 *
 * @param clusterIssuer The name of the ClusterIssuer.
 * @param certName The name of the Certificate resource.
 * @param namespace The namespace to create the Certificate in.
 * @param commonName The common name for the certificate.
 * @param secretName The name of the secret to store the certificate in.
 * @param isCA Whether this certificate should be a CA.
 * @param dnsNames Optional array of DNS names for the certificate.
 * @returns A promise that resolves with the created Certificate resource.
 */
export const createRestrictedCert = async (
  clusterIssuer: string,
  certName: string,
  namespace: string,
  commonName: string,
  secretName: string,
  isCA: boolean,
  dnsNames?: string[],
) => {
  const cert = {
    apiVersion: 'cert-manager.io/v1',
    kind: 'Certificate',
    metadata: {
      name: certName,
      namespace: namespace,
    },
    spec: {
      commonName: commonName,
      ...(dnsNames && dnsNames.length > 0 ? { dnsNames } : {}),
      secretName: secretName,
      privateKey: {
        algorithm: 'RSA',
        encoding: 'PKCS1',
        size: 2048,
      },
      isCA: isCA,
      issuerRef: {
        name: clusterIssuer,
        kind: 'ClusterIssuer',
        group: 'cert-manager.io',
      },
    },
  };

  return await k8sCreate({ model: CertModel, data: cert });
};

/**
 * Creates a trust-manager Bundle to distribute CA certificates to multiple namespaces.
 * The Bundle reads a CA certificate from a source secret and creates a copy of it
 * in all specified target namespaces.
 *
 * Note: trust-manager v1alpha1 does not support specifying the source secret's namespace
 * in the Bundle spec. The secret must be in the namespace where trust-manager is configured
 * to look for source secrets (typically the trust-manager installation namespace).
 *
 * @param bundleName The name of the Bundle resource (also the name of the secret it creates)
 * @param sourceSecretName The name of the secret containing the CA certificate (e.g., 'root-ca-secret')
 * @param _sourceNamespace The namespace where the source secret is located (currently unused due to API limitation)
 * @param targetNamespaces Array of namespaces where the CA secret should be distributed
 * @returns A promise that resolves when the Bundle is created
 */
export const createTrustBundle = async (
  bundleName: string,
  sourceSecretName: string,
  _sourceNamespace: string,
  targetNamespaces: string[],
) => {
  const trustBundle = {
    apiVersion: 'trust.cert-manager.io/v1alpha1',
    kind: 'Bundle',
    metadata: {
      name: bundleName,
    },
    spec: {
      sources: [
        {
          secret: {
            name: sourceSecretName,
            key: 'tls.crt',
          },
        },
      ],
      target: {
        secret: {
          key: 'ca.pem',
        },
        namespaceSelector: {
          matchExpressions: [
            {
              key: 'kubernetes.io/metadata.name',
              operator: 'In',
              values: targetNamespaces,
            },
          ],
        },
      },
    },
  };

  try {
    await k8sCreate({
      model: BundleModel,
      data: trustBundle,
    });
    return trustBundle;
  } catch (error) {
    throw new Error(
      `Failed to create Trust Bundle: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
