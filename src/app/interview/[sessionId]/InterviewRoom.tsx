"use client";

/**
 * InterviewRoom — Immersive AI Interview Audio Room
 *
 * Design: 3D-inspired audio room with a central AI orb, animated rings,
 * glassmorphism panels, and Framer Motion animations.
 *
 * Architecture:
 *  - Fetches ephemeral token → WebSocket to Gemini 3.1 Flash Live Preview
 *  - Text & voice input, audio playback, transcription, barge-in
 *  - All AI logic in hooks/refs, UI is purely presentational
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Send,
  StopCircle,
  ChevronLeft,
  Loader2,
  Volume2,
  VolumeX,
  MessageSquare,
  X,
} from "lucide-react";

/* ────────────────────────────── Types ────────────────────────────── */

interface Message {
  id: string;
  role: "interviewer" | "user";
  content: string;
  created_at: string;
}

interface SessionData {
  id: string;
  status: string;
  interviewer_id: string;
  topic_id: string;
  interviewers: {
    name: string;
    title: string;
    personality: string | null;
    specialties: string[];
  } | null;
  interview_topics: { name: string; category: string } | null;
}

interface Props {
  user: User;
  session: SessionData;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
type AIState = "idle" | "listening" | "thinking" | "speaking";

/* ─────────────────────── Audio playback helper ───────────────────── */

class AudioPlayer {
  private ctx: AudioContext | null = null;
  private queue: AudioBuffer[] = [];
  private playing = false;
  private currentSource: AudioBufferSourceNode | null = null;
  muted = false;
  onStateChange: ((playing: boolean) => void) | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext({ sampleRate: 24000 });
    }
    return this.ctx;
  }

  enqueue(pcmBase64: string) {
    const ctx = this.getContext();
    const raw = atob(pcmBase64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const samples = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) float32[i] = samples[i] / 32768;
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    this.queue.push(buffer);
    if (!this.playing) this.playNext();
  }

  private playNext() {
    const ctx = this.getContext();
    if (this.queue.length === 0 || this.muted) {
      this.playing = false;
      this.onStateChange?.(false);
      return;
    }
    this.playing = true;
    this.onStateChange?.(true);
    const buffer = this.queue.shift()!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };
    this.currentSource = source;
    source.start();
  }

  stop() {
    this.queue = [];
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* */ }
      this.currentSource = null;
    }
    this.playing = false;
    this.onStateChange?.(false);
  }

  async close() {
    this.stop();
    if (this.ctx && this.ctx.state !== "closed") await this.ctx.close();
  }
}

/* ─────────────────── Mic capture → PCM 16kHz mono ────────────────── */

async function startMicCapture(
  onAudioChunk: (base64pcm: string) => void
): Promise<{ stop: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = (e) => {
    const float32 = e.inputBuffer.getChannelData(0);
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    onAudioChunk(btoa(binary));
  };
  source.connect(processor);
  processor.connect(audioCtx.destination);
  return {
    stop: () => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      audioCtx.close();
    },
  };
}

/* ═══════════════════════════ AI Orb Component ═══════════════════════ */

