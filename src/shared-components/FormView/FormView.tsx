import {
  Banner,
  Form,
  FormFieldGroup,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  InputGroup,
  InputGroupText,
  NumberInput,
  PageSection,
  TextInput,
} from '@patternfly/react-core';
import { FC, useContext } from 'react';
import { ArtemisReducerOperations712 as ArtemisReducerOperations712 } from '@app/reducers/7.12/reducer';
import { LegacyBrokerProperties } from './BrokerProperties/BrokerProperties';
import { useTranslation } from '@app/i18n/i18n';
import {
  ArtemisReducerGlobalOperations,
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import { RestrictedSwitch } from './RestrictedSwitch';

export const FormView: FC = () => {
  const { t } = useTranslation();
  const formState = useContext(BrokerCreationFormState);
  const { cr } = useContext(BrokerCreationFormState);
  const targetNs = cr.metadata.namespace;
  const dispatch = useContext(BrokerCreationFormDispatch);

  const handleNameChange = (name: string) => {
    dispatch({
      operation: ArtemisReducerOperations712.setBrokerName,
      payload: name,
    });
  };

  const versions = ['7.12', '7.13'] as const;
  type BrokerVersion = (typeof versions)[number];

  const onChangeVersion = (value: BrokerVersion) => {
    dispatch({
      operation: ArtemisReducerGlobalOperations.setBrokerVersion,
      payload: value,
    });
  };

  const options = [
    { value: '7.12', label: 'AMQ 7.12', disabled: false },
    { value: '7.13', label: 'AMQ 7.13', disabled: false },
  ];

  const crName = formState.cr.metadata.name;
  const replicas = formState.cr.spec.deploymentPlan.size;
  return (
    <>
      <Form isHorizontal>
        <FormFieldGroup>
          <Grid lg={6} xl2={3} hasGutter>
            <FormGroup
              label={t('CR Name')}
              isRequired
              fieldId="horizontal-form-name"
            >
              <TextInput
                value={crName}
                isRequired
                type="text"
                id="horizontal-form-name"
                aria-describedby="horizontal-form-name-helper"
                name="horizontal-form-name"
                onChange={(_event, name: string) => handleNameChange(name)}
              />
            </FormGroup>
            <FormGroup
              label={t('Replicas')}
              isRequired
              fieldId="horizontal-form-name"
            >
              <NumberInput
                value={replicas}
                min={0}
                max={1024}
                onMinus={() =>
                  dispatch({
                    operation: ArtemisReducerOperations712.decrementReplicas,
                  })
                }
                onChange={(event) =>
                  dispatch({
                    operation: ArtemisReducerOperations712.setReplicasNumber,
                    payload: Number((event.target as HTMLInputElement).value),
                  })
                }
                onPlus={() =>
                  dispatch({
                    operation: ArtemisReducerOperations712.incrementReplicas,
                  })
                }
                inputName="input"
                inputAriaLabel="number input"
                minusBtnAriaLabel="minus"
                plusBtnAriaLabel="plus"
              />
            </FormGroup>
            <FormGroup label={t('Restricted mode')}>
              <RestrictedSwitch />
            </FormGroup>
            <FormGroup label={t('Broker Version')}>
              <InputGroup>
                <InputGroupText id="broker-version" className=".pf-u-w-initial">
                  {t('Version:')}
                </InputGroupText>
                <FormSelect
                  value={formState.brokerVersion}
                  onChange={(_event, value) =>
                    onChangeVersion(value as BrokerVersion)
                  }
                  aria-label="FormSelect Input"
                  isDisabled={formState?.cr?.spec?.restricted}
                >
                  {options.map((option, index) => (
                    <FormSelectOption
                      isDisabled={option.disabled}
                      key={index}
                      value={option.value}
                      label={option.label}
                    />
                  ))}
                </FormSelect>
              </InputGroup>
            </FormGroup>
          </Grid>
        </FormFieldGroup>
      </Form>
      <Banner variant={'blue'}>
        <b>{crName}</b>
        {t(' in namespace ')}
        <b>{targetNs}</b>
      </Banner>
      <PageSection
        hasOverflowScroll
        isFilled
        type="wizard"
        aria-label={t('broker configuration')}
      >
        {!formState.cr.spec.restricted && (
          <LegacyBrokerProperties
            brokerId={0}
            perBrokerProperties={false}
            crName={crName}
            targetNs={targetNs}
          />
        )}
      </PageSection>
    </>
  );
};
