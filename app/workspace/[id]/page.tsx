import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Workspace from "./Workspace";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ prompt?: string }> }) {
  const { id } = await params; const { prompt } = await searchParams;
  const sb = await supabaseServer();
  const { data: project } = await sb.from("projects").select("id, name, slug, published_version").eq("id", id).maybeSingle();
  if (!project) redirect("/workspace");
  const { data: messages } = await sb.from("messages").select("id, role, content, credits, action_kind").eq("project_id", id).order("id").limit(100);
  return <Workspace project={project} initialMessages={messages ?? []} initialPrompt={prompt ?? ""} />;
}
