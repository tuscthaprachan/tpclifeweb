"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { a } from "@/lib/i18n/admin";
import { isLocale, LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n/config";
import { DocumentLanguageProvider } from "./document-language";

/** Keeps both translations in the form while presenting one editable document. */
export function DocumentCanvas({ locale, children }: { locale: Locale; children?: ReactNode }) {
  const [language, setLanguage] = useState(locale);
  const surface = useRef<HTMLElement>(null);
  const labelId = useId();

  useEffect(() => {
    const form = surface.current?.closest("form");
    let frame = 0;

    function reveal(hash: string) {
      const target = document.getElementById(hash.slice(1));
      if (!target || !surface.current?.contains(target)) return;
      const lang = target.closest<HTMLElement>("[data-content-language]")?.dataset.contentLanguage;
      if (isLocale(lang)) setLanguage(lang);
      for (let disclosure = target.closest("details"); disclosure; disclosure = disclosure.parentElement?.closest("details") ?? null) {
        disclosure.open = true;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => target.focus());
    }

    const onHashChange = () => reveal(window.location.hash);
    const onLink = (event: MouseEvent) => {
      if (event.button || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#f-"]') : null;
      if (link) reveal(link.hash);
    };
    onHashChange();
    // A repeated click on the same error link does not fire hashchange.
    form?.addEventListener("click", onLink);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelAnimationFrame(frame);
      form?.removeEventListener("click", onLink);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <section ref={surface} className="console-document" aria-labelledby={labelId}>
      <div className="console-document-bar">
        <h2 id={labelId} className="m-0 inline-flex items-center gap-[var(--space-2)] text-base font-semibold">
          <ConsoleIcon name="edit" />{a("edDocumentTitle", locale)}
        </h2>
        <div role="group" aria-label={a("edDocumentLanguage", locale)} className="console-document-languages">
          {LOCALES.map((lang) => (
            <button type="button" key={lang} lang={lang} aria-pressed={language === lang} onClick={() => setLanguage(lang)}>
              {LOCALE_LABEL[lang]}
            </button>
          ))}
        </div>
      </div>
      <div className="console-document-page">
        <DocumentLanguageProvider value={{ language, setLanguage }}>{children}</DocumentLanguageProvider>
      </div>
    </section>
  );
}
