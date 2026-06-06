"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, LayoutDashboard, User as UserIcon, LogOut,
  Sparkles, Mic, Play, ChevronDown, Target, Users,
  CheckCircle2, Loader2, Briefcase, X,
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

const PERSONALITY_STYLES: Record<string, string> = {
  Friendly:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Strict:      "bg-red-500/15 text-red-400 border-red-500/25",
  Analytical:  "bg-sky-500/15 text-sky-400 border-sky-500/25",
  Relaxed:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Encouraging: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  Direct:      "bg-orange-500/15 text-orange-400 border-orange-500/25",
};

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-red-500 to-orange-500",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-yellow-600",
];

const CATEGORY_COLOURS: Record<string, string> = {
  Technical:  "text-sky-400  bg-sky-400/10  border-sky-400/20",
  HR:         "text-pink-400 bg-pink-400/10 border-pink-400/20",
  Leadership: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  General:    "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

export default function HomeClient({ user, profile, interviewers, topics }: Props) {
  const router   = useRouter();
  const supabase = createClient();

  const [selectedIdx, setSelectedIdx]       = useState(Math.min(1, interviewers.length - 1));
  const [selectedTopic, setSelectedTopic]   = useState<Topic | null>(null);
  const [showPopup, setShowPopup]           = useState(false);
  const [starting, setStarting]             = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const selectedInterviewer = interviewers[selectedIdx] ?? null;

  const groupedTopics = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  function handleCarouselChange(index: number) {
    setSelectedIdx(index);
  }

  function handleSelectInterviewer() {
    if (!selectedInterviewer) return;
    setShowPopup(true);
  }

  async function handleStartInterview() {
    if (!selectedInterviewer || !selectedTopic) return;
    setStarting(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabase as any)
      .from("interview_sessions")
      .insert({
        user_id:        user.id,
        interviewer_id: selectedInterviewer.id,
        topic_id:       selectedTopic.id,
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
  const gradient    = AVATAR_GRADIENTS[selectedIdx % AVATAR_GRADIENTS.length];
  const initials    = selectedInterviewer?.name.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "AI";
  const personalityStyle = PERSONALITY_STYLES[selectedInterviewer?.personality ?? ""] ?? "bg-white/5 text-slate-400 border-white/10";

  const carouselSlides = interviewers.map((iv) => ({
    title:  iv.name,
    button: iv.personality ?? "Meet Interviewer",
    src:    iv.avatar_url && (iv.avatar_url.startsWith("/") || iv.avatar_url.startsWith("http"))
      ? iv.avatar_url
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(iv.name)}&background=6366f1&color=fff&size=400`,
  }));

  return (
    <div className="min-h-screen bg-[#060912] text-white overflow-x-hidden">

      {/* Background - simplified for mobile performance */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[400px] w-[400px] sm:h-[700px] sm:w-[700px] rounded-full bg-indigo-600/8 blur-[100px] sm:blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[350px] w-[350px] sm:h-[600px] sm:w-[600px] rounded-full bg-violet-600/8 blur-[80px] sm:blur-[130px]" />
      </div>

      {/* Navbar - Mobile Responsive */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#060912]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm sm:text-base font-bold">
              AI <span className="text-indigo-400">Interviewer</span>
            </span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="/dashboard" className="flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-400 active:bg-white/10 sm:hover:bg-white/5 sm:hover:text-white transition-colors touch-manipulation">
              <LayoutDashboard className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Dashboard</span>
            </a>
            <a href="/profile" className="flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-400 active:bg-white/10 sm:hover:bg-white/5 sm:hover:text-white transition-colors touch-manipulation">
              <UserIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Profile</span>
            </a>
            <button onClick={handleLogout} className="flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-400 active:bg-red-500/10 active:text-red-400 sm:hover:bg-red-500/10 sm:hover:text-red-400 transition-colors touch-manipulation" aria-label="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">

          {/* Welcome */}
          <div className="mb-5 sm:mb-6 text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 sm:px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest text-indigo-400 uppercase">Ready to practice?</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">Hey, {displayName} 👋</h1>
            <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-400">
              Select an interviewer below, then choose your topic.
            </p>
          </div>
        </div>

        {/* ── Carousel — full-width section ── */}
        {carouselSlides.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <p className="mb-2 sm:mb-3 text-center text-[10px] font-bold tracking-widest text-slate-600 uppercase flex items-center justify-center gap-2">
              <Users className="h-3 w-3" /> Choose your interviewer
            </p>
            <Carousel
              slides={carouselSlides}
              initialIndex={Math.min(1, carouselSlides.length - 1)}
              onSlideChange={handleCarouselChange}
            />
          </div>
        )}

        {/* ── Selected interviewer detail + Select button ─────────── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {selectedInterviewer && (
            <div className="mx-auto max-w-xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3 sm:space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} text-base sm:text-lg font-black text-white overflow-hidden shadow-lg`}>
                    {selectedInterviewer.avatar_url ? (
                      <img src={selectedInterviewer.avatar_url} alt={selectedInterviewer.name} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">{selectedInterviewer.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-400 truncate">{selectedInterviewer.title}</p>
                    {selectedInterviewer.company && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-600" />
                        <span className="text-[10px] sm:text-xs text-slate-500">{selectedInterviewer.company}</span>
                      </div>
                    )}
                  </div>
                  {selectedInterviewer.personality && (
                    <span className={`shrink-0 rounded-full border px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold ${personalityStyle}`}>
                      {selectedInterviewer.personality}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {selectedInterviewer.bio && (
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-400">{selectedInterviewer.bio}</p>
                )}

                {/* Specialties */}
                {selectedInterviewer.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {selectedInterviewer.specialties.map((s) => (
                      <span key={s} className="rounded-full border border-white/10 bg-white/5 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs text-slate-300">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Select button */}
                <button
                  onClick={handleSelectInterviewer}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all sm:hover:brightness-110 touch-manipulation"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Select {selectedInterviewer.name}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Topic Selection Popup ─────────────────────────────────── */}
      {showPopup && selectedInterviewer && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => { setShowPopup(false); setError(null); }}
          />

          {/* Modal - Mobile: slide up from bottom, Desktop: centered */}
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in duration-300 sm:duration-200">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
              {/* Mobile drag indicator */}
              <div className="sm:hidden flex justify-center mb-2">
                <div className="w-10 h-1 rounded-full bg-slate-600" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xs font-bold text-white overflow-hidden`}>
                    {selectedInterviewer.avatar_url ? (
                      <img src={selectedInterviewer.avatar_url} alt={selectedInterviewer.name} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedInterviewer.name}</p>
                    <p className="text-xs text-slate-500">{selectedInterviewer.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPopup(false); setError(null); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 active:bg-white/10 active:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                <Target className="h-3.5 w-3.5" />
                Choose a Topic
              </h3>

              {/* Topic list */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                {Object.entries(groupedTopics).map(([category, catTopics]) => (
                  <div key={category}>
                    <div className={`sticky top-0 z-10 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase bg-[#0d1117] border-b border-white/5 ${CATEGORY_COLOURS[category] ?? "text-slate-500"}`}>
                      {category}
                    </div>
                    {catTopics.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTopic(t)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-sm active:bg-white/10 transition-colors touch-manipulation ${
                          selectedTopic?.id === t.id ? "bg-indigo-500/10 text-indigo-300" : "text-slate-300"
                        }`}
                      >
                        <span className="text-left">{t.name}</span>
                        {selectedTopic?.id === t.id && <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Topic description */}
              {selectedTopic?.description && (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                  <p className="text-xs leading-relaxed text-slate-500">{selectedTopic.description}</p>
                </div>
              )}

              {/* Session preview */}
              {selectedTopic && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 space-y-2">
                  <p className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">Session Preview</p>
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-white">{selectedInterviewer.name}</span>
                    {" "}will interview you on{" "}
                    <span className="text-indigo-300">{selectedTopic.name}</span>
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <Mic className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Voice + text</span>
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
            </div>

            {/* Fixed bottom button */}
            <div className="flex-shrink-0 border-t border-white/5 p-4 sm:px-5 sm:py-4 bg-[#0d1117]">
              <button
                onClick={handleStartInterview}
                disabled={!selectedTopic || starting}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
              >
                {starting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</>
                ) : (
                  <><Play className="h-4 w-4 fill-white" /> Start Interview</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
