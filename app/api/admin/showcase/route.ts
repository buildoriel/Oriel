import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { HttpError } from "@/lib/supabase/server";
import { seedShowcase } from "@/lib/showcase";
import { handle } from "@/lib/http";

export const maxDuration = 300;

/**
 * Operator task: publish Oriel's example projects (content/showcase) and their free templates.
 * Off unless ADMIN_TASK_TOKEN is set; called with `Authorization: Bearer <token>`.
 */
export const POST = handle(async (req: Request) => {
  const token = process.env.ADMIN_TASK_TOKEN;
  if (!token || token.length < 32) throw new HttpError(404, "Not found.");
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(token);
  if (given.length !== want.length || !timingSafeEqual(given, want)) throw new HttpError(401, "unauthorized");
  const body = await req.json().catch(() => ({}));
  const slugs = Array.isArray(body?.slugs) ? body.slugs.filter((x: unknown): x is string => typeof x === "string") : undefined;
  return NextResponse.json({ results: await seedShowcase(slugs) });
});
