import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { FC } from 'react';

export const DataPlane: FC = () => {
  return (
    <EmptyState>
      <EmptyStateHeader
        titleText="No items yet"
        headingLevel="h4"
        icon={<EmptyStateIcon icon={SearchIcon} />}
      />
      <EmptyStateBody>Section to be implemented</EmptyStateBody>
      <EmptyStateFooter></EmptyStateFooter>
    </EmptyState>
  );
};
