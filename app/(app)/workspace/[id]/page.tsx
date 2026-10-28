import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Workspace from "./Workspace";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ prompt?: string }> }) {
  const { id } = await params; const { prompt } = await searchParams;
  const sb = await supabaseServer();
  const { data: project } = await sb.from("projects").select("id, name, slug, published_version, owner_id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!project) redirect("/workspace");
  const [{ data: messages }, { data: active }] = await Promise.all([
    sb.from("messages").select("id, role, content, credits, action_kind").eq("project_id", id).order("id").limit(100),
    // a build that is still queued or running (e.g. the tab was closed): the workspace picks up its progress
    sb.from("agent_runs").select("id").eq("project_id", id).is("finished_at", null).maybeSingle(),
  ]);
  return <Workspace project={project} initialMessages={messages ?? []} initialPrompt={prompt ?? ""} activeRunId={active?.id ?? null} />;
}
