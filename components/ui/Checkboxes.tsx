import type { ChangeEvent, ReactNode } from "react";
import { Fieldset } from "./Fieldset";

export interface CheckboxOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
}

interface CheckboxesProps {
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  name: string;
  options: CheckboxOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
}

/** A checkbox group with its own legend, hint and error, via Fieldset. */
export function Checkboxes({ id, legend, hint, error, name, options, value, defaultValue, onValueChange, className }: CheckboxesProps) {
  const controlled = value !== undefined;

  function toggle(optionValue: string, checked: boolean) {
    if (!onValueChange) return;
    const current = new Set(value ?? []);
    if (checked) current.add(optionValue);
    else current.delete(optionValue);
    onValueChange(Array.from(current));
  }

  return (
    <Fieldset legend={legend} hint={hint} error={error} id={id} className={className}>
      <div className="flex flex-col gap-[var(--space-3)]">
        {options.map((option, index) => {
          const optionId = `${id}-${index}`;
          return (
            <div key={option.value} className="flex items-start gap-[var(--space-2)]">
              <input
                type="checkbox"
                id={optionId}
                name={name}
                value={option.value}
                className="mt-[3px] h-[1.25rem] w-[1.25rem]"
                {...(controlled
                  ? { checked: value.includes(option.value), onChange: (e: ChangeEvent<HTMLInputElement>) => toggle(option.value, e.target.checked) }
                  : {
                      defaultChecked: defaultValue?.includes(option.value),
                      onChange: onValueChange ? (e: ChangeEvent<HTMLInputElement>) => toggle(option.value, e.target.checked) : undefined,
                    })}
              />
              <label htmlFor={optionId} className="text-base text-ink-900">
                {option.label}
                {option.hint ? <span className="block text-sm text-ink-600">{option.hint}</span> : null}
              </label>
            </div>
          );
        })}
      </div>
    </Fieldset>
  );
}
