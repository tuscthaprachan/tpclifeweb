/**
 * Two small icons unique to this surface: a lost item (something missing,
 * still being looked for) and a found item (something recovered, held safe).
 * Styled to match components/ui/icons.tsx (currentColor stroke, 20x20
 * viewbox), but kept local rather than added there since lost and found is
 * the only surface that needs them.
 *
 * Both are `aria-hidden` unconditionally, same rule as the shared set: 1.4.1
 * means the word next to the icon carries the meaning (LostFoundKindBadge
 * always renders `kindLabel` beside it), the icon is reinforcement only.
 */

interface IconProps {
  className?: string;
}

/** A tag with a broken corner, standing in for something gone missing. */
export function LostItemIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path
        d="M9 3.5H4.5v4.5L11 14.5a1.5 1.5 0 002.1 0l1.9-1.9a1.5 1.5 0 000-2.1L9 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.75" cy="6.25" r="0.9" fill="currentColor" />
      <path d="M3 16.5l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** A hand holding a tag, standing in for something recovered and held safe. */
export function FoundItemIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path
        d="M9 2.5H4.5V7L11 13.5a1.5 1.5 0 002.1 0l1.9-1.9a1.5 1.5 0 000-2.1L9 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.75" cy="5.25" r="0.9" fill="currentColor" />
      <path d="M3.5 17c1-1.5 2.6-2.2 4-1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
