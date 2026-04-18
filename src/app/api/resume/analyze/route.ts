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
  const { resumeUrl } = body;

  if (!resumeUrl) {
    return NextResponse.json(
      { error: "resumeUrl is required" },
      { status: 400 }
    );
  }

  // Download the resume PDF from Supabase storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(resumeUrl);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: "Failed to download resume" },
      { status: 500 }
    );
  }

  const pdfBytes = Buffer.from(await fileData.arrayBuffer());
  const pdfBase64 = pdfBytes.toString("base64");

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
    });

    const analysisModel =
      process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-3.1-pro-preview";

    const prompt = `You are an expert resume analyst. Analyze the following resume PDF and return ONLY a valid JSON object (no markdown fences, no extra text) with these exact keys:

{
  "name": "<candidate full name>",
  "email": "<email or null>",
  "phone": "<phone or null>",
  "summary": "<2-3 sentence professional summary of the candidate>",
  "skills": ["<skill 1>", "<skill 2>", ...],
  "experience": [
    {
      "title": "<job title>",
      "company": "<company name>",
      "duration": "<duration e.g. Jan 2022 - Present>",
      "highlights": ["<key achievement or responsibility>"]
    }
  ],
  "education": [
    {
      "degree": "<degree name>",
      "institution": "<institution name>",
      "year": "<graduation year or duration>"
    }
  ],
  "projects": [
    {
      "name": "<project name>",
      "description": "<brief description>",
      "technologies": ["<tech used>"]
    }
  ],
  "certifications": ["<certification 1>", ...],
  "strengths": ["<key strength based on resume>", ...],
  "areas_to_explore": ["<topic an interviewer should probe deeper on>", ...]
}

Be thorough — extract every skill, project, and experience entry. For areas_to_explore, identify gaps, vague claims, or interesting points an interviewer should ask about.`;

    const result = await ai.models.generateContent({
      model: analysisModel,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = result.text ?? "";
    const analysis = JSON.parse(responseText);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { error: updateError } = await db
      .from("profiles")
      .update({ resume_analysis: analysis })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, analysis });
  } catch (err) {
    console.error("Resume analysis failed:", err);
    return NextResponse.json(
      { error: "Resume analysis failed", details: String(err) },
      { status: 500 }
    );
  }
}
