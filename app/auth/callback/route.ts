import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/redirect";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.exchangeCodeForSession(code);
    const ref = (await cookies()).get("oriel_ref")?.value;
    if (data.user && ref) {
      const db = admin();
      const { data: referrer } = await db.from("profiles").select("id").eq("referral_code", ref).maybeSingle();
      if (referrer && referrer.id !== data.user.id) {
        // hanya untuk akun baru (dibuat < 10 menit lalu)
        if (Date.now() - new Date(data.user.created_at).getTime() < 10 * 60_000) {
          await db.from("referrals").insert({ referrer_id: referrer.id, referred_id: data.user.id });
          await db.from("profiles").update({ referred_by: referrer.id }).eq("id", data.user.id);
        }
      }
    }
  }
  const dest = new URL(next, url.origin);
  return NextResponse.redirect(dest.origin === url.origin ? dest : new URL("/workspace", url.origin));
}
