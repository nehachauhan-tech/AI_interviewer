"use client";

import { useState, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  BrainCircuit, User as UserIcon, Phone, GraduationCap,
  Camera, Loader2, CheckCircle2, ArrowRight, LayoutDashboard, Home,
  FileText, Upload, Trash2, Sparkles, Briefcase, Code2, FolderOpen, Award
} from "lucide-react";
import type { ResumeAnalysis } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Props {
  user: User;
  profile: Profile | null;
}

export default function ProfileForm({ user, profile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [qualification, setQualification] = useState(profile?.qualification ?? "");
  const [contactNumber, setContactNumber] = useState(profile?.contact_number ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [resumeUrl, setResumeUrl] = useState(profile?.resume_url ?? "");
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(
    (profile?.resume_analysis as ResumeAnalysis) ?? null
  );
  const resumeRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isProfileComplete = !!(fullName && qualification && contactNumber);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Avatar upload failed: " + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploadingAvatar(false);
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Resume must be under 5 MB");
      return;
    }

    setUploadingResume(true);
    setError(null);

    const path = `${user.id}/${Date.now()}_resume.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Resume upload failed: " + uploadError.message);
      setUploadingResume(false);
      return;
    }

    setResumeUrl(path);
    setUploadingResume(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("profiles").update({ resume_url: path }).eq("id", user.id);

    setAnalyzingResume(true);
    try {
      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeUrl: path }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setResumeAnalysis(data.analysis);
      } else {
        setError(data.error || "Resume analysis failed");
      }
    } catch {
      setError("Failed to analyze resume");
    } finally {
      setAnalyzingResume(false);
    }
  }

  async function handleRemoveResume() {
    if (!resumeUrl) return;
    setError(null);

    await supabase.storage.from("resumes").remove([resumeUrl]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("profiles")
      .update({ resume_url: null, resume_analysis: null })
      .eq("id", user.id);

    setResumeUrl("");
    setResumeAnalysis(null);
    if (resumeRef.current) resumeRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        qualification,
        contact_number: contactNumber,
        avatar_url: avatarUrl || null,
        resume_url: resumeUrl || null,
        resume_analysis: resumeAnalysis || null,
      });

      if (error) {
        setError(error.message);
      } else {
        setSaved(true);
        setTimeout(() => {
          router.push("/home");
          router.refresh();
        }, 1200);
      }
    });
  }

  const displayAvatar = avatarPreview || avatarUrl;
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-[#060912] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#060912]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/home" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <BrainCircuit className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold">
              AI <span className="text-indigo-400">Interviewer</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/home"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Home className="h-3.5 w-3.5" /> Home
            </a>
            <a
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </a>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5">
              <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">Your Profile</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              {profile?.full_name ? "Update your profile" : "Set up your profile"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              This helps us personalise your interview experience.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-indigo-400">{initials}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-indigo-600 text-white transition-all hover:bg-indigo-500 disabled:opacity-60"
                    aria-label="Upload avatar"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-xs text-slate-500">JPEG, PNG or WebP · max 2 MB</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="fullName">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
              </div>

              {/* Qualification */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="qualification">
                  Qualification <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="qualification"
                    type="text"
                    required
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. B.Tech CSE, MBA, Self-taught Developer"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="contact">
                  Contact Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="contact"
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Email (from account)
                </label>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-500">
                  {user.email}
                </div>
              </div>

              {/* ─── Resume Upload Section ─── */}
              <div className="border-t border-white/10 pt-7">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-slate-300">Resume</h2>
                  <span className="text-xs text-slate-500">(PDF, max 5 MB)</span>
                </div>

                {!resumeUrl ? (
                  <button
                    type="button"
                    onClick={() => resumeRef.current?.click()}
                    disabled={uploadingResume}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-indigo-300"
                  >
                    {uploadingResume ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    {uploadingResume ? "Uploading..." : "Click to upload your resume"}
                  </button>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                          <FileText className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Resume uploaded</p>
                          <p className="text-xs text-slate-500">PDF document</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveResume}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>

                    {analyzingResume && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        <span className="text-sm text-indigo-300">
                          AI is analyzing your resume...
                        </span>
                      </div>
                    )}

                    {resumeAnalysis && !analyzingResume && (
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
                          <Sparkles className="h-4 w-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-300">
                            AI Analysis Complete
                          </span>
                        </div>

                        <p className="text-sm leading-relaxed text-slate-300">
                          {resumeAnalysis.summary}
                        </p>

                        {resumeAnalysis.skills.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <Code2 className="h-3.5 w-3.5" /> Skills
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {resumeAnalysis.skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {resumeAnalysis.experience.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <Briefcase className="h-3.5 w-3.5" /> Experience
                            </div>
                            <div className="space-y-2">
                              {resumeAnalysis.experience.map((exp, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                                >
                                  <p className="text-sm font-medium text-white">{exp.title}</p>
                                  <p className="text-xs text-slate-400">
                                    {exp.company} &middot; {exp.duration}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {resumeAnalysis.projects.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <FolderOpen className="h-3.5 w-3.5" /> Projects
                            </div>
                            <div className="space-y-2">
                              {resumeAnalysis.projects.map((proj, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                                >
                                  <p className="text-sm font-medium text-white">{proj.name}</p>
                                  <p className="text-xs text-slate-400">{proj.description}</p>
                                  {proj.technologies.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {proj.technologies.map((t) => (
                                        <span
                                          key={t}
                                          className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {resumeAnalysis.certifications.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <Award className="h-3.5 w-3.5" /> Certifications
                            </div>
                            <ul className="space-y-1">
                              {resumeAnalysis.certifications.map((cert) => (
                                <li key={cert} className="text-xs text-slate-300">
                                  &bull; {cert}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={resumeRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleResumeUpload}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending || !isProfileComplete}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Saved! Redirecting…
                  </>
                ) : (
                  <>
                    Save Profile
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
