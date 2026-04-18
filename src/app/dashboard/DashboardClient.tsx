"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, Home, User as UserIcon,
  TrendingDown, TrendingUp, CheckCircle2,
  Clock, MessageSquare, HelpCircle, ChevronRight,
  Monitor, MessagesSquare, Shield, Puzzle
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
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getScoreDiff(analyses: Analysis[]): number | null {
  if (analyses.length < 2) return null;
  const latest = analyses[0]?.overall_score;
  const prev = analyses[1]?.overall_score;
  if (latest == null || prev == null) return null;
  return latest - prev;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Technical: Monitor,
  HR: MessagesSquare,
  Leadership: Shield,
  General: Puzzle,
};

const STATUS_STYLES: Record<string, string> = {
  completed:   "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  in_progress: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  abandoned:   "bg-slate-500/15 text-slate-400 border border-slate-500/20",
};

/* ─── Animated Performance Bar ─────────────────────────── */

function AnimatedBar({ label, value, colour, icon: Icon }: {
  label: string; value: number | null; colour: string; icon: React.ElementType;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const val = value ?? 0;

  return (
    <div ref={barRef} className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <div className="flex-1">
        <div className="flex justify-between mb-1.5">
          <span className="text-sm text-slate-300">{label}</span>
          <span className="text-sm font-bold text-white">{val}</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all ease-out"
            style={{
              width: visible ? `${val}%` : "0%",
              background: colour,
              transitionDuration: "1.2s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function DashboardClient({
  user, profile, stats, recentSessions, analyses, interviewerAvatars,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

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

  const questionsAnswered = latest?.keywords_mentioned?.length ?? 0;
  const followUpNeeded = latest?.engagement_level ?? "—";

  const avgAnswerLength = (() => {
    if (!latest) return "—";
    const score = latest.communication_score ?? 0;
    if (score >= 70) return "Detailed";
    if (score >= 40) return "Moderate";
    return "Short";
  })();

  function getInterviewerAvatar(name: string | undefined): string | null {
    if (!name) return null;
    return interviewerAvatars[name] || null;
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-5%] h-[600px] w-[600px] rounded-full bg-violet-600/8 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] h-[500px] w-[500px] rounded-full bg-indigo-600/8 blur-[120px]" />
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

          {/* ═══ Top Row: Overall Score + Performance Breakdown ═══ */}
          <div className="grid gap-4 lg:grid-cols-2 mb-4">

            {/* ── Overall Score Card ── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Overall Score</h2>
                {scoreDiff != null && (
                  <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                    scoreDiff >= 0
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {scoreDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {scoreDiff >= 0 ? "+" : ""}{scoreDiff} from last interview
                  </span>
                )}
              </div>

              <p className="text-6xl font-black tracking-tight text-white mb-6">
                {overallScore}<span className="text-2xl font-bold text-slate-600">/100</span>
              </p>

              <div className="space-y-2.5">
                {strongestSkill && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">
                      <span className="font-semibold text-white">Strongest Skill</span>{" "}
                      {strongestSkill.name} ({strongestSkill.score})
                    </span>
                  </div>
                )}
                {weakestSkill && (
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-slate-300">
                      <span className="font-semibold text-white">Weakest Skill</span>{" "}
                      {weakestSkill.name} ({weakestSkill.score})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Performance Breakdown ── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-5">Performance Breakdown</h2>
              <div className="space-y-4">
                <AnimatedBar label="Technical"      value={latest?.technical_score}       colour="#6366f1" icon={Monitor} />
                <AnimatedBar label="Communication"  value={latest?.communication_score}   colour="#22c55e" icon={MessagesSquare} />
                <AnimatedBar label="Confidence"     value={latest?.confidence_score}      colour="#f59e0b" icon={Shield} />
                <AnimatedBar label="Problem Solving" value={latest?.problem_solving_score} colour="#ec4899" icon={Puzzle} />
              </div>
            </div>
          </div>

          {/* ═══ Second Row: What to Improve + Interview Summary ═══ */}
          <div className="grid gap-4 lg:grid-cols-2 mb-4">

            {/* ── What to Improve Next ── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> What to Improve Next
              </h2>

              {latest?.action_items && latest.action_items.length > 0 ? (
                <ul className="space-y-3 mb-4">
                  {latest.action_items.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-sm text-slate-300 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 mb-4">Complete an interview to see improvement suggestions.</p>
              )}

              {latest?.detailed_feedback && (
                <button
                  onClick={() => {
                    const el = document.getElementById("detailed-feedback");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  View Detailed Feedback
                </button>
              )}
            </div>

            {/* ── Interview Summary ── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-200">Interview Summary</h2>
                {recentSessions.length > 0 && (
                  <span className="text-xs text-indigo-400 font-medium cursor-pointer hover:text-indigo-300">View All</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="text-sm font-bold text-white">
                      {recentSessions[0] ? formatDuration(recentSessions[0].duration_secs) : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Questions Answered</p>
                    <p className="text-sm font-bold text-white">{questionsAnswered || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MessagesSquare className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Avg Answer Length</p>
                    <p className="text-sm font-bold text-white">{avgAnswerLength}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Follow-Up Needed</p>
                    <p className="text-sm font-bold text-white capitalize">{followUpNeeded}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Past Sessions ═══ */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200">Past Sessions</h2>
              {recentSessions.length > 4 && (
                <span className="text-xs text-indigo-400 font-medium cursor-pointer hover:text-indigo-300">View All</span>
              )}
            </div>

            {recentSessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                <p className="text-sm text-slate-500">No sessions yet. Start your first interview!</p>
                <a href="/home" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  Start Interview <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recentSessions.slice(0, 6).map((s) => {
                  const avatarPath = getInterviewerAvatar(s.interviewers?.name);
                  const sessionAnalysis = analyses.find((a) => a.session_id === s.id);
                  const score = sessionAnalysis?.overall_score;
                  const CategoryIcon = CATEGORY_ICONS[s.interview_topics?.category ?? ""] ?? Puzzle;

                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer"
                    >
                      {/* Score circle */}
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                          <circle
                            cx="24" cy="24" r="20"
                            fill="none"
                            stroke={score != null && score >= 60 ? "#22c55e" : score != null && score >= 40 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${((score ?? 0) / 100) * (2 * Math.PI * 20)} ${2 * Math.PI * 20}`}
                          />
                        </svg>
                        <span className="text-sm font-black text-white">{score ?? "—"}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-white truncate">
                            {s.interview_topics?.name ?? "Unknown Topic"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CategoryIcon className="h-3 w-3" />
                          <span>{s.interview_topics?.category ?? "General"}</span>
                          <span className="text-white/10">•</span>
                          <span className={`capitalize ${
                            s.status === "completed" ? "text-emerald-500" :
                            s.status === "in_progress" ? "text-amber-500" : "text-slate-500"
                          }`}>
                            {s.status === "completed" ? "Proficient" : s.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {/* Interviewer avatar + date */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        {avatarPath ? (
                          <Image
                            src={avatarPath}
                            alt={s.interviewers?.name ?? "Interviewer"}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-400 border border-white/10">
                            {(s.interviewers?.name ?? "AI").split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-600">{formatDate(s.started_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ Detailed Feedback (expandable) ═══ */}
          {latest?.detailed_feedback && (
            <div id="detailed-feedback" className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Detailed Feedback</h2>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">{latest.detailed_feedback}</p>
            </div>
          )}

          {/* ═══ Strengths & Areas to Improve ═══ */}
          {latest && (latest.strengths?.length || latest.areas_to_improve?.length) ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {latest.strengths && latest.strengths.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <p className="mb-3 text-xs font-bold tracking-widest text-emerald-400 uppercase">Strengths</p>
                  <ul className="space-y-2">
                    {latest.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {latest.areas_to_improve && latest.areas_to_improve.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <p className="mb-3 text-xs font-bold tracking-widest text-amber-400 uppercase">Areas to Improve</p>
                  <ul className="space-y-2">
                    {latest.areas_to_improve.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

        </div>
      </main>
    </div>
  );
}
