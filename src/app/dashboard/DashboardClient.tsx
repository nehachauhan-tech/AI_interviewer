"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, Home, User as UserIcon,
  TrendingDown, TrendingUp, CheckCircle2,
  Clock, MessageSquare, HelpCircle, ChevronRight,
  Monitor, MessagesSquare, Shield, Puzzle,
  X, ChevronDown, ChevronUp, BarChart2,
  Zap, Target, Award, BookOpen,
  Calendar, Timer, Star, AlertCircle,
  RotateCcw, Eye, Bot, Mic2,
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
  if (score == null) return "#64748b";
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

function ScoreRing({ score, size = 52 }: { score: number | null | undefined; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const val = score ?? 0;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90 absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${(val/100)*circ} ${circ}`}
        />
      </svg>
      <span className="relative text-xs font-black" style={{ color }}>{score ?? "—"}</span>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 hover:border-white/10 hover:bg-white/[0.05] transition-all">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: `${color}18` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 leading-none mb-1">{label}</p>
        <p className="text-lg font-black text-white leading-none">{value}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Score Sparkline ────────────────────────────────────── */

function ScoreSparkline({ analyses }: { analyses: Analysis[] }) {
  const pts = [...analyses].reverse().filter(a => a.overall_score != null).map(a => a.overall_score as number);
  if (pts.length < 2) return null;
  const W = 100, H = 28;
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const d = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const trend = pts[pts.length - 1] - pts[0];

  return (
    <div className="flex items-center gap-2">
      <svg width={W} height={H} className="overflow-visible">
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={trend >= 0 ? "#22c55e" : "#ef4444"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trend >= 0 ? "#22c55e" : "#ef4444"} />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#sg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-xs font-bold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {trend >= 0 ? "+" : ""}{trend} pts
      </span>
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
}

function SessionDetailDrawer({ session, analysis, messages, profile, onClose, interviewerAvatars }: DetailProps) {
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

  const qCount = conversation.filter(m => m.role === "interviewer").length;

  /* user display info */
  const userName = profile?.full_name ?? "You";
  const userInitials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const userAvatar = profile?.avatar_url ?? null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[680px] flex-col bg-[#0c0f18] border-l border-white/8 shadow-2xl"
        style={{ animation: "slideIn .28s cubic-bezier(.16,1,.3,1)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/6 shrink-0">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/8 hover:text-white transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              {session.interview_topics?.name ?? "Interview Session"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {formatFullDate(session.started_at)} · {formatTime(session.started_at)}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize shrink-0 ${
            session.status === "completed"   ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" :
            session.status === "in_progress" ? "bg-amber-500/15  text-amber-400  border border-amber-500/25"  :
                                               "bg-slate-500/15  text-slate-400  border border-slate-500/20"
          }`}>
            {session.status.replace("_", " ")}
          </span>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Quick stats bar */}
          <div className="grid grid-cols-4 divide-x divide-white/5 border-b border-white/5 shrink-0">
            {[
              { icon: Timer,       label: "Duration",  val: formatDuration(session.duration_secs), color: "#6366f1" },
              { icon: MessageSquare, label: "Questions", val: qCount || "—",                       color: "#8b5cf6" },
              { icon: CategoryIcon,  label: "Category",  val: session.interview_topics?.category ?? "—", color: catColor },
              { icon: Star,          label: "Score",     val: analysis?.overall_score ?? "—",      color: scoreColor(analysis?.overall_score) },
            ].map(({ icon: Ic, label, val, color }) => (
              <div key={label} className="flex flex-col items-center py-3 px-2 gap-1">
                <Ic className="h-3.5 w-3.5" style={{ color }} />
                <span className="text-[10px] text-slate-500">{label}</span>
                <span className="text-xs font-bold text-white">{val}</span>
              </div>
            ))}
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* Interviewer row */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.025] p-4">
              {avatarPath ? (
                <Image src={avatarPath} alt={session.interviewers?.name ?? ""} width={44} height={44}
                  className="h-11 w-11 rounded-full object-cover border-2 border-white/10 shrink-0" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-400 border-2 border-white/10 shrink-0">
                  {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{session.interviewers?.name ?? "AI Interviewer"}</p>
                <p className="text-xs text-slate-500">{session.interviewers?.title ?? "AI Interviewer"}</p>
              </div>
              {session.status === "abandoned" && (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 shrink-0">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">Left early</span>
                </div>
              )}
            </div>

            {/* Performance scores */}
            {analysis && (
              <section>
                <SectionLabel>Performance Scores</SectionLabel>
                <div className="space-y-3 mt-3">
                  <AnimatedBar label="Technical"       value={analysis.technical_score}       colour="#6366f1" icon={Monitor}        delay={0} />
                  <AnimatedBar label="Communication"   value={analysis.communication_score}   colour="#22c55e" icon={MessagesSquare}  delay={80} />
                  <AnimatedBar label="Confidence"      value={analysis.confidence_score}      colour="#f59e0b" icon={Shield}          delay={160} />
                  <AnimatedBar label="Problem Solving" value={analysis.problem_solving_score} colour="#ec4899" icon={Puzzle}          delay={240} />
                </div>
              </section>
            )}

            {/* ── Conversation transcript ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Conversation Transcript</SectionLabel>
                <span className="text-[11px] text-slate-600">{conversation.length} messages</span>
              </div>

              {conversation.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <MessageSquare className="mx-auto mb-2 h-7 w-7 text-slate-700" />
                  <p className="text-sm text-slate-500">No transcript for this session.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversation.map((msg) => {
                    const isBot = msg.role === "interviewer";
                    const isExp = expanded === msg.id;
                    const isLong = msg.content.length > 220;

                    return (
                      <div
                        key={msg.id}
                        className={`rounded-xl border p-4 transition-colors ${
                          isBot
                            ? "border-indigo-500/18 bg-indigo-500/[0.055]"
                            : "border-emerald-500/18 bg-emerald-500/[0.04]"
                        }`}
                      >
                        {/* Speaker row */}
                        <div className="flex items-center gap-2.5 mb-2.5">
                          {isBot ? (
                            /* ── AI interviewer avatar ── */
                            avatarPath ? (
                              <Image src={avatarPath} alt={session.interviewers?.name ?? "AI"} width={26} height={26}
                                className="h-6.5 w-6.5 rounded-full object-cover border border-indigo-500/30 shrink-0" />
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/25 shrink-0">
                                <Bot className="h-3 w-3 text-indigo-400" />
                              </div>
                            )
                          ) : (
                            /* ── User avatar ── */
                            userAvatar ? (
                              <Image src={userAvatar} alt={userName} width={26} height={26}
                                className="h-6.5 w-6.5 rounded-full object-cover border border-emerald-500/30 shrink-0" />
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-400 shrink-0">
                                {userInitials}
                              </div>
                            )
                          )}

                          <span className={`text-xs font-semibold ${isBot ? "text-indigo-400" : "text-emerald-400"}`}>
                            {isBot ? (session.interviewers?.name ?? "Interviewer") : userName}
                          </span>
                          <span className="text-[10px] text-slate-600 ml-auto">{formatTime(msg.created_at)}</span>
                        </div>

                        {/* Content */}
                        <p className={`text-sm text-slate-300 leading-relaxed pl-[2px] ${!isExp && isLong ? "line-clamp-3" : ""}`}>
                          {msg.content}
                        </p>

                        {isLong && (
                          <button
                            onClick={() => setExpanded(isExp ? null : msg.id)}
                            className="mt-2 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {isExp ? "Show less" : "Read more"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Strengths + Areas */}
            {analysis && (analysis.strengths?.length || analysis.areas_to_improve?.length) ? (
              <section className="grid gap-3 sm:grid-cols-2">
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <p className="mb-2.5 text-[10px] font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Strengths
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.areas_to_improve && analysis.areas_to_improve.length > 0 && (
                  <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                    <p className="mb-2.5 text-[10px] font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                      <Target className="h-3 w-3" /> To Improve
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.areas_to_improve.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ) : null}

            {/* Action items */}
            {analysis?.action_items && analysis.action_items.length > 0 && (
              <section className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-4">
                <p className="mb-2.5 text-[10px] font-bold tracking-widest text-violet-400 uppercase flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Action Items
                </p>
                <ul className="space-y-2">
                  {analysis.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/25 text-[9px] font-bold text-violet-400 shrink-0">
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
              <section className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="mb-2.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Detailed Feedback
                </p>
                <p className="text-xs leading-relaxed text-slate-400 whitespace-pre-line">
                  {analysis.detailed_feedback}
                </p>
              </section>
            )}

            {/* Keywords */}
            {analysis && (analysis.keywords_mentioned?.length || analysis.keywords_missed?.length) ? (
              <section className="space-y-3">
                {analysis.keywords_mentioned && analysis.keywords_mentioned.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Keywords Used</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords_mentioned.map((k, i) => (
                        <span key={i} className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.keywords_missed && analysis.keywords_missed.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Keywords Missed</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords_missed.map((k, i) => (
                        <span key={i} className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[11px] font-medium text-red-400">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <div className="h-2" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/6 shrink-0">
          <a href="/home" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:brightness-110 transition-all">
            <RotateCcw className="h-3.5 w-3.5" /> Practice This Topic Again
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

/* tiny helper */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">{children}</p>;
}

/* ─── Session Card ───────────────────────────────────────── */

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
      className="group w-full flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5 text-left hover:border-indigo-500/35 hover:bg-white/[0.045] transition-all"
    >
      {/* Score ring */}
      <ScoreRing score={score} size={44} />

      {/* Middle info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-snug">
          {session.interview_topics?.name ?? "Unknown Topic"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <CategoryIcon className="h-3 w-3 shrink-0" style={{ color: catColor }} />
          <span className="text-[11px] text-slate-500">{session.interview_topics?.category ?? "General"}</span>
          <span className="text-white/10">·</span>
          <Clock className="h-3 w-3 text-slate-600 shrink-0" />
          <span className="text-[11px] text-slate-500">{formatDuration(session.duration_secs)}</span>
        </div>
        {analysis?.summary && (
          <p className="mt-1 text-[11px] text-slate-600 line-clamp-1">{analysis.summary}</p>
        )}
      </div>

      {/* Right column */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${
          session.status === "completed"   ? "bg-emerald-500/15 text-emerald-400" :
          session.status === "in_progress" ? "bg-amber-500/15  text-amber-400"  :
                                             "bg-slate-500/15  text-slate-500"
        }`}>
          {session.status.replace("_", " ")}
        </span>

        <div className="flex items-center gap-1.5">
          {avatarPath ? (
            <Image src={avatarPath} alt={session.interviewers?.name ?? ""} width={24} height={24}
              className="h-6 w-6 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-[9px] font-bold text-indigo-400 border border-white/10">
              {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
          )}
          <span className="text-[10px] text-slate-600">{formatDate(session.started_at)}</span>
        </div>

        <ChevronRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-indigo-400 transition-colors" />
      </div>
    </button>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────── */

export default function DashboardClient({ user, profile, stats, recentSessions, analyses, interviewerAvatars }: Props) {
  const supabase = createClient();

  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const latest = analyses[0] ?? null;
  const scoreDiff = getScoreDiff(analyses);
  const overallScore = latest?.overall_score ?? 0;

  const strongestSkill = (() => {
    if (!latest) return null;
    const rows: [string, number | null][] = [
      ["Technical", latest.technical_score], ["Communication", latest.communication_score],
      ["Confidence", latest.confidence_score], ["Problem Solving", latest.problem_solving_score],
    ];
    const valid = rows.filter(([, v]) => v != null) as [string, number][];
    if (!valid.length) return null;
    return valid.sort((a, b) => b[1] - a[1])[0];
  })();

  const weakestSkill = (() => {
    if (!latest) return null;
    const rows: [string, number | null][] = [
      ["Technical", latest.technical_score], ["Communication", latest.communication_score],
      ["Confidence", latest.confidence_score], ["Problem Solving", latest.problem_solving_score],
    ];
    const valid = rows.filter(([, v]) => v != null) as [string, number][];
    if (!valid.length) return null;
    return valid.sort((a, b) => a[1] - b[1])[0];
  })();

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

  const totalMins = stats?.total_practice_secs ? Math.round(stats.total_practice_secs / 60) : 0;

  return (
    <div className="min-h-screen bg-[#090c13] text-white">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-violet-600/6 blur-[130px]" />
        <div className="absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full bg-indigo-600/6 blur-[110px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.055] bg-[#090c13]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <a href="/home" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold">
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
            <a href="/home" className="ml-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 transition-all">
              + New Interview
            </a>
          </div>
        </div>
      </nav>

      <main className="relative pt-20 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-[1400px]">

          {/* ── Page header ── */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white">
                {profile?.full_name ? `Hey, ${profile.full_name.split(" ")[0]} 👋` : "My Dashboard"}
              </h1>
              <p className="text-sm text-slate-500">Track progress · Review sessions · Improve faster</p>
            </div>
            <ScoreSparkline analyses={analyses} />
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
            <StatCard icon={Award}        label="Total Sessions"   value={stats?.total_sessions ?? 0}           color="#6366f1" />
            <StatCard icon={CheckCircle2} label="Completed"        value={stats?.completed_sessions ?? 0}       color="#22c55e" />
            <StatCard icon={BarChart2}    label="Avg Score"        value={stats?.avg_overall_score ? Math.round(stats.avg_overall_score) : "—"} color="#f59e0b" />
            <StatCard icon={Clock}        label="Practice Time"    value={totalMins > 0 ? `${totalMins}m` : "—"} color="#ec4899" />
          </div>

          {/* ══════════════════════════════════════════════════
              TWO-COLUMN LAYOUT
              Left  (lg:col-span-7): Analytics
              Right (lg:col-span-5): Sessions list — always visible
          ══════════════════════════════════════════════════ */}
          <div className="grid gap-4 lg:grid-cols-12">

            {/* ─────────── LEFT: Analytics ─────────── */}
            <div className="lg:col-span-7 space-y-4">

              {/* Overall score + breakdown */}
              <div className="grid gap-4 sm:grid-cols-2">

                {/* Score card */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 flex flex-col">
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-3">Latest Score</p>
                  <div className="flex items-center gap-4 mb-4">
                    <ScoreRing score={overallScore} size={72} />
                    <div>
                      <p className="text-4xl font-black text-white leading-none">{overallScore}</p>
                      <p className="text-xs text-slate-500 mt-1">/100</p>
                      <p className="text-xs font-semibold mt-1" style={{ color: scoreColor(overallScore) }}>
                        {scoreLabel(overallScore)}
                      </p>
                    </div>
                    {scoreDiff != null && (
                      <span className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold self-start ${
                        scoreDiff >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                       : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {scoreDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {scoreDiff >= 0 ? "+" : ""}{scoreDiff}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-3 border-t border-white/5 space-y-1.5">
                    {strongestSkill && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-slate-400">Best: <span className="text-white font-medium">{strongestSkill[0]}</span> <span className="text-emerald-400">({strongestSkill[1]})</span></span>
                      </div>
                    )}
                    {weakestSkill && (
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs text-slate-400">Focus: <span className="text-white font-medium">{weakestSkill[0]}</span> <span className="text-amber-400">({weakestSkill[1]})</span></span>
                      </div>
                    )}
                    {!latest && <p className="text-xs text-slate-600">Complete an interview to see scores.</p>}
                  </div>
                </div>

                {/* Performance breakdown */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4">Performance</p>
                  <div className="space-y-3.5">
                    <AnimatedBar label="Technical"       value={latest?.technical_score}       colour="#6366f1" icon={Monitor}       delay={0} />
                    <AnimatedBar label="Communication"   value={latest?.communication_score}   colour="#22c55e" icon={MessagesSquare} delay={80} />
                    <AnimatedBar label="Confidence"      value={latest?.confidence_score}      colour="#f59e0b" icon={Shield}         delay={160} />
                    <AnimatedBar label="Problem Solving" value={latest?.problem_solving_score} colour="#ec4899" icon={Puzzle}         delay={240} />
                  </div>
                </div>
              </div>

              {/* Focus areas + last interview */}
              <div className="grid gap-4 sm:grid-cols-2">

                {/* Focus areas */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
                      <Target className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">Focus Areas</p>
                  </div>
                  {latest?.action_items && latest.action_items.length > 0 ? (
                    <ul className="space-y-2.5">
                      {latest.action_items.slice(0, 3).map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[9px] font-bold text-violet-400 shrink-0">{i + 1}</span>
                          <span className="text-xs text-slate-300 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-600">Complete an interview to see suggestions.</p>
                  )}
                </div>

                {/* Last interview quick stats */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Last Interview</p>
                    </div>
                    {recentSessions[0] && (
                      <button onClick={() => openSession(recentSessions[0])}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                        <Eye className="h-3 w-3" /> View
                      </button>
                    )}
                  </div>
                  {recentSessions[0] ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white truncate">{recentSessions[0].interview_topics?.name ?? "—"}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Duration", val: formatDuration(recentSessions[0].duration_secs) },
                          { label: "Date",     val: formatDate(recentSessions[0].started_at) },
                          { label: "Score",    val: latest?.overall_score ?? "—" },
                        ].map(({ label, val }) => (
                          <div key={label} className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
                            <p className="text-[9px] text-slate-600">{label}</p>
                            <p className="text-xs font-bold text-white">{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No interviews yet.</p>
                  )}
                </div>
              </div>

              {/* Strengths + Areas */}
              {latest && (latest.strengths?.length || latest.areas_to_improve?.length) ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {latest.strengths && latest.strengths.length > 0 && (
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
                      <p className="mb-3 text-[10px] font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" /> Strengths
                      </p>
                      <ul className="space-y-2">
                        {latest.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400 shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {latest.areas_to_improve && latest.areas_to_improve.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5">
                      <p className="mb-3 text-[10px] font-bold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                        <HelpCircle className="h-3 w-3" /> Areas to Improve
                      </p>
                      <ul className="space-y-2">
                        {latest.areas_to_improve.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 shrink-0" />{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Detailed feedback */}
              {latest?.detailed_feedback && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <p className="mb-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Detailed Feedback
                  </p>
                  <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line">{latest.detailed_feedback}</p>
                </div>
              )}
            </div>

            {/* ─────────── RIGHT: Past Sessions (always visible) ─────────── */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 lg:sticky lg:top-20">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">Past Sessions</p>
                  </div>
                  <span className="text-[11px] text-slate-600 bg-white/[0.04] border border-white/5 rounded-full px-2.5 py-0.5">
                    {recentSessions.length} total
                  </span>
                </div>

                {recentSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                    <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                    <p className="text-sm text-slate-500 mb-3">No sessions yet.</p>
                    <a href="/home" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                      Start first interview <ChevronRight className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  /* Scrollable session list */
                  <div className="space-y-2.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5">
                    {recentSessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        session={s}
                        analysis={analyses.find(a => a.session_id === s.id) ?? null}
                        interviewerAvatars={interviewerAvatars}
                        onClick={() => openSession(s)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>{/* end 12-col grid */}
        </div>
      </main>

      {/* Session detail drawer */}
      {selectedSession && (
        <SessionDetailDrawer
          session={selectedSession}
          analysis={analyses.find(a => a.session_id === selectedSession.id) ?? null}
          messages={loadingMessages ? [] : sessionMessages}
          profile={profile}
          onClose={closeSession}
          interviewerAvatars={interviewerAvatars}
        />
      )}

      {/* Loading overlay */}
      {loadingMessages && selectedSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0c0f18]/95 px-6 py-4 shadow-2xl">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-sm font-medium text-slate-300">Loading transcript…</span>
          </div>
        </div>
      )}
    </div>
  );
}
