import { NextResponse } from "next/server";
import { HttpError } from "./supabase/server";

export function handle<T extends any[]>(fn: (...a: T) => Promise<Response>) {
  return async (...a: T) => {
    try { return await fn(...a); }
    catch (e: any) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message, ...e.details }, { status: e.status });
      if (String(e?.message).includes("INSUFFICIENT_CREDITS"))
        return NextResponse.json({ error: "Not enough credits. Top up or upgrade your tier." }, { status: 402 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong on our side." }, { status: 500 });
    }
  };
}

export function requireCron(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) throw new HttpError(401, "unauthorized");
}
