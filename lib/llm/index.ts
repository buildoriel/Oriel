import Anthropic from "@anthropic-ai/sdk";

/**
 * AI adapter layer. The agent always speaks the Anthropic message format;
 * this adapter forwards it to Anthropic directly or to OpenRouter.
 *
 *   LLM_PROVIDER=openrouter  (default)  -> https://openrouter.ai, provider pinned to Anthropic
 *   LLM_PROVIDER=anthropic              -> Claude API directly
 *
 * Cost accounting does NOT change: usage is mapped to the Anthropic shape and priced
 * with the table in lib/agent/models.ts (usageCostUsd).
 */
export type LlmRequest = {
  model: string;                       // internal name, e.g. "claude-sonnet-5-5"
  max_tokens: number;
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
};
export type LlmUsage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number };
export type LlmResponse = {
  content: Anthropic.ContentBlock[];
  stop_reason: "tool_use" | "end_turn" | "max_tokens";
  usage: LlmUsage;
};

const provider = () => (process.env.LLM_PROVIDER ?? "openrouter") as "openrouter" | "anthropic";

export async function createMessage(req: LlmRequest): Promise<LlmResponse> {
  return provider() === "anthropic" ? viaAnthropic(req) : viaOpenRouter(req);
}

// ---------------------------------------------------------------- Anthropic direct
let _anthropic: Anthropic | null = null;
async function viaAnthropic(req: LlmRequest): Promise<LlmResponse> {
  _anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const res = await _anthropic.messages.create({
    model: req.model, max_tokens: req.max_tokens, system: req.system, messages: req.messages, ...(req.tools ? { tools: req.tools } : {}),
  });
  return {
    content: res.content,
    stop_reason: res.stop_reason === "tool_use" ? "tool_use" : res.stop_reason === "max_tokens" ? "max_tokens" : "end_turn",
    usage: {
      input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens,
      cache_creation_input_tokens: res.usage.cache_creation_input_tokens ?? 0, cache_read_input_tokens: res.usage.cache_read_input_tokens ?? 0,
    },
  };
}

// ---------------------------------------------------------------- OpenRouter
/**
 * Internal model name -> OpenRouter slug. VERIFY at https://openrouter.ai/models,
 * then override with env OPENROUTER_MODEL_MAP if a slug differs.
 */
const DEFAULT_MODEL_MAP: Record<string, string> = {
  "claude-haiku-5-5": "anthropic/claude-haiku-5.5",
  "claude-sonnet-5-5": "anthropic/claude-sonnet-5.5",
  "claude-opus-5-5": "anthropic/claude-opus-5.5",
  "claude-fable-5-1": "anthropic/claude-fable-5.1",
};
const modelMap = (): Record<string, string> => ({
  ...DEFAULT_MODEL_MAP,
  ...(process.env.OPENROUTER_MODEL_MAP ? JSON.parse(process.env.OPENROUTER_MODEL_MAP) : {}),
});

type ORPart = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };
type ORImage = { type: "image_url"; image_url: { url: string } };
type ORMessage =
  | { role: "system" | "user"; content: string | (ORPart | ORImage)[] }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string | ORPart[] };

const part = (text: string, cc?: unknown): ORPart =>
  cc ? { type: "text", text, cache_control: { type: "ephemeral" } } : { type: "text", text };

function toOpenRouterMessages(req: LlmRequest): ORMessage[] {
  const out: ORMessage[] = [{ role: "system", content: req.system.map((b) => part(b.text, b.cache_control)) }];
  for (const m of req.messages) {
    if (typeof m.content === "string") { out.push({ role: m.role, content: m.content } as ORMessage); continue; }
    if (m.role === "assistant") {
      const text = m.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      const calls = m.content.filter((b: any) => b.type === "tool_use").map((b: any) => ({
        id: b.id, type: "function" as const, function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
      }));
      out.push({ role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
      continue;
    }
    // user: tool results become role "tool" messages (must directly follow the assistant), remaining text and images become a user message
    const texts: (ORPart | ORImage)[] = [];
    for (const b of m.content as any[]) {
      if (b.type === "tool_result") {
        const body = typeof b.content === "string" ? b.content : (b.content ?? []).map((c: any) => c.text ?? "").join("");
        out.push({ role: "tool", tool_call_id: b.tool_use_id, content: b.cache_control ? [part(body, true)] : body });
      } else if (b.type === "text") texts.push(part(b.text, b.cache_control));
      else if (b.type === "image" && b.source?.type === "base64") texts.push({ type: "image_url", image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } });
    }
    if (texts.length) out.push({ role: "user", content: texts });
  }
  return out;
}

async function viaOpenRouter(req: LlmRequest): Promise<LlmResponse> {
  const model = modelMap()[req.model];
  if (!model) throw new Error(`Model ${req.model} is not mapped to OpenRouter (OPENROUTER_MODEL_MAP).`);
  const order = (process.env.OPENROUTER_PROVIDER_ORDER ?? "anthropic").split(",").map((s) => s.trim());

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://buildoriel.com",
      "X-Title": "Oriel",
    },
    body: JSON.stringify({
      model,
      max_tokens: req.max_tokens,
      messages: toOpenRouterMessages(req),
      ...(req.tools?.length ? {
        tools: req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } })),
      } : {}),
      // Pin to the Anthropic provider with no fallback: the prompt cache only hits on the same provider.
      provider: { order, allow_fallbacks: false },
      usage: { include: true },
    }),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`OpenRouter ${res.status}: ${j.error?.message ?? "request failed"}`);

  const msg = j.choices?.[0]?.message ?? {};
  const content: any[] = [];
  if (typeof msg.content === "string" && msg.content) content.push({ type: "text", text: msg.content, citations: null });
  for (const c of msg.tool_calls ?? []) {
    let input: unknown = {};
    try { input = JSON.parse(c.function?.arguments || "{}"); } catch { /* malformed arguments -> the tool replies with an error */ }
    content.push({ type: "tool_use", id: c.id, name: c.function?.name, input });
  }
  const fr = j.choices?.[0]?.finish_reason;

  // OpenAI format: prompt_tokens ALREADY includes tokens read from / written to the cache.
  const u = j.usage ?? {};
  const cacheRead = Number(u.prompt_tokens_details?.cached_tokens ?? 0);
  const cacheWrite = Number(u.prompt_tokens_details?.cache_write_tokens ?? 0);
  return {
    content: content as Anthropic.ContentBlock[],
    stop_reason: fr === "tool_calls" || (msg.tool_calls?.length ?? 0) > 0 ? "tool_use" : fr === "length" ? "max_tokens" : "end_turn",
    usage: {
      input_tokens: Math.max(0, Number(u.prompt_tokens ?? 0) - cacheRead - cacheWrite),
      output_tokens: Number(u.completion_tokens ?? 0),
      cache_creation_input_tokens: cacheWrite,
      cache_read_input_tokens: cacheRead,
    },
  };
}
