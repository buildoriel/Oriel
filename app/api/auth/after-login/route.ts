import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/supabase/server";
import { applyReferral } from "@/lib/referral";
import { handle } from "@/lib/http";

// Sign-ins that finish in the browser (Google button) skip /auth/callback, so referral linking runs here.
export const POST = handle(async () => {
  const user = await requireUser();
  await applyReferral(user, (await cookies()).get("oriel_ref")?.value);
  return NextResponse.json({ ok: true });
});
