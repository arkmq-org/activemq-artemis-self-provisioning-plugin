import { FC } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { ErrorCircleOIcon } from '@patternfly/react-icons';

export type GenericErrorProps = {
  message?: string;
};

export const GenericError: FC<GenericErrorProps> = ({ message }) => {
  const { t } = useTranslation();
  return (
    <EmptyState variant={EmptyStateVariant.sm}>
      <EmptyStateHeader
        titleText={t('Something went wrong')}
        icon={<EmptyStateIcon icon={ErrorCircleOIcon} />}
        headingLevel="h4"
      />
      <EmptyStateBody>
        {message ??
          t(
            'An unexpected error occurred. Required data is not available. Please try again later.',
          )}
      </EmptyStateBody>
    </EmptyState>
  );
};
