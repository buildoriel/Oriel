import type Anthropic from "@anthropic-ai/sdk";

export const MAX_FILE_BYTES = 400_000;
export const MAX_IMAGE_BYTES = 3_000_000;
export const MAX_PROJECT_FILES = 200;
const SAFE_PATH = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._\-/]{1,160}$/;
const TEXT_EXT = /\.(html|css|js|mjs|json|svg|txt|md|csv|xml|webmanifest|sql)$/i;
export const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
/** Binary files stored as data URLs: generated images plus uploaded GIFs. */
const BINARY_EXT = /\.(png|jpe?g|webp|gif)$/i;
/** Files meant only for the project team (the database schema, text files attached in chat); never published. */
export const PRIVATE_FILE = /\.sql$|^assets\/uploads\/.*\.(txt|md|csv|json)$/i;
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
  // cache breakpoint: every tool definition above is cached
  cache_control: { type: "ephemeral" },
} as Anthropic.Tool;

/** Fixed tool lists per configuration so the cache prefix does not change between requests. */
export const TOOLS: Anthropic.Tool[] = [...BASE_TOOLS, FINISH];
export const TOOLS_WITH_IMAGES: Anthropic.Tool[] = [...BASE_TOOLS, GENERATE_IMAGE, FINISH];

export type FileMap = Map<string, string>;

export const validPath = (path: string) => SAFE_PATH.test(path) && (TEXT_EXT.test(path) || BINARY_EXT.test(path));

/** Project contents for the prompt: images become a short description so base64 does not burn tokens. */
export function snapshotOf(files: FileMap) {
  if (!files.size) return "(project is empty)";
  return [...files.entries()].map(([p, c]) => isDataUrl(c)
    ? `<file path="${p}" type="${dataUrlMime(c)}" bytes="${dataUrlBytes(c).length}" />`
    : `<file path="${p}">\n${c}\n</file>`).join("\n");
}

export function runTool(files: FileMap, changed: Set<string>, deleted: Set<string>, name: string, input: any): { out: string; done?: string } {
  const path = String(input?.path ?? "");
  if (name !== "finish" && !validPath(path)) return { out: `Error: path not allowed: ${path}` };
  switch (name) {
    case "write_file": {
      if (BINARY_EXT.test(path)) return { out: "Error: raster images are created with generate_image, not write_file." };
      const c = String(input.content ?? "");
      if (Buffer.byteLength(c) > MAX_FILE_BYTES) return { out: "Error: file too large (max 400KB)." };
      if (!files.has(path) && files.size >= MAX_PROJECT_FILES) return { out: "Error: file count limit reached." };
      files.set(path, c); changed.add(path); deleted.delete(path);
      return { out: `OK wrote ${path} (${c.length} chars)` };
    }
    case "str_replace": {
      const cur = files.get(path);
      if (cur == null) return { out: `Error: ${path} does not exist.` };
      if (isDataUrl(cur)) return { out: "Error: image files cannot be edited as text." };
      const n = cur.split(input.old_str).length - 1;
      if (n !== 1) return { out: `Error: old_str found ${n} times, must be exactly 1.` };
      files.set(path, cur.replace(input.old_str, () => String(input.new_str ?? ""))); changed.add(path);
      return { out: `OK edited ${path}` };
    }
    case "read_file": {
      const cur = files.get(path);
      if (cur == null) return { out: `Error: ${path} does not exist.` };
      return { out: isDataUrl(cur) ? `(image ${dataUrlMime(cur)}, ${dataUrlBytes(cur).length} bytes)` : cur };
    }
    case "delete_file":
      files.delete(path); changed.delete(path); deleted.add(path);
      return { out: `OK deleted ${path}` };
    case "finish":
      return { out: "done", done: String(input?.summary ?? "Done.") };
    default:
      return { out: `Error: unknown tool ${name}` };
  }
}
