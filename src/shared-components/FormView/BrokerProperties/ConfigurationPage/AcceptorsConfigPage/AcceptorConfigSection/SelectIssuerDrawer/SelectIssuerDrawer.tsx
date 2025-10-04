import { useTranslation } from '@app/i18n/i18n';
import { BrokerCreationFormState } from '@app/reducers/reducer';
import { CertIssuerModel, CertModel } from '@app/k8s/models';
import { IssuerResource } from '@app/k8s/types';
import {
  RedExclamationCircleIcon,
  k8sCreate,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelContent,
  FormGroup,
  FormHelperText,
  InputGroup,
  InputGroupItem,
  Spinner,
  Split,
  SplitItem,
  TextInput,
} from '@patternfly/react-core';
import { FC, useContext, useMemo, useState } from 'react';
import { TypeaheadSelect } from '@patternfly/react-templates';

const createChainOftrust = async (
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

type SelectIssuerDrawerProps = {
  selectedIssuer: string;
  setSelectedIssuer: (issuerName: string) => void;
  clearIssuer: () => void;
  disableCreation?: boolean;
  isClusterIssuer?: boolean;
};

export const SelectIssuerDrawer: FC<SelectIssuerDrawerProps> = ({
  selectedIssuer,
  setSelectedIssuer,
  clearIssuer,
  disableCreation,
  isClusterIssuer,
}) => {
  const { cr } = useContext(BrokerCreationFormState);
  const { t } = useTranslation();
  const [issuers, loaded, loadError] = useK8sWatchResource<IssuerResource[]>({
    groupVersionKind: {
      group: 'cert-manager.io',
      version: 'v1',
      kind: isClusterIssuer ? 'ClusterIssuer' : 'Issuer',
    },
    isList: true,
    namespace: isClusterIssuer ? '' : cr.metadata.namespace,
  });
  const [alertIssuer, setAlertIssuer] = useState<Error>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newIssuer, setNewIssuer] = useState('');

  const validIssuers = useMemo(() => {
    if (!issuers) return [];
    return issuers.filter((issuer) => issuer.spec?.ca !== undefined);
  }, [issuers]);

  const selectOptions = useMemo(() => {
    return validIssuers
      .map((issuer) => ({
        value: issuer.metadata.name,
        content: issuer.metadata.name,
      }))
      .sort((a, b) => String(a.content).localeCompare(String(b.content)));
  }, [validIssuers]);

  if (!loaded) {
    return <Spinner size="lg" />;
  }
  if (loadError) {
    return (
      <>
        {t('cant fetch issuers')}
        <RedExclamationCircleIcon />
      </>
    );
  }

  const clearSelection = () => {
    setAlertIssuer(undefined);
    clearIssuer();
  };

  const onSelectIssuer = (selection: string) => {
    setSelectedIssuer(selection);
  };

  const triggerChainOfTrustCreation = () => {
    setAlertIssuer(undefined);
    createChainOftrust(newIssuer, cr.metadata.namespace, cr.spec.ingressDomain)
      .then(() => {
        setIsExpanded(false);
        setSelectedIssuer(newIssuer);
      })
      .catch((reason) => {
        setAlertIssuer(reason);
      });
  };
  return (
    <>
      <Drawer
        isExpanded={isExpanded}
        position="right"
        onExpand={() => setIsExpanded(true)}
      >
        <DrawerContent
          panelContent={
            <DrawerPanelContent>
              <DrawerHead>
                <FormGroup label={t('Name of the issuer')} isRequired>
                  <FormHelperText>
                    {t(
                      'Clicking on create will trigger the creation of 3 elements, a root issuer, a certificate signed by the root issuer, and an issuer using the certificate. The name of the issuer will correspond to the later.',
                    )}
                  </FormHelperText>
                  <InputGroup>
                    <InputGroupItem isFill>
                      <TextInput
                        value={newIssuer}
                        onChange={(_event, v) => {
                          setAlertIssuer(undefined);
                          setNewIssuer(v);
                        }}
                      />
                    </InputGroupItem>
                    <InputGroupItem>
                      <Button onClick={triggerChainOfTrustCreation}>
                        {t('Create')}
                      </Button>
                    </InputGroupItem>
                  </InputGroup>
                </FormGroup>
                {alertIssuer && (
                  <Alert variant={AlertVariant.danger} title="Error">
                    {alertIssuer.message}
                  </Alert>
                )}
                <DrawerActions>
                  <DrawerCloseButton onClick={() => setIsExpanded(false)} />
                </DrawerActions>
              </DrawerHead>
            </DrawerPanelContent>
          }
        >
          <DrawerContentBody>
            <Split>
              <SplitItem isFilled>
                <TypeaheadSelect
                  selectOptions={selectOptions}
                  onClearSelection={clearSelection}
                  onSelect={(_ev, selectedValue) => {
                    const selection = String(selectedValue);
                    onSelectIssuer(selection);
                  }}
                  selected={selectedIssuer}
                  placeholder={
                    isClusterIssuer
                      ? t('Select a cluster issuer')
                      : t('Select an issuer')
                  }
                />
              </SplitItem>
              {!disableCreation && (
                <SplitItem>
                  <Button
                    variant={ButtonVariant.primary}
                    onClick={() => setIsExpanded(true)}
                  >
                    {t('Create a new chain of trust')}
                  </Button>
                </SplitItem>
              )}
            </Split>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};
