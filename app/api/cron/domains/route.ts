import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { verifyDomain } from "@/lib/domains";
import { handle, requireCron } from "@/lib/http";
// re-check domains that are not active yet (DNS can take a while)
export const GET = handle(async (req: Request) => {
  requireCron(req);
  const { data } = await admin().from("domains").select("id").in("status", ["pending", "dns_ok"]).limit(100);
  const out = [];
  for (const d of data ?? []) out.push(await verifyDomain(d.id).catch((e) => ({ error: String(e) })));
  return NextResponse.json({ checked: out.length });
});
