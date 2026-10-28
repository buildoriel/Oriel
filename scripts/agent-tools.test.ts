// Agent tools, image adapter, and redirect helper tests, no network: npx tsx scripts/agent-tools.test.ts
import assert from "node:assert";
import { runTool, snapshotOf, validPath, TOOLS, TOOLS_WITH_IMAGES, type FileMap } from "../lib/agent/tools";
import { generateImage, imageEnabled } from "../lib/llm/image";
import { safeNext } from "../lib/redirect";

const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function main() {
  // ---- path ----
  assert.ok(validPath("index.html")); assert.ok(validPath("img/hero.webp")); assert.ok(validPath("supabase/schema.sql"));
  assert.ok(!validPath("../x.html")); assert.ok(!validPath("/abs.html")); assert.ok(!validPath("run.sh")); assert.ok(!validPath("a.php"));

  // ---- str_replace: "$&" / "$1" patterns in new_str must be written literally ----
  const files: FileMap = new Map([["index.html", "<p>price: X</p>"], ["hero.png", PNG_1PX]]);
  const changed = new Set<string>(), deleted = new Set<string>();
  assert.equal(runTool(files, changed, deleted, "str_replace", { path: "index.html", old_str: "X", new_str: "$& $1 $$" }).out, "OK edited index.html");
  assert.equal(files.get("index.html"), "<p>price: $& $1 $$</p>");
  // ---- images: cannot be written/edited as text, read back as a description ----
  assert.match(runTool(files, changed, deleted, "write_file", { path: "a.png", content: "x" }).out, /generate_image/);
  assert.match(runTool(files, changed, deleted, "str_replace", { path: "hero.png", old_str: "i", new_str: "j" }).out, /image files cannot be edited/);
  assert.match(runTool(files, changed, deleted, "read_file", { path: "hero.png" }).out, /^\(image image\/png, \d+ bytes\)$/);
  // ---- prompt snapshot: no base64 ----
  const snap = snapshotOf(files);
  assert.ok(!snap.includes("iVBOR")); assert.match(snap, /<file path="hero.png" type="image\/png" bytes="\d+" \/>/);
  // ---- tool lists: finish is always last (cache breakpoint) ----
  assert.equal(TOOLS.at(-1)!.name, "finish"); assert.equal(TOOLS_WITH_IMAGES.at(-1)!.name, "finish");
  assert.ok(TOOLS_WITH_IMAGES.some((t) => t.name === "generate_image")); assert.ok(!TOOLS.some((t) => t.name === "generate_image"));

  // ---- image adapter (OpenRouter) ----
  delete process.env.IMAGE_MODEL; assert.equal(imageEnabled(), false);
  process.env.IMAGE_MODEL = "google/gemini-2.5-flash-image"; process.env.OPENROUTER_API_KEY = "test";
  let sent: any;
  globalThis.fetch = (async (_u: string, init: any) => {
    sent = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: "", images: [{ type: "image_url", image_url: { url: PNG_1PX } }] } }], usage: { cost: 0.039 } }));
  }) as any;
  const img = await generateImage("ceramics on a wooden table", "4:3");
  assert.deepEqual(sent.modalities, ["image", "text"]); assert.equal(sent.image_config.aspect_ratio, "4:3"); assert.equal(sent.model, "google/gemini-2.5-flash-image");
  assert.equal(img.mime, "image/png"); assert.equal(img.costUsd, 0.039); assert.ok(img.bytes > 50);
  globalThis.fetch = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "sorry" } }] }))) as any;
  await assert.rejects(generateImage("x"), /did not return an image/);

  // ---- redirect after login: local paths only ----
  const safe = safeNext;
  assert.equal(safe("/workspace/abc"), "/workspace/abc"); assert.equal(safe("//evil.com"), "/workspace");
  assert.equal(safe("/\\evil.com"), "/workspace"); assert.equal(safe("https://evil.com"), "/workspace");

  console.log("agent tools + image + redirect tests: OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
