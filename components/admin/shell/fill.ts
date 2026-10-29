/** Fills `{name}` placeholders. A client-safe twin of `fmt` in lib/i18n/admin.ts, which would drag every console string into the bundle. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
