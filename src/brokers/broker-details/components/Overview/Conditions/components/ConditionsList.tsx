import { FC } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import { ConditionsRow } from './ConditionsRow';
import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';

export type ConditionsListProps = {
  conditions: {
    type: string;
    status: string;
    lastTransitionTime: string;
    reason: string;
    message: string;
  }[];
};

const ConditionsList: FC<ConditionsListProps> = ({ conditions }) => {
  const { t } = useTranslation();

  const columns = [
    { title: t('Type'), id: 'type' },
    { title: t('Status'), id: 'status' },
    { title: t('Updated'), id: 'updated' },
    { title: t('Reason'), id: 'reason' },
    { title: t('Message'), id: 'message' },
  ];

  return (
    <Table aria-label={t('Conditions Table')} variant="compact">
      <Thead>
        <Tr>
          {columns.map((column) => (
            <Th key={column.id}>{column.title}</Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {conditions.map((condition, index: number) => (
          <ConditionsRow key={index} condition={condition} />
        ))}
      </Tbody>
    </Table>
  );
};

export { ConditionsList };
