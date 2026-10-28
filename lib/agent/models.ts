import type { TierId } from "../config";

export type ActionKind = "edit" | "build" | "large";
export const ROUTER_MODEL = "claude-haiku-5-5";

/**
 * Price per 1 million tokens (USD). VERIFY against https://docs.claude.com before production;
 * the defaults here are placeholders. Can be overridden with env MODEL_PRICES_JSON.
 * cacheWrite = tokens written to the cache, cacheRead = tokens read from the cache.
 */
type Price = { input: number; output: number; cacheWrite: number; cacheRead: number };
const DEFAULT_PRICES: Record<string, Price> = {
  "claude-haiku-5-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  "claude-sonnet-5-5": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-opus-5-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-fable-5-1": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
};
export const PRICES: Record<string, Price> = {
  ...DEFAULT_PRICES,
  ...(process.env.MODEL_PRICES_JSON ? JSON.parse(process.env.MODEL_PRICES_JSON) : {}),
};

export type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null };
export function usageCostUsd(model: string, u: Usage) {
  const p = PRICES[model];
  if (!p) throw new Error(`Unknown model price: ${model}`);
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead) / 1_000_000
  );
}

/** Strongest model allowed per tier and action kind. */
export function pickModel(tier: TierId, kind: ActionKind, opts: { premiumLeft: number }) {
  switch (tier) {
    case "free": return "claude-haiku-5-5";
    case "builder": return kind === "edit" ? "claude-haiku-5-5" : "claude-sonnet-5-5";
    case "pro":
      if (kind === "edit") return "claude-haiku-5-5";
      // "occasional Opus": large projects use Opus while this month's premium quota lasts
      return kind === "large" && opts.premiumLeft > 0 ? "claude-opus-5-5" : "claude-sonnet-5-5";
    case "studio":
      if (kind === "edit") return "claude-haiku-5-5";
      return kind === "large" ? "claude-fable-5-1" : "claude-opus-5-5";
  }
}

/** Agent step limit and credit cap per request, so one message cannot drain the balance. */
export const KIND_LIMITS: Record<ActionKind, { maxSteps: number; maxCredits: number; minCredits: number; maxTokens: number }> = {
  edit:  { maxSteps: 6,  maxCredits: 40,   minCredits: 1,  maxTokens: 8000 },
  build: { maxSteps: 24, maxCredits: 600,  minCredits: 10, maxTokens: 16000 },
  large: { maxSteps: 60, maxCredits: 4000, minCredits: 100, maxTokens: 32000 },
};
