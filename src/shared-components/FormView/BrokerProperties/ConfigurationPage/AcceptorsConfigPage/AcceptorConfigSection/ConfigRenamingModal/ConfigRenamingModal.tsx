import {
  Button,
  Modal,
  ModalVariant,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { FC, useContext, useState } from 'react';
import {
  BrokerCreationFormDispatch,
  BrokerCreationFormState,
} from '@app/reducers/reducer';
import {
  ArtemisReducerOperations712,
  listConfigs,
} from '../../../../../../../reducers/7.12/reducer';
import { useTranslation } from '../../../../../../../i18n/i18n';
import { ConfigType, ConfigTypeContext } from '../../../ConfigurationPage';
export type ConfigRenamingModalProps = {
  initName: string;
};

export const ConfigRenamingModal: FC<ConfigRenamingModalProps> = ({
  initName,
}) => {
  const { t } = useTranslation();
  const configType = useContext(ConfigTypeContext);
  const dispatch = useContext(BrokerCreationFormDispatch);
  const [newName, setNewName] = useState(initName);
  const [toolTip, setTooltip] = useState('');
  const [validateStatus, setValidateStatus] = useState(null);
  const { cr } = useContext(BrokerCreationFormState);
  const uniqueSet = listConfigs(configType, cr, 'set') as Set<string>;

  const handleNewName = () => {
    if (configType === ConfigType.acceptors) {
      dispatch({
        operation: ArtemisReducerOperations712.setAcceptorName,
        payload: {
          oldName: initName,
          newName: newName,
        },
      });
    }
    if (configType === ConfigType.connectors) {
      dispatch({
        operation: ArtemisReducerOperations712.setConnectorName,
        payload: {
          oldName: initName,
          newName: newName,
        },
      });
    }
  };

  const validateName = (value: string) => {
    setNewName(value);
    if (value === '') {
      setValidateStatus(ValidatedOptions.error);
      setTooltip(t('Name should not be empty'));
      return false;
    }
    if (uniqueSet?.has(value)) {
      setValidateStatus(ValidatedOptions.error);
      setTooltip(t('Name already exists'));
      return false;
    }
    setValidateStatus(ValidatedOptions.success);
    setTooltip(t('Name available'));
    return true;
  };

  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Modal
        variant={ModalVariant.small}
        title="Rename"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            onClick={handleNewName}
            isDisabled={validateStatus !== ValidatedOptions.success}
          >
            {t('Confirm')}
          </Button>,
          <Button key="cancel" variant="link" onClick={() => setIsOpen(false)}>
            {t('Cancel')}
          </Button>,
        ]}
      >
        <TextInput
          value={newName}
          onChange={(_event, value: string) => validateName(value)}
          isRequired
          validated={validateStatus}
          type="text"
          aria-label="name input panel"
        />
        <p>{toolTip}</p>
      </Modal>
      <Button variant="plain" onClick={() => setIsOpen(true)}>
        {t('Rename')}
      </Button>
    </>
  );
};
