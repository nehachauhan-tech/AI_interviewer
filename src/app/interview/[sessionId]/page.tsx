import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import InterviewRoom from "./InterviewRoom";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function InterviewPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("*, interviewers(*), interview_topics(*)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) notFound();

  return <InterviewRoom user={user} session={session} />;
}
