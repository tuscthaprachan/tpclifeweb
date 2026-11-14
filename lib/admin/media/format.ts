/** A file size for people: bytes, kilobytes or megabytes with one decimal at most. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(Math.round((bytes / 1024 / 1024) * 10) / 10).toString()} MB`;
}