function AIOrb({ state, name }: { state: AIState; name: string }) {
  const ringVariants = {
    idle: { scale: 1, opacity: 0.15 },
    listening: { scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] },
    thinking: { scale: [1, 1.08, 1], opacity: [0.15, 0.3, 0.15] },
    speaking: { scale: [1, 1.25, 1.1, 1.3, 1], opacity: [0.2, 0.5, 0.3, 0.6, 0.2] },
  };

  const coreVariants = {
    idle: { scale: 1 },
    listening: { scale: [1, 1.05, 1] },
    thinking: { scale: [1, 0.95, 1.02, 0.98, 1], rotate: [0, 5, -5, 3, 0] },
    speaking: { scale: [1, 1.08, 0.98, 1.05, 1] },
  };

  const glowColor = {
    idle: "rgba(99, 102, 241, 0.3)",
    listening: "rgba(239, 68, 68, 0.5)",
    thinking: "rgba(168, 85, 247, 0.4)",
    speaking: "rgba(99, 102, 241, 0.6)",
  };

  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="relative flex items-center justify-center" style={{ perspective: "800px" }}>
      {/* Outer glow pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 320, height: 320, background: `radial-gradient(circle, ${glowColor[state]} 0%, transparent 70%)` }}
        animate={{ scale: state === "idle" ? 1 : [1, 1.3, 1], opacity: state === "idle" ? 0.3 : [0.3, 0.6, 0.3] }}
        transition={{ duration: state === "speaking" ? 0.8 : 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ring 3 — outermost */}
      <motion.div
        className="absolute rounded-full border border-indigo-500/20"
        style={{ width: 260, height: 260, rotateX: "60deg", transformStyle: "preserve-3d" }}
        animate={ringVariants[state]}
        transition={{ duration: state === "speaking" ? 0.6 : 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ring 2 */}
      <motion.div
        className="absolute rounded-full border-2 border-violet-500/25"
        style={{ width: 220, height: 220, rotateX: "45deg", rotateZ: "45deg", transformStyle: "preserve-3d" }}
        animate={{
          ...ringVariants[state],
          rotateZ: state === "idle" ? [45, 405] : [45, 225, 405],
        }}
        transition={{ duration: state === "speaking" ? 1.5 : 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Ring 1 — inner orbit */}
      <motion.div
        className="absolute rounded-full border-2 border-indigo-400/30"
        style={{ width: 180, height: 180, rotateX: "70deg", rotateZ: "-30deg", transformStyle: "preserve-3d" }}
        animate={{
          ...ringVariants[state],
          rotateZ: state === "idle" ? [-30, -390] : [-30, -210, -390],
        }}
        transition={{ duration: state === "speaking" ? 2 : 6, repeat: Infinity, ease: "linear" }}
      />

      {/* Orbiting particle dots */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-indigo-400"
          style={{ transformStyle: "preserve-3d" }}
          animate={{
            x: [
              Math.cos((i * Math.PI) / 3) * 100,
              Math.cos((i * Math.PI) / 3 + Math.PI) * 100,
              Math.cos((i * Math.PI) / 3 + Math.PI * 2) * 100,
            ],
            y: [
              Math.sin((i * Math.PI) / 3) * 100 * 0.4,
              Math.sin((i * Math.PI) / 3 + Math.PI) * 100 * 0.4,
              Math.sin((i * Math.PI) / 3 + Math.PI * 2) * 100 * 0.4,
            ],
            opacity: state === "idle" ? [0.2, 0.5, 0.2] : [0.4, 1, 0.4],
            scale: state === "speaking" ? [1, 2, 1] : [1, 1.3, 1],
          }}
          transition={{
            duration: state === "speaking" ? 2 : 4,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Core orb — the AI "face" */}
      <motion.div
        className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: 130,
          height: 130,
          background: "radial-gradient(circle at 35% 35%, #818cf8, #6366f1 40%, #4338ca 70%, #312e81 100%)",
          boxShadow: `0 0 60px ${glowColor[state]}, inset 0 -8px 20px rgba(0,0,0,0.3), inset 0 4px 12px rgba(255,255,255,0.1)`,
          transformStyle: "preserve-3d",
        }}
        animate={coreVariants[state]}
        transition={{ duration: state === "speaking" ? 0.5 : 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Specular highlight — glass-like */}
        <div
          className="absolute rounded-full"
          style={{
            width: 80,
            height: 40,
            top: 15,
            left: 18,
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, transparent 70%)",
          }}
        />
        {/* Initials */}
        <span className="text-3xl font-bold text-white/90 drop-shadow-lg select-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          {initials}
        </span>
      </motion.div>

      {/* State label */}
      <motion.div
        className="absolute -bottom-12 flex items-center gap-2"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        key={state}
      >
        {state === "listening" && (
          <>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-300">Listening...</span>
          </>
        )}
        {state === "thinking" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
            <span className="text-xs font-medium text-violet-300">Thinking...</span>
          </>
        )}
        {state === "speaking" && (
          <>
            <Volume2 className="h-3 w-3 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300">Speaking...</span>
          </>
        )}
        {state === "idle" && (
          <span className="text-xs font-medium text-slate-500">Ready</span>
        )}
      </motion.div>
    </div>
  );
}

