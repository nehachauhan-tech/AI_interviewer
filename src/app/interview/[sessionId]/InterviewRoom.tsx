"use client";

/**
 * InterviewRoom — live interview UI
 *
 * This component is the shell for the live Gemini Flash Lite Live interview.
 * Wire up the Gemini Live API calls here when you have the usage code.
 *
 * State management:
 *  - messages: the in-session conversation (also saved to session_messages table)
 *  - recording: whether mic is active
 *  - ended: whether session is done
 *
 * Backend calls to add:
 *  1. POST /api/interview/[sessionId]/message  — save each message turn
 *  2. POST /api/interview/[sessionId]/end      — mark session completed + trigger analysis
 */

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  BrainCircuit, Mic, MicOff, Send, StopCircle,
  ChevronLeft, Loader2, Volume2
} from "lucide-react";

interface Message {
  id: string;
  role: "interviewer" | "user";
  content: string;
  created_at: string;
}

interface SessionData {
  id: string;
  status: string;
  interviewers: { name: string; title: string; personality: string | null } | null;
  interview_topics: { name: string; category: string } | null;
}

interface Props {
  user: User;
  session: SessionData;
}

const AVATAR_COLOURS = [
  "from-indigo-500 to-violet-600",
  "from-red-500 to-orange-500",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-yellow-600",
];

export default function InterviewRoom({ user, session }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(session.status === "completed");
  const [sequenceNo, setSequenceNo] = useState(0);

  const interviewer = session.interviewers;
  const topic = session.interview_topics;
  const initials = interviewer?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "AI";

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing messages on mount
  useEffect(() => {
    supabase
      .from("session_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("sequence_no")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data as Message[]);
          setSequenceNo(data.length);
        } else {
          // Opening message from interviewer
          const openingMessage: Message = {
            id: "opening",
            role: "interviewer",
            content: `Hello! I'm ${interviewer?.name ?? "your AI interviewer"}, ${interviewer?.title ?? ""}. Today we'll be discussing ${topic?.name ?? "your interview topic"}. Let's get started — could you please introduce yourself?`,
            created_at: new Date().toISOString(),
          };
          setMessages([openingMessage]);
        }
      });
  }, []);

  async function saveMessage(role: "interviewer" | "user", content: string) {
    const seq = sequenceNo;
    setSequenceNo((n) => n + 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("session_messages").insert({
      session_id: session.id,
      user_id: user.id,
      role,
      content,
      sequence_no: seq,
    });
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || ended) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    await saveMessage("user", text);

    // ── TODO: call Gemini Flash Lite Live API here ───────────
    // const aiResponse = await callGeminiLive(text, session.id);
    // For now, a placeholder response:
    const aiResponse = "Thank you for that answer. That's a great point. Could you elaborate further on how you would handle scalability challenges in that approach?";

    const aiMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "interviewer",
      content: aiResponse,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, aiMsg]);
    await saveMessage("interviewer", aiResponse);
    setLoading(false);
  }

  async function handleEndSession() {
    setEnding(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("interview_sessions").update({
      status: "completed",
      ended_at: new Date().toISOString(),
    }).eq("id", session.id);

    // ── TODO: trigger Gemini 1.5 Pro analysis API route here ─

    setEnded(true);
    setEnding(false);

    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="flex h-screen flex-col bg-[#060912] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/5 bg-[#060912]/90 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <a href="/home" className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" /> Back
          </a>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">{interviewer?.name}</p>
              <p className="text-xs text-slate-500">{topic?.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!ended && (
            <button
              onClick={handleEndSession}
              disabled={ending}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-60"
            >
              {ending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
              End Session
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${
                msg.role === "interviewer"
                  ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                  : "bg-gradient-to-br from-slate-600 to-slate-700"
              }`}>
                {msg.role === "interviewer" ? initials : "ME"}
              </div>
              {/* Bubble */}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "interviewer"
                  ? "rounded-tl-sm bg-white/[0.05] border border-white/5"
                  : "rounded-tr-sm bg-indigo-600/20 border border-indigo-500/20"
              }`}>
                {msg.role === "interviewer" && (
                  <p className="mb-1 text-xs font-semibold text-indigo-300">{interviewer?.name}</p>
                )}
                <p className="text-sm leading-relaxed text-slate-200">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                {initials}
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/5 px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {ended && (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400">
                Session completed — redirecting to dashboard…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {!ended && (
        <div className="border-t border-white/5 bg-[#060912]/90 px-4 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-end gap-3">
            {/* Mic toggle — will connect to Gemini Live voice stream */}
            <button
              onClick={() => setRecording(!recording)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
                recording
                  ? "border-red-500/50 bg-red-500/20 text-red-400 animate-pulse"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
              aria-label={recording ? "Stop recording" : "Start voice input"}
            >
              {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                style={{ maxHeight: "150px" }}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-700">
            Session is recorded. Responses are saved and analysed after the interview ends.
          </p>
        </div>
      )}
    </div>
  );
}
