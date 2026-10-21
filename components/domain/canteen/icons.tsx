/**
 * Icons for the canteen: one per dish type, one per diet, a chilli and a
 * couple of small marks. Inline SVG in the style of `components/ui/icons.tsx`
 * (currentColor stroke, 20x20 viewBox, `aria-hidden`).
 *
 * Per 1.4.1 the word next to an icon carries the meaning. An icon here is
 * never the only thing that says what something is.
 */

import type { DishType } from "@/lib/sanity/types";
import type { DietKey } from "@/lib/canteen/params";

interface IconProps {
  className?: string;
  size?: number;
}

function Svg({ className, size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

/* ---- Dish types ---- */

/** A bowl with a mound of rice. */
/** A speaker with sound waves: hear a name read aloud. */
export function SpeakerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8h3l4-3.5v11L6 12H3z" />
      <path d="M13 7.5a3.5 3.5 0 010 5" />
      <path d="M15 5.5a6.5 6.5 0 010 9" />
    </Svg>
  );
}

export function RiceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5h14a7 7 0 01-14 0z" />
      <path d="M5.5 10c.4-2.6 2.2-4.2 4.5-4.2s4.1 1.6 4.5 4.2" />
    </Svg>
  );
}

/** A bowl with wavy noodles and chopsticks. */
export function NoodlesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5h14a7 7 0 01-14 0z" />
      <path d="M6 9c1-1.2 2-1.2 3 0s2 1.2 3 0 2-1.2 2.5-.4" />
      <path d="M12 2.5l2.5 5M14.5 2.5L16 6" />
    </Svg>
  );
}

/** A bowl with steam. */
export function SoupIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5h14a7 7 0 01-14 0z" />
      <path d="M7 3c-1 1 1 2 0 3.2M10.5 3c-1 1 1 2 0 3.2M14 3c-1 1 1 2 0 3.2" />
    </Svg>
  );
}

/** A plate with a ladle of curry poured over. */
export function CurryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12.5h15" />
      <path d="M4 12.5c.3 2.6 2.8 4 6 4s5.7-1.4 6-4" />
      <path d="M5 12.5c.4-3 2.3-5 5-5s4.6 2 5 5" />
      <path d="M8 9.5c.6.8 1.2.8 1.8 0s1.2-.8 1.8 0" />
    </Svg>
  );
}

/** A wok with a handle: cooked fresh when you order. */
export function WokIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 9h12a6 6 0 01-12 0z" />
      <path d="M14.5 9.5l3.5-2" />
      <path d="M6 5.5l.8 1.5M9 4.5l.4 2M12 5.5l-.6 1.5" />
    </Svg>
  );
}

/** A round plate seen from the side with a fork. */
export function PlateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="3.5" />
    </Svg>
  );
}

/** A skewer with pieces on it. */
export function SnackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 16.5L16.5 3.5" />
      <circle cx="7.5" cy="12.5" r="1.8" />
      <circle cx="10.5" cy="9.5" r="1.8" />
      <circle cx="13.5" cy="6.5" r="1.8" />
    </Svg>
  );
}

/** A cup with a straw. */
export function DrinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 7h10l-1.2 9.5H6.2L5 7z" />
      <path d="M4.5 7h11" />
      <path d="M11 7l1.5-4.5h2" />
    </Svg>
  );
}

/** An ice cream cone. */
export function DessertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9l4 9 4-9" />
      <path d="M5.5 9a4.5 4.5 0 119 0z" />
    </Svg>
  );
}

const TYPE_ICON: Record<DishType, (props: IconProps) => React.JSX.Element> = {
  rice: RiceIcon,
  noodles: NoodlesIcon,
  soup: SoupIcon,
  curryOverRice: CurryIcon,
  madeToOrder: WokIcon,
  singlePlate: PlateIcon,
  snack: SnackIcon,
  drink: DrinkIcon,
  dessert: DessertIcon,
};

/** The icon for a dish type. Always put the type's word beside it. */
export function DishTypeIcon({ type, ...props }: IconProps & { type: DishType }) {
  const Icon = TYPE_ICON[type];
  return <Icon {...props} />;
}

/* ---- Diets ---- */

/** A circle with a slash: left out. Used for "no pork". */
export function NoPorkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M5 15L15 5" />
    </Svg>
  );
}

/** A crescent moon: halal. */
export function HalalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 3.5a7 7 0 100 13 5.5 5.5 0 010-13z" />
    </Svg>
  );
}

/** A leaf: vegetarian. */
export function VegetarianIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16C4 8.5 8.5 4 16.5 3.5 16 11.5 11.5 16 4 16z" />
      <path d="M4 16c2.5-3 5-5.5 8-7.5" />
    </Svg>
  );
}

const DIET_ICON: Record<DietKey, (props: IconProps) => React.JSX.Element> = {
  nopork: NoPorkIcon,
  halal: HalalIcon,
  vegetarian: VegetarianIcon,
};

/** The icon for a diet. Always put the diet's word beside it. */
export function DietIcon({ diet, ...props }: IconProps & { diet: DietKey }) {
  const Icon = DIET_ICON[diet];
  return <Icon {...props} />;
}

/* ---- Small marks ---- */

/** A coin: used to mark the cheapest price, always beside the word "Cheapest". */
export function CoinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M12.5 7.5c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.4.7-2.4 1.7s1 1.4 2.4 1.7 2.4.7 2.4 1.7-1 1.7-2.4 1.7c-1.1 0-2-.4-2.5-1.2M10 5v10" />
    </Svg>
  );
}

/** A heart, outline or solid: the favourite toggle. */
export function HeartIcon({ filled, className, size = 16 }: IconProps & { filled?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 16.5S3 12.5 3 7.8A3.8 3.8 0 0110 6a3.8 3.8 0 017 1.8c0 4.7-7 8.7-7 8.7z" />
    </svg>
  );
}

/** A small cross: removes a chip. */
export function RemoveIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 14}>
      <path d="M5 5l10 10M15 5L5 15" />
    </Svg>
  );
}

/** A tick: marks a chip that is switched on, so the state is never colour alone. */
export function TickIcon(props: IconProps) {
  return (
    <Svg {...props} size={props.size ?? 14}>
      <path d="M4 10.5l4 4L16 6" strokeWidth="2" />
    </Svg>
  );
}

/** A map pin. */
export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 17.5s5.5-4.8 5.5-9.3a5.5 5.5 0 00-11 0c0 4.5 5.5 9.3 5.5 9.3z" />
      <circle cx="10" cy="8.2" r="2" />
    </Svg>
  );
}

/** A dice: Decide for me. */
export function DiceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="13" height="13" rx="3" />
      <circle cx="7.5" cy="7.5" r="0.9" fill="currentColor" />
      <circle cx="12.5" cy="12.5" r="0.9" fill="currentColor" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" />
    </Svg>
  );
}

/** A sliders mark: filters. */
export function FiltersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 6h14M3 10h14M3 14h14" />
      <circle cx="7" cy="6" r="1.8" fill="var(--surface)" />
      <circle cx="13" cy="10" r="1.8" fill="var(--surface)" />
      <circle cx="8" cy="14" r="1.8" fill="var(--surface)" />
    </Svg>
  );
}
