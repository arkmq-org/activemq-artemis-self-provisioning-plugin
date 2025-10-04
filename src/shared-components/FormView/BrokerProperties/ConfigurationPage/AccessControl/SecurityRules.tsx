import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import { FC, useContext, useState } from 'react';
import {
  Button,
  InputGroup,
  InputGroupText,
  TextInput,
  InputGroupItem,
  FormFieldGroupExpandable,
  FormFieldGroupHeader,
  SearchInput,
} from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { useTranslation } from '@app/i18n/i18n';
import {
  ArtemisReducerOperations713,
  getSecurityRoles,
} from '@app/reducers/7.13/reducer';

type SecurityRulesProps = {
  name: string;
  value: string;
};

const SecurityRule: FC<SecurityRulesProps> = ({ name: key, value: value }) => {
  const { cr } = useContext(BrokerCreationFormState);
  const securityRoles = getSecurityRoles(cr);
  const dispatch = useContext(BrokerCreationFormDispatch);
  const updateSecurityRole = (prevKey: string, key: string, value: string) => {
    // find the index of the prevKey
    let prevKeyIndex = 0;
    let hasFoundIndex = false;
    securityRoles.forEach((_v, k) => {
      if (k === prevKey) {
        hasFoundIndex = true;
      }
      if (!hasFoundIndex) {
        prevKeyIndex += 1;
      }
    });
    const deconstructedSecurityRoles = [...securityRoles];
    const upUntilIndex = deconstructedSecurityRoles.slice(0, prevKeyIndex);
    const indexToTheEnd = deconstructedSecurityRoles.slice(
      prevKeyIndex + 1,
      deconstructedSecurityRoles.length,
    );
    const newSecurityRoles = new Map([
      ...upUntilIndex,
      [key, value],
      ...indexToTheEnd,
    ]);
    dispatch({
      operation: ArtemisReducerOperations713.setSecurityRoles,
      payload: newSecurityRoles,
    });
  };
  const deleteSecurityRule = (key: string) => {
    updateSecurityRole(key, '', '');
  };
  const [newKey, setNewKey] = useState(key);
  const [newValue, setNewValue] = useState(value);
  return (
    <InputGroup>
      <InputGroupItem isFill>
        <TextInput value={newKey} onChange={(_event, v) => setNewKey(v)} />
      </InputGroupItem>
      <InputGroupText>=</InputGroupText>
      <InputGroupItem isFill>
        <TextInput value={newValue} onChange={(_event, v) => setNewValue(v)} />
      </InputGroupItem>
      <InputGroupItem>
        <Button
          onClick={() => updateSecurityRole(key, newKey, newValue)}
          isDisabled={
            newKey === '' ||
            newValue === '' ||
            (newKey === key && newValue === value)
          }
        >
          update
        </Button>
      </InputGroupItem>
      <InputGroupItem>
        <Button
          variant="plain"
          aria-label="Remove"
          onClick={() => deleteSecurityRule(key)}
        >
          <TrashIcon />
        </Button>
      </InputGroupItem>
    </InputGroup>
  );
};

export const SecurityRoles: FC = () => {
  const { t } = useTranslation();
  const { cr } = useContext(BrokerCreationFormState);
  const securityRoles = getSecurityRoles(cr);
  const dispatch = useContext(BrokerCreationFormDispatch);

  const [filterValue, setFilterValue] = useState<string>('');

  const addNewSecurityRule = (key: string, value: string) => {
    const newSecurityRoles = new Map([...securityRoles, [key, value]]);
    dispatch({
      operation: ArtemisReducerOperations713.setSecurityRoles,
      payload: newSecurityRoles,
    });
  };
  return (
    <FormFieldGroupExpandable
      isExpanded
      header={
        <FormFieldGroupHeader
          titleText={{
            text: t('Security roles'),
            id: 'securityRoles',
          }}
          titleDescription={t(
            'Configure which user can access which resources on the broker',
          )}
        />
      }
    >
      <SearchInput
        placeholder={t('Filter by security roles...')}
        value={filterValue}
        onChange={(_event, value) => setFilterValue(value)}
        onClear={() => setFilterValue('')}
      />

      {Array.from(securityRoles)
        .filter(([key]) => {
          if (!filterValue) return true;

          try {
            const regex = new RegExp(filterValue, 'i');
            return regex.test(key);
          } catch {
            return key.toLowerCase().includes(filterValue.toLowerCase());
          }
        })
        .map(([key, value]) => (
          <SecurityRule key={key + value} name={key} value={value} />
        ))}
      <Button
        variant="link"
        onClick={() =>
          addNewSecurityRule('securityRoles.*.placeholder', 'false')
        }
      >
        {t('Add a security role')}
      </Button>
    </FormFieldGroupExpandable>
  );
};
