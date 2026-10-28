// Pure rules for project team members (tested in scripts/team.test.ts).

export const MAX_MEMBERS = 10;
export const INVITES_PER_DAY = 30;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "maya@example.com" -> "m•••@example.com" (shown to members who are not the owner). */
export function maskEmail(email: string | null | undefined) {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";
  return `${email[0]}•••${email.slice(at)}`;
}

/** Why an invite is not allowed, or null when it is. Checked in this order so the message is the most useful one. */
export function inviteBlocker(a: {
  isOwner: boolean; ownerTier: string; memberCount: number; invitesToday: number;
}): string | null {
  if (!a.isOwner) return "Only the project owner can invite people.";
  if (a.ownerTier !== "studio") return "Team projects are part of the Studio plan. Upgrade to invite people.";
  if (a.memberCount >= MAX_MEMBERS) return `A project can have up to ${MAX_MEMBERS} members.`;
  if (a.invitesToday >= INVITES_PER_DAY) return "Too many invites today. Try again tomorrow.";
  return null;
}

/** Who may remove a membership: the owner removes anyone, a member may only remove themselves (leave). */
export function canRemove(a: { callerId: string; ownerId: string; targetId: string }) {
  if (a.targetId === a.ownerId) return false;
  return a.callerId === a.ownerId || a.callerId === a.targetId;
}
