/**
 * POST /api/interview/end
 *
 * Called when a session ends. It:
 *  1. Marks the session as completed in the DB
 *  2. Fetches all session messages as transcript
 *  3. Uploads the plain-text transcript to Supabase Storage
 *  4. Runs Gemini 3.1 Pro analysis on the transcript
 *  5. Saves the analysis result to session_analyses table
 */
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, durationSecs } = body;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: (sessionError as { message: string }).message },
      { status: 500 }
    );
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
    .upload(
      transcriptPath,
      new Blob([transcript], { type: "text/plain" }),
      { upsert: true }
    );

  await db
    .from("interview_sessions")
    .update({ transcript_file_path: transcriptPath })
    .eq("id", sessionId);

  // 5. Fetch resume analysis for richer scoring context
  const { data: profileData } = await db
    .from("profiles")
    .select("resume_analysis")
    .eq("id", user.id)
    .single();

  const resumeContext =
    profileData?.resume_analysis
      ? `\n\nCANDIDATE RESUME CONTEXT (use this to judge whether the candidate demonstrated knowledge consistent with their claimed experience):\n${JSON.stringify(profileData.resume_analysis, null, 2)}`
      : "";

  // 6. Run Gemini 3.1 Pro analysis
  let analysisTriggered = false;

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
    });

    const analysisModel =
      process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-3.1-pro-preview";

    const analysisPrompt = `You are an expert interview coach. Analyse the following interview transcript and return ONLY a valid JSON object (no markdown fences, no extra text) with these exact keys:${resumeContext}

{
  "overall_score": <number 0-100>,
  "technical_score": <number 0-100>,
  "communication_score": <number 0-100>,
  "confidence_score": <number 0-100>,
  "problem_solving_score": <number 0-100>,
  "leadership_score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areas_to_improve": ["<area 1>", "<area 2>", "<area 3>"],
  "action_items": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "detailed_feedback": "<paragraph with detailed coaching feedback>",
  "keywords_mentioned": ["<relevant keyword mentioned by candidate>"],
  "keywords_missed": ["<important keyword candidate should have mentioned>"],
  "sentiment": "<positive|neutral|negative>",
  "engagement_level": "<high|medium|low>",
  "filler_word_count": <estimated number of filler words like um, uh, like, you know>
}

Score rubric:
- 90-100: Exceptional — would pass top-tier interview
- 70-89: Strong — good performance with minor improvements needed
- 50-69: Average — meets baseline but needs work
- 30-49: Below average — significant gaps
- 0-29: Needs major improvement

Transcript:

${transcript}`;

    const result = await ai.models.generateContent({
      model: analysisModel,
      contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.text ?? "";

    // Parse the JSON response
    const analysisJson = JSON.parse(responseText);

    // Insert into session_analyses
    await db.from("session_analyses").insert({
      session_id: sessionId,
      user_id: user.id,
      gemini_model_used: analysisModel,
      overall_score: analysisJson.overall_score ?? null,
      technical_score: analysisJson.technical_score ?? null,
      communication_score: analysisJson.communication_score ?? null,
      confidence_score: analysisJson.confidence_score ?? null,
      problem_solving_score: analysisJson.problem_solving_score ?? null,
      leadership_score: analysisJson.leadership_score ?? null,
      summary: analysisJson.summary ?? null,
      strengths: analysisJson.strengths ?? null,
      areas_to_improve: analysisJson.areas_to_improve ?? null,
      action_items: analysisJson.action_items ?? null,
      detailed_feedback: analysisJson.detailed_feedback ?? null,
      keywords_mentioned: analysisJson.keywords_mentioned ?? null,
      keywords_missed: analysisJson.keywords_missed ?? null,
      sentiment: analysisJson.sentiment ?? null,
      engagement_level: analysisJson.engagement_level ?? null,
      filler_word_count: analysisJson.filler_word_count ?? null,
    });

    analysisTriggered = true;
  } catch (err) {
    console.error("Gemini analysis failed:", err);
    // Analysis failure should not block the session from completing
  }

  return NextResponse.json({
    success: true,
    analysisTriggered,
    transcriptPath,
  });
}
