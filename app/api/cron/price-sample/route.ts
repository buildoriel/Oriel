import { NextResponse } from "next/server";
import { samplePrice } from "@/lib/staking/price";
import { handle, requireCron } from "@/lib/http";
export const GET = handle(async (req: Request) => { requireCron(req); return NextResponse.json({ price: await samplePrice() }); });
