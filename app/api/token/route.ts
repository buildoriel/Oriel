import { NextResponse } from "next/server";
import { officialToken } from "@/lib/official-token";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** The official $ORIEL contract address (null until the token exists). Cached at the edge for 30 seconds. */
export const GET = handle(async () => {
  const t = await officialToken();
  return NextResponse.json({ address: t.address }, {
    headers: { "cache-control": t.address ? "public, s-maxage=300, stale-while-revalidate=600" : "public, s-maxage=30, stale-while-revalidate=30" },
  });
});
