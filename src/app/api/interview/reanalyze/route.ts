/**
 * POST /api/interview/reanalyze
 *
 * Re-runs AI analysis on an existing session's transcript.
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
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Verify session belongs to user
  const { data: session, error: sessionError } = await db
    .from("interview_sessions")
    .select("id, user_id, transcript_file_path")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  // Fetch messages to build transcript
  const { data: messages } = await db
    .from("session_messages")
    .select("role, content, sequence_no")
    .eq("session_id", sessionId)
    .order("sequence_no");

  if (!messages || (messages as unknown[]).length === 0) {
    return NextResponse.json(
      { error: "No messages found for this session" },
      { status: 400 }
    );
  }

  // Build transcript
  const transcript = (messages as { role: string; content: string }[])
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n\n");

  // Fetch resume analysis for context
  const { data: profileData } = await db
    .from("profiles")
    .select("resume_analysis")
    .eq("id", user.id)
    .single();

  const resumeContext =
    profileData?.resume_analysis
      ? `\n\nCANDIDATE RESUME CONTEXT (use this to judge whether the candidate demonstrated knowledge consistent with their claimed experience):\n${JSON.stringify(profileData.resume_analysis, null, 2)}`
      : "";

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
    const analysisJson = JSON.parse(responseText);

    // Delete old analysis for this session
    await db
      .from("session_analyses")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    // Insert new analysis
    const { data: newAnalysis, error: insertError } = await db
      .from("session_analyses")
      .insert({
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
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: newAnalysis,
    });
  } catch (err) {
    console.error("Gemini analysis failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
