"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, Home, User as UserIcon,
  TrendingDown, TrendingUp, CheckCircle2,
  Clock, MessageSquare, ChevronRight,
  Monitor, MessagesSquare, Shield, Puzzle,
  X, ChevronDown, ChevronUp,
  Zap, Target, Award, BookOpen,
  Calendar, Star,
  RotateCcw, Bot, RefreshCw, Loader2,
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
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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
  const a = analyses[0]?.overall_score;
  const b = analyses[1]?.overall_score;
  if (a == null || b == null) return null;
  return a - b;
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return "#94a3b8";
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score: number | null | undefined) {
  if (score == null) return "No data";
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
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const val = value ?? 0;

  return (
    <div ref={barRef} className="group flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: `${colour}20` }}>
        <Icon className="h-5 w-5" style={{ color: colour }} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <span className="text-base text-slate-300 group-hover:text-white transition-colors">{label}</span>
          <span className="text-base font-bold" style={{ color: colour }}>{val}</span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all ease-out"
            style={{
              width: visible ? `${val}%` : "0%",
              background: `linear-gradient(90deg,${colour}60,${colour})`,
              transitionDuration: "1.4s",
              transitionDelay: `${delay}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Score Ring ─────────────────────────────────────────── */

function ScoreRing({ score, size = 60 }: { score: number | null | undefined; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const val = score ?? 0;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90 absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(val/100)*circ} ${circ}`}
        />
      </svg>
      <span className="relative text-sm font-black" style={{ color }}>{score ?? "—"}</span>
    </div>
  );
}

/* ─── Simple Stat Card ─────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 hover:border-white/12 hover:bg-white/[0.06] transition-all">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0" style={{ background: `${color}20` }}>
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-black text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

/* ─── Session Detail Drawer ──────────────────────────────── */

interface DetailProps {
  session: SessionRow;
  analysis: Analysis | null;
  messages: Message[];
  profile: Profile | null;
  onClose: () => void;
  interviewerAvatars: Record<string, string>;
  onReanalyze: () => void;
  isReanalyzing: boolean;
}

function SessionDetailDrawer({ session, analysis, messages, profile, onClose, interviewerAvatars, onReanalyze, isReanalyzing }: DetailProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const avatarPath = session.interviewers?.name ? interviewerAvatars[session.interviewers.name] : null;
  const CategoryIcon = CATEGORY_ICONS[session.interview_topics?.category ?? ""] ?? Puzzle;
  const catColor = CATEGORY_COLORS[session.interview_topics?.category ?? ""] ?? "#6366f1";

  const conversation = messages
    .filter(m => m.role !== "system")
    .sort((a, b) => a.sequence_no - b.sequence_no);

  const userName = profile?.full_name ?? "You";
  const userInitials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const userAvatar = profile?.avatar_url ?? null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[720px] flex-col bg-[#0c0f18] border-l border-white/10 shadow-2xl"
        style={{ animation: "slideIn .28s cubic-bezier(.16,1,.3,1)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-white/8 shrink-0">
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {session.interview_topics?.name ?? "Interview Session"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {formatFullDate(session.started_at)} at {formatTime(session.started_at)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-bold capitalize shrink-0 ${
            session.status === "completed"   ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
            session.status === "in_progress" ? "bg-amber-500/20  text-amber-400  border border-amber-500/30"  :
                                               "bg-slate-500/20  text-slate-400  border border-slate-500/25"
          }`}>
            {session.status.replace("_", " ")}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick info bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 bg-white/[0.02]">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-300">{formatDuration(session.duration_secs)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-4 w-4" style={{ color: catColor }} />
                <span className="text-sm text-slate-300">{session.interview_topics?.category ?? "General"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4" style={{ color: scoreColor(analysis?.overall_score) }} />
                <span className="text-sm font-bold" style={{ color: scoreColor(analysis?.overall_score) }}>
                  {analysis?.overall_score ?? "—"}/100
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-8">

            {/* Interviewer info */}
            <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              {avatarPath ? (
                <Image src={avatarPath} alt={session.interviewers?.name ?? ""} width={56} height={56}
                  className="h-14 w-14 rounded-full object-cover border-2 border-white/15 shrink-0" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20 text-lg font-bold text-indigo-400 border-2 border-white/15 shrink-0">
                  {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-white">{session.interviewers?.name ?? "AI Interviewer"}</p>
                <p className="text-sm text-slate-400">{session.interviewers?.title ?? "AI Interviewer"}</p>
              </div>
            </div>

            {/* Performance scores */}
            {analysis && (
              <section>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Performance Scores</h3>
                <div className="space-y-4">
                  <AnimatedBar label="Technical"       value={analysis.technical_score}       colour="#6366f1" icon={Monitor}        delay={0} />
                  <AnimatedBar label="Communication"   value={analysis.communication_score}   colour="#22c55e" icon={MessagesSquare}  delay={80} />
                  <AnimatedBar label="Confidence"      value={analysis.confidence_score}      colour="#f59e0b" icon={Shield}          delay={160} />
                  <AnimatedBar label="Problem Solving" value={analysis.problem_solving_score} colour="#ec4899" icon={Puzzle}          delay={240} />
                </div>
              </section>
            )}

            {/* Conversation transcript */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Conversation</h3>
                <span className="text-sm text-slate-500">{conversation.length} messages</span>
              </div>

              {conversation.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-base text-slate-400">No transcript available for this session.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversation.map((msg) => {
                    const isBot = msg.role === "interviewer";
                    const isExp = expanded === msg.id;
                    const isLong = msg.content.length > 200;

                    return (
                      <div
                        key={msg.id}
                        className={`rounded-2xl border p-5 transition-colors ${
                          isBot
                            ? "border-indigo-500/20 bg-indigo-500/[0.06]"
                            : "border-emerald-500/20 bg-emerald-500/[0.05]"
                        }`}
                      >
                        {/* Speaker row */}
                        <div className="flex items-center gap-3 mb-3">
                          {isBot ? (
                            avatarPath ? (
                              <Image src={avatarPath} alt={session.interviewers?.name ?? "AI"} width={32} height={32}
                                className="h-8 w-8 rounded-full object-cover border border-indigo-500/40 shrink-0" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/30 shrink-0">
                                <Bot className="h-4 w-4 text-indigo-400" />
                              </div>
                            )
                          ) : (
                            userAvatar ? (
                              <Image src={userAvatar} alt={userName} width={32} height={32}
                                className="h-8 w-8 rounded-full object-cover border border-emerald-500/40 shrink-0" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/25 text-xs font-bold text-emerald-400 shrink-0">
                                {userInitials}
                              </div>
                            )
                          )}
                          <span className={`text-base font-semibold ${isBot ? "text-indigo-400" : "text-emerald-400"}`}>
                            {isBot ? (session.interviewers?.name ?? "Interviewer") : userName}
                          </span>
                          <span className="text-sm text-slate-500 ml-auto">{formatTime(msg.created_at)}</span>
                        </div>

                        {/* Content */}
                        <p className={`text-base text-slate-200 leading-relaxed ${!isExp && isLong ? "line-clamp-3" : ""}`}>
                          {msg.content}
                        </p>

                        {isLong && (
                          <button
                            onClick={() => setExpanded(isExp ? null : msg.id)}
                            className="mt-3 flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {isExp ? "Show less" : "Read more"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Strengths + Areas to Improve */}
            {analysis && (analysis.strengths?.length || analysis.areas_to_improve?.length) ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
                    <h4 className="mb-3 text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Strengths
                    </h4>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-base text-slate-200">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.areas_to_improve && analysis.areas_to_improve.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
                    <h4 className="mb-3 text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Target className="h-4 w-4" /> Areas to Improve
                    </h4>
                    <ul className="space-y-2">
                      {analysis.areas_to_improve.map((a, i) => (
                        <li key={i} className="flex items-start gap-3 text-base text-slate-200">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {/* Action items */}
            {analysis?.action_items && analysis.action_items.length > 0 && (
              <section className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-5">
                <h4 className="mb-3 text-sm font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Action Items
                </h4>
                <ul className="space-y-3">
                  {analysis.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-slate-200">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/30 text-sm font-bold text-violet-400 shrink-0">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Detailed feedback */}
            {analysis?.detailed_feedback && (
              <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <h4 className="mb-3 text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Detailed Feedback
                </h4>
                <p className="text-base leading-relaxed text-slate-300 whitespace-pre-line">
                  {analysis.detailed_feedback}
                </p>
              </section>
            )}

            {/* Keywords */}
            {analysis && (analysis.keywords_mentioned?.length || analysis.keywords_missed?.length) ? (
              <section className="space-y-4">
                {analysis.keywords_mentioned && analysis.keywords_mentioned.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-slate-400 uppercase tracking-wider">Keywords Used</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords_mentioned.map((k, i) => (
                        <span key={i} className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 text-sm font-medium text-emerald-400">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.keywords_missed && analysis.keywords_missed.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-slate-400 uppercase tracking-wider">Keywords Missed</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keywords_missed.map((k, i) => (
                        <span key={i} className="rounded-full bg-red-500/15 border border-red-500/25 px-3 py-1.5 text-sm font-medium text-red-400">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <div className="h-4" />
          </div>
        </div>

        {/* Footer with actions */}
        <div className="px-6 py-5 border-t border-white/8 shrink-0 flex gap-3">
          <button
            onClick={onReanalyze}
            disabled={isReanalyzing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] py-3 text-base font-semibold text-white hover:bg-white/[0.1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReanalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" /> Re-run AI Analysis
              </>
            )}
          </button>
          <a href="/home" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-base font-bold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 transition-all">
            <RotateCcw className="h-4 w-4" /> Practice Again
          </a>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity:0 }
          to   { transform: translateX(0);   opacity:1 }
        }
      `}</style>
    </>
  );
}

/* ─── Session Card (Simplified) ───────────────────────────────────────── */

function SessionCard({
  session, analysis, interviewerAvatars, onClick,
}: {
  session: SessionRow;
  analysis: Analysis | null;
  interviewerAvatars: Record<string, string>;
  onClick: () => void;
}) {
  const avatarPath = session.interviewers?.name ? interviewerAvatars[session.interviewers.name] : null;
  const CategoryIcon = CATEGORY_ICONS[session.interview_topics?.category ?? ""] ?? Puzzle;
  const catColor = CATEGORY_COLORS[session.interview_topics?.category ?? ""] ?? "#6366f1";
  const score = analysis?.overall_score;

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left hover:border-indigo-500/40 hover:bg-white/[0.06] transition-all"
    >
      {/* Score ring */}
      <ScoreRing score={score} size={56} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-white truncate mb-1">
          {session.interview_topics?.name ?? "Unknown Topic"}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CategoryIcon className="h-4 w-4 shrink-0" style={{ color: catColor }} />
            <span className="text-sm text-slate-400">{session.interview_topics?.category ?? "General"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="text-sm text-slate-400">{formatDuration(session.duration_secs)}</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
          session.status === "completed"   ? "bg-emerald-500/20 text-emerald-400" :
          session.status === "in_progress" ? "bg-amber-500/20  text-amber-400"  :
                                             "bg-slate-500/20  text-slate-400"
        }`}>
          {session.status.replace("_", " ")}
        </span>

        <div className="flex items-center gap-2">
          {avatarPath ? (
            <Image src={avatarPath} alt={session.interviewers?.name ?? ""} width={28} height={28}
              className="h-7 w-7 rounded-full object-cover border border-white/15" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400 border border-white/15">
              {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
          )}
          <span className="text-sm text-slate-500">{formatDate(session.started_at)}</span>
        </div>

        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
      </div>
    </button>
  );
}

/* ─── Main Dashboard (Simplified) ─────────────────────────────────────── */

export default function DashboardClient({ user, profile, stats, recentSessions, analyses, interviewerAvatars }: Props) {
  const supabase = createClient();

  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [localAnalyses, setLocalAnalyses] = useState<Analysis[]>(analyses);

  const latest = localAnalyses[0] ?? null;
  const scoreDiff = getScoreDiff(localAnalyses);
  const overallScore = latest?.overall_score ?? 0;

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

  const handleReanalyze = useCallback(async () => {
    if (!selectedSession) return;
    setIsReanalyzing(true);
    try {
      const res = await fetch("/api/interview/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.id }),
      });
      if (res.ok) {
        const { analysis: newAnalysis } = await res.json();
        setLocalAnalyses(prev => {
          const filtered = prev.filter(a => a.session_id !== selectedSession.id);
          return [newAnalysis, ...filtered];
        });
      }
    } catch (err) {
      console.error("Reanalyze failed:", err);
    } finally {
      setIsReanalyzing(false);
    }
  }, [selectedSession]);

  const totalMins = stats?.total_practice_secs ? Math.round(stats.total_practice_secs / 60) : 0;

  return (
    <div className="min-h-screen bg-[#090c13] text-white">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-violet-600/8 blur-[130px]" />
        <div className="absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full bg-indigo-600/8 blur-[110px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#090c13]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/home" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">
              AI <span className="text-indigo-400">Interviewer</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/home" className="flex items-center gap-2 rounded-xl px-4 py-2 text-base text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <Home className="h-4 w-4" /> Home
            </a>
            <a href="/profile" className="flex items-center gap-2 rounded-xl px-4 py-2 text-base text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <UserIcon className="h-4 w-4" /> Profile
            </a>
            <a href="/home" className="ml-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-base font-bold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 transition-all">
              + New Interview
            </a>
          </div>
        </div>
      </nav>

      <main className="relative pt-24 pb-20 px-6">
        <div className="mx-auto max-w-6xl">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">
              {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Your Dashboard"}
            </h1>
            <p className="text-lg text-slate-400">Track your progress and review past interview sessions</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
            <StatCard icon={Award}        label="Total Sessions"   value={stats?.total_sessions ?? 0}           color="#6366f1" />
            <StatCard icon={CheckCircle2} label="Completed"        value={stats?.completed_sessions ?? 0}       color="#22c55e" />
            <StatCard icon={Star}         label="Avg Score"        value={stats?.avg_overall_score ? Math.round(stats.avg_overall_score) : "—"} color="#f59e0b" />
            <StatCard icon={Clock}        label="Practice Time"    value={totalMins > 0 ? `${totalMins}m` : "—"} color="#ec4899" />
          </div>

          {/* Two column layout */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Left: Latest Score & Performance */}
            <div className="space-y-6">

              {/* Score overview card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                <h2 className="text-lg font-bold text-white mb-5">Latest Performance</h2>

                <div className="flex items-center gap-6 mb-6">
                  <ScoreRing score={overallScore} size={90} />
                  <div>
                    <p className="text-5xl font-black text-white leading-none">{overallScore}</p>
                    <p className="text-base text-slate-400 mt-1">out of 100</p>
                    <p className="text-lg font-semibold mt-2" style={{ color: scoreColor(overallScore) }}>
                      {scoreLabel(overallScore)}
                    </p>
                  </div>
                  {scoreDiff != null && (
                    <span className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
                      scoreDiff >= 0 ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                                     : "bg-red-500/15 text-red-400 border border-red-500/25"
                    }`}>
                      {scoreDiff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {scoreDiff >= 0 ? "+" : ""}{scoreDiff} from last
                    </span>
                  )}
                </div>

                {/* Performance bars */}
                <div className="space-y-4">
                  <AnimatedBar label="Technical"       value={latest?.technical_score}       colour="#6366f1" icon={Monitor}       delay={0} />
                  <AnimatedBar label="Communication"   value={latest?.communication_score}   colour="#22c55e" icon={MessagesSquare} delay={80} />
                  <AnimatedBar label="Confidence"      value={latest?.confidence_score}      colour="#f59e0b" icon={Shield}         delay={160} />
                  <AnimatedBar label="Problem Solving" value={latest?.problem_solving_score} colour="#ec4899" icon={Puzzle}         delay={240} />
                </div>

                {!latest && (
                  <p className="text-base text-slate-500 text-center py-8">Complete an interview to see your scores</p>
                )}
              </div>

              {/* Focus areas */}
              {latest?.action_items && latest.action_items.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
                      <Target className="h-5 w-5 text-violet-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Focus Areas</h2>
                  </div>
                  <ul className="space-y-3">
                    {latest.action_items.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/25 text-sm font-bold text-violet-400 shrink-0">{i + 1}</span>
                        <span className="text-base text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Past Sessions */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Past Sessions</h2>
                </div>
                <span className="text-base text-slate-500 bg-white/[0.05] border border-white/8 rounded-full px-3 py-1">
                  {recentSessions.length} total
                </span>
              </div>

              {recentSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                  <p className="text-lg text-slate-400 mb-4">No sessions yet</p>
                  <a href="/home" className="inline-flex items-center gap-2 text-base font-medium text-indigo-400 hover:text-indigo-300">
                    Start your first interview <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {recentSessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      analysis={localAnalyses.find(a => a.session_id === s.id) ?? null}
                      interviewerAvatars={interviewerAvatars}
                      onClick={() => openSession(s)}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Session detail drawer */}
      {selectedSession && (
        <SessionDetailDrawer
          session={selectedSession}
          analysis={localAnalyses.find(a => a.session_id === selectedSession.id) ?? null}
          messages={loadingMessages ? [] : sessionMessages}
          profile={profile}
          onClose={closeSession}
          interviewerAvatars={interviewerAvatars}
          onReanalyze={handleReanalyze}
          isReanalyzing={isReanalyzing}
        />
      )}

      {/* Loading overlay */}
      {loadingMessages && selectedSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-[#0c0f18]/95 px-8 py-5 shadow-2xl">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-base font-medium text-slate-300">Loading conversation...</span>
          </div>
        </div>
      )}
    </div>
  );
}
