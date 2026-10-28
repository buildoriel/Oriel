import { NextResponse } from "next/server";
import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { projectAccess } from "@/lib/projects";
import { handle } from "@/lib/http";
import { isPlaceholderEmail } from "@/lib/account-email";
import { EMAIL_RE, canRemove, inviteBlocker, maskEmail } from "./rules";

type Ctx = { params: Promise<{ id: string }> };

async function emailOf(userId: string) {
  const { data } = await admin().auth.admin.getUserById(userId);
  const e = data?.user?.email ?? null;
  return isPlaceholderEmail(e) ? null : e;
}

/** Invitee by email, @handle, or wallet address (wallet-only accounts have no email). */
async function findInvitee(raw: string) {
  const q = raw.trim().toLowerCase();
  if (/^0x[0-9a-f]{40}$/.test(q)) {
    const { data } = await admin().from("profiles").select("id").eq("wallet_address", q).maybeSingle();
    return data?.id ?? null;
  }
  if (/^@?[a-z0-9_]{3,24}$/.test(q) && !q.includes(".")) {
    const { data } = await admin().from("profiles").select("id").eq("handle", q.replace(/^@/, "")).maybeSingle();
    return data?.id ?? null;
  }
  if (EMAIL_RE.test(q) && q.length <= 254) return userIdByEmail(q);
  throw new HttpError(400, "Enter an email address, an @handle, or a wallet address.");
}

/** Auth users are not mirrored in profiles; user_id_by_email (service role only) looks them up. */
async function userIdByEmail(email: string) {
  const { data, error } = await admin().rpc("user_id_by_email", { p_email: email });
  if (error) throw error;
  return (data as string | null) ?? null;
}

async function ownerTier(ownerId: string) {
  const { data } = await admin().rpc("effective_tier", { p_user: ownerId });
  return (data as string | null) ?? "free";
}

/** Owner first, then members. Emails are visible to the owner; members see them masked. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const p = await projectAccess(user.id, (await ctx.params).id);
  const db = admin();
  const isOwner = p.role === "owner";
  const { data: rows } = await db.from("project_members").select("user_id, role, created_at").eq("project_id", p.id).order("created_at");
  const ids = [p.owner_id, ...(rows ?? []).map((r) => r.user_id)];
  const [{ data: profiles }, emails, tier] = await Promise.all([
    db.from("profiles").select("id, handle").in("id", ids),
    Promise.all(ids.map((id) => emailOf(id).catch(() => null))),
    ownerTier(p.owner_id),
  ]);
  const handleOf = (id: string) => profiles?.find((x) => x.id === id)?.handle ?? null;
  const show = (id: string, i: number) => (isOwner || id === user.id ? emails[i] : maskEmail(emails[i]));
  const members = [
    { user_id: p.owner_id, handle: handleOf(p.owner_id), email: show(p.owner_id, 0), role: "owner", created_at: p.created_at, you: p.owner_id === user.id },
    ...(rows ?? []).map((r, i) => ({ user_id: r.user_id, handle: handleOf(r.user_id), email: show(r.user_id, i + 1), role: r.role, created_at: r.created_at, you: r.user_id === user.id })),
  ];
  return NextResponse.json({ isOwner, canInvite: isOwner && tier === "studio", tier, members });
});

/** Owner adds an existing Oriel user as an editor. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const p = await projectAccess(user.id, (await ctx.params).id);
  const body = await req.json().catch(() => ({}));
  const target = typeof body.email === "string" ? body.email.slice(0, 254) : "";
  if (!target.trim()) throw new HttpError(400, "Enter an email address, an @handle, or a wallet address.");

  const db = admin();
  const [{ count: memberCount }, { count: invitesToday }, tier] = await Promise.all([
    db.from("project_members").select("user_id", { count: "exact", head: true }).eq("project_id", p.id),
    db.from("project_members").select("user_id", { count: "exact", head: true }).eq("added_by", user.id)
      .gte("created_at", new Date(Date.now() - 86400_000).toISOString()),
    ownerTier(p.owner_id),
  ]);
  const blocked = inviteBlocker({ isOwner: p.role === "owner", ownerTier: tier, memberCount: memberCount ?? 0, invitesToday: invitesToday ?? 0 });
  if (blocked) throw new HttpError(403, blocked);

  const invitee = await findInvitee(target);
  if (!invitee) throw new HttpError(404, "No Oriel account matches that. Ask them to sign in to Oriel once, then invite them again.");
  if (invitee === user.id) throw new HttpError(400, "You already own this project.");

  const { error } = await db.from("project_members").insert({ project_id: p.id, user_id: invitee, role: "editor", added_by: user.id });
  if (error?.code === "23505") throw new HttpError(409, "That person is already a member.");
  if (error) throw error;

  const { data: me } = await db.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const who = me?.handle ? `@${me.handle}` : (isPlaceholderEmail(user.email) ? "Someone" : user.email ?? "Someone");
  await db.from("notifications").insert({ user_id: invitee, kind: "team_invite", body: `${who} added you to ${p.name}.` });
  return NextResponse.json({ ok: true });
});

/** Owner removes a member, or a member leaves: DELETE ?userId=<id> */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const p = await projectAccess(user.id, (await ctx.params).id);
  const target = new URL(req.url).searchParams.get("userId") ?? "";
  if (!canRemove({ callerId: user.id, ownerId: p.owner_id, targetId: target })) throw new HttpError(403, "You can't remove that person.");
  await admin().from("project_members").delete().eq("project_id", p.id).eq("user_id", target);
  return NextResponse.json({ ok: true });
});
