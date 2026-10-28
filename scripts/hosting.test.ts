// Tes pemetaan URL situs statis tanpa jaringan: npx tsx scripts/hosting.test.ts
import assert from "node:assert";
import { serveStatic } from "../lib/hosting/serve";
import { fileBody } from "../lib/hosting";

const FILES: Record<string, string> = {
  "index.html": "<h1>home</h1>", "about.html": "about", "blog/index.html": "blog", "style.css": "body{}",
  "img/a.png": "data:image/png;base64,iVBORw0KGgo=", "supabase/schema.sql": "create table x();",
};
const load = async (rel: string) => (rel in FILES ? fileBody(FILES[rel]) : null);
const nf = () => new Response("nf", { status: 404 });
const go = (path: string) => {
  const trailing = path.endsWith("/");
  return serveStatic(path.split("/").filter(Boolean), trailing, load, nf, { "cache-control": "public, max-age=60" });
};

async function main() {
  let r = await go("/"); assert.equal(r.status, 200); assert.equal(await r.text(), "<h1>home</h1>"); assert.match(r.headers.get("content-type")!, /text\/html/);
  r = await go("/about"); assert.equal(await r.text(), "about");
  r = await go("/blog"); assert.equal(r.status, 308); assert.equal(r.headers.get("location"), "blog/");
  r = await go("/blog/"); assert.equal(r.status, 200); assert.equal(await r.text(), "blog");
  r = await go("/style.css"); assert.equal(r.headers.get("cache-control"), "public, max-age=86400");
  r = await go("/img/a.png"); assert.equal(r.headers.get("content-type"), "image/png");
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())].slice(0, 4), [0x89, 0x50, 0x4e, 0x47]); // byte asli PNG, bukan teks base64
  assert.equal((await go("/supabase/schema.sql")).status, 404); // file privat tidak tayang
  assert.equal((await go("/tidak-ada")).status, 404);
  assert.equal((await go("/a/../index.html")).status, 404);
  console.log("hosting tests: OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