/* ═══════════════════ Voice Visualizer Bars ═══════════════════════════ */

function VoiceVisualizer({ active, color = "indigo" }: { active: boolean; color?: string }) {
  const barCount = 24;
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-400",
    red: "bg-red-400",
    violet: "bg-violet-400",
  };
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${active ? colorMap[color] : "bg-slate-700"}`}
          animate={active ? {
            height: [4, Math.random() * 28 + 4, 4],
            opacity: [0.4, 1, 0.4],
          } : { height: 4, opacity: 0.2 }}
          transition={{
            duration: active ? 0.4 + Math.random() * 0.3 : 0.5,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.02,
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════ Main Component ═══════════════════════════ */

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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [muted, setMuted] = useState(false);
  const [aiState, setAIState] = useState<AIState>("idle");
  const [chatOpen, setChatOpen] = useState(false);

  const sessionRef = useRef<import("@google/genai").Session | null>(null);
  const playerRef = useRef<AudioPlayer>(new AudioPlayer());
  const micRef = useRef<{ stop: () => void } | null>(null);
  const pendingTextRef = useRef<string>("");
  const startTimeRef = useRef<number>(Date.now());

  const interviewer = session.interviewers;
  const topic = session.interview_topics;

  // Track audio playback state for AI orb
  useEffect(() => {
    playerRef.current.onStateChange = (playing) => {
      setAIState((prev) => {
        if (playing) return "speaking";
        if (prev === "speaking") return "idle";
        return prev;
      });
    };
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  // System instruction for interviewer persona
  const systemInstruction = useCallback(() => {
    const personality = interviewer?.personality ?? "professional and friendly";
    const specialties = interviewer?.specialties?.join(", ") ?? "general topics";
    return `You are ${interviewer?.name ?? "an AI interviewer"}, ${interviewer?.title ?? "a professional interviewer"}. Your personality is: ${personality}. Your specialties include: ${specialties}.

You are conducting a mock interview on the topic: "${topic?.name ?? "general"}".
Category: ${topic?.category ?? "General"}.

Guidelines:
- Ask one question at a time and wait for the candidate's response.
- Start with easier questions and gradually increase difficulty.
- Provide brief encouraging feedback before asking the next question.
- If the candidate's answer is vague, ask follow-up questions for clarity.
- Keep your responses conversational and concise (2-3 sentences max per turn).
- After 8-10 questions, wrap up the interview naturally.
- Do NOT break character. You are the interviewer, not an AI assistant.

