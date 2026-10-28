import type { TierId } from "../config";
import { CREDIT_COST_USD } from "../config";
import { KIND_LIMITS, PRICES, pickModel, type ActionKind } from "./models";

/**
 * Rough credit estimate shown before a request is sent. No LLM call: the request kind is guessed with
 * keywords (the real build uses the Haiku router), the model comes from the same pickModel as the agent,
 * and the cost from a typical token profile per kind. Shown as a range and labelled as an estimate.
 */
const LARGE_NEW = /\b(multi-?page|pages|online store|e-?commerce|shop|blog|web ?app|platform|marketplace|several screens|multiple screens|full (site|website|app)|saas|booking system|admin panel)\b/i;
const LARGE_EDIT = /\b(rebuild|redo|from scratch|start over|whole site|entire (site|website|app)|all (the )?pages|(several|multiple|\d+) (new )?pages)\b/i;
const BUILD_EDIT = /\b(new page|another page|add (a |an )?(page|section|feature|form|gallery|blog|cart|checkout|dashboard)|redesign|rework|restyle|rewrite|overhaul|make it (look|feel) (completely|totally))\b/i;

export function guessKind(message: string, fileCount: number): ActionKind {
  const m = message.trim();
  if (fileCount === 0) return LARGE_NEW.test(m) || m.length > 900 ? "large" : "build";
  if (LARGE_EDIT.test(m)) return "large";
  if (BUILD_EDIT.test(m) || m.length > 500) return "build";
  return "edit";
}

// typical agent run per kind: steps × tokens per step (fresh input, cache read, cache write, output)
const PROFILE: Record<ActionKind, { steps: number; input: number; read: number; write: number; output: number }> = {
  edit:  { steps: 3,  input: 3000, read: 15000, write: 0,    output: 800 },
  build: { steps: 12, input: 4000, read: 40000, write: 4000, output: 4000 },
  large: { steps: 35, input: 6000, read: 90000, write: 6000, output: 6000 },
};

export function typicalCredits(kind: ActionKind, model: string) {
  const p = PRICES[model], t = PROFILE[kind];
  const usd = t.steps * (t.input * p.input + t.read * p.cacheRead + t.write * p.cacheWrite + t.output * p.output) / 1_000_000;
  return usd / CREDIT_COST_USD;
}

export function estimate(message: string, fileCount: number, tier: TierId, premiumLeft = 0) {
  const kind = guessKind(message, fileCount);
  const model = pickModel(tier, kind, { premiumLeft });
  const mid = typicalCredits(kind, model), lim = KIND_LIMITS[kind];
  const clamp = (n: number) => Math.min(lim.maxCredits, Math.max(lim.minCredits, n));
  const round = (n: number) => (n < 20 ? Math.max(1, Math.round(n)) : n < 200 ? Math.round(n / 5) * 5 : Math.round(n / 50) * 50);
  const low = round(clamp(mid * 0.5)), high = Math.max(low, round(clamp(mid * 1.5)));
  return { kind, model, low, high, cap: lim.maxCredits };
}
