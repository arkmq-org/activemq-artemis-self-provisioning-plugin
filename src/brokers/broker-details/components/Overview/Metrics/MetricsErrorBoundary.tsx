import { FC, ReactNode } from 'react';
import { ErrorBoundary } from '@patternfly/react-component-groups';
import { useTranslation } from '@app/i18n/i18n';

type MetricsErrorBoundaryProps = {
  children: ReactNode;
};

export const MetricsErrorBoundary: FC<MetricsErrorBoundaryProps> = ({
  children,
}) => {
  const { t } = useTranslation();
  return (
    <ErrorBoundary headerTitle="" errorTitle={t('Something wrong happened')}>
      {children}
    </ErrorBoundary>
  );
};
