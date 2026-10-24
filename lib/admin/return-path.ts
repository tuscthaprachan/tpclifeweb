/** Only ever send people back to a page inside the console. Anything else becomes the dashboard. */
export function safeReturnPath(value: FormDataEntryValue | string | null | undefined): string {
  const path = typeof value === "string" ? value : "";
  return /^\/admin(?:\/[A-Za-z0-9\-._~/]*)?$/.test(path) ? path : "/admin";
}
