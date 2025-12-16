import type React from 'react';
import { useState } from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import type { DropdownProps } from '@patternfly/react-core';

export interface IDropdownWithToggleProps<T> {
  id: string;
  toggleId: string;
  value: T;
  name?: string;
  items: IDropdownOption<T>[];
  onSelectOption?: (value: T, name: string) => void;
  isLabelAndValueNotSame?: boolean;
}

export interface IDropdownOption<T> {
  value?: T;
  label?: string;
  key?: string;
  isDisabled?: boolean;
}

export const DropdownWithToggle = <T,>({
  id,
  toggleId,
  items,
  value,
  onSelectOption,
  name,
  isLabelAndValueNotSame,
}: IDropdownWithToggleProps<T>) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect: DropdownProps['onSelect'] = (e) => {
    if (e?.currentTarget?.textContent) {
      const selectedValue: string = e.currentTarget.textContent;
      const filteredOption = items?.filter(
        (item) => item.label === selectedValue,
      )[0];
      if (onSelectOption && filteredOption?.value !== undefined) {
        onSelectOption(filteredOption.value, name ?? '');
      }
      setIsOpen((isOpen) => !isOpen);
    }
  };

  const getItems = (options: IDropdownOption<T>[]) => {
    return (
      <DropdownList>
        {options.map((option) => {
          const { key, value, label } = option;
          return (
            <DropdownItem key={key} value={value}>
              {label || value}
            </DropdownItem>
          );
        })}
      </DropdownList>
    );
  };

  const getSelectedValue = () => {
    if (isLabelAndValueNotSame) {
      const filteredOption = items?.filter((item) => item.value === value)[0];
      return filteredOption?.label;
    }
    return value;
  };

  return (
    <Dropdown
      id={id}
      isOpen={isOpen}
      onSelect={onSelect}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          id={toggleId}
          ref={toggleRef}
          onClick={onToggleClick}
          isExpanded={isOpen}
          data-testid="dropdown-toggle"
        >
          {getSelectedValue()}
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      {getItems(items)}
    </Dropdown>
  );
};
