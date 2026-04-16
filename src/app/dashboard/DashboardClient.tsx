"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, LayoutDashboard, User as UserIcon, Home,
  LogOut, TrendingUp, Clock, Target, Star, MessageSquare,
  CheckCircle2, AlertCircle, Zap, Award, ChevronRight,
  BarChart3, Mic, Calendar
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
  interviewers: { name: string; title: string } | null;
  interview_topics: { name: string; category: string } | null;
}

interface Props {
  user: User;
  profile: Profile | null;
  stats: Stats | null;
  recentSessions: SessionRow[];
  analyses: Analysis[];
}

/* ─── Helpers ─────────────────────────────────────────────── */
function ScoreRing({ score, label, colour }: { score: number | null; label: string; colour: string }) {
  const val = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  const dash = (val / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36"
            fill="none"
            stroke={colour}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-700"
          />
        </svg>
        <span className="text-xl font-black text-white">{val}</span>
      </div>
      <span className="text-xs font-medium text-slate-400 text-center">{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, sub, colour }: {
  icon: React.ElementType; value: string | number; label: string; sub?: string; colour: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colour}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-white">{value ?? "—"}</p>
      <p className="text-sm font-medium text-slate-300 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ScoreBar({ label, value, colour }: { label: string; value: number | null; colour: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold text-white">{value ?? "—"}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value ?? 0}%`, background: colour }}
        />
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  completed:   "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  in_progress: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  abandoned:   "bg-slate-500/15 text-slate-400 border border-slate-500/20",
};

const CATEGORY_COLOURS: Record<string, string> = {
  Technical:  "text-sky-400",
  HR:         "text-pink-400",
  Leadership: "text-amber-400",
  General:    "text-slate-400",
};

export default function DashboardClient({ user, profile, stats, recentSessions, analyses }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(analyses[0] ?? null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const totalPracticeMin = stats?.total_practice_secs
    ? Math.round(stats.total_practice_secs / 60)
    : 0;

  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen bg-[#060912] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-5%] h-[600px] w-[600px] rounded-full bg-violet-600/8 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-[-5%] h-[500px] w-[500px] rounded-full bg-indigo-600/8 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#060912]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="/home" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold">
              AI <span className="text-indigo-400">Interviewer</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/home" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <Home className="h-3.5 w-3.5" /> Home
            </a>
            <a href="/profile" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <UserIcon className="h-3.5 w-3.5" /> Profile
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative pt-24 pb-16 px-6">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-10 flex items-center justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1">
                <BarChart3 className="h-3 w-3 text-indigo-400" />
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Performance Dashboard</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {displayName}&apos;s Progress
              </h1>
            </div>
            <a
              href="/home"
              className="hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:brightness-110 transition-all"
            >
              New Interview
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* ── Stat Cards ──────────────────────────────────────── */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Mic}      value={stats?.total_sessions ?? 0}      label="Total Sessions"      colour="bg-indigo-500/15 text-indigo-400" />
            <StatCard icon={CheckCircle2} value={stats?.completed_sessions ?? 0} label="Completed"        colour="bg-emerald-500/15 text-emerald-400" />
            <StatCard icon={Star}     value={stats?.avg_overall_score ? `${stats.avg_overall_score}/100` : "—"} label="Avg Overall Score" colour="bg-amber-500/15 text-amber-400" />
            <StatCard icon={Clock}    value={totalPracticeMin > 0 ? `${totalPracticeMin}m` : "—"} label="Practice Time" colour="bg-violet-500/15 text-violet-400" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Left column: scores + analysis ─────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Score rings */}
              {stats && (stats.avg_overall_score != null) && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                  <h2 className="mb-6 text-sm font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Average Scores
                  </h2>
                  <div className="flex flex-wrap justify-around gap-6">
                    <ScoreRing score={stats.avg_overall_score}       label="Overall"       colour="#6366f1" />
                    <ScoreRing score={stats.avg_technical_score}      label="Technical"     colour="#38bdf8" />
                    <ScoreRing score={stats.avg_communication_score}  label="Communication" colour="#34d399" />
                    <ScoreRing score={stats.avg_confidence_score}     label="Confidence"    colour="#f59e0b" />
                  </div>
                </div>
              )}

              {/* Latest AI Analysis */}
              {selectedAnalysis ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
                      <Zap className="h-4 w-4 text-indigo-400" /> Latest AI Analysis
                    </h2>
                    <span className="text-xs text-slate-600">{formatDate(selectedAnalysis.analysis_run_at)}</span>
                  </div>

                  {/* Summary */}
                  {selectedAnalysis.summary && (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <p className="text-sm leading-relaxed text-slate-300">{selectedAnalysis.summary}</p>
                    </div>
                  )}

                  {/* Score bars */}
                  <div className="space-y-3">
                    <ScoreBar label="Overall"        value={selectedAnalysis.overall_score}         colour="#6366f1" />
                    <ScoreBar label="Technical"      value={selectedAnalysis.technical_score}        colour="#38bdf8" />
                    <ScoreBar label="Communication"  value={selectedAnalysis.communication_score}    colour="#34d399" />
                    <ScoreBar label="Confidence"     value={selectedAnalysis.confidence_score}       colour="#f59e0b" />
                    <ScoreBar label="Problem Solving" value={selectedAnalysis.problem_solving_score} colour="#f472b6" />
                  </div>

                  {/* Strengths + Areas */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedAnalysis.strengths && selectedAnalysis.strengths.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold tracking-widest text-emerald-400 uppercase">Strengths</p>
                        <ul className="space-y-1.5">
                          {selectedAnalysis.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedAnalysis.areas_to_improve && selectedAnalysis.areas_to_improve.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold tracking-widest text-amber-400 uppercase">Improve</p>
                        <ul className="space-y-1.5">
                          {selectedAnalysis.areas_to_improve.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Action items */}
                  {selectedAnalysis.action_items && selectedAnalysis.action_items.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-bold tracking-widest text-indigo-400 uppercase">Action Items</p>
                      <ul className="space-y-1.5">
                        {selectedAnalysis.action_items.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Sentiment + engagement */}
                  <div className="flex flex-wrap gap-3">
                    {selectedAnalysis.sentiment && (
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                        selectedAnalysis.sentiment === "positive"
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                          : selectedAnalysis.sentiment === "negative"
                          ? "border-red-500/25 bg-red-500/10 text-red-400"
                          : "border-slate-500/25 bg-slate-500/10 text-slate-400"
                      }`}>
                        {selectedAnalysis.sentiment} sentiment
                      </span>
                    )}
                    {selectedAnalysis.engagement_level && (
                      <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 capitalize">
                        {selectedAnalysis.engagement_level} engagement
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                  <Award className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                  <p className="text-sm font-semibold text-slate-500">No analysis yet</p>
                  <p className="mt-1 text-xs text-slate-700">Complete an interview to see your AI-powered performance analysis.</p>
                  <a href="/home" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 px-4 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-600/30 transition-colors">
                    Start Interview <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* ── Right column: recent sessions ─────────────────── */}
            <div className="space-y-5">
              <h2 className="text-sm font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Recent Sessions
              </h2>

              {recentSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                  <p className="text-sm text-slate-600">No sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">
                            {s.interviewers?.name ?? "AI Interviewer"}
                          </p>
                          <p className={`text-xs mt-0.5 font-medium ${CATEGORY_COLOURS[s.interview_topics?.category ?? ""] ?? "text-slate-400"}`}>
                            {s.interview_topics?.name ?? "Unknown topic"}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLES[s.status] ?? STATUS_STYLES.abandoned}`}>
                          {s.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{formatDate(s.started_at)}</span>
                        {s.duration_secs && (
                          <>
                            <span className="text-white/10">•</span>
                            <span>{formatDuration(s.duration_secs)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent analyses selector */}
              {analyses.length > 1 && (
                <div className="pt-4 border-t border-white/5">
                  <p className="mb-3 text-xs font-bold tracking-widest text-slate-600 uppercase">View Analysis For</p>
                  <div className="space-y-2">
                    {analyses.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAnalysis(a)}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${
                          selectedAnalysis?.id === a.id
                            ? "bg-indigo-500/10 border border-indigo-500/25 text-indigo-300"
                            : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="font-medium">{formatDate(a.analysis_run_at)}</span>
                        <span className="font-black">{a.overall_score ?? "—"}<span className="text-xs font-normal text-slate-600">/100</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
