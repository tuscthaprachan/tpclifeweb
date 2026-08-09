/**
 * Small inline icon set used only alongside visible text (StatusTag,
 * WarningText, NotificationBanner, Dialog's close button, Accordion's
 * disclosure marker). Every one is `aria-hidden` unconditionally: per 1.4.1
 * the word next to it is what carries the meaning, the icon is reinforcement,
 * so it is never the thing a screen reader announces.
 */

interface IconProps {
  className?: string;
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WarningIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path
        d="M10 2.5l8.5 15h-17L10 2.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="14.75" r="1" fill="currentColor" />
    </svg>
  );
}

export function ErrorIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="13.75" r="1" fill="currentColor" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="6.25" r="1" fill="currentColor" />
    </svg>
  );
}

export function NeutralDotIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <circle cx="10" cy="10" r="5" fill="currentColor" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path d="M12 4.5L6 10l6 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" className={className}>
      <path d="M8 4.5l6 5.5-6 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
