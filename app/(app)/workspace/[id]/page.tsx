import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Workspace from "./Workspace";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ prompt?: string }> }) {
  const { id } = await params; const { prompt } = await searchParams;
  const sb = await supabaseServer();
  const [{ data: project }, { data: auth }] = await Promise.all([
    sb.from("projects").select("id, name, slug, published_version, owner_id").eq("id", id).is("deleted_at", null).maybeSingle(),
    sb.auth.getUser(),
  ]);
  if (!project || !auth.user) redirect("/workspace");
  const [{ data: messages }, { data: active }] = await Promise.all([
    sb.from("messages").select("id, role, content, credits, action_kind, attachments").eq("project_id", id).order("id", { ascending: false }).limit(100),
    // a build that is still queued or running (e.g. the tab was closed): the workspace picks up its progress
    sb.from("agent_runs").select("id").eq("project_id", id).is("finished_at", null).order("id", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { owner_id, ...rest } = project;
  return <Workspace project={rest} role={owner_id === auth.user.id ? "owner" : "editor"} initialMessages={(messages ?? []).reverse() as any}
    initialPrompt={prompt ?? ""} activeRunId={active?.id ?? null} />;
}
