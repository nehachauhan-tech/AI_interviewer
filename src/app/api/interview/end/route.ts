/**
 * POST /api/interview/end
 *
 * Called when a session ends. It:
 *  1. Marks the session as completed in the DB
 *  2. Fetches all session messages as transcript
 *  3. Uploads the plain-text transcript to Supabase Storage
 *  4. Triggers Gemini 1.5 Pro analysis (plug in your usage code here)
 *  5. Saves the analysis result to session_analyses table
 */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, durationSecs } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Mark session completed
  const { error: sessionError } = await db
    .from("interview_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      duration_secs: durationSecs ?? null,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (sessionError) {
    return NextResponse.json({ error: (sessionError as { message: string }).message }, { status: 500 });
  }

  // 2. Fetch all messages for the transcript
  const { data: messages } = await db
    .from("session_messages")
    .select("role, content, sequence_no")
    .eq("session_id", sessionId)
    .order("sequence_no");

  if (!messages || (messages as unknown[]).length === 0) {
    return NextResponse.json({ success: true, analysisTriggered: false });
  }

  // 3. Build plain text transcript
  const transcript = (messages as { role: string; content: string }[])
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n\n");

  // 4. Upload transcript to Storage
  const transcriptPath = `${user.id}/${sessionId}/transcript.txt`;
  await supabase.storage
    .from("interview-transcripts")
    .upload(transcriptPath, new Blob([transcript], { type: "text/plain" }), { upsert: true });

  await db
    .from("interview_sessions")
    .update({ transcript_file_path: transcriptPath })
    .eq("id", sessionId);

  // 5. ── TODO: Plug in Gemini 1.5 Pro analysis here ───────────────
  //
  // const { GoogleGenerativeAI } = await import("@google/generative-ai");
  // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  // const model = genAI.getGenerativeModel({ model: process.env.GEMINI_ANALYSIS_MODEL! });
  //
  // const analysisPrompt = `You are an expert interview coach. Analyse this interview transcript
  // and return a JSON object with keys: overall_score, technical_score, communication_score,
  // confidence_score, problem_solving_score, summary, strengths (array), areas_to_improve (array),
  // action_items (array), keywords_mentioned (array), keywords_missed (array),
  // sentiment ("positive"|"neutral"|"negative"), engagement_level ("high"|"medium"|"low"),
  // filler_word_count (number).
  //
  // Transcript:\n\n${transcript}`;
  //
  // const result = await model.generateContent(analysisPrompt);
  // const analysisJson = JSON.parse(result.response.text());
  //
  // await supabase.from("session_analyses").insert({
  //   session_id: sessionId,
  //   user_id: user.id,
  //   gemini_model_used: process.env.GEMINI_ANALYSIS_MODEL,
  //   ...analysisJson,
  // });
  // ────────────────────────────────────────────────────────────────

  return NextResponse.json({ success: true, analysisTriggered: false, transcriptPath });
}
