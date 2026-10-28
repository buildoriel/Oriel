// Resumable agent tests with an in-memory database and a scripted model, no network:
//   npx tsx scripts/agent-queue.test.ts
// Covers: a build split across worker slices, files saved every step, state checkpoints,
// credits charged per slice adding up to the real cost, Stop, and the credit-limit cut-off.
import assert from "node:assert";
import { setAdminForTests } from "../lib/supabase/admin";
import { runSlice, finishRun, type AgentState } from "../lib/agent/loop";
import { usdToCredits } from "../lib/credits";
import { usageCostUsd } from "../lib/agent/models";
import { fakeDb } from "./fake-db";

process.env.LLM_PROVIDER = "openrouter"; process.env.OPENROUTER_API_KEY = "test"; delete process.env.IMAGE_MODEL;
const USER = "u1", PROJECT = "p1";

/** Scripted model: each call returns the next tool call. Usage is large enough to cost real credits. */
function scriptModel(steps: { name: string; args: object }[], delayMs = 0) {
  let i = 0; const seen: any[] = [];
  globalThis.fetch = (async (_u: string, init: any) => {
    seen.push(JSON.parse(init.body));
    await new Promise((ok) => setTimeout(ok, delayMs));
    const s = steps[Math.min(i++, steps.length - 1)];
    return new Response(JSON.stringify({
      choices: [{ finish_reason: "tool_calls", message: { content: "", tool_calls: [{ id: `c${i}`, type: "function", function: { name: s.name, arguments: JSON.stringify(s.args) } }] } }],
      usage: { prompt_tokens: 20000, completion_tokens: 2000, prompt_tokens_details: { cached_tokens: 15000, cache_write_tokens: 0 } },
    }));
  }) as any;
  return seen;
}
const STEP_USAGE = { input_tokens: 5000, output_tokens: 2000, cache_creation_input_tokens: 0, cache_read_input_tokens: 15000 };

function setup(balance = 1000) {
  const db = fakeDb({
    project_files: [], credit_balances: [{ user_id: USER, monthly: 0, topup: balance }], profiles: [{ id: USER, staked_tier: "free" }],
    ai_usage: [], credit_ledger: [], messages: [], projects: [{ id: PROJECT, github_repo: null, github_autocommit: false }],
  }, {
    spend_credits: ({ p_user, p_amount }: any) => {
      const b = db.tables.credit_balances.find((r) => r.user_id === p_user)!;
      if (b.monthly + b.topup < p_amount) throw new Error("INSUFFICIENT_CREDITS");
      const m = Math.min(b.monthly, p_amount); b.monthly -= m; b.topup -= p_amount - m;
      db.tables.credit_ledger.push({ delta: -p_amount }); return b.monthly + b.topup;
    },
  });
  setAdminForTests(db);
  return db;
}
const freshState = (over: Partial<AgentState> = {}): AgentState => ({
  v: 1, userMsgId: 1, tier: "builder", kind: "build", model: "claude-sonnet-5-5",
  budgetCredits: 600, maxSteps: 24, maxTokens: 16000,
  msgs: [{ role: "user", content: [{ type: "text", text: "<project_files>\n(project is empty)\n</project_files>" }, { type: "text", text: "<request>build</request>" }] }],
  step: 0, images: 0, summary: "", costUsd: 0, chargedUsd: 0, chargedCredits: 0,
  usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }, changed: [], deleted: [], ...over,
});
const noop = async () => {};

