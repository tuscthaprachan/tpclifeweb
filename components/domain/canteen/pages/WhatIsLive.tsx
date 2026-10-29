"use client";

import { use, useMemo } from "react";

import { indexCanteen } from "@/lib/canteen/derive";
import { localePath, type Locale } from "@/lib/i18n/config";

import { canteenData } from "../data-client";
import { CanonicalRedirect, useSearch } from "../live";
import { tidyTarget } from "../redirects";
import { dataForCanonicals } from "../slim";
import { WhatIsDetail, WhatIsList } from "./WhatIs";

export function LiveWhatIsList({ locale }: { locale: Locale }) {
  const search = useSearch();
  const full = use(canteenData());
  const data = useMemo(() => dataForCanonicals(full), [full]);
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, "/eat/what-is"), search)} />
      <WhatIsList locale={locale} data={data} query={search} />
    </>
  );
}

export function LiveWhatIsDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const search = useSearch();
  const full = use(canteenData());
  const shown = useMemo(() => {
    const canonical = indexCanteen(full).canonicalBySlug.get(slug);
    return canonical ? { canonical, data: dataForCanonicals(full, canonical._id) } : null;
  }, [full, slug]);
  return (
    <>
      <CanonicalRedirect search={search.toString()} compute={() => tidyTarget(localePath(locale, `/eat/what-is/${slug}`), search)} />
      {shown ? <WhatIsDetail locale={locale} data={shown.data} canonical={shown.canonical} query={search} /> : null}
    </>
  );
}
