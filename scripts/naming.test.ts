// Project names from the first prompt, no network: npx tsx scripts/naming.test.ts
import assert from "node:assert/strict";
import { nameFromPrompt, SLUG_RE } from "../lib/projects";

assert.deepEqual(nameFromPrompt('A landing page for a coffee shop in Bandung called "Kopi Senja". Warm and minimal.'), { name: "Kopi Senja", base: "kopi-senja" });
assert.deepEqual(nameFromPrompt("A portfolio site for an architecture photographer named Lena Ortiz"), { name: "Lena Ortiz", base: "lena-ortiz" });
assert.deepEqual(nameFromPrompt("Three SVG logo options for a cycling club called North Loop."), { name: "North Loop", base: "north-loop" });
assert.deepEqual(nameFromPrompt("A personal finance dashboard with monthly spending charts"), { name: "Personal Finance Dashboard", base: "personal-finance-dashboard" });
assert.deepEqual(nameFromPrompt(""), { name: "New project", base: "new-project" });
assert.deepEqual(nameFromPrompt("!!!"), { name: "New project", base: "new-project" });
for (const p of ["x", "A very long prompt about an extraordinarily specific internationalization dashboard", "“Café Ümlaut”"]) {
  const { base } = nameFromPrompt(p);
  assert.ok(SLUG_RE.test(base) || base === "project", `slug ok: ${base}`);
}
console.log("naming: ok");
