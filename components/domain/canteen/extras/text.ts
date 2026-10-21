/**
 * Small text helpers for the "what is this dish" pages. Pure.
 */

/**
 * A short excerpt for an index card: the first sentence if it fits, else the
 * text cut at a word boundary with an ellipsis. Thai has no spaces between
 * words, so a Thai excerpt that is too long is cut at the limit.
 * Sentences end at a full stop followed by a space or the end of the text.
 */
export function excerpt(text: string | undefined | null, max = 140): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length === 0) return "";
  const stop = clean.search(/[.!?](\s|$)/);
  const first = stop >= 0 ? clean.slice(0, stop + 1) : clean;
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.5 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s,;:]+$/, "")}...`;
}
