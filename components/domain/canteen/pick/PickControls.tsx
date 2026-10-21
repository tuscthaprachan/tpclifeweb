import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { serialise, type CanteenFilters } from "@/lib/canteen/params";
import { localePath, type Locale } from "@/lib/i18n/config";

import { ChoiceGroup } from "../ChoiceGroup";
import { DiceIcon } from "../icons";
import "../fun.css";
import { PICK_ROUTE, type PickMode } from "./helpers";
import { PICK } from "./strings";
import type { Bias } from "@/lib/canteen/random";

interface PickControlsProps {
  locale: Locale;
  filters: CanteenFilters;
  mode: PickMode;
  bias: Bias;
  /** Keep `same=1` through a new spin. */
  sameStall?: boolean;
}

/**
 * Mode, bias and budget as a plain GET form. It carries every other filter as
 * a hidden field and leaves out `seed`, `lock`, `of` and `not`, so submitting
 * starts a fresh spin (the page adds a new seed). Works without JavaScript.
 */
export function PickControls({ locale, filters, mode, bias, sameStall = false }: PickControlsProps) {
  // The budget is the visible box below, so it is left out of the hidden fields.
  const hidden = new URLSearchParams(serialise({ ...filters, max: undefined }));
  return (
    <form method="get" action={localePath(locale, PICK_ROUTE)} className="flex flex-col gap-[var(--space-4)]">
      {[...hidden.entries()].map(([name, value]) => (
        <input key={`${name}-${value}`} type="hidden" name={name} value={value} />
      ))}
      {sameStall ? <input type="hidden" name="same" value="1" /> : null}

      <ChoiceGroup
        id="pick-mode"
        legend={PICK.modeLegend[locale]}
        name="mode"
        kind="radio"
        layout="chips"
        selected={[mode]}
        choices={[
          { value: "dish", label: PICK.modeDish[locale] },
          { value: "meal", label: PICK.modeMeal[locale] },
          { value: "stall", label: PICK.modeStall[locale] },
        ]}
      />
      <ChoiceGroup
        id="pick-bias"
        legend={PICK.biasLegend[locale]}
        hint={PICK.biasHint[locale]}
        name="bias"
        kind="radio"
        layout="chips"
        selected={[bias]}
        choices={[
          { value: "fair", label: PICK.biasFair[locale] },
          { value: "new", label: PICK.biasNew[locale] },
          { value: "cheap", label: PICK.biasCheap[locale] },
          { value: "usual", label: PICK.biasUsual[locale] },
        ]}
      />
      <TextInput
        id="pick-budget"
        name="maxOther"
        label={PICK.budgetLabel[locale]}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        defaultValue={filters.max === undefined ? "" : String(filters.max)}
        className="max-w-[16rem]"
      />
      <div>
        <Button type="submit" className="fun-roll">
          <span aria-hidden="true" className="fun-die">
            <DiceIcon size={26} />
          </span>
          {PICK.spin[locale]}
        </Button>
      </div>
    </form>
  );
}
