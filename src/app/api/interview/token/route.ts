/**
 * POST /api/interview/token
 *
 * Generates a short-lived ephemeral token for the Gemini Live API.
 * The client uses this token to open a direct WebSocket to Gemini,
 * keeping the real API key server-side only.
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

  // Verify the session belongs to this user and is still in progress
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "in_progress") {
    return NextResponse.json(
      { error: "Session is not active" },
      { status: 400 }
    );
  }

  try {
    const client = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
    });

    console.log("[Token] Creating ephemeral token...");

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(
          Date.now() + 2 * 60 * 1000
        ).toISOString(),
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    console.log("[Token] Token created:", token.name ? `${token.name.slice(0, 30)}...` : "EMPTY");

    return NextResponse.json({ token: token.name });
  } catch (err) {
    console.error("[Token] Failed to create ephemeral token:", err);
    return NextResponse.json(
      { error: "Failed to create token", details: String(err) },
      { status: 500 }
    );
  }
}
