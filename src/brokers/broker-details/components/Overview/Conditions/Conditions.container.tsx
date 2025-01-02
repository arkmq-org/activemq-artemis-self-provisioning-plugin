import { FC } from 'react';
import { BrokerCR } from '@app/k8s/types';
import { useTranslation } from '@app/i18n/i18n';
import { ConditionsList } from './components/ConditionsList';
import { PageSection, Title } from '@patternfly/react-core';

type ConditionsContainerProps = {
  cr: BrokerCR;
};

export const ConditionsContainer: FC<ConditionsContainerProps> = ({ cr }) => {
  const { t } = useTranslation();

  return (
    <PageSection>
      <Title headingLevel="h2" className="pf-u-ml-md pf-u-mb-md">
        {t('Conditions')}
      </Title>
      <ConditionsList conditions={cr.status?.conditions} />
    </PageSection>
  );
};
