import type { ReactNode } from "react";
import { Fieldset } from "@/components/ui/Fieldset";
import { cx } from "@/components/ui/cx";
import { TickIcon } from "./icons";

export interface Choice {
  value: string;
  label: string;
  /** How many dishes choosing this would give. Shown as "(14)". At 0 the option is disabled, not hidden, unless it is already chosen. */
  count?: number;
  icon?: ReactNode;
}

interface ChoiceGroupProps {
  /** Unique within the page. Option ids are built from it. */
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  /** The form field name. */
  name: string;
  kind: "checkbox" | "radio";
  choices: Choice[];
  /** The values that are on. */
  selected: readonly string[];
  /** "list" is a vertical list of labelled controls, "chips" is a wrapping row of buttons-that-are-inputs. */
  layout?: "list" | "chips";
  className?: string;
}

/**
 * A group of native checkboxes or radios inside a fieldset with a legend,
 * each with its count. Server rendered, so the form works without
 * JavaScript. An option that would give no dishes is disabled and shows
 * "(0)": it stays in place so the layout does not jump.
 *
 * Chips are real inputs. The input is stretched invisibly over the chip so a
 * click or a tap anywhere on it works, and the chip shows a tick when on,
 * so the state is never colour alone (1.4.1). Focus is drawn on the chip.
 */
export function ChoiceGroup({ id, legend, hint, name, kind, choices, selected, layout = "list", className }: ChoiceGroupProps) {
  const on = new Set(selected);

  return (
    <Fieldset legend={legend} hint={hint} id={id} className={className}>
      <div className={layout === "chips" ? "flex flex-wrap gap-[var(--space-2)]" : "flex flex-col gap-[var(--space-2)]"}>
        {choices.map((choice, index) => {
          const optionId = `${id}-${index}`;
          const checked = on.has(choice.value);
          const disabled = choice.count === 0 && !checked;
          const countText = choice.count !== undefined ? <span className={layout === "chips" ? undefined : "text-ink-600"}> ({choice.count})</span> : null;

          if (layout === "chips") {
            return (
              <label key={choice.value} htmlFor={optionId} className="relative inline-flex">
                <input
                  id={optionId}
                  type={kind}
                  name={name}
                  value={choice.value}
                  defaultChecked={checked}
                  disabled={disabled}
                  className="peer absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
                <span
                  className={cx(
                    "inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] rounded-pill border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-1)] text-sm font-medium text-ink-900",
                    "peer-checked:border-action peer-checked:bg-action peer-checked:text-action-ink",
                    "peer-disabled:opacity-50",
                    "peer-focus-visible:outline-[length:var(--focus-width)] peer-focus-visible:outline-solid peer-focus-visible:outline-[var(--focus-fill)] peer-focus-visible:shadow-[0_0_0_calc(var(--focus-width)*2)_var(--focus-bar)]",
                    "peer-checked:[&>.tick]:inline-flex",
                  )}
                >
                  <span className="tick hidden" aria-hidden="true">
                    <TickIcon />
                  </span>
                  {choice.icon}
                  <span>
                    {choice.label}
                    {countText}
                  </span>
                </span>
              </label>
            );
          }

          return (
            <div key={choice.value} className={cx("flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]", disabled && "opacity-60")}>
              <input
                id={optionId}
                type={kind}
                name={name}
                value={choice.value}
                defaultChecked={checked}
                disabled={disabled}
                className="m-0 size-5 min-h-0 min-w-0 shrink-0"
              />
              <label htmlFor={optionId} className="flex min-h-[var(--target-min)] flex-1 items-center gap-[var(--space-2)] text-base text-ink-900">
                {choice.icon ? <span className="inline-flex shrink-0 items-center text-ink-600 [&>svg]:size-[1.25em]">{choice.icon}</span> : null}
                <span>
                  {choice.label}
                  {countText}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </Fieldset>
  );
}
