/**
 * The Studio's own root layout. There is no `app/layout.tsx` at the repo
 * root: `app/[locale]/layout.tsx` supplies `<html>`/`<body>` for the public
 * site, and `/studio` is a sibling top-level route outside that segment, so
 * it needs its own. `NextStudioLayout` provides the minimal `<html>`/`<body>`
 * the Studio needs, deliberately with none of the public site's chrome
 * (header, footer, phase banner): editors work in the Studio's own UI, not
 * inside the student-facing site frame.
 */
import { NextStudioLayout } from "next-sanity/studio";
import type { ReactNode } from "react";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <NextStudioLayout>{children}</NextStudioLayout>;
}
