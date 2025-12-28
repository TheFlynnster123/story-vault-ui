import { useCombobox, Combobox, InputBase } from "@mantine/core";
import type React from "react";
import { d } from "../../services/Dependencies";

interface SchedulerComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export const SchedulerCombobox: React.FC<SchedulerComboboxProps> = ({
  value,
  onChange,
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const schedulerMapper = d.SchedulerMapper();
  const schedulerOptions = schedulerMapper.GetAvailableSchedulers();

  // Convert the current value (which might be a scheduler name) to display name for showing
  const displayValue = schedulerMapper.MapToDisplayName(value);

  const options = schedulerOptions.map((item) => (
    <Combobox.Option value={item.value} key={item.value}>
      {item.label}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label="Scheduler"
          value={displayValue}
          onChange={(event) => onChange(event.currentTarget.value)}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          placeholder="Select or enter a scheduler"
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};
