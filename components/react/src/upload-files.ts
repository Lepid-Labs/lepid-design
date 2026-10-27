// Pure checks and wording behind FileUpload, kept DOM-free so node:test can run it
// (so it imports nothing). `accept` is the native input's own syntax: a comma list
// of extensions (".pdf"), MIME types ("application/pdf") and wildcards ("image/*").
// The picker filters by it, but a drop or a "All files" pick does not, so every
// file is checked again here.

export interface FileLike {
  name: string;
  /** MIME type; "" when the browser cannot tell. */
  type: string;
  size: number;
}

const tokens = (accept = "") =>
  accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

const mimeMatches = (type: string, token: string) =>
  token.endsWith("/*") ? type.startsWith(token.slice(0, -1)) : type === token;

/** Whether a file matches `accept` by extension or MIME type. Empty accepts all. */
export function matchesAccept({ name, type }: Pick<FileLike, "name" | "type">, accept?: string): boolean {
  const list = tokens(accept);
  const lower = name.toLowerCase();
  const mime = type.toLowerCase();
  return list.length === 0 || list.some((t) => (t.startsWith(".") ? lower.endsWith(t) : !!mime && mimeMatches(mime, t)));
}

/** While files are dragged over, only their MIME types are known (no names). True
 *  unless every type is known and none can match, so the zone never cries
 *  "invalid" about a file it cannot see yet. */
export function dragMayAccept(types: readonly string[], accept?: string): boolean {
  const list = tokens(accept);
  if (list.length === 0 || list.some((t) => t.startsWith("."))) return true;
  return types.length === 0 || types.some((type) => !type || list.some((t) => mimeMatches(type.toLowerCase(), t)));
}

/** "940 B", "12 KB", "3.4 MB": one decimal under 10, none above. */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = Math.max(0, bytes);
  let u = 0;
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000;
    u++;
  }
  return `${u === 0 || v >= 10 ? Math.round(v) : Math.round(v * 10) / 10} ${units[u]}`;
}

/** Why a file cannot be uploaded, in words, or undefined when it can. `acceptLabel`
 *  says the accept list the way people do ("images or PDFs"). */
export function fileProblem(file: FileLike, { accept, maxSize, acceptLabel }: { accept?: string; maxSize?: number; acceptLabel?: string } = {}): string | undefined {
  if (!matchesAccept(file, accept)) return `${file.name} isn't a file type this accepts. Use ${acceptLabel ?? tokens(accept).join(", ")}.`;
  if (maxSize !== undefined && file.size > maxSize) return `${file.name} is ${formatBytes(file.size)}; the limit is ${formatBytes(maxSize)}.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return undefined;
}

/** Time left at the rate so far, as "8 s left" / "3 min left", once there is a
 *  rate worth trusting (a second in); undefined before that or when done. */
export function timeLeft(loaded: number, total: number, elapsedMs: number): string | undefined {
  if (elapsedMs < 1000 || loaded <= 0 || loaded >= total) return undefined;
  const s = Math.ceil(((total - loaded) * elapsedMs) / loaded / 1000);
  return s < 60 ? `${s} s left` : `${Math.ceil(s / 60)} min left`;
}
