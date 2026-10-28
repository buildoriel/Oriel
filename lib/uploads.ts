/** Chat attachments: shared limits and validation (client and server). Files are saved as project files under assets/uploads/. */
export const UPLOAD_DIR = "assets/uploads/";
export const MAX_ATTACHMENTS = 5;
export const MAX_IMAGE_UPLOAD = 4 * 1024 * 1024;
export const MAX_TEXT_UPLOAD = 200 * 1024;

const TYPES: Record<string, { ext: string[]; kind: "image" | "text" }> = {
  "image/png": { ext: ["png"], kind: "image" },
  "image/jpeg": { ext: ["jpg", "jpeg"], kind: "image" },
  "image/webp": { ext: ["webp"], kind: "image" },
  "image/gif": { ext: ["gif"], kind: "image" },
  "image/svg+xml": { ext: ["svg"], kind: "text" },   // SVG is markup: stored as text so it can be edited and is scanned before publish
  "text/plain": { ext: ["txt"], kind: "text" },
  "text/markdown": { ext: ["md"], kind: "text" },
  "text/csv": { ext: ["csv"], kind: "text" },
  "application/json": { ext: ["json"], kind: "text" },
};
const BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(TYPES).flatMap(([t, v]) => v.ext.map((e) => [e, t])));
export const ACCEPT = Object.keys(TYPES).join(",") + ",.md,.csv,.txt,.json,.svg";

export type Attachment = { path: string; name: string; type: string; size: number };

const extOf = (name: string) => (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();

/** The file's type, from the extension (browsers report text/markdown and text/csv inconsistently). Null when not allowed. */
export function uploadType(name: string) {
  const type = BY_EXT[extOf(name)];
  return type ? { type, kind: TYPES[type].kind } : null;
}

/** Raster images must really be what their extension says (checked on the server from the first bytes). */
export function imageMagicOk(type: string, b: Uint8Array) {
  const hex = Array.from(b.slice(0, 12), (x) => x.toString(16).padStart(2, "0")).join("");
  if (type === "image/png") return hex.startsWith("89504e470d0a1a0a");
  if (type === "image/jpeg") return hex.startsWith("ffd8ff");
  if (type === "image/gif") return hex.startsWith("474946383");
  if (type === "image/webp") return hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
  return true;
}

/** Why a file cannot be attached, or null if it can. */
export function uploadError(name: string, size: number) {
  const t = uploadType(name);
  if (!t) return `${name}: only images (PNG, JPG, WebP, GIF, SVG) and text files (TXT, MD, CSV, JSON) can be attached.`;
  const max = t.kind === "image" && t.type !== "image/svg+xml" ? MAX_IMAGE_UPLOAD : MAX_TEXT_UPLOAD;
  if (size > max) return `${name} is too large (max ${max >= 1024 * 1024 ? `${max / 1024 / 1024} MB` : `${max / 1024} KB`}).`;
  if (size === 0) return `${name} is empty.`;
  return null;
}

/** A safe project path for an uploaded file that does not collide with existing paths. */
export function uploadPath(name: string, taken: Set<string>) {
  const ext = extOf(name) === "jpeg" ? "jpg" : extOf(name);
  const base = name.replace(/\.[^.]*$/, "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file";
  let path = `${UPLOAD_DIR}${base}.${ext}`;
  for (let i = 2; taken.has(path); i++) path = `${UPLOAD_DIR}${base}-${i}.${ext}`;
  return path;
}

export const isUploadPath = (p: string) => p.startsWith(UPLOAD_DIR) && !p.includes("..") && /^[a-z0-9./-]+$/.test(p);
