// OpenRouter conversion tests, no network: npx tsx scripts/llm-adapter.test.ts
import assert from "node:assert";
import { createMessage } from "../lib/llm";
import { usageCostUsd } from "../lib/agent/models";
import { TOOLS } from "../lib/agent/tools";

process.env.LLM_PROVIDER = "openrouter";
process.env.OPENROUTER_API_KEY = "test";
let sent: any;
globalThis.fetch = (async (_url: string, init: any) => {
  sent = JSON.parse(init.body);
  return new Response(JSON.stringify({
    choices: [{ finish_reason: "tool_calls", message: { content: "Writing the page.", tool_calls: [
      { id: "call_1", type: "function", function: { name: "write_file", arguments: '{"path":"index.html","content":"<h1>Hi</h1>"}' } }] } }],
    usage: { prompt_tokens: 12000, completion_tokens: 800, prompt_tokens_details: { cached_tokens: 10000, cache_write_tokens: 1500 } },
  }), { status: 200 });
}) as any;

async function main() {
  const res = await createMessage({
    model: "claude-sonnet-5-5", max_tokens: 1000, tools: TOOLS,
    system: [{ type: "text", text: "SYS", cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: [{ type: "text", text: "SNAPSHOT", cache_control: { type: "ephemeral" } }, { type: "text", text: "build a site" }] },
      { role: "assistant", content: [{ type: "tool_use", id: "t0", name: "read_file", input: { path: "a.html" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t0", content: "content", cache_control: { type: "ephemeral" } } as any] },
    ],
  });

  // request
  assert.equal(sent.model, "anthropic/claude-sonnet-5.5");
  assert.deepEqual(sent.provider, { order: ["anthropic"], allow_fallbacks: false });
  assert.equal(sent.messages[0].role, "system");
  assert.ok(sent.messages[0].content[0].cache_control);
  assert.ok(sent.messages[1].content[0].cache_control);
  assert.equal(sent.messages[2].tool_calls[0].function.name, "read_file");
  assert.equal(sent.messages[3].role, "tool");
  assert.equal(sent.messages[3].tool_call_id, "t0");
  assert.equal(sent.tools.length, TOOLS.length);
  assert.equal(sent.tools[0].function.parameters.type, "object");
  // response
  assert.equal(res.stop_reason, "tool_use");
  assert.equal(res.content[1].type, "tool_use");
  assert.equal((res.content[1] as any).input.path, "index.html");
  assert.deepEqual(res.usage, { input_tokens: 500, output_tokens: 800, cache_creation_input_tokens: 1500, cache_read_input_tokens: 10000 });
  // cost accounting still uses the same price table
  assert.ok(usageCostUsd("claude-sonnet-5-5", res.usage) > 0);
  console.log("llm adapter tests: OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
