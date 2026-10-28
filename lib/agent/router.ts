import { createMessage } from "../llm";
import { ROUTER_MODEL, usageCostUsd, type ActionKind } from "./models";

const ROUTER_SYSTEM = `You classify a single user request for an AI website/design builder.
Return ONLY a JSON object: {"kind":"edit"|"build"|"large","reason":"<short>"}.
- edit: change to an existing project (copy, colors, one section, fix a bug, add one element).
- build: create a new single page/app/design/document, or rework most of one page.
- large: multi-page site, store/blog with many pages, app with several screens, or a full rebuild.
If the project has no files yet, the answer is never "edit".`;

export async function routeRequest(message: string, fileCount: number) {
  const res = await createMessage({
    model: ROUTER_MODEL,
    max_tokens: 100,
    system: [{ type: "text", text: ROUTER_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Project files: ${fileCount}\nRequest: ${message.slice(0, 4000)}` }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  let kind: ActionKind = fileCount === 0 ? "build" : "edit";
  try {
    const j = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (["edit", "build", "large"].includes(j.kind)) kind = j.kind;
  } catch { /* use the default */ }
  if (fileCount === 0 && kind === "edit") kind = "build";
  return { kind, costUsd: usageCostUsd(ROUTER_MODEL, res.usage), usage: res.usage };
}
