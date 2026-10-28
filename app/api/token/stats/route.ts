import { NextResponse } from "next/server";
import { cachedTokenStats } from "@/lib/token-stats";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Official $ORIEL addresses and live on-chain numbers. Public; cached at the edge for a minute. */
export const GET = handle(async () =>
  NextResponse.json(await cachedTokenStats(), { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } }));
