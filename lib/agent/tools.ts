import type Anthropic from "@anthropic-ai/sdk";

export const MAX_FILE_BYTES = 400_000;
export const MAX_PROJECT_FILES = 200;
const SAFE_PATH = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._\-/]{1,160}$/;
const ALLOWED_EXT = /\.(html|css|js|mjs|json|svg|txt|md|csv|xml|webmanifest)$/i;

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "write_file",
    description: "Create or fully overwrite a file in the project.",
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
  {
    name: "finish",
    description: "End the task and give the person a short summary of what changed.",
    input_schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] },
    // breakpoint cache: semua definisi tool di atas ikut ter-cache
    cache_control: { type: "ephemeral" },
  } as Anthropic.Tool,
];

export type FileMap = Map<string, string>;

export function runTool(files: FileMap, changed: Set<string>, deleted: Set<string>, name: string, input: any): { out: string; done?: string } {
  const path = String(input?.path ?? "");
  if (name !== "finish" && (!SAFE_PATH.test(path) || !ALLOWED_EXT.test(path))) return { out: `Error: path tidak diizinkan: ${path}` };
  switch (name) {
    case "write_file": {
      const c = String(input.content ?? "");
      if (Buffer.byteLength(c) > MAX_FILE_BYTES) return { out: "Error: file terlalu besar (maks 400KB)." };
      if (!files.has(path) && files.size >= MAX_PROJECT_FILES) return { out: "Error: batas jumlah file tercapai." };
      files.set(path, c); changed.add(path); deleted.delete(path);
      return { out: `OK wrote ${path} (${c.length} chars)` };
    }
    case "str_replace": {
      const cur = files.get(path);
      if (cur == null) return { out: `Error: ${path} tidak ada.` };
      const n = cur.split(input.old_str).length - 1;
      if (n !== 1) return { out: `Error: old_str ditemukan ${n} kali, harus tepat 1.` };
      files.set(path, cur.replace(input.old_str, input.new_str)); changed.add(path);
      return { out: `OK edited ${path}` };
    }
    case "read_file": {
      const cur = files.get(path);
      return { out: cur == null ? `Error: ${path} tidak ada.` : cur };
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
