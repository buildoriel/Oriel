import { requireUser, HttpError } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { ownProject } from "@/lib/projects";
import { runAgent, type AgentEvent } from "@/lib/agent/loop";
import { handle } from "@/lib/http";

export const maxDuration = 300; // seconds (needs a Vercel plan that supports it)
const RUNS_PER_HOUR = Number(process.env.AGENT_RUNS_PER_HOUR ?? 40);

// Server-Sent Events: agent progress is streamed straight to the workspace.
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownProject(user.id, id);
  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim() || message.length > 8000)
    throw new HttpError(400, "Message is empty or too long (max 8,000 characters).");

  // usage limits: max N requests per hour, and only one running build per user
  // (two parallel builds could both pass the balance check and then charge credits twice)
  const db = admin();
  const { count } = await db.from("agent_runs").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("started_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= RUNS_PER_HOUR) throw new HttpError(429, "Too many requests in the last hour. Try again shortly.");
  const { data: runId } = await db.rpc("begin_agent_run", { p_user: user.id, p_project: id });
  if (!runId) throw new HttpError(409, "A build is still running. Wait for it to finish.");

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch { /* the client closed the connection; the agent still finishes and saves its work */ } };
      let status = "done";
      try { await runAgent({ userId: user.id, projectId: id, message: message.trim(), emit }); }
      catch (e: any) {
        status = "error";
        emit({ type: "error", message: String(e?.message).includes("INSUFFICIENT_CREDITS")
          ? "Not enough credits for this request. Top up or upgrade your tier." : "The build failed. Try sending your message again." });
        console.error(e);
      } finally {
        await db.from("agent_runs").update({ finished_at: new Date().toISOString(), status }).eq("id", runId);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
});
