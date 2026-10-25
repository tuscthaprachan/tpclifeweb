interface RiverProps {
  className?: string;
}

export function River({ className }: RiverProps) {
  return (
    <svg viewBox="0 0 120 84" aria-hidden="true" focusable="false" className={className}>
      <circle cx="90" cy="26" r="12" fill="var(--fill-transport)" />
      <path d="M0 58q10-5 20 0t20 0t20 0t20 0t20 0t20 0v26h-120z" fill="var(--fill-governance)" opacity=".55" />
      <path d="M30 50h46l-7 10h-32z" fill="var(--fill-transport)" />
      <rect x="38" y="40" width="26" height="10" rx="2" fill="var(--surface)" />
      <g fill="var(--fill-activity)">
        <rect x="42" y="43" width="5" height="4" rx="1" />
        <rect x="50" y="43" width="5" height="4" rx="1" />
        <rect x="58" y="43" width="4" height="4" rx="1" />
      </g>
      <path d="M0 68q10-5 20 0t20 0t20 0t20 0t20 0t20 0v16h-120z" fill="var(--fill-governance)" />
    </svg>
  );
}
