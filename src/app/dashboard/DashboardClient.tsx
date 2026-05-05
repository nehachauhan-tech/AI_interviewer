"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Database, TranscriptMessage } from "@/lib/supabase/types";
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

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  duration_secs: number | null;
  interviewers: { name: string; title: string; avatar_url: string | null } | null;
  interview_topics: { name: string; category: string } | null;
  transcript_json: TranscriptMessage[] | null;
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

/* ─── User Avatar with fallback ─────────────────────────── */

function UserAvatar({ src, name, size = 24, className = "" }: {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (!src || imgError) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-emerald-500/25 text-emerald-400 font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full object-cover border border-emerald-500/40 shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setImgError(true)}
    />
  );
}

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
        <div className="flex justify-between mb-1">
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
          <span className="text-sm font-semibold" style={{ color: colour }}>{val}</span>
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

function ScoreRing({ score, size = 48 }: { score: number | null | undefined; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const val = score ?? 0;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90 absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${(val/100)*circ} ${circ}`}
        />
      </svg>
      <span className="relative text-xs font-bold" style={{ color }}>{score ?? "—"}</span>
    </div>
  );
}

/* ─── Simple Stat Card ─────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 hover:border-white/12 hover:bg-white/[0.06] transition-all">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0" style={{ background: `${color}20` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

/* ─── Session Detail Drawer ──────────────────────────────── */

interface DetailProps {
  session: SessionRow;
  analysis: Analysis | null;
  profile: Profile | null;
  onClose: () => void;
  interviewerAvatars: Record<string, string>;
  onReanalyze: () => void;
  isReanalyzing: boolean;
}

function SessionDetailDrawer({ session, analysis, profile, onClose, interviewerAvatars, onReanalyze, isReanalyzing }: DetailProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

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

  const conversation = session.transcript_json ?? [];

  const userName = profile?.full_name ?? "You";
  const userInitials = userName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // Handle avatar URL - could be full URL, storage path, or null
  const rawAvatar = profile?.avatar_url;
  const userAvatar = rawAvatar
    ? rawAvatar.startsWith("http")
      ? rawAvatar
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${rawAvatar}`
    : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[600px] flex-col bg-[#0c0f18] border-l border-white/10 shadow-2xl"
        style={{ animation: "slideIn .28s cubic-bezier(.16,1,.3,1)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              {session.interview_topics?.name ?? "Interview Session"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatFullDate(session.started_at)} at {formatTime(session.started_at)}
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize shrink-0 ${
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
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/6 bg-white/[0.02]">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs text-slate-300">{formatDuration(session.duration_secs)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CategoryIcon className="h-3.5 w-3.5" style={{ color: catColor }} />
                <span className="text-xs text-slate-300">{session.interview_topics?.category ?? "General"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" style={{ color: scoreColor(analysis?.overall_score) }} />
                <span className="text-xs font-semibold" style={{ color: scoreColor(analysis?.overall_score) }}>
                  {analysis?.overall_score ?? "—"}/100
                </span>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 space-y-6">

            {/* Interviewer info */}
            <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4">
              {avatarPath ? (
                <Image src={avatarPath} alt={session.interviewers?.name ?? ""} width={44} height={44}
                  className="h-11 w-11 rounded-full object-cover border-2 border-white/15 shrink-0" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-400 border-2 border-white/15 shrink-0">
                  {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{session.interviewers?.name ?? "AI Interviewer"}</p>
                <p className="text-xs text-slate-400">{session.interviewers?.title ?? "AI Interviewer"}</p>
              </div>
            </div>

            {/* Performance scores */}
            {analysis && (
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Performance</h3>
                <div className="space-y-3">
                  <AnimatedBar label="Technical"       value={analysis.technical_score}       colour="#6366f1" icon={Monitor}        delay={0} />
                  <AnimatedBar label="Communication"   value={analysis.communication_score}   colour="#22c55e" icon={MessagesSquare}  delay={80} />
                  <AnimatedBar label="Confidence"      value={analysis.confidence_score}      colour="#f59e0b" icon={Shield}          delay={160} />
                  <AnimatedBar label="Problem Solving" value={analysis.problem_solving_score} colour="#ec4899" icon={Puzzle}          delay={240} />
                </div>
              </section>
            )}

            {/* Conversation transcript */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversation</h3>
                <span className="text-xs text-slate-500">{conversation.length} messages</span>
              </div>

              {conversation.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-400">No transcript available for this session.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversation.map((msg, idx) => {
                    const isBot = msg.role === "interviewer";
                    const isExp = expanded === idx;
                    const isLong = msg.content.length > 180;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 transition-colors ${
                          isBot
                            ? "border-indigo-500/20 bg-indigo-500/[0.06]"
                            : "border-emerald-500/20 bg-emerald-500/[0.05]"
                        }`}
                      >
                        {/* Speaker row */}
                        <div className="flex items-center gap-2 mb-2">
                          {isBot ? (
                            avatarPath ? (
                              <Image src={avatarPath} alt={session.interviewers?.name ?? "AI"} width={24} height={24}
                                className="h-6 w-6 rounded-full object-cover border border-indigo-500/40 shrink-0" />
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/30 shrink-0">
                                <Bot className="h-3 w-3 text-indigo-400" />
                              </div>
                            )
                          ) : (
                            <UserAvatar src={userAvatar} name={userName} size={24} />
                          )}
                          <span className={`text-xs font-semibold ${isBot ? "text-indigo-400" : "text-emerald-400"}`}>
                            {isBot ? (session.interviewers?.name ?? "Interviewer") : userName}
                          </span>
                          {msg.timestamp && (
                            <span className="text-[10px] text-slate-500 ml-auto">{formatTime(msg.timestamp)}</span>
                          )}
                        </div>

                        {/* Content */}
                        <p className={`text-sm text-slate-200 leading-relaxed ${!isExp && isLong ? "line-clamp-3" : ""}`}>
                          {msg.content}
                        </p>

                        {isLong && (
                          <button
                            onClick={() => setExpanded(isExp ? null : idx)}
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

            {/* Strengths + Areas to Improve */}
            {analysis && (analysis.strengths?.length || analysis.areas_to_improve?.length) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                    <h4 className="mb-2 text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Strengths
                    </h4>
                    <ul className="space-y-1.5">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-emerald-400 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.areas_to_improve && analysis.areas_to_improve.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                    <h4 className="mb-2 text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="h-3 w-3" /> Areas to Improve
                    </h4>
                    <ul className="space-y-1.5">
                      {analysis.areas_to_improve.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {/* Action items */}
            {analysis?.action_items && analysis.action_items.length > 0 && (
              <section className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
                <h4 className="mb-2 text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Action Items
                </h4>
                <ul className="space-y-2">
                  {analysis.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/30 text-[10px] font-bold text-violet-400 shrink-0">
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
              <section className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <h4 className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Detailed Feedback
                </h4>
                <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line">
                  {analysis.detailed_feedback}
                </p>
              </section>
            )}

            {/* Keywords */}
            {analysis && (analysis.keywords_mentioned?.length || analysis.keywords_missed?.length) ? (
              <section className="space-y-3">
                {analysis.keywords_mentioned && analysis.keywords_mentioned.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Keywords Used</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords_mentioned.map((k, i) => (
                        <span key={i} className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-1 text-[11px] font-medium text-emerald-400">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.keywords_missed && analysis.keywords_missed.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Keywords Missed</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords_missed.map((k, i) => (
                        <span key={i} className="rounded-full bg-red-500/15 border border-red-500/25 px-2 py-1 text-[11px] font-medium text-red-400">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <div className="h-2" />
          </div>
        </div>

        {/* Footer with actions */}
        <div className="px-5 py-4 border-t border-white/8 shrink-0 flex gap-2">
          <button
            onClick={onReanalyze}
            disabled={isReanalyzing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] py-2.5 text-sm font-medium text-white hover:bg-white/[0.1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReanalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
              </>
            )}
          </button>
          <a href="/home" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 transition-all">
            <RotateCcw className="h-3.5 w-3.5" /> Practice Again
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
      className="group w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-left hover:border-indigo-500/40 hover:bg-white/[0.06] transition-all"
    >
      {/* Score ring */}
      <ScoreRing score={score} size={44} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate mb-0.5">
          {session.interview_topics?.name ?? "Unknown Topic"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <CategoryIcon className="h-3 w-3 shrink-0" style={{ color: catColor }} />
            <span className="text-xs text-slate-400">{session.interview_topics?.category ?? "General"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-400">{formatDuration(session.duration_secs)}</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
          session.status === "completed"   ? "bg-emerald-500/20 text-emerald-400" :
          session.status === "in_progress" ? "bg-amber-500/20  text-amber-400"  :
                                             "bg-slate-500/20  text-slate-400"
        }`}>
          {session.status.replace("_", " ")}
        </span>

        <div className="flex items-center gap-1.5">
          {avatarPath ? (
            <Image src={avatarPath} alt={session.interviewers?.name ?? ""} width={22} height={22}
              className="h-5.5 w-5.5 rounded-full object-cover border border-white/15" />
          ) : (
            <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-500/20 text-[9px] font-bold text-indigo-400 border border-white/15">
              {(session.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
          )}
          <span className="text-[11px] text-slate-500">{formatDate(session.started_at)}</span>
        </div>

        <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
      </div>
    </button>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────── */

export default function DashboardClient({ user, profile, stats, recentSessions, analyses, interviewerAvatars }: Props) {
  const supabase = createClient();

  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [localAnalyses, setLocalAnalyses] = useState<Analysis[]>(analyses);

  const latest = localAnalyses[0] ?? null;
  const scoreDiff = getScoreDiff(localAnalyses);
  const overallScore = latest?.overall_score ?? 0;

  const openSession = useCallback((session: SessionRow) => {
    setSelectedSession(session);
  }, []);

  const closeSession = useCallback(() => {
    setSelectedSession(null);
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
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <a href="/home" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold">
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
            <a href="/home" className="ml-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 transition-all">
              + New Interview
            </a>
          </div>
        </div>
      </nav>

      <main className="relative pt-20 pb-16 px-5">
        <div className="mx-auto max-w-5xl">

          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="text-sm text-slate-400">Track your progress and review past sessions</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
            <StatCard icon={Award}        label="Total Sessions"   value={stats?.total_sessions ?? 0}           color="#6366f1" />
            <StatCard icon={CheckCircle2} label="Completed"        value={stats?.completed_sessions ?? 0}       color="#22c55e" />
            <StatCard icon={Star}         label="Avg Score"        value={stats?.avg_overall_score ? Math.round(stats.avg_overall_score) : "—"} color="#f59e0b" />
            <StatCard icon={Clock}        label="Practice Time"    value={totalMins > 0 ? `${totalMins}m` : "—"} color="#ec4899" />
          </div>

          {/* Two column layout */}
          <div className="grid gap-5 lg:grid-cols-2">

            {/* Left: Latest Score & Performance */}
            <div className="space-y-5">

              {/* Score overview card */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <h2 className="text-sm font-bold text-white mb-4">Latest Performance</h2>

                <div className="flex items-center gap-5 mb-5">
                  <ScoreRing score={overallScore} size={72} />
                  <div>
                    <p className="text-4xl font-bold text-white leading-none">{overallScore}</p>
                    <p className="text-xs text-slate-400 mt-0.5">out of 100</p>
                    <p className="text-sm font-semibold mt-1" style={{ color: scoreColor(overallScore) }}>
                      {scoreLabel(overallScore)}
                    </p>
                  </div>
                  {scoreDiff != null && (
                    <span className={`ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                      scoreDiff >= 0 ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                                     : "bg-red-500/15 text-red-400 border border-red-500/25"
                    }`}>
                      {scoreDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {scoreDiff >= 0 ? "+" : ""}{scoreDiff}
                    </span>
                  )}
                </div>

                {/* Performance bars */}
                <div className="space-y-3">
                  <AnimatedBar label="Technical"       value={latest?.technical_score}       colour="#6366f1" icon={Monitor}       delay={0} />
                  <AnimatedBar label="Communication"   value={latest?.communication_score}   colour="#22c55e" icon={MessagesSquare} delay={80} />
                  <AnimatedBar label="Confidence"      value={latest?.confidence_score}      colour="#f59e0b" icon={Shield}         delay={160} />
                  <AnimatedBar label="Problem Solving" value={latest?.problem_solving_score} colour="#ec4899" icon={Puzzle}         delay={240} />
                </div>

                {!latest && (
                  <p className="text-sm text-slate-500 text-center py-6">Complete an interview to see your scores</p>
                )}
              </div>

              {/* Focus areas */}
              {latest?.action_items && latest.action_items.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                      <Target className="h-4 w-4 text-violet-400" />
                    </div>
                    <h2 className="text-sm font-bold text-white">Focus Areas</h2>
                  </div>
                  <ul className="space-y-2">
                    {latest.action_items.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/25 text-[10px] font-bold text-violet-400 shrink-0">{i + 1}</span>
                        <span className="text-xs text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Past Sessions */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                  </div>
                  <h2 className="text-sm font-bold text-white">Past Sessions</h2>
                </div>
                <span className="text-xs text-slate-500 bg-white/[0.05] border border-white/8 rounded-full px-2 py-0.5">
                  {recentSessions.length} total
                </span>
              </div>

              {recentSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 py-12 text-center">
                  <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-400 mb-3">No sessions yet</p>
                  <a href="/home" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                    Start your first interview <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
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
          profile={profile}
          onClose={closeSession}
          interviewerAvatars={interviewerAvatars}
          onReanalyze={handleReanalyze}
          isReanalyzing={isReanalyzing}
        />
      )}
    </div>
  );
}
