import type Anthropic from "@anthropic-ai/sdk";

export const MAX_FILE_BYTES = 400_000;
export const MAX_IMAGE_BYTES = 3_000_000;
export const MAX_PROJECT_FILES = 200;
const SAFE_PATH = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._\-/]{1,160}$/;
const TEXT_EXT = /\.(html|css|js|mjs|json|svg|txt|md|csv|xml|webmanifest|sql)$/i;
export const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
/** File yang hanya untuk pemilik proyek (mis. skema database), tidak ikut ditayangkan. */
export const PRIVATE_FILE = /\.sql$/i;
const DATA_URL = /^data:([\w/+.-]+);base64,/;
export const isDataUrl = (c: string) => DATA_URL.test(c);
export const dataUrlBytes = (c: string) => Buffer.from(c.replace(DATA_URL, ""), "base64");
export const dataUrlMime = (c: string) => c.match(DATA_URL)?.[1] ?? "application/octet-stream";

const GENERATE_IMAGE: Anthropic.Tool = {
  name: "generate_image",
  description: "Create a raster image (photo or illustration) and save it at path (.png/.jpg/.webp). Costs the person credits: use only where a real image clearly helps, at most 4 per request. Prefer SVG/CSS for icons, logos, and simple shapes.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string" },
      prompt: { type: "string", description: "Detailed visual description: subject, setting, style, lighting, colors. No text in the image." },
      aspect_ratio: { type: "string", enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"] },
    },
    required: ["path", "prompt"],
  },
};

const BASE_TOOLS: Anthropic.Tool[] = [
  {
    name: "write_file",
    description: "Create or fully overwrite a text file in the project.",
    input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
  },
  {
    name: "str_replace",
    description: "Replace one exact, unique occurrence of old_str with new_str in a file.",
    input_schema: { type: "object", properties: { path: { type: "string" }, old_str: { type: "string" }, new_str: { type: "string" } }, required: ["path", "old_str", "new_str"] },
  },
  {
    name: "read_file",
    description: "Read the current content of a file.",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "delete_file",
    description: "Delete a file from the project.",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
];

const FINISH: Anthropic.Tool = {
  name: "finish",
  description: "End the task and give the person a short summary of what changed.",
  input_schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
  // breakpoint cache: semua definisi tool di atas ikut ter-cache
  cache_control: { type: "ephemeral" },
} as Anthropic.Tool;

/** Daftar tool tetap per konfigurasi agar prefix cache tidak berubah antar permintaan. */
export const TOOLS: Anthropic.Tool[] = [...BASE_TOOLS, FINISH];
export const TOOLS_WITH_IMAGES: Anthropic.Tool[] = [...BASE_TOOLS, GENERATE_IMAGE, FINISH];

export type FileMap = Map<string, string>;

export const validPath = (path: string) => SAFE_PATH.test(path) && (TEXT_EXT.test(path) || IMAGE_EXT.test(path));

/** Isi proyek untuk prompt: gambar diganti keterangan singkat agar base64 tidak memakan token. */
export function snapshotOf(files: FileMap) {
  if (!files.size) return "(project is empty)";
  return [...files.entries()].map(([p, c]) => isDataUrl(c)
    ? `<file path="${p}" type="${dataUrlMime(c)}" bytes="${dataUrlBytes(c).length}" />`
    : `<file path="${p}">\n${c}\n</file>`).join("\n");
}

export function runTool(files: FileMap, changed: Set<string>, deleted: Set<string>, name: string, input: any): { out: string; done?: string } {
  const path = String(input?.path ?? "");
  if (name !== "finish" && !validPath(path)) return { out: `Error: path tidak diizinkan: ${path}` };
  switch (name) {
    case "write_file": {
      if (IMAGE_EXT.test(path)) return { out: "Error: gambar raster dibuat dengan generate_image, bukan write_file." };
      const c = String(input.content ?? "");
      if (Buffer.byteLength(c) > MAX_FILE_BYTES) return { out: "Error: file terlalu besar (maks 400KB)." };
      if (!files.has(path) && files.size >= MAX_PROJECT_FILES) return { out: "Error: batas jumlah file tercapai." };
      files.set(path, c); changed.add(path); deleted.delete(path);
      return { out: `OK wrote ${path} (${c.length} chars)` };
    }
    case "str_replace": {
      const cur = files.get(path);
      if (cur == null) return { out: `Error: ${path} tidak ada.` };
      if (isDataUrl(cur)) return { out: "Error: file gambar tidak bisa diedit sebagai teks." };
      const n = cur.split(input.old_str).length - 1;
      if (n !== 1) return { out: `Error: old_str ditemukan ${n} kali, harus tepat 1.` };
      files.set(path, cur.replace(input.old_str, () => String(input.new_str ?? ""))); changed.add(path);
      return { out: `OK edited ${path}` };
    }
    case "read_file": {
      const cur = files.get(path);
      if (cur == null) return { out: `Error: ${path} tidak ada.` };
      return { out: isDataUrl(cur) ? `(gambar ${dataUrlMime(cur)}, ${dataUrlBytes(cur).length} byte)` : cur };
    }
    case "delete_file":
      files.delete(path); changed.delete(path); deleted.add(path);
      return { out: `OK deleted ${path}` };
    case "finish":
      return { out: "done", done: String(input?.summary ?? "Selesai.") };
    default:
      return { out: `Error: tool tidak dikenal ${name}` };
  }
}