Begin by greeting the candidate and asking them to introduce themselves.`;
  }, [interviewer, topic]);

  // ── Connect to Gemini Live on mount ──
  useEffect(() => {
    if (ended) return;
    let cancelled = false;

    async function connect() {
      try {
        setConnectionStatus("connecting");

        // 1. Fetch ephemeral token
        console.log("[Gemini] Fetching ephemeral token...");
        const tokenRes = await fetch("/api/interview/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.id }),
        });

        if (!tokenRes.ok) {
          const errorBody = await tokenRes.text();
          console.error("[Gemini] Token fetch failed:", tokenRes.status, errorBody);
          throw new Error(`Token fetch failed: ${tokenRes.status}`);
        }

        const { token } = await tokenRes.json();
        console.log("[Gemini] Token received:", token ? `${token.slice(0, 30)}...` : "EMPTY");
        if (!token) throw new Error("Empty token received");
        if (cancelled) return;

        // 2. Create Gemini client with v1alpha for ephemeral tokens
        const { GoogleGenAI, Modality } = await import("@google/genai");

        const modelName = process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";
        console.log("[Gemini] Connecting to model:", modelName);

        const ai = new GoogleGenAI({
          apiKey: token,
          httpOptions: { apiVersion: "v1alpha" },
        });

        // 3. Connect to Gemini Live
        const liveSession = await ai.live.connect({
          model: modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: systemInstruction(),
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              console.log("[Gemini] WebSocket OPEN");
              if (!cancelled) setConnectionStatus("connected");
            },
            onmessage: (msg: import("@google/genai").LiveServerMessage) => {
              console.log("[Gemini] Message received:", JSON.stringify(msg).slice(0, 200));
              if (!cancelled) handleServerMessage(msg);
            },
            onerror: (e: ErrorEvent) => {
              console.error("[Gemini] WebSocket ERROR:", e);
              console.error("[Gemini] Error details — message:", e.message, "type:", e.type);
              if (!cancelled) setConnectionStatus("error");
            },
            onclose: (e: CloseEvent) => {
              console.log("[Gemini] WebSocket CLOSED — code:", e.code, "reason:", e.reason, "wasClean:", e.wasClean);
              if (!cancelled) setConnectionStatus("disconnected");
            },
          },
        });

        console.log("[Gemini] Session established, sending opening prompt...");
        if (cancelled) { liveSession.close(); return; }
        sessionRef.current = liveSession;

        // 4. Send opening prompt via sendRealtimeInput (Gemini 3.1 only supports
        // sendClientContent for initial history seeding, not mid-conversation)
        liveSession.sendRealtimeInput({
          text: "The interview is starting now. Please greet me and ask me to introduce myself.",
        });
        setAIState("thinking");
        console.log("[Gemini] Opening prompt sent via sendRealtimeInput");

      } catch (err) {
        console.error("[Gemini] Connection failed:", err);
        if (!cancelled) setConnectionStatus("error");
      }
    }

    connect();
    return () => {
      cancelled = true;
      sessionRef.current?.close();
      sessionRef.current = null;
      playerRef.current.close();
    };
  }, [ended]);

  // ── Handle incoming Gemini messages ──
  function handleServerMessage(message: import("@google/genai").LiveServerMessage) {
    const sc = message.serverContent;
    if (!sc) return;

    if (sc.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          playerRef.current.enqueue(part.inlineData.data);
        }
      }
    }

    if (sc.outputTranscription?.text) {
      pendingTextRef.current += sc.outputTranscription.text;
    }

    if (sc.turnComplete) {
      const text = pendingTextRef.current.trim();
      if (text) {
        const aiMsg: Message = { id: `ai-${Date.now()}`, role: "interviewer", content: text, created_at: new Date().toISOString() };
        setMessages((m) => [...m, aiMsg]);
        saveMessage("interviewer", text);
        pendingTextRef.current = "";
      }
      setLoading(false);
      // aiState will be set to "idle" by AudioPlayer.onStateChange when audio finishes
    }

    if (sc.interrupted) {
      playerRef.current.stop();
      const text = pendingTextRef.current.trim();
      if (text) {
        const aiMsg: Message = { id: `ai-${Date.now()}`, role: "interviewer", content: text, created_at: new Date().toISOString() };
        setMessages((m) => [...m, aiMsg]);
        saveMessage("interviewer", text);
        pendingTextRef.current = "";
      }
      setLoading(false);
      setAIState("idle");
    }

    if (sc.inputTranscription?.text) {
      const transcribed = sc.inputTranscription.text.trim();
      if (transcribed) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "user" && last.id.startsWith("mic-")) {
            return [...prev.slice(0, -1), { ...last, content: last.content + " " + transcribed }];
          }
          return [...prev, { id: `mic-${Date.now()}`, role: "user", content: transcribed, created_at: new Date().toISOString() }];
        });
      }
    }
  }

  // ── Load existing messages ──
  useEffect(() => {
    (supabase as ReturnType<typeof createClient>)
      .from("session_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("sequence_no")
      .then(({ data }: { data: Message[] | null }) => {
        if (data && data.length > 0) { setMessages(data); setSequenceNo(data.length); }
      });
  }, []);

  async function saveMessage(role: "interviewer" | "user", content: string) {
    const seq = sequenceNo;
    setSequenceNo((n) => n + 1);
    await (supabase as ReturnType<typeof createClient>).from("session_messages").insert({
      session_id: session.id, user_id: user.id, role, content, sequence_no: seq,
    } as Record<string, unknown>);
  }

  // ── Send text ──
  async function handleSend() {
    const text = input.trim();
    if (!text || loading || ended || !sessionRef.current) return;
    setMessages((m) => [...m, { id: `user-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() }]);
    setInput("");
    setLoading(true);
    setAIState("thinking");
    await saveMessage("user", text);
    playerRef.current.stop();
    // Gemini 3.1: must use sendRealtimeInput for text (sendClientContent is initial-history only)
    sessionRef.current.sendRealtimeInput({ text });
  }

  // ── Toggle mic ──
  async function toggleMic() {
    if (!sessionRef.current || ended) return;
    if (recording) {
      micRef.current?.stop();
      micRef.current = null;
      setRecording(false);
      setAIState("thinking");
      // Save accumulated mic transcript
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "user" && last.id.startsWith("mic-")) {
          saveMessage("user", last.content);
        }
        return prev;
      });
    } else {
      try {
        setRecording(true);
        setAIState("listening");
        setLoading(true);
        playerRef.current.stop();
        const mic = await startMicCapture((base64pcm) => {
          sessionRef.current?.sendRealtimeInput({
            audio: { data: base64pcm, mimeType: "audio/pcm;rate=16000" },
          });
        });
        micRef.current = mic;
      } catch (err) {
        console.error("Mic access denied:", err);
        setRecording(false);
        setAIState("idle");
        setLoading(false);
      }
    }
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      playerRef.current.muted = next;
      if (next) playerRef.current.stop();
      return next;
    });
  }

  // ── End session ──
  async function handleEndSession() {
    setEnding(true);
    micRef.current?.stop(); micRef.current = null; setRecording(false);
    sessionRef.current?.close(); sessionRef.current = null;
    playerRef.current.stop();
    setConnectionStatus("disconnected");
    setAIState("idle");

    const durationSecs = Math.round((Date.now() - startTimeRef.current) / 1000);
    try {
      await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, durationSecs }),
      });
    } catch (err) {
      console.error("Failed to trigger analysis:", err);
    }
    setEnded(true);
    setEnding(false);
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  /* ═══════════════════════════ Render ═══════════════════════════════ */

  const lastAiMessage = [...messages].reverse().find((m) => m.role === "interviewer");

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#060912] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/[0.07] blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/[0.05] blur-[100px]" />
        <div className="absolute left-1/4 bottom-1/3 h-[300px] w-[300px] rounded-full bg-blue-600/[0.04] blur-[80px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ─── Header ─── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-20 flex items-center justify-between border-b border-white/5 px-5 py-3 backdrop-blur-xl bg-[#060912]/60"
      >
        <div className="flex items-center gap-4">
          <a href="/home" className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" /> Back
          </a>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <p className="text-sm font-bold leading-tight">{interviewer?.name}</p>
            <p className="text-xs text-slate-500">{topic?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            connectionStatus === "connected" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" :
            connectionStatus === "connecting" ? "text-amber-400 border-amber-500/20 bg-amber-500/10" :
            "text-red-400 border-red-500/20 bg-red-500/10"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              connectionStatus === "connected" ? "bg-emerald-400" :
              connectionStatus === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-400"
            }`} />
            {connectionStatus === "connected" ? "Live" : connectionStatus === "connecting" ? "Connecting" : "Offline"}
          </span>

          <button onClick={toggleMute} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
            muted ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
          }`}>
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Chat toggle */}
          <button onClick={() => setChatOpen(!chatOpen)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
            chatOpen ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
          }`}>
            <MessageSquare className="h-3.5 w-3.5" />
            {messages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold">
                {messages.length}
              </span>
            )}
          </button>

          {!ended && (
            <button
              onClick={handleEndSession}
              disabled={ending}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-60"
            >
              {ending ? <Loader2 className="h-3 w-3 animate-spin" /> : <StopCircle className="h-3 w-3" />}
              End
            </button>
          )}
        </div>
      </motion.header>

      {/* ─── Main Stage ─── */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        {/* Central AI Orb */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <AIOrb state={aiState} name={interviewer?.name ?? "AI"} />

          {/* Voice visualizer */}
          <motion.div
            className="mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <VoiceVisualizer active={aiState === "speaking" || recording} color={recording ? "red" : "indigo"} />
          </motion.div>

          {/* Last AI message subtitle */}
          <AnimatePresence mode="wait">
            {lastAiMessage && !chatOpen && (
              <motion.div
                key={lastAiMessage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-6 max-w-lg px-4 text-center"
              >
                <p className="text-sm leading-relaxed text-slate-300/80">
                  {lastAiMessage.content.length > 200
                    ? lastAiMessage.content.slice(0, 200) + "..."
                    : lastAiMessage.content}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Session ended */}
          <AnimatePresence>
            {ended && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analysing your performance...
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ─── Chat Panel (slide-in) ─── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="absolute right-0 top-0 bottom-0 z-30 flex w-full max-w-md flex-col border-l border-white/5 bg-[#0a0e1a]/90 backdrop-blur-2xl"
            >
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <span className="text-sm font-semibold text-slate-300">Transcript</span>
                <button onClick={() => setChatOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                      msg.role === "interviewer"
                        ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                        : "bg-slate-700"
                    }`}>
                      {msg.role === "interviewer"
                        ? interviewer?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)
                        : "ME"}
                    </div>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      msg.role === "interviewer"
                        ? "rounded-tl-sm bg-white/[0.04] border border-white/5"
                        : "rounded-tr-sm bg-indigo-600/15 border border-indigo-500/15"
                    }`}>
                      <p className="text-xs leading-relaxed text-slate-300">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Chat input */}
              {!ended && (
                <div className="border-t border-white/5 px-3 py-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={connectionStatus === "connected" ? "Type a response..." : "Connecting..."}
                      disabled={connectionStatus !== "connected"}
                      rows={1}
                      className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-40"
                      style={{ maxHeight: "80px" }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || loading || connectionStatus !== "connected"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-30"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Bottom Controls ─── */}
      {!ended && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
          className="relative z-20 border-t border-white/5 bg-[#060912]/60 px-4 py-5 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-md items-center justify-center gap-5">
            {/* Mute */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                muted ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </motion.button>

            {/* Mic — the big center button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleMic}
              disabled={connectionStatus !== "connected"}
              className="relative"
            >
              {/* Pulse ring when recording */}
              {recording && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500/20"
                  animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                  style={{ width: 72, height: 72, left: -4, top: -4 }}
                />
              )}
              <div className={`flex h-16 w-16 items-center justify-center rounded-full transition-all shadow-xl ${
                recording
                  ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-600/30"
                  : connectionStatus === "connected"
                    ? "bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-600/30 hover:shadow-indigo-600/50"
                    : "bg-slate-800 opacity-50 cursor-not-allowed"
              }`}>
                {recording
                  ? <MicOff className="h-6 w-6 text-white" />
                  : <Mic className="h-6 w-6 text-white" />}
              </div>
            </motion.button>

            {/* Chat toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setChatOpen(!chatOpen)}
              className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                chatOpen ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              {messages.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold">
                  {messages.length}
                </span>
              )}
            </motion.button>
          </div>

          <p className="mt-3 text-center text-[10px] text-slate-700 tracking-wide uppercase">
            {recording ? "Tap mic to stop" : "Tap mic to speak or open chat to type"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