async function main() {
  // ---- 1. a build split across two worker slices ----
  {
    const db = setup();
    const seen = scriptModel([
      { name: "write_file", args: { path: "index.html", content: "<h1>Clay</h1>" } },
      { name: "write_file", args: { path: "style.css", content: "h1{color:red}" } },
      { name: "finish", args: { summary: "Built the landing page." } },
    ], 30);
    const events: any[] = []; const checkpoints: number[] = [];
    const emit = async (e: any) => { events.push(e); };
    const base = { userId: USER, projectId: PROJECT, emit, cancelled: async () => false, checkpoint: async (s: AgentState) => { checkpoints.push(s.step); } };

    // slice 1: deadline passes during the first model call, so exactly one step runs
    const r1 = await runSlice({ ...base, state: freshState(), deadline: Date.now() + 10 });
    assert.equal(r1.finished, false); assert.equal(r1.state.step, 1);
    assert.equal(db.tables.project_files.find((f) => f.path === "index.html")?.content, "<h1>Clay</h1>", "file saved right after its step");
    assert.deepEqual(checkpoints, [1], "state checkpointed after the step");
    const credits1 = r1.state.chargedCredits;
    assert.equal(credits1, usdToCredits(usageCostUsd("claude-sonnet-5-5", STEP_USAGE)), "slice 1 charged for its step");

    // slice 2: resumes from the saved state (JSON round trip like the database), finishes
    const resumed = JSON.parse(JSON.stringify(r1.state));
    const r2 = await runSlice({ ...base, state: resumed, deadline: Date.now() + 60_000 });
    assert.equal(r2.finished, true); assert.equal(r2.state.summary, "Built the landing page."); assert.equal(r2.state.step, 3);
    // the model saw the earlier turn: request 2 carries the tool result of step 1
    assert.ok(JSON.stringify(seen[1].messages).includes("OK wrote index.html"), "conversation continues across slices");
    assert.deepEqual(db.tables.project_files.map((f) => f.path).sort(), ["index.html", "style.css"]);

    const total = usageCostUsd("claude-sonnet-5-5", STEP_USAGE) * 3;
    assert.ok(Math.abs(r2.state.costUsd - total) < 1e-9);
    assert.equal(r2.state.chargedCredits, usdToCredits(total), "credits over all slices equal the real cost");
    const loggedUsd = db.tables.ai_usage.reduce((s, r) => s + r.cost_usd, 0);
    assert.ok(Math.abs(loggedUsd - total) < 1e-9, "ai_usage rows add up to the real cost");
    assert.equal(db.tables.credit_balances[0].topup, 1000 - usdToCredits(total));

    await finishRun({ userId: USER, projectId: PROJECT, state: r2.state, emit });
    const done = events.find((e) => e.type === "done");
    assert.equal(done.summary, "Built the landing page."); assert.equal(done.credits, usdToCredits(total)); assert.equal(done.balance, 1000 - usdToCredits(total));
    assert.equal(db.tables.messages.at(-1)?.content, "Built the landing page.");
    assert.ok(events.some((e) => e.type === "file" && e.path === "style.css"));
  }

  // ---- 2. Stop: finishes the current step, keeps files, charges only for the work done ----
  {
    const db = setup();
    scriptModel([{ name: "write_file", args: { path: "index.html", content: "x" } }, { name: "write_file", args: { path: "b.html", content: "y" } }]);
    let calls = 0;
    const r = await runSlice({ userId: USER, projectId: PROJECT, state: freshState(), deadline: Date.now() + 60_000, emit: noop, checkpoint: noop,
      cancelled: async () => ++calls > 1 });
    assert.equal(r.finished, true); assert.match(r.state.summary, /^Stopped/); assert.equal(r.state.step, 1);
    assert.deepEqual(db.tables.project_files.map((f) => f.path), ["index.html"]);
    assert.equal(r.state.chargedCredits, usdToCredits(usageCostUsd("claude-sonnet-5-5", STEP_USAGE)));
  }

  // ---- 3. the per-request credit budget stops a runaway build ----
  {
    setup();
    scriptModel([{ name: "write_file", args: { path: "index.html", content: "x" } }]);
    const r = await runSlice({ userId: USER, projectId: PROJECT, state: freshState({ budgetCredits: 15 }), deadline: Date.now() + 60_000, emit: noop, checkpoint: noop, cancelled: async () => false });
    assert.equal(r.finished, true); assert.match(r.state.summary, /credit limit/);
    // each step costs 5 credits here, so the 15-credit budget is reached exactly after step 3
    const perStep = usdToCredits(usageCostUsd("claude-sonnet-5-5", STEP_USAGE));
    assert.equal(perStep, 5); assert.equal(r.state.step, 3); assert.equal(r.state.chargedCredits, 15);
  }

  // ---- 4. balance spent elsewhere mid-build: charge what is left, stop cleanly ----
  {
    const db = setup(3);
    scriptModel([{ name: "write_file", args: { path: "index.html", content: "x" } }], 30);
    const r = await runSlice({ userId: USER, projectId: PROJECT, state: freshState({ budgetCredits: 600 }), deadline: Date.now() + 10, emit: noop, checkpoint: noop, cancelled: async () => false });
    assert.equal(r.finished, true); assert.match(r.state.summary, /credits ran out/);
    assert.equal(db.tables.credit_balances[0].topup, 0); assert.equal(r.state.chargedCredits, 3);
  }

  console.log("agent queue tests: OK");
}
main().catch((e) => { console.error(e); process.exit(1); });
