"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Modal } from "./ui";

type Member = { user_id: string; handle: string | null; email: string | null; role: string; created_at: string; you: boolean };
type Team = { isOwner: boolean; canInvite: boolean; tier: string; members: Member[] };

const label = (m: Member) => (m.handle ? `@${m.handle}` : m.email ?? "Oriel user");

/** Project team: list members, invite by email, @handle or wallet (Studio owners), remove members or leave. */
export function ShareDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const load = () => fetch(`/api/projects/${projectId}/members`).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Could not load the team.");
    setTeam(j);
  }).catch((e) => setErr(e.message));
  useEffect(() => { if (open) { setErr(""); setNote(""); load(); } }, [open, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true); setErr(""); setNote("");
    const r = await fetch(`/api/projects/${projectId}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Could not invite that person.");
    setNote(`Added ${email.trim()}. They'll see the project in their sidebar.`); setEmail(""); load();
  }

  async function remove(m: Member) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/projects/${projectId}/members?userId=${encodeURIComponent(m.user_id)}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Could not remove that person.");
    if (m.you) { location.href = "/workspace"; return; }
    load();
  }

  return (
    <Modal open={open} onClose={onClose} title="Share project"
      footer={<button type="button" className="btn btn-ghost" onClick={onClose}>Done</button>}>
      <p>Members can chat, preview and publish. They use their own credits.</p>

      {team?.isOwner && (team.canInvite ? (
        <form onSubmit={invite} className="row" style={{ gap: 8 }}>
          <div className="input-group grow">
            <input className="input" type="text" required placeholder="Email, @handle, or wallet address" aria-label="Email, handle, or wallet address" autoCapitalize="off" spellCheck={false}
              value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>{busy ? <span className="spinner" /> : null}Invite</button>
        </form>
      ) : (
        <div className="callout callout-accent">
          <Icon name="user" />
          <span className="callout-body">Team projects are part of the Studio plan. <Link href="/tiers">Upgrade to invite people</Link>.</span>
        </div>
      ))}
      {err && <div className="callout callout-bad" role="alert"><Icon name="alert" /><span className="callout-body">{err}</span></div>}
      {note && <div className="callout callout-ok" role="status"><Icon name="check" /><span className="callout-body">{note}</span></div>}

      <div className="divide" aria-label="Members">
        {!team && !err && <div className="skel" style={{ height: 48 }} />}
        {team?.members.map((m) => (
          <div key={m.user_id} className="list-row" style={{ padding: "10px 0" }}>
            <span className="row" style={{ gap: 10, minWidth: 0 }}>
              <span className="avatar">{label(m).replace("@", "").charAt(0)}</span>
              <span style={{ minWidth: 0 }}>
                <span className="truncate" style={{ display: "block", color: "var(--ink)" }}>{label(m)}{m.you ? " (you)" : ""}</span>
                {m.handle && m.email && <span className="xs faint truncate" style={{ display: "block" }}>{m.email}</span>}
              </span>
            </span>
            {m.role === "owner" ? <span className="badge">Owner</span>
              : team.isOwner ? <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => remove(m)}>Remove</button>
              : m.you ? <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => remove(m)}>Leave project</button>
              : <span className="badge">Editor</span>}
          </div>
        ))}
      </div>
    </Modal>
  );
}
