"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, ChevronLeft, ChevronRight, LayoutDashboard,
  User as UserIcon, LogOut, Sparkles, Mic, Play, ChevronDown,
  Briefcase, Code2, Monitor, Target, GraduationCap, Users,
  CheckCircle2, Loader2
} from "lucide-react";

type Profile      = Database["public"]["Tables"]["profiles"]["Row"];
type Interviewer  = Database["public"]["Tables"]["interviewers"]["Row"];
type Topic        = Database["public"]["Tables"]["interview_topics"]["Row"];

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

/* ── Interviewer avatar gradient (by index) ─────────────────── */
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

/* ── Specialty icon mapping ────────────────────────────────── */
function SpecialtyBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
      {label}
    </span>
  );
}

export default function HomeClient({ user, profile, interviewers, topics }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [activeSlide, setActiveSlide]       = useState(0);
  const [selectedTopic, setSelectedTopic]   = useState<Topic | null>(null);
  const [topicDropdown, setTopicDropdown]   = useState(false);
  const [starting, setStarting]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const interviewer = interviewers[activeSlide];
  const totalSlides = interviewers.length;

  function prevSlide() {
    setActiveSlide((i) => (i - 1 + totalSlides) % totalSlides);
  }
  function nextSlide() {
    setActiveSlide((i) => (i + 1) % totalSlides);
  }

  async function handleStartInterview() {
    if (!interviewer || !selectedTopic) return;
    setStarting(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabase as any)
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        interviewer_id: interviewer.id,
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
  const avatarGradient = AVATAR_GRADIENTS[activeSlide % AVATAR_GRADIENTS.length];
  const initials = interviewer?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "AI";

  // Group topics by category
  const groupedTopics = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

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
              Hire<span className="text-indigo-400">-check</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/dashboard" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
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
        <div className="mx-auto max-w-6xl">

          {/* Welcome */}
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">Ready to practice?</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Hey, {displayName} 👋
            </h1>
            <p className="mt-2 text-slate-400">
              Pick an interviewer and a topic — your AI interview starts instantly.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">

            {/* ── Interviewer Carousel ──────────────────────────── */}
            <div>
              <h2 className="mb-5 text-sm font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
                <Users className="h-4 w-4" />
                Choose Your Interviewer
              </h2>

              {/* Slide counter */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-slate-600">{activeSlide + 1} / {totalSlides}</span>
                <div className="flex gap-1.5">
                  {interviewers.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeSlide ? "w-6 bg-indigo-500" : "w-1.5 bg-white/15 hover:bg-white/30"
                      }`}
                      aria-label={`Go to interviewer ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm">
                {/* Nav arrows */}
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                  aria-label="Previous interviewer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                  aria-label="Next interviewer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {interviewer && (
                  <div className="px-8 space-y-5">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-5">
                      <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient} shadow-lg text-2xl font-black text-white`}>
                        {interviewer.avatar_url ? (
                          <img src={interviewer.avatar_url} alt={interviewer.name} className="h-full w-full rounded-2xl object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-black">{interviewer.name}</h3>
                        <p className="text-sm text-slate-400">{interviewer.title}</p>
                        {interviewer.company && (
                          <p className="text-xs text-slate-500 mt-0.5">@ {interviewer.company}</p>
                        )}
                      </div>
                    </div>

                    {/* Personality */}
                    {interviewer.personality && (
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${PERSONALITY_STYLES[interviewer.personality] ?? "bg-white/5 text-slate-400 border-white/10"}`}>
                          {interviewer.personality}
                        </span>
                        <span className="text-xs text-slate-600">Interview Style</span>
                      </div>
                    )}

                    {/* Bio */}
                    {interviewer.bio && (
                      <p className="text-sm leading-relaxed text-slate-400">{interviewer.bio}</p>
                    )}

                    {/* Specialties */}
                    {interviewer.specialties?.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Specialises in</p>
                        <div className="flex flex-wrap gap-2">
                          {interviewer.specialties.map((s) => (
                            <SpecialtyBadge key={s} label={s} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mini cards row */}
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {interviewers.map((iv, i) => (
                  <button
                    key={iv.id}
                    onClick={() => setActiveSlide(i)}
                    className={`group rounded-xl border p-2.5 text-center transition-all ${
                      i === activeSlide
                        ? "border-indigo-500/50 bg-indigo-500/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} text-xs font-bold text-white`}>
                      {iv.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <p className="text-[10px] leading-tight text-slate-400 truncate">{iv.name.split(" ")[0]}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Topic Selection + Start ───────────────────────── */}
            <div className="space-y-6">
              <div>
                <h2 className="mb-5 text-sm font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
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
                </div>

                {/* Topic description */}
                {selectedTopic?.description && (
                  <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs leading-relaxed text-slate-500">{selectedTopic.description}</p>
                  </div>
                )}
              </div>

              {/* Session preview card */}
              {interviewer && selectedTopic && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-4 space-y-3">
                  <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Session Preview</p>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient} text-sm font-bold text-white`}>
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{interviewer.name}</p>
                      <p className="text-xs text-slate-400">will interview you on <span className="text-indigo-300">{selectedTopic.name}</span></p>
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
                disabled={!interviewer || !selectedTopic || starting}
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

          {/* ── How it works mini section ─────────────────────── */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-sm font-bold tracking-widest text-slate-600 uppercase">How it works</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { icon: Users,         n: "01", label: "Pick Interviewer",   desc: "Choose the AI persona that matches your target role." },
                { icon: Target,        n: "02", label: "Select Topic",        desc: "Pick from 16+ categories — DSA, System Design, HR, and more." },
                { icon: Mic,           n: "03", label: "Live Interview",      desc: "Speak or type your answers in real-time with the AI." },
                { icon: LayoutDashboard, n: "04", label: "Get Analysis",     desc: "Review your scores, strengths, and action items on the Dashboard." },
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
