"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, Home, User as UserIcon,
  TrendingDown, TrendingUp, CheckCircle2,
  Clock, MessageSquare, HelpCircle, ChevronRight,
  Monitor, MessagesSquare, Shield, Puzzle,
  X, ChevronDown, ChevronUp, BarChart2,
  Zap, Target, Award, BookOpen, ArrowLeft,
  Calendar, Timer, Star, AlertCircle,
  Play, RotateCcw, Eye, Bot, Mic
} from "lucide-react";

type Profile  = Database["public"]["Tables"]["profiles"]["Row"];
type Stats    = Database["public"]["Views"]["user_dashboard_stats"]["Row"];
type Analysis = Database["public"]["Tables"]["session_analyses"]["Row"];
type Message  = Database["public"]["Tables"]["session_messages"]["Row"];

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  duration_secs: number | null;
  interviewers: { name: string; title: string; avatar_url: string | null } | null;
  interview_topics: { name: string; category: string } | null;
}

interface Props {
  user: User;
  profile: Profile | null;
  stats: Stats | null;
  recentSessions: SessionRow[];
  analyses: Analysis[];
  interviewerAvatars: Record<string, string>;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getScoreDiff(analyses: Analysis[]): number | null {
  if (analyses.length < 2) return null;
  const latest = analyses[0]?.overall_score;
  const prev = analyses[1]?.overall_score;
  if (latest == null || prev == null) return null;
  return latest - prev;
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return "#64748b";
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number | null | undefined) {
  if (score == null) return "N/A";
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Average";
  return "Needs Work";
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Technical: Monitor,
  HR: MessagesSquare,
  Leadership: Shield,
  General: Puzzle,
};

const CATEGORY_COLORS: Record<string, string> = {
  Technical: "#6366f1",
  HR: "#22c55e",
  Leadership: "#f59e0b",
  General: "#ec4899",
};

/* ─── Animated Performance Bar ─────────────────────────── */

function AnimatedBar({ label, value, colour, icon: Icon, delay = 0 }: {
  label: string; value: number | null; colour: string; icon: React.ElementType; delay?: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const val = value ?? 0;

  return (
    <div ref={barRef} className="group flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: `${colour}20` }}>
        <Icon className="h-4 w-4" style={{ color: colour }} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1.5">
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
          <span className="text-sm font-bold" style={{ color: colour }}>{val}</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all ease-out"
            style={{
              width: visible ? `${val}%` : "0%",
              background: `linear-gradient(90deg, ${colour}80, ${colour})`,
              transitionDuration: "1.4s",
              transitionDelay: `${delay}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Mini Score Ring ─────────────────────────────────────── */

function ScoreRing({ score, size = 52 }: { score: number | null | undefined; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const val = score ?? 0;
  const fill = (val / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90 absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
      </svg>
      <span className="relative text-xs font-black" style={{ color }}>{score ?? "—"}</span>
    </div>
  );
}

/* ─── Stat Pill ───────────────────────────────────────────── */

function StatPill({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3 hover:border-white/10 hover:bg-white/[0.04] transition-all">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: `${color}20` }}>
        <Icon className="h-4.5 w-4.5" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-slate-500 leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

/* ─── Session Detail Panel ───────────────────────────────── */

interface SessionDetailProps {
  session: SessionRow;
  analysis: Analysis | null;
  messages: Message[];
  onClose: () => void;
  interviewerAvatars: Record<string, string>;
}

function SessionDetailPanel({ session, analysis, messages, onClose, interviewerAvatars }: SessionDetailProps) {
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent scroll on body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const avatarPath = session.interviewers?.name ? interviewerAvatars[session.interviewers.name] : null;
  const CategoryIcon = CATEGORY_ICONS[session.interview_topics?.category ?? ""] ?? Puzzle;
  const catColor = CATEGORY_COLORS[session.interview_topics?.category ?? ""] ?? "#6366f1";

  // Separate interviewer questions from user answers
  const conversation = messages.filter(m => m.role !== "system").sort((a, b) => a.sequence_no - b.sequence_no);
  const interviewerTurns = conversation.filter(m => m.role === "interviewer");
  const userTurns = conversation.filter(m => m.role === "user");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl flex flex-col bg-[#0d1117] border-l border-white/8 shadow-2xl"
        style={{ animation: "slideInRight 0.3s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5 bg-white/[0.02] shrink-0">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/8 hover:text-white transition-all"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">
              {session.interview_topics?.name ?? "Interview Session"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatFullDate(session.started_at)} · {formatTime(session.started_at)}
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
            session.status === "completed"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
              : session.status === "in_progress"
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
              : "bg-slate-500/15 text-slate-400 border border-slate-500/20"
          }`}>
            {session.status.replace("_", " ")}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Session meta row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <Timer className="h-4 w-4 mx-auto mb-1.5 text-indigo-400" />
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-sm font-bold text-white">{formatDuration(session.duration_secs)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <MessageSquare className="h-4 w-4 mx-auto mb-1.5 text-violet-400" />
              <p className="text-xs text-slate-500">Exchanges</p>
              <p className="text-sm font-bold text-white">{interviewerTurns.length || "—"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <CategoryIcon className="h-4 w-4 mx-auto mb-1.5" style={{ color: catColor }} />
              <p className="text-xs text-slate-500">Category</p>
              <p className="text-sm font-bold text-white">{session.interview_topics?.category ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <Star className="h-4 w-4 mx-auto mb-1.5 text-amber-400" />
              <p className="text-xs text-slate-500">Score</p>
              <p className="text-sm font-bold" style={{ color: scoreColor(analysis?.overall_score) }}>
                {analysis?.overall_score ?? "—"}
              </p>
            </div>
          </div>

          {/* Interviewer info */}
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            {avatarPath ? (
              <Image
                src={avatarPath}
                alt={session.interviewers?.name ?? ""}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover border-2 border-white/10"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-400 border-2 border-white/10">
                {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{session.interviewers?.name ?? "AI Interviewer"}</p>
              <p className="text-xs text-slate-500">{session.interviewers?.title ?? ""}</p>
            </div>
            {session.status === "abandoned" && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Left early</span>
              </div>
            )}
          </div>

          {/* Score breakdown if analysis exists */}
          {analysis && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Performance Scores</h3>
              <div className="space-y-3">
                <AnimatedBar label="Technical"       value={analysis.technical_score}       colour="#6366f1" icon={Monitor}       delay={0} />
                <AnimatedBar label="Communication"   value={analysis.communication_score}   colour="#22c55e" icon={MessagesSquare} delay={100} />
                <AnimatedBar label="Confidence"      value={analysis.confidence_score}      colour="#f59e0b" icon={Shield}         delay={200} />
                <AnimatedBar label="Problem Solving" value={analysis.problem_solving_score} colour="#ec4899" icon={Puzzle}         delay={300} />
              </div>
            </div>
          )}

          {/* Conversation transcript */}
          {conversation.length > 0 ? (
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                Session Transcript
                <span className="ml-auto text-xs font-normal text-slate-600 normal-case tracking-normal">
                  {conversation.length} messages
                </span>
              </h3>
              <div className="space-y-3">
                {conversation.map((msg) => {
                  const isInterviewer = msg.role === "interviewer";
                  const isExpanded = expandedMsg === msg.id;
                  const isLong = msg.content.length > 200;

                  return (
                    <div
                      key={msg.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isInterviewer
                          ? "border-indigo-500/20 bg-indigo-500/5"
                          : "border-white/5 bg-white/[0.02]"
                      }`}
                    >
                      {/* Message header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                          isInterviewer
                            ? "bg-indigo-500/20 text-indigo-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {isInterviewer ? <Bot className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                        </div>
                        <span className={`text-xs font-semibold ${isInterviewer ? "text-indigo-400" : "text-emerald-400"}`}>
                          {isInterviewer ? (session.interviewers?.name ?? "Interviewer") : "You"}
                        </span>
                        <span className="ml-auto text-[10px] text-slate-600">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Message content */}
                      <p className={`text-sm text-slate-300 leading-relaxed ${!isExpanded && isLong ? "line-clamp-3" : ""}`}>
                        {msg.content}
                      </p>

                      {isLong && (
                        <button
                          onClick={() => setExpandedMsg(isExpanded ? null : msg.id)}
                          className="mt-2 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">No transcript available for this session.</p>
            </div>
          )}

          {/* Strengths & areas */}
          {analysis && (analysis.strengths?.length || analysis.areas_to_improve?.length) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <p className="mb-3 text-xs font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                  </p>
                  <ul className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.areas_to_improve && analysis.areas_to_improve.length > 0 && (
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <p className="mb-3 text-xs font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> To Improve
                  </p>
                  <ul className="space-y-2">
                    {analysis.areas_to_improve.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {/* Action items */}
          {analysis?.action_items && analysis.action_items.length > 0 && (
            <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-4">
              <p className="mb-3 text-xs font-bold tracking-widest text-violet-400 uppercase flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Action Items
              </p>
              <ul className="space-y-2">
                {analysis.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 text-[9px] font-bold text-violet-400 shrink-0">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed feedback */}
          {analysis?.detailed_feedback && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Detailed Feedback
              </p>
              <p className="text-xs leading-relaxed text-slate-400 whitespace-pre-line">
                {analysis.detailed_feedback}
              </p>
            </div>
          )}

          {/* Keywords */}
          {analysis && (analysis.keywords_mentioned?.length || analysis.keywords_missed?.length) ? (
            <div className="space-y-3">
              {analysis.keywords_mentioned && analysis.keywords_mentioned.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Keywords Used</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords_mentioned.map((k, i) => (
                      <span key={i} className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.keywords_missed && analysis.keywords_missed.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Keywords Missed</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords_missed.map((k, i) => (
                      <span key={i} className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[11px] font-medium text-red-400">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] shrink-0">
          <a
            href="/home"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:brightness-110 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Practice This Topic Again
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ─── Score History Sparkline ─────────────────────────────── */

function ScoreSparkline({ analyses }: { analyses: Analysis[] }) {
  const points = analyses
    .slice()
    .reverse()
    .filter(a => a.overall_score != null)
    .map(a => a.overall_score as number);

  if (points.length < 2) return null;

  const w = 120, h = 32;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;

  const pathD = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const trend = points[points.length - 1] - points[0];

  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={trend >= 0 ? "#22c55e" : "#ef4444"} stopOpacity="0.4" />
            <stop offset="100%" stopColor={trend >= 0 ? "#22c55e" : "#ef4444"} />
          </linearGradient>
        </defs>
        <path d={pathD} fill="none" stroke="url(#sparkGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-xs font-bold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {trend >= 0 ? "+" : ""}{trend} pts
      </span>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function DashboardClient({
  user, profile, stats, recentSessions, analyses, interviewerAvatars,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "sessions">("overview");

  const latest = analyses[0] ?? null;
  const scoreDiff = getScoreDiff(analyses);
  const overallScore = latest?.overall_score ?? 0;

  const strongestSkill = (() => {
    if (!latest) return null;
    const scores: [string, number | null][] = [
      ["Technical", latest.technical_score],
      ["Communication", latest.communication_score],
      ["Confidence", latest.confidence_score],
      ["Problem Solving", latest.problem_solving_score],
    ];
    const valid = scores.filter(([, v]) => v != null) as [string, number][];
    if (!valid.length) return null;
    valid.sort((a, b) => b[1] - a[1]);
    return { name: valid[0][0], score: valid[0][1] };
  })();

  const weakestSkill = (() => {
    if (!latest) return null;
    const scores: [string, number | null][] = [
      ["Technical", latest.technical_score],
      ["Communication", latest.communication_score],
      ["Confidence", latest.confidence_score],
      ["Problem Solving", latest.problem_solving_score],
    ];
    const valid = scores.filter(([, v]) => v != null) as [string, number][];
    if (!valid.length) return null;
    valid.sort((a, b) => a[1] - b[1]);
    return { name: valid[0][0], score: valid[0][1] };
  })();

  function getInterviewerAvatar(name: string | undefined): string | null {
    if (!name) return null;
    return interviewerAvatars[name] || null;
  }

  const openSession = useCallback(async (session: SessionRow) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    const { data } = await supabase
      .from("session_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("sequence_no", { ascending: true });
    setSessionMessages(data ?? []);
    setLoadingMessages(false);
  }, [supabase]);

  const closeSession = useCallback(() => {
    setSelectedSession(null);
    setSessionMessages([]);
  }, []);

  const totalPracticeTime = stats?.total_practice_secs
    ? Math.round(stats.total_practice_secs / 60)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-5%] h-[600px] w-[600px] rounded-full bg-violet-600/7 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] h-[500px] w-[500px] rounded-full bg-indigo-600/7 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] h-[300px] w-[300px] rounded-full bg-blue-600/4 blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0d14]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <a href="/home" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold">
              AI <span className="text-indigo-400">Interviewer</span>
            </span>
          </a>
          <div className="flex items-center gap-1">
            <a href="/home" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <Home className="h-3.5 w-3.5" /> Home
            </a>
            <a href="/profile" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <UserIcon className="h-3.5 w-3.5" /> Profile
            </a>
            <a
              href="/home"
              className="ml-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 transition-all"
            >
              New Interview
            </a>
          </div>
        </div>
      </nav>

      <main className="relative pt-20 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">

          {/* ═══ Page header ═══ */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">
                {profile?.full_name ? `Hey, ${profile.full_name.split(" ")[0]} 👋` : "Dashboard"}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Track your progress and review past sessions.
              </p>
            </div>
            <ScoreSparkline analyses={analyses} />
          </div>

          {/* ═══ Top stat pills ═══ */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <StatPill icon={Award}       label="Total Sessions"   value={stats?.total_sessions ?? 0}                            color="#6366f1" />
            <StatPill icon={CheckCircle2} label="Completed"       value={stats?.completed_sessions ?? 0}                        color="#22c55e" />
            <StatPill icon={BarChart2}   label="Avg Score"        value={stats?.avg_overall_score ? `${Math.round(stats.avg_overall_score)}` : "—"}   color="#f59e0b" />
            <StatPill icon={Clock}       label="Practice Time"    value={totalPracticeTime > 0 ? `${totalPracticeTime}m` : "—"} color="#ec4899" />
          </div>

          {/* ═══ Tabs ═══ */}
          <div className="flex gap-1 mb-5 rounded-xl bg-white/[0.03] border border-white/5 p-1 w-fit">
            {(["overview", "sessions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab === "overview" ? "Overview" : "All Sessions"}
              </button>
            ))}
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === "overview" && (
            <div className="space-y-4">

              {/* Top row: Overall Score + Performance */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Overall Score Card */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-1">Latest Score</p>
                      <div className="flex items-end gap-3">
                        <span className="text-7xl font-black tracking-tight text-white leading-none">{overallScore}</span>
                        <span className="text-2xl font-bold text-slate-700 mb-1">/100</span>
                      </div>
                      <p className="text-sm font-semibold mt-2" style={{ color: scoreColor(overallScore) }}>
                        {scoreLabel(overallScore)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {scoreDiff != null && (
                        <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                          scoreDiff >= 0
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {scoreDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {scoreDiff >= 0 ? "+" : ""}{scoreDiff}
                        </span>
                      )}
                      <ScoreRing score={overallScore} size={64} />
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/5">
                    {strongestSkill && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-sm text-slate-400">
                          Best: <span className="font-semibold text-white">{strongestSkill.name}</span>
                          <span className="ml-1 text-xs text-emerald-400">({strongestSkill.score})</span>
                        </span>
                      </div>
                    )}
                    {weakestSkill && (
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-amber-400 shrink-0" />
                        <span className="text-sm text-slate-400">
                          Needs work: <span className="font-semibold text-white">{weakestSkill.name}</span>
                          <span className="ml-1 text-xs text-amber-400">({weakestSkill.score})</span>
                        </span>
                      </div>
                    )}
                    {!latest && (
                      <p className="text-sm text-slate-600">Complete your first interview to see scores.</p>
                    )}
                  </div>
                </div>

                {/* Performance Breakdown */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-5">Performance Breakdown</h2>
                  <div className="space-y-4">
                    <AnimatedBar label="Technical"       value={latest?.technical_score}       colour="#6366f1" icon={Monitor}       delay={0} />
                    <AnimatedBar label="Communication"   value={latest?.communication_score}   colour="#22c55e" icon={MessagesSquare} delay={100} />
                    <AnimatedBar label="Confidence"      value={latest?.confidence_score}      colour="#f59e0b" icon={Shield}         delay={200} />
                    <AnimatedBar label="Problem Solving" value={latest?.problem_solving_score} colour="#ec4899" icon={Puzzle}         delay={300} />
                  </div>
                </div>
              </div>

              {/* Second row: Action Items + Interview Summary */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* What to Improve */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-violet-400" /> Focus Areas
                  </h2>
                  {latest?.action_items && latest.action_items.length > 0 ? (
                    <ul className="space-y-3">
                      {latest.action_items.slice(0, 3).map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-400 shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm text-slate-300 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-600">Complete an interview to see improvement suggestions.</p>
                  )}
                </div>

                {/* Last Interview Stats */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Last Interview</h2>
                    {recentSessions[0] && (
                      <button
                        onClick={() => openSession(recentSessions[0])}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Eye className="h-3 w-3" /> View Detail
                      </button>
                    )}
                  </div>
                  {recentSessions[0] ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
                        <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">Topic</p>
                          <p className="text-sm font-semibold text-white truncate">
                            {recentSessions[0].interview_topics?.name ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                          <Clock className="h-3.5 w-3.5 mx-auto mb-1 text-slate-500" />
                          <p className="text-[10px] text-slate-500">Duration</p>
                          <p className="text-xs font-bold text-white">{formatDuration(recentSessions[0].duration_secs)}</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                          <Calendar className="h-3.5 w-3.5 mx-auto mb-1 text-slate-500" />
                          <p className="text-[10px] text-slate-500">Date</p>
                          <p className="text-xs font-bold text-white">{formatDate(recentSessions[0].started_at)}</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
                          <Star className="h-3.5 w-3.5 mx-auto mb-1 text-amber-400" />
                          <p className="text-[10px] text-slate-500">Score</p>
                          <p className="text-xs font-bold" style={{ color: scoreColor(latest?.overall_score) }}>
                            {latest?.overall_score ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No interviews yet.</p>
                  )}
                </div>
              </div>

              {/* Strengths & Areas */}
              {latest && (latest.strengths?.length || latest.areas_to_improve?.length) ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {latest.strengths && latest.strengths.length > 0 && (
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-6">
                      <p className="mb-3 text-xs font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                      </p>
                      <ul className="space-y-2">
                        {latest.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {latest.areas_to_improve && latest.areas_to_improve.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-6">
                      <p className="mb-3 text-xs font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" /> Areas to Improve
                      </p>
                      <ul className="space-y-2">
                        {latest.areas_to_improve.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Detailed feedback */}
              {latest?.detailed_feedback && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Detailed Feedback
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">{latest.detailed_feedback}</p>
                </div>
              )}

              {/* Recent sessions preview */}
              {recentSessions.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Recent Sessions</h2>
                    <button
                      onClick={() => setActiveTab("sessions")}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View All <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recentSessions.slice(0, 4).map((s) => {
                      const sessionAnalysis = analyses.find((a) => a.session_id === s.id);
                      return (
                        <SessionCard
                          key={s.id}
                          session={s}
                          analysis={sessionAnalysis ?? null}
                          interviewerAvatars={interviewerAvatars}
                          onClick={() => openSession(s)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ SESSIONS TAB ═══ */}
          {activeTab === "sessions" && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">All Sessions</h2>
                <span className="text-xs text-slate-600">{recentSessions.length} total</span>
              </div>

              {recentSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-14 text-center">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                  <p className="text-sm text-slate-500 mb-3">No sessions yet.</p>
                  <a href="/home" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300">
                    Start your first interview <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((s) => {
                    const sessionAnalysis = analyses.find((a) => a.session_id === s.id);
                    return (
                      <SessionCard
                        key={s.id}
                        session={s}
                        analysis={sessionAnalysis ?? null}
                        interviewerAvatars={interviewerAvatars}
                        onClick={() => openSession(s)}
                        expanded
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ═══ Session Detail Panel ═══ */}
      {selectedSession && (
        <SessionDetailPanel
          session={selectedSession}
          analysis={analyses.find((a) => a.session_id === selectedSession.id) ?? null}
          messages={loadingMessages ? [] : sessionMessages}
          onClose={closeSession}
          interviewerAvatars={interviewerAvatars}
        />
      )}

      {/* Loading overlay for messages */}
      {loadingMessages && selectedSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d1117]/90 px-6 py-4 shadow-2xl">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-sm font-medium text-slate-300">Loading transcript…</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Session Card (reused in both tabs) ─────────────────── */

function SessionCard({
  session, analysis, interviewerAvatars, onClick, expanded = false,
}: {
  session: SessionRow;
  analysis: Analysis | null;
  interviewerAvatars: Record<string, string>;
  onClick: () => void;
  expanded?: boolean;
}) {
  const avatarPath = session.interviewers?.name ? interviewerAvatars[session.interviewers.name] : null;
  const CategoryIcon = CATEGORY_ICONS[session.interview_topics?.category ?? ""] ?? Puzzle;
  const catColor = CATEGORY_COLORS[session.interview_topics?.category ?? ""] ?? "#6366f1";
  const score = analysis?.overall_score;

  return (
    <div
      onClick={onClick}
      className="group relative flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all cursor-pointer"
    >
      {/* Score ring */}
      <ScoreRing score={score} size={48} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {session.interview_topics?.name ?? "Unknown Topic"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <CategoryIcon className="h-3 w-3 shrink-0" style={{ color: catColor }} />
          <span className="text-xs text-slate-500">{session.interview_topics?.category ?? "General"}</span>
          <span className="text-white/10">·</span>
          <Clock className="h-3 w-3 text-slate-600 shrink-0" />
          <span className="text-xs text-slate-500">{formatDuration(session.duration_secs)}</span>
          {expanded && (
            <>
              <span className="text-white/10">·</span>
              <span className="text-xs text-slate-600">{formatDate(session.started_at)}</span>
            </>
          )}
        </div>
        {expanded && analysis?.summary && (
          <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">{analysis.summary}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {/* Status */}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
          session.status === "completed"
            ? "bg-emerald-500/15 text-emerald-400"
            : session.status === "in_progress"
            ? "bg-amber-500/15 text-amber-400"
            : "bg-slate-500/15 text-slate-500"
        }`}>
          {session.status.replace("_", " ")}
        </span>

        {/* Interviewer avatar + date */}
        <div className="flex flex-col items-center gap-0.5">
          {avatarPath ? (
            <Image
              src={avatarPath}
              alt={session.interviewers?.name ?? ""}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] font-bold text-indigo-400 border border-white/10">
              {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
          )}
          {!expanded && (
            <span className="text-[10px] text-slate-600">{formatDate(session.started_at)}</span>
          )}
        </div>
      </div>

      {/* Hover arrow */}
      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-700 group-hover:text-indigo-400 transition-colors" />
    </div>
  );
}
