import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject } from "@/lib/projects";
import { runAgent, type AgentEvent } from "@/lib/agent/loop";
import { handle } from "@/lib/http";

export const maxDuration = 300; // detik (butuh plan Vercel yang mendukung)
const RUNS_PER_HOUR = Number(process.env.AGENT_RUNS_PER_HOUR ?? 40);

// Server-Sent Events: progres agent dikirim langsung ke workspace.
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownProject(user.id, id);
  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim() || message.length > 8000)
    throw new HttpError(400, "Pesan kosong atau terlalu panjang (maks 8.000 karakter).");

  // batas pemakaian: maks N permintaan per jam, dan hanya satu build berjalan per user
  // (dua build paralel bisa sama-sama lolos cek saldo lalu memotong kredit dua kali)
  const db = admin();
  const { count } = await db.from("agent_runs").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("started_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= RUNS_PER_HOUR) throw new HttpError(429, "Terlalu banyak permintaan dalam satu jam. Coba lagi sebentar.");
  const { data: runId } = await db.rpc("begin_agent_run", { p_user: user.id, p_project: id });
  if (!runId) throw new HttpError(409, "Masih ada build yang berjalan. Tunggu sampai selesai.");

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { /* klien menutup koneksi; agent tetap selesai dan menyimpan hasil */ } };
      let status = "done";
      try { await runAgent({ userId: user.id, projectId: id, message: message.trim(), emit }); }
      catch (e: any) {
        status = "error";
        emit({ type: "error", message: String(e?.message).includes("INSUFFICIENT_CREDITS")
          ? "Kredit tidak cukup untuk permintaan ini. Top-up atau naikkan tier." : "Build gagal. Coba kirim ulang pesanmu." });
        console.error(e);
      } finally {
        await db.from("agent_runs").update({ finished_at: new Date().toISOString(), status }).eq("id", runId);
        try { controller.close(); } catch { /* sudah tertutup */ }
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
});
