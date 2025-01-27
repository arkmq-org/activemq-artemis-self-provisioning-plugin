import { FC } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { ErrorCircleOIcon } from '@patternfly/react-icons';

export const ErrorState: FC = () => {
  const { t } = useTranslation();
  return (
    <EmptyState>
      <EmptyStateHeader
        titleText={t('Error fetching broker')}
        icon={<EmptyStateIcon icon={ErrorCircleOIcon} />}
        headingLevel="h4"
      />
      <EmptyStateBody>
        {t(
          "Could not get broker's CR. An error occurred while retrieving the broker's CR. Please try again later.",
        )}
      </EmptyStateBody>
    </EmptyState>
  );
};
