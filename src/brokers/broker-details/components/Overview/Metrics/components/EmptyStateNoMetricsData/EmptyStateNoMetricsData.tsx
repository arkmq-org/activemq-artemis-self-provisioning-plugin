import { FunctionComponent } from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { useTranslation } from '../../../../../../../i18n/i18n';

export const EmptyStateNoMetricsData: FunctionComponent = () => {
  const { t } = useTranslation();
  return (
    <EmptyState variant={EmptyStateVariant.xs}>
      <EmptyStateHeader
        titleText={<>{t('Data unavailable')}</>}
        icon={
          <EmptyStateIcon
            icon={ExclamationTriangleIcon}
            color="var(--pf-global--warning-color--100)"
          />
        }
        headingLevel="h3"
      />
      <EmptyStateBody>
        {t(
          'Waiting for the first scrape. This can take up to a minute after enabling monitoring.',
        )}
      </EmptyStateBody>
    </EmptyState>
  );
};
