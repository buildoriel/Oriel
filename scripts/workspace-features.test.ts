// Attachments, slug release, credit estimate, attached images for the model: npx tsx scripts/workspace-features.test.ts
import assert from "node:assert";
import { MAX_IMAGE_UPLOAD, MAX_TEXT_UPLOAD, imageMagicOk, isUploadPath, uploadError, uploadPath, uploadType } from "../lib/uploads";
import { SLUG_RE, releasedSlug } from "../lib/projects";
import { estimate, guessKind } from "../lib/agent/estimate";
import { attachmentBlocks, withImages } from "../lib/agent/loop";
import { isPublicFile } from "../lib/hosting";
import { validPath } from "../lib/agent/tools";

// ---- upload validation
assert.equal(uploadType("Logo.PNG")?.type, "image/png");
assert.equal(uploadType("photo.jpeg")?.type, "image/jpeg");
assert.equal(uploadType("icon.svg")?.kind, "text");
assert.equal(uploadType("notes.md")?.type, "text/markdown");
assert.equal(uploadType("evil.html"), null);
assert.equal(uploadType("script.js"), null);
assert.equal(uploadType("noext"), null);
assert.equal(uploadError("a.png", MAX_IMAGE_UPLOAD), null);
assert.match(uploadError("a.png", MAX_IMAGE_UPLOAD + 1)!, /too large \(max 4 MB\)/);
assert.match(uploadError("a.csv", MAX_TEXT_UPLOAD + 1)!, /max 200 KB/);
assert.match(uploadError("a.svg", MAX_TEXT_UPLOAD + 1)!, /max 200 KB/);   // SVG is text: small limit
assert.match(uploadError("a.exe", 10)!, /only images/);
assert.match(uploadError("a.txt", 0)!, /empty/);

// ---- magic bytes
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
assert.ok(imageMagicOk("image/png", png));
assert.ok(!imageMagicOk("image/jpeg", png));
assert.ok(imageMagicOk("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])));
assert.ok(imageMagicOk("image/webp", new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")));
assert.ok(!imageMagicOk("image/gif", new TextEncoder().encode("<html>")));

// ---- safe, unique paths
const taken = new Set(["assets/uploads/my-logo.png"]);
assert.equal(uploadPath("My Logo.png", taken), "assets/uploads/my-logo-2.png");
assert.equal(uploadPath("../../etc/passwd.txt", new Set()), "assets/uploads/etc-passwd.txt");
assert.equal(uploadPath("Café Menü.JPEG", new Set()), "assets/uploads/cafe-menu.jpg");
assert.equal(uploadPath("###.csv", new Set()), "assets/uploads/file.csv");
for (const p of ["assets/uploads/my-logo-2.png", "assets/uploads/etc-passwd.txt", "assets/uploads/cafe-menu.jpg"]) { assert.ok(isUploadPath(p)); assert.ok(validPath(p)); }
assert.ok(validPath("assets/uploads/anim.gif"));
assert.ok(!isUploadPath("index.html"));
assert.ok(!isUploadPath("assets/uploads/../index.html"));
// attached text files are reference material: never published; images are
assert.ok(!isPublicFile("assets/uploads/data.csv"));
assert.ok(!isPublicFile("assets/uploads/brief.md"));
assert.ok(isPublicFile("assets/uploads/logo.png"));
assert.ok(isPublicFile("data/menu.csv"));

// ---- released slugs are valid and unique
const a = releasedSlug(), b = releasedSlug();
assert.ok(SLUG_RE.test(a), a); assert.notEqual(a, b);
assert.equal(releasedSlug("123e4567-e89b-12d3-a456-426614174000"), "x-123e4567e89b12d3a456426614174000");

// ---- estimate
assert.equal(guessKind("Make the headline bigger", 4), "edit");
assert.equal(guessKind("Make the headline bigger", 0), "build");            // empty project: never an edit
assert.equal(guessKind("A multi-page online store for candles", 0), "large");
assert.equal(guessKind("Add a new page about our team", 6), "build");
assert.equal(guessKind("Rebuild the whole site from scratch", 6), "large");
const e1 = estimate("Make the headline bigger", 4, "pro");
assert.equal(e1.kind, "edit"); assert.equal(e1.model, "claude-haiku-5-5"); assert.ok(e1.low >= 1 && e1.high <= 40 && e1.low <= e1.high);
const e2 = estimate("A landing page for a coffee roaster", 0, "builder");
assert.equal(e2.model, "claude-sonnet-5-5"); assert.ok(e2.low >= 10 && e2.high <= 600 && e2.low < e2.high);
const e3 = estimate("A multi-page online store", 0, "studio");
assert.equal(e3.model, "claude-fable-5-1"); assert.ok(e3.high <= 4000);
assert.equal(estimate("A multi-page online store", 0, "pro", 0).model, "claude-sonnet-5-5");   // no premium builds left

// ---- attached images reach the model; the stored state only holds markers
const img = "data:image/png;base64," + Buffer.from(png).toString("base64");
const files = new Map([["assets/uploads/logo.png", img], ["assets/uploads/brief.md", "# Brief"], ["index.html", "<h1>x</h1>"]]);
const blocks = attachmentBlocks([
  { path: "assets/uploads/logo.png", name: "logo.png", type: "image/png", size: 12 },
  { path: "assets/uploads/brief.md", name: "brief.md", type: "text/markdown", size: 7 },
  { path: "assets/uploads/gone.png", name: "gone.png", type: "image/png", size: 7 },
], files);
assert.equal(blocks.length, 2);
assert.match(blocks[0].text, /assets\/uploads\/logo\.png \(image\/png/);
assert.match(blocks[0].text, /brief\.md .*private reference/);
assert.doesNotMatch(blocks[0].text, /gone\.png/);
assert.equal(blocks[1].text, '<attached_image path="assets/uploads/logo.png" />');
const msgs = withImages([{ role: "user", content: [{ type: "text", text: "files" }, ...blocks, { type: "text", text: "request" }] }], files);
const content = msgs[0].content as any[];
assert.equal(content[2].type, "image"); assert.equal(content[2].source.media_type, "image/png");
assert.equal(content[2].source.data, Buffer.from(png).toString("base64"));
assert.equal(content[3].text, "request");
// a missing image becomes a note instead of failing the request
const gone = withImages([{ role: "user", content: [{ type: "text", text: '<attached_image path="assets/uploads/x.png" />' }] }], new Map());
assert.equal((gone[0].content as any[])[0].type, "text");
// a request that merely mentions the marker inside other text is not turned into an image
const mention = withImages([{ role: "user", content: [{ type: "text", text: 'hi <attached_image path="assets/uploads/logo.png" />' }] }], files);
assert.equal((mention[0].content as any[])[0].type, "text");

console.log("workspace features: all tests passed");
