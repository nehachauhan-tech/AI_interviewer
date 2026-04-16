"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, LayoutDashboard, User as UserIcon, LogOut,
  Sparkles, Mic, Play, ChevronDown, Target, Users,
  CheckCircle2, Loader2, Briefcase, Star, BadgeCheck,
} from "lucide-react";
import Carousel from "@/components/ui/carousel";

type Profile     = Database["public"]["Tables"]["profiles"]["Row"];
type Interviewer = Database["public"]["Tables"]["interviewers"]["Row"];
type Topic       = Database["public"]["Tables"]["interview_topics"]["Row"];

interface Props {
  user: User;
  profile: Profile | null;
  interviewers: Interviewer[];
  topics: Topic[];
}

/* ── Personality badge colours ─────────────────────────────── */
const PERSONALITY_STYLES: Record<string, string> = {
  Friendly:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Strict:      "bg-red-500/15 text-red-400 border-red-500/25",
  Analytical:  "bg-sky-500/15 text-sky-400 border-sky-500/25",
  Relaxed:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Encouraging: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  Direct:      "bg-orange-500/15 text-orange-400 border-orange-500/25",
};

/* ── Avatar gradients ────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-red-500 to-orange-500",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-yellow-600",
];

/* ── Topic category colours ────────────────────────────────── */
const CATEGORY_COLOURS: Record<string, string> = {
  Technical:  "text-sky-400  bg-sky-400/10  border-sky-400/20",
  HR:         "text-pink-400 bg-pink-400/10 border-pink-400/20",
  Leadership: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  General:    "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

/* ── Interviewer card ────────────────────────────────────────── */
function InterviewerCard({
  interviewer,
  index,
  selected,
  onSelect,
}: {
  interviewer: Interviewer;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const initials = interviewer.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const personalityStyle = PERSONALITY_STYLES[interviewer.personality ?? ""] ?? "bg-white/5 text-slate-400 border-white/10";

  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-200 hover:scale-[1.02] ${
        selected
          ? "border-indigo-500/60 bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-600/10"
          : "border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.04]"
      }`}
      aria-pressed={selected}
    >
      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
          <CheckCircle2 className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Avatar */}
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-md text-lg font-black text-white overflow-hidden`}>
        {interviewer.avatar_url ? (
          <img src={interviewer.avatar_url} alt={interviewer.name} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>

      {/* Name + title */}
      <h3 className="text-sm font-bold text-white leading-tight">{interviewer.name}</h3>
      <p className="mt-0.5 text-xs text-slate-400 leading-snug">{interviewer.title}</p>
      {interviewer.company && (
        <div className="mt-1 flex items-center gap-1">
          <Briefcase className="h-3 w-3 text-slate-600" />
          <p className="text-[10px] text-slate-500">{interviewer.company}</p>
        </div>
      )}

      {/* Personality badge */}
      {interviewer.personality && (
        <span className={`mt-3 inline-block self-start rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${personalityStyle}`}>
          {interviewer.personality}
        </span>
      )}

      {/* Specialties */}
      {interviewer.specialties?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {interviewer.specialties.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
              {s}
            </span>
          ))}
          {interviewer.specialties.length > 3 && (
            <span className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
              +{interviewer.specialties.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bio snippet */}
      {interviewer.bio && (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500 line-clamp-2">{interviewer.bio}</p>
      )}
    </button>
  );
}

export default function HomeClient({ user, profile, interviewers, topics }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedInterviewer, setSelectedInterviewer] = useState<Interviewer | null>(
    interviewers[0] ?? null
  );
  const [selectedTopic, setSelectedTopic]   = useState<Topic | null>(null);
  const [topicDropdown, setTopicDropdown]   = useState(false);
  const [starting, setStarting]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  async function handleStartInterview() {
    if (!selectedInterviewer || !selectedTopic) return;
    setStarting(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabase as any)
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        interviewer_id: selectedInterviewer.id,
        topic_id: selectedTopic.id,
      })
      .select()
      .single();

    if (sessionError || !session) {
      setError((sessionError as { message?: string })?.message ?? "Failed to create session");
      setStarting(false);
      return;
    }

    router.push(`/interview/${(session as { id: string }).id}`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";

  const groupedTopics = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  /* ── Carousel slides — one per interviewer ─────────────────── */
  const carouselSlides = interviewers.map((iv) => ({
    title: iv.name,
    button: iv.personality ?? "Meet Interviewer",
    src: iv.avatar_url && iv.avatar_url.startsWith("http")
      ? iv.avatar_url
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(iv.name)}&background=6366f1&color=fff&size=400`,
  }));

  const selectedIdx = selectedInterviewer
    ? interviewers.findIndex((iv) => iv.id === selectedInterviewer.id)
    : -1;

  return (
    <div className="min-h-screen bg-[#060912] text-white">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[700px] w-[700px] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#060912]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold">
              AI <span className="text-indigo-400">Interviewer</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </a>
            <a
              href="/profile"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <UserIcon className="h-3.5 w-3.5" /> Profile
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative pt-24 pb-20 px-6">
        <div className="mx-auto max-w-7xl">

          {/* ── Welcome ─────────────────────────────────────────── */}
          <div className="mb-14 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">Ready to practice?</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Hey, {displayName} 👋
            </h1>
            <p className="mt-2 text-slate-400 text-sm sm:text-base">
              Pick an interviewer and a topic — your AI interview starts instantly.
            </p>
          </div>

          {/* ── Carousel Hero ────────────────────────────────────── */}
          {carouselSlides.length > 0 && (
            <div className="mb-16 overflow-hidden">
              <h2 className="mb-6 text-center text-xs font-bold tracking-widest text-slate-600 uppercase flex items-center justify-center gap-2">
                <Star className="h-3.5 w-3.5 text-indigo-400" />
                Meet Your AI Interviewers
              </h2>
              <div className="relative overflow-hidden w-full py-10">
                <Carousel slides={carouselSlides} />
              </div>
            </div>
          )}

          {/* ── Two-column layout ────────────────────────────────── */}
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">

            {/* ── Interviewer Grid ─────────────────────────────── */}
            <div>
              <h2 className="mb-5 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                <Users className="h-4 w-4" />
                Choose Your Interviewer
                {selectedInterviewer && (
                  <span className="ml-auto text-[10px] font-semibold text-indigo-400 normal-case tracking-normal">
                    {selectedInterviewer.name} selected
                  </span>
                )}
              </h2>

              {interviewers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                  <p className="text-sm text-slate-600">No interviewers available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {interviewers.map((iv, i) => (
                    <InterviewerCard
                      key={iv.id}
                      interviewer={iv}
                      index={i}
                      selected={selectedInterviewer?.id === iv.id}
                      onSelect={() => setSelectedInterviewer(iv)}
                    />
                  ))}
                </div>
              )}

              {/* Selected interviewer detail strip */}
              {selectedInterviewer && (
                <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3.5 flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[selectedIdx % AVATAR_GRADIENTS.length]} text-xs font-bold text-white`}>
                    {selectedInterviewer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{selectedInterviewer.name}</p>
                    <p className="text-xs text-slate-400 truncate">{selectedInterviewer.title}</p>
                  </div>
                  <BadgeCheck className="ml-auto h-4 w-4 shrink-0 text-indigo-400" />
                </div>
              )}
            </div>

            {/* ── Topic Selection + Start ──────────────────────── */}
            <div className="space-y-6">
              <div>
                <h2 className="mb-5 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                  <Target className="h-4 w-4" />
                  Choose a Topic
                </h2>

                {/* Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTopicDropdown(!topicDropdown)}
                    className={`flex w-full items-center justify-between rounded-xl border bg-white/[0.03] px-4 py-3.5 text-sm transition-all ${
                      topicDropdown
                        ? "border-indigo-500/50 ring-2 ring-indigo-500/20"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    aria-expanded={topicDropdown}
                  >
                    <span className={selectedTopic ? "text-white" : "text-slate-500"}>
                      {selectedTopic ? selectedTopic.name : "Select an interview topic…"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${topicDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {topicDropdown && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/50">
                      {Object.entries(groupedTopics).map(([category, catTopics]) => (
                        <div key={category}>
                          <div className={`sticky top-0 px-4 py-2 text-[10px] font-bold tracking-widest uppercase bg-[#0d1117] ${CATEGORY_COLOURS[category] ?? "text-slate-500"}`}>
                            {category}
                          </div>
                          {catTopics.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTopic(t);
                                setTopicDropdown(false);
                              }}
                              className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-white/5 ${
                                selectedTopic?.id === t.id ? "bg-indigo-500/10 text-indigo-300" : "text-slate-300"
                              }`}
                            >
                              <span>{t.name}</span>
                              {selectedTopic?.id === t.id && (
                                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {topicDropdown && (
                    <div className="fixed inset-0 z-10" onClick={() => setTopicDropdown(false)} aria-hidden="true" />
                  )}
                </div>

                {/* Topic description */}
                {selectedTopic?.description && (
                  <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs leading-relaxed text-slate-500">{selectedTopic.description}</p>
                  </div>
                )}
              </div>

              {/* Session preview */}
              {selectedInterviewer && selectedTopic && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-4 space-y-3">
                  <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Session Preview</p>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[selectedIdx % AVATAR_GRADIENTS.length]} text-sm font-bold text-white`}>
                      {selectedInterviewer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedInterviewer.name}</p>
                      <p className="text-xs text-slate-400">
                        will interview you on <span className="text-indigo-300">{selectedTopic.name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <Mic className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Voice + text interaction</span>
                    <span className="text-white/20">•</span>
                    <span>Recorded &amp; analysed</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Start button */}
              <button
                onClick={handleStartInterview}
                disabled={!selectedInterviewer || !selectedTopic || starting}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-indigo-600/30 transition-all hover:brightness-110 hover:shadow-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 fill-white" />
                    Start Interview
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-600">
                The session is recorded (audio + text) for performance analysis.
              </p>
            </div>
          </div>

          {/* ── How it works ─────────────────────────────────────── */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-xs font-bold tracking-widest text-slate-600 uppercase">How it works</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { icon: Users,           n: "01", label: "Pick Interviewer",  desc: "Choose the AI persona that matches your target role." },
                { icon: Target,          n: "02", label: "Select Topic",       desc: "Pick from 16+ categories — DSA, System Design, HR, and more." },
                { icon: Mic,             n: "03", label: "Live Interview",     desc: "Speak or type your answers in real-time with the AI." },
                { icon: LayoutDashboard, n: "04", label: "Get Analysis",      desc: "Review your scores, strengths, and action items on the Dashboard." },
              ].map(({ icon: Icon, n, label, desc }) => (
                <div key={n} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-lg font-black text-indigo-400">
                    {n}
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">{label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
