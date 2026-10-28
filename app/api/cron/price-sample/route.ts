import { NextResponse } from "next/server";
import { samplePrice } from "@/lib/staking/price";
import { handle, requireCron } from "@/lib/http";

// skipped until $ORIEL and its pool exist (ORIEL_TOKEN_ADDRESS / ORIEL_POOL_ADDRESS unset)
export const GET = handle(async (req: Request) => {
  requireCron(req);
  if (!process.env.ORIEL_POOL_ADDRESS || !process.env.ORIEL_TOKEN_ADDRESS) return NextResponse.json({ skipped: "token or pool address not configured" });
  return NextResponse.json({ price: await samplePrice() });
});
