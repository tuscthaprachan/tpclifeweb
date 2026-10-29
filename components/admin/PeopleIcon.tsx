import { Clock, KeyRound, LifeBuoy, Link2, Lock, LogOut, MailOpen, Settings, ShieldCheck, Trash2, UserPlus, Users, X, type LucideIcon } from "lucide-react";

const PEOPLE_ICONS = {
  key: KeyRound,
  mailOpen: MailOpen,
  lifeBuoy: LifeBuoy,
  lock: Lock,
  logOut: LogOut,
  settings: Settings,
  clock: Clock,
  link: Link2,
  userPlus: UserPlus,
  users: Users,
  shield: ShieldCheck,
  trash: Trash2,
  cancel: X,
} as const satisfies Record<string, LucideIcon>;

export type PeopleIconName = keyof typeof PEOPLE_ICONS;

/** Icons for the staff, security and signed-out pages that ConsoleIcon does not carry. Decorative, same conventions as ConsoleIcon. */
export function PeopleIcon({ name, size = 18, className }: { name: PeopleIconName; size?: number; className?: string }) {
  const Icon = PEOPLE_ICONS[name];
  return <Icon aria-hidden="true" focusable="false" size={size} strokeWidth={1.75} absoluteStrokeWidth className={className ? `shrink-0 ${className}` : "shrink-0"} />;
}
