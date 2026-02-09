import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';

import {
  Form,
  FormFieldGroup,
  FormFieldGroupHeader,
  Switch,
} from '@patternfly/react-core';
import { FC, useContext } from 'react';
import { useTranslation } from '@app/i18n/i18n';
import { ArtemisReducerOperations713 } from '@app/reducers/7.13/reducer';
import { ServiceAccountSelector } from './ServiceAccountSelector';
import { SelectUserMappings } from './UserMappings';
import { SecurityRoles } from './SecurityRules';

export const AccessControlPage: FC = () => {
  const { t } = useTranslation();
  const { cr, brokerVersion } = useContext(BrokerCreationFormState);
  const dispatch = useContext(BrokerCreationFormDispatch);

  const handleAuthChange = (value: boolean) => {
    dispatch({
      operation: ArtemisReducerOperations713.isUsingToken,
      payload: value,
    });
  };

  return (
    <Form isHorizontal>
      {brokerVersion === '7.13' && (
        <FormFieldGroup>
          <Switch
            id={'id-switch-console-auth-token'}
            label={t('RBAC enabled')}
            labelOff={t('RBAC disabled')}
            isChecked={!cr?.spec?.adminUser}
            onChange={(_event, value: boolean) => handleAuthChange(value)}
          />
          {!cr?.spec?.adminUser && (
            <FormFieldGroup
              header={
                <FormFieldGroupHeader
                  titleText={{
                    text: t('Configuration for the token authentication'),
                    id: 'field-group-configuration-token' + 'console',
                  }}
                />
              }
            >
              <ServiceAccountSelector />
              <SelectUserMappings />
              <SecurityRoles />
            </FormFieldGroup>
          )}
        </FormFieldGroup>
      )}
    </Form>
  );
};
