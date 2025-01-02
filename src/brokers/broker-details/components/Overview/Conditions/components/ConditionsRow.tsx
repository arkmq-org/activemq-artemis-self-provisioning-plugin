import { FC } from 'react';
import { Timestamp } from '@openshift-console/dynamic-plugin-sdk';
import { Td, Tr } from '@patternfly/react-table';

export type ConditionsRowProps = {
  condition: {
    type: string;
    status: string;
    lastTransitionTime: string;
    reason: string;
    message: string;
  };
};

export const ConditionsRow: FC<ConditionsRowProps> = ({ condition }) => {
  const { type, status, reason, message, lastTransitionTime } = condition;

  return (
    <Tr>
      <Td>{type}</Td>
      <Td>{status}</Td>
      <Td>
        <Timestamp timestamp={lastTransitionTime} />
      </Td>
      <Td>{reason}</Td>
      <Td>{message}</Td>
    </Tr>
  );
};
