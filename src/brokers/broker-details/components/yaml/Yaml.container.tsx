import { FC, Suspense } from 'react';
import { Loading } from '@app/shared-components/Loading/Loading';
import { ResourceYAMLEditor } from '@openshift-console/dynamic-plugin-sdk';
import YAML from 'yaml';
import { Alert, AlertVariant, Button } from '@patternfly/react-core';
import { useTranslation } from '@app/i18n/i18n';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import { useGetBrokerCR } from '@app/k8s/customHooks';
import { ErrorState } from '@app/shared-components/ErrorState/ErrorState';

const YamlContainer: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ns: namespace, name } = useParams<{ ns?: string; name?: string }>();
  const { brokerCr, isLoading, error } = useGetBrokerCR(name, namespace);
  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorState />;
  }
  const onClickEditYaml = () => {
    const currentPath = window.location.pathname;
    navigate(
      `/k8s/ns/${namespace}/edit-broker/${name}?returnUrl=${encodeURIComponent(
        currentPath,
      )}`,
    );
  };

  return (
    <>
      <Alert
        variant={AlertVariant.info}
        isInline
        title={t('This YAML view is in read-only mode.')}
        className="pf-u-mt-md pf-u-ml-md pf-u-mr-md"
      >
        <p>
          {t('Proceed to the ')}
          <Button
            variant="link"
            onClick={onClickEditYaml}
            className="pf-m-inline"
          >
            {t('edit form')}
          </Button>
          {t(' to apply changes')}
        </p>
      </Alert>
      <Suspense fallback={<Loading />}>
        <ResourceYAMLEditor
          initialResource={YAML.stringify(brokerCr, null, '  ')}
          readOnly
        />
      </Suspense>
    </>
  );
};

export { YamlContainer };
