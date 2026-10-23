import type { ReactNode } from "react";
import { Fieldset } from "./Fieldset";

export interface RadioOption {
  value: string;
  label: ReactNode;
  hint?: ReactNode;
}

interface RadiosProps {
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/** A radio group with its own legend, hint and error, via Fieldset. */
export function Radios({ id, legend, hint, error, name, options, value, defaultValue, onValueChange, className }: RadiosProps) {
  const controlled = value !== undefined;

  return (
    <Fieldset legend={legend} hint={hint} error={error} id={id} className={className}>
      <div className="flex flex-col gap-[var(--space-3)]">
        {options.map((option, index) => {
          const optionId = `${id}-${index}`;
          return (
            <div key={option.value} className="flex min-h-[var(--target-min)] items-start gap-[var(--space-2)]">
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                className="m-0 mt-[calc((var(--target-min)-1.5rem)/2)] size-6 min-h-0 min-w-0 shrink-0"
                {...(controlled
                  ? { checked: value === option.value, onChange: () => onValueChange?.(option.value) }
                  : { defaultChecked: defaultValue === option.value, onChange: onValueChange ? () => onValueChange(option.value) : undefined })}
              />
              <label htmlFor={optionId} className="flex min-h-[var(--target-min)] flex-1 flex-col justify-center text-base text-ink-900">
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
