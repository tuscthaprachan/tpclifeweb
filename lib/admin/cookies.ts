/**
 * When a Better Auth call replaces the session (the first time an
 * authenticator app is confirmed, for instance), the next call in the same
 * Server Action must carry the new cookie, because `headers()` still holds the
 * one the browser sent. This applies a response's Set-Cookie list to a copy of
 * the request headers.
 */

export function withResponseCookies(requestHeaders: Headers, responseHeaders: Headers): Headers {
  const jar = new Map<string, string>();
  for (const part of (requestHeaders.get("cookie") ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  for (const line of responseHeaders.getSetCookie()) {
    const pair = line.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "" || /max-age=0/i.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
  const next = new Headers(requestHeaders);
  next.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  return next;
}
