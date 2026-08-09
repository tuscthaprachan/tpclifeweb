/**
 * Minimal class name joiner. The project has no clsx/cn dependency, and one
 * line here is cheaper than adding one for what is always a short, static
 * list of Tailwind classes.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
