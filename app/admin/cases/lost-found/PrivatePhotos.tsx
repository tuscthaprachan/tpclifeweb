import Image from "next/image";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import type { CasePhoto } from "@/lib/lost-found/photos";

/** The case's private photos, through short-lived signed links. They are for staff only and are not the pictures on the public list. */
export function PrivatePhotos({ photos, locale }: { photos: CasePhoto[]; locale: Locale }) {
  if (photos.length === 0) return <p className="m-0 text-ink-600">{a("lfcPhotosNone", locale)}</p>;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-[var(--space-3)] p-0">
      {photos.map((photo, index) => (
        <li key={photo.id}>
          {photo.url ? (
            <a href={photo.url} target="_blank" rel="noreferrer">
              <Image src={photo.url} alt={a("lfcPhotoAlt", locale, { n: index + 1 })} width={160} height={160} unoptimized className="size-40 rounded-control border border-line object-cover" />
              <span className="visually-hidden"> {a("lfcPhotoOpen", locale)}</span>
            </a>
          ) : (
            <span className="text-sm text-ink-600">{a("lfcPhotoUnavailable", locale)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
