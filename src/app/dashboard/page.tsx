import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [
    { data: profile },
    { data: stats },
    { data: recentSessions },
    { data: analyses },
    { data: interviewers },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_dashboard_stats").select("*").eq("user_id", user.id).single(),
    supabase
      .from("interview_sessions")
      .select("*, interviewers(name, title, avatar_url), interview_topics(name, category)")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("session_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("interviewers").select("id, name, avatar_url"),
  ]);

  const interviewerMap: Record<string, string> = {};
  interviewers?.forEach((i) => {
    if (i.avatar_url) interviewerMap[i.name] = i.avatar_url;
  });

  return (
    <DashboardClient
      user={user}
      profile={profile}
      stats={stats}
      recentSessions={recentSessions ?? []}
      analyses={analyses ?? []}
      interviewerAvatars={interviewerMap}
    />
  );
}
