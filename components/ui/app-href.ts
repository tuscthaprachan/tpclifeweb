export function isAppHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\") && !/^\/(api|_next)(\/|$)/.test(href);
}
