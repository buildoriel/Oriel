import { NextResponse } from "next/server";
import { runMonthly } from "@/lib/economics";
import { handle, requireCron } from "@/lib/http";
export const maxDuration = 800;
export const GET = handle(async (req: Request) => { requireCron(req); return NextResponse.json(await runMonthly()); });
