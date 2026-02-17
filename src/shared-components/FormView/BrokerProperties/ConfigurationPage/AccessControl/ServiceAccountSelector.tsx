import React, { useContext } from 'react';
import {
  Bullseye,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Popover,
  Spinner,
} from '@patternfly/react-core';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import { ArtemisReducerOperations713 } from '@app/reducers/7.13/reducer';
import { useTranslation } from '@app/i18n/i18n';
import { useGetServiceAccounts } from '@app/k8s/customHooks';
import { HelpIcon } from '@patternfly/react-icons';
import styles from '@patternfly/react-styles/css/components/Form/form';

export const ServiceAccountSelector: React.FunctionComponent = () => {
  const { t } = useTranslation();
  const { cr } = useContext(BrokerCreationFormState);
  const dispatch = useContext(BrokerCreationFormDispatch);

  const { serviceAccounts, isLoading, error } = useGetServiceAccounts(
    cr.metadata?.namespace ?? '',
  );

  return (
    <>
      <FormGroup
        label={t('Service account')}
        labelIcon={
          <Popover
            headerContent={
              <div>
                {t(
                  'Select a service account that has the permission to perform a token review',
                )}
              </div>
            }
            bodyContent={
              <div>
                {t(
                  'The selected service account must within the same namespace as the broker you want to deploy and must have a cluster wide role binding to the `system:auth-delegator` role.',
                )}{' '}
                {t(
                  "If you can't apply the role binding yourself, ask your platform administrator to provide you with such role binding",
                )}
              </div>
            }
          >
            <button
              type="button"
              aria-label="More info for name field"
              onClick={(e) => e.preventDefault()}
              aria-describedby="form-group-label-info"
              className={styles.formGroupLabelHelp}
            >
              <HelpIcon />
            </button>
          </Popover>
        }
        isRequired
      >
        {isLoading && (
          <>
            <Bullseye>
              <Spinner size="sm"></Spinner>
            </Bullseye>
          </>
        )}
        {error && (
          <>
            <Bullseye>{error}</Bullseye>
          </>
        )}

        {!isLoading && !error && (
          <FormSelect
            value={cr.spec?.deploymentPlan?.podSecurity?.serviceAccountName}
            onChange={(_event, value) =>
              dispatch({
                operation: ArtemisReducerOperations713.setServiceAccount,
                payload: value,
              })
            }
            aria-label="FormSelect Input"
            ouiaId="BasicFormSelect"
          >
            <FormSelectOption
              label={t('select a service account')}
              isDisabled
            />
            {serviceAccounts.map((option, index) => (
              <FormSelectOption
                key={index}
                value={option.metadata?.name ?? ''}
                label={option.metadata?.name ?? ''}
              />
            ))}
          </FormSelect>
        )}
      </FormGroup>
    </>
  );
};
