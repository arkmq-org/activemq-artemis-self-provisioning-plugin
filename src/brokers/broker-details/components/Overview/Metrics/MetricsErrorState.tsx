import { FC } from 'react';
import { ErrorState } from '@patternfly/react-component-groups';
import { useTranslation } from '@app/i18n/i18n';
import { ExpandableSection } from '@patternfly/react-core';

type MetricsErrorStateProps = {
  error: unknown;
};

const getErrorMessage = (error: unknown): string => {
  if (!error) return 'No additional error information available.';

  if (error instanceof Error) return error.message;

  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (obj.error) return String(obj.error);
    if (obj.message) return String(obj.message);
    return JSON.stringify(obj, null, 2);
  }

  return String(error);
};

export const MetricsErrorState: FC<MetricsErrorStateProps> = ({ error }) => {
  const { t } = useTranslation();

  const errorMessage = getErrorMessage(error);

  return (
    <ErrorState
      errorTitle={t('Unable to load metrics')}
      errorDescription={t('There was a problem contacting Prometheus.')}
      customFooter={
        <ExpandableSection toggleText={t('Show details')}>
          {errorMessage}
        </ExpandableSection>
      }
    />
  );
};
