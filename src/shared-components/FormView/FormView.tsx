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
  Switch,
  TextInput,
} from '@patternfly/react-core';
import { FC, useContext, useState } from 'react';
import { ArtemisReducerOperations712 as ArtemisReducerOperations712 } from '@app/reducers/7.12/reducer';
import {
  BrokerProperties,
  BrokerPropertiesList,
} from './BrokerProperties/BrokerProperties';
import { useTranslation } from '@app/i18n/i18n';
import {
  ArtemisReducerGlobalOperations,
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';

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

  const [isPerBrokerConfig, setIsPerBrokerConfig] = useState<boolean>(false);

  const handleChange = (
    checked: boolean,
    _event: React.FormEvent<HTMLInputElement>,
  ) => {
    setIsPerBrokerConfig(checked);
  };

  const onChangeVersion = (value: '7.12' | '7.13') => {
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
      <Form isHorizontal isWidthLimited>
        <FormFieldGroup>
          <Grid hasGutter md={6}>
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
            <FormGroup label={t('Broker Version')}>
              <InputGroup>
                <InputGroupText id="broker-version" className=".pf-u-w-initial">
                  {t('Version:')}
                </InputGroupText>
                <FormSelect
                  value={formState.brokerVersion}
                  onChange={(_event, value: any) => onChangeVersion(value)}
                  aria-label="FormSelect Input"
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
            <FormGroup label={t('Per broker config')}>
              <Switch
                id="simple-switch"
                label="enabled"
                labelOff="disabled"
                isChecked={isPerBrokerConfig}
                onChange={(_event, checked: boolean) =>
                  handleChange(checked, _event)
                }
                ouiaId="BasicSwitch"
                isDisabled={replicas <= 1}
              />
            </FormGroup>
          </Grid>
        </FormFieldGroup>
      </Form>
      <Form isHorizontal>
        <Banner variant={'blue'}>
          <b>{crName}</b>
          {t(' in namespace ')}
          <b>{targetNs}</b>
        </Banner>
        <FormFieldGroup>
          {isPerBrokerConfig && replicas > 1 ? (
            <BrokerPropertiesList
              replicas={replicas}
              crName={crName}
              targetNs={targetNs}
            />
          ) : (
            <BrokerProperties
              brokerId={0}
              perBrokerProperties={false}
              crName={crName}
              targetNs={targetNs}
            />
          )}
        </FormFieldGroup>
      </Form>
    </>
  );
};
