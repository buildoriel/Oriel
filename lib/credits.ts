import { admin } from "./supabase/admin";
import { CREDIT_COST_USD } from "./config";

export async function getBalance(userId: string) {
  const { data } = await admin().from("credit_balances").select("monthly, topup").eq("user_id", userId).single();
  return { monthly: Number(data?.monthly ?? 0), topup: Number(data?.topup ?? 0), total: Number(data?.monthly ?? 0) + Number(data?.topup ?? 0) };
}

export async function spend(userId: string, amount: number, reason: string, ref?: string, meta: object = {}) {
  const { data, error } = await admin().rpc("spend_credits", {
    p_user: userId, p_amount: Math.ceil(amount), p_reason: reason, p_ref: ref ?? null, p_meta: meta,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

export async function grant(userId: string, amount: number, bucket: "monthly" | "topup", reason: string, ref?: string, meta: object = {}) {
  const { data, error } = await admin().rpc("grant_credits", {
    p_user: userId, p_amount: Math.floor(amount), p_bucket: bucket, p_reason: reason, p_ref: ref ?? null, p_meta: meta,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

/** AI cost in USD -> credits (rounded up, minimum 1) */
export const usdToCredits = (usd: number) => Math.max(1, Math.ceil(usd / CREDIT_COST_USD));
