import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { applyReferral } from "@/lib/referral";
import { safeNext } from "@/lib/redirect";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.exchangeCodeForSession(code);
    if (data.user) await applyReferral(data.user, (await cookies()).get("oriel_ref")?.value);
  }
  const dest = new URL(next, url.origin);
  return NextResponse.redirect(dest.origin === url.origin ? dest : new URL("/workspace", url.origin));
}
