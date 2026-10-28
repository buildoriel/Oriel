import { requireUser } from "@/lib/supabase/server";
import { ownProject } from "@/lib/projects";
import { runAgent, type AgentEvent } from "@/lib/agent/loop";
import { handle } from "@/lib/http";

export const maxDuration = 300; // detik (butuh plan Vercel yang mendukung)

// Server-Sent Events: progres agent dikirim langsung ke workspace.
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownProject(user.id, id);
  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim() || message.length > 8000)
    return Response.json({ error: "Pesan kosong atau terlalu panjang (maks 8.000 karakter)." }, { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      try { await runAgent({ userId: user.id, projectId: id, message: message.trim(), emit }); }
      catch (e: any) {
        emit({ type: "error", message: String(e?.message).includes("INSUFFICIENT_CREDITS")
          ? "Kredit tidak cukup untuk permintaan ini. Top-up atau naikkan tier." : "Build gagal. Coba kirim ulang pesanmu." });
        console.error(e);
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
});
