import { admin } from "./supabase/admin";
import { HttpError } from "./supabase/server";
import { TIER_ORDER, type TierId } from "./config";
export async function requireTier(userId: string, min: TierId, what: string) {
  const { data } = await admin().rpc("effective_tier", { p_user: userId });
  if (TIER_ORDER.indexOf(data as TierId) < TIER_ORDER.indexOf(min))
    throw new HttpError(403, `${what} tersedia mulai tier ${min[0].toUpperCase() + min.slice(1)}.`);
  return data as TierId;
}
