import { FC } from 'react';
import { ConfigType } from '../../../../ConfigurationPage';
import { useTranslation } from '@app/i18n/i18n';
import { PresetAlertPopover } from '../PresetAlertPopover/PresetAlertPopover';
import { ExposeMode } from '@app/reducers/7.12/reducer';
import { FormGroup } from '@patternfly/react-core';
import { TypeaheadSelect } from '@patternfly/react-templates';

type SelectExposeModeProps = {
  selectedExposeMode: string;
  setSelectedExposeMode: (issuerName: string) => void;
  clearExposeMode: () => void;
  configName: string;
  configType: ConfigType;
};

export const SelectExposeMode: FC<SelectExposeModeProps> = ({
  selectedExposeMode,
  setSelectedExposeMode,
  clearExposeMode,
  configName,
  configType,
}) => {
  const { t } = useTranslation();

  const exposeModes = Object.values(ExposeMode);

  const selectOptions = exposeModes.map((mode) => ({
    value: mode,
    content: mode,
  }));

  return (
    <FormGroup
      label={t('Expose Mode')}
      labelIcon={
        <PresetAlertPopover
          configName={configName}
          configType={configType}
          kind="caution"
        />
      }
    >
      <TypeaheadSelect
        selectOptions={selectOptions}
        selected={selectedExposeMode}
        placeholder={t('Select expose mode')}
        onSelect={(_e, selectedValue) => {
          setSelectedExposeMode(String(selectedValue));
        }}
        onClearSelection={clearExposeMode}
      />
    </FormGroup>
  );
};
