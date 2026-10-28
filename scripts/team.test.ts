// Team member rules, no network: npx tsx scripts/team.test.ts
import assert from "node:assert";
import { MAX_MEMBERS, INVITES_PER_DAY, canRemove, inviteBlocker, maskEmail } from "../app/api/projects/[id]/members/rules";

const ok = { isOwner: true, ownerTier: "studio", memberCount: 0, invitesToday: 0 };

assert.equal(maskEmail("maya@example.com"), "m•••@example.com");
assert.equal(maskEmail(null), null);
assert.equal(maskEmail("@x.com"), "•••");

assert.equal(inviteBlocker(ok), null, "studio owner can invite");
assert.match(inviteBlocker({ ...ok, isOwner: false })!, /Only the project owner/);
assert.match(inviteBlocker({ ...ok, ownerTier: "pro" })!, /Studio plan/);
assert.match(inviteBlocker({ ...ok, memberCount: MAX_MEMBERS })!, /up to 10 members/);
assert.equal(inviteBlocker({ ...ok, memberCount: MAX_MEMBERS - 1 }), null);
assert.match(inviteBlocker({ ...ok, invitesToday: INVITES_PER_DAY })!, /Too many invites/);
// a non-owner gets the owner message even on a free tier
assert.match(inviteBlocker({ ...ok, isOwner: false, ownerTier: "free" })!, /Only the project owner/);

const ids = { ownerId: "o", targetId: "m" };
assert.equal(canRemove({ ...ids, callerId: "o" }), true, "owner removes member");
assert.equal(canRemove({ ...ids, callerId: "m" }), true, "member leaves");
assert.equal(canRemove({ ...ids, callerId: "x" }), false, "other member cannot remove");
assert.equal(canRemove({ ownerId: "o", targetId: "o", callerId: "o" }), false, "owner cannot be removed");
console.log("team: ok");
