/**
 * A link a Reporter typed is untrusted. Only http(s) URLs are ever rendered as
 * links, so a "javascript:" or "data:" value can't run in a viewer's browser.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
