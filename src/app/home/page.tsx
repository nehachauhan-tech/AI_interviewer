import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const [{ data: profile }, { data: interviewers }, { data: topics }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("interviewers").select("*").order("name"),
    supabase.from("interview_topics").select("*").order("category").order("name"),
  ]);

  return (
    <HomeClient
      user={user}
      profile={profile}
      interviewers={interviewers ?? []}
      topics={topics ?? []}
    />
  );
}
