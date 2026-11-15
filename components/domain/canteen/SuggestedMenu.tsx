"use client";

import { useMemo, useState, type ReactNode } from "react";

import { useHydrated } from "@/components/hooks/use-hydrated";
import { useStatusMessage } from "@/components/hooks/use-status-message";
import { Button } from "@/components/ui/Button";
import { Grid } from "@/components/ui/Grid";
import { newSeed, pickSuggested, type SuggestedCandidate } from "@/lib/canteen/random";
import type { Locale } from "@/lib/i18n/config";

import { EAT, t } from "./strings";

interface SuggestedMenuProps {
  locale: Locale;
  /** The dishes the client may draw from, with one rendered card each. */
  candidates: readonly SuggestedCandidate[];
  /** A rendered `DishCard` per candidate `_id`. */
  cards: Record<string, ReactNode>;
  count: number;
  /** The draw shown by the server and the first client render, so hydration matches. */
  initialSeed: string;
}

/**
 * The hub's suggested menu. The server and the first client render use the
 * same seed, so there is no hydration mismatch and the list works without
 * JavaScript. Once hydrated it draws with a fresh seed in the same commit, so
 * every visit differs and the first paint is already the final list. The
 * button redraws in place.
 */
export function SuggestedMenu({ locale, candidates, cards, count, initialSeed }: SuggestedMenuProps) {
  const hydrated = useHydrated();
  const [fresh] = useState(() => newSeed());
  const [shuffled, setShuffled] = useState<string | null>(null);
  const seed = shuffled ?? (hydrated ? fresh : initialSeed);
  const announce = useStatusMessage<string>(5000);

  const shown = useMemo(() => pickSuggested(candidates, count, seed), [candidates, count, seed]);
  const canShuffle = candidates.length > 1;

  return (
    <>
      <Grid as="ul" minColumnWidth="16rem" className="m-0 list-none p-0">
        {shown.map((dish) => (
          <li key={dish._id} className="min-w-0">
            {cards[dish._id]}
          </li>
        ))}
      </Grid>
      {canShuffle ? (
        <p className="m-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShuffled(newSeed());
              announce.show(t(EAT.suggestedUpdated, locale));
            }}
          >
            {t(EAT.suggestedShuffle, locale)}
          </Button>
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="visually-hidden">
        {announce.value ? <span key={announce.nonce}>{announce.value}</span> : null}
      </p>
    </>
  );
}
