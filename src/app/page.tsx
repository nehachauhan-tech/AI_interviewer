import {
  Mic,
  BrainCircuit,
  MessageSquareText,
  BarChart3,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Star,
  Code2,
  Briefcase,
  UserCheck,
  GraduationCap,
  Globe,
  Monitor,
  ChevronRight,
  Play,
  Shield,
  Zap,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LandingNavbar from "./LandingNavbar";

/* ───────────────────── Hero ───────────────────── */
function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const ctaHref = isLoggedIn ? "/home" : "/auth";
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-60 -left-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide text-primary sm:text-sm">
              AI-Powered Mock Interviews
            </span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Ace Your Next Interview{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              With Confidence
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Practice real-world interviews with AI-powered characters that simulate HR managers,
            tech leads, and senior developers. Get instant, friendly feedback and actionable
            tips to level up your interview skills.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={ctaHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-8 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 sm:w-auto"
            >
              {isLoggedIn ? "Go to Dashboard" : "Start Free Interview"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 text-base font-semibold text-foreground transition-all hover:border-primary/30 hover:bg-surface sm:w-auto"
            >
              <Play className="h-4 w-4 text-primary" aria-hidden="true" />
              See How It Works
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-8">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              ))}
              <span className="ml-2 text-sm font-medium text-muted">4.9/5 rating</span>
            </div>
            <div className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
            <p className="text-sm font-medium text-muted">
              <span className="text-foreground">10,000+</span> interviews completed
            </p>
            <div className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
            <p className="text-sm font-medium text-muted">
              <span className="text-foreground">95%</span> improved in 3 sessions
            </p>
          </div>
        </div>

        {/* Hero visual — mock interview preview */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-primary/5">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-muted">InterviewAI Session</span>
            </div>
            {/* Interview conversation preview */}
            <div className="p-6 sm:p-8">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                    <BrainCircuit className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-surface-alt px-4 py-3">
                    <p className="text-sm font-medium text-foreground">AI Tech Lead</p>
                    <p className="mt-1 text-sm text-muted">
                      &ldquo;Can you walk me through how you would design a scalable REST API for
                      an e-commerce platform? Think about authentication, rate limiting, and
                      database choices.&rdquo;
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-3">
                    <p className="text-sm text-foreground">
                      &ldquo;I&apos;d start with a Node.js or Python backend using JWT for
                      auth, implement rate limiting with Redis, and use PostgreSQL for the
                      database with proper indexing...&rdquo;
                    </p>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-alt">
                    <UserCheck className="h-4 w-4 text-muted" aria-hidden="true" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                    <BrainCircuit className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/30">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Great approach! Here&apos;s a tip:
                    </p>
                    <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                      Consider mentioning horizontal scaling with load balancers and caching
                      strategies. This shows senior-level thinking.
                    </p>
                  </div>
                </div>
              </div>
              {/* Input bar */}
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <Mic className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="flex-1 text-sm text-muted">Type or speak your answer...</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-accent">
                  <ArrowRight className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
          <div
            className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-2xl"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Features ───────────────────── */
const features = [
  {
    icon: MessageSquareText,
    title: "Real-Time Conversations",
    description:
      "Chat with AI interviewers that respond naturally, ask follow-ups, and adapt to your answers just like a real interviewer.",
  },
  {
    icon: BrainCircuit,
    title: "Smart Feedback & Guidance",
    description:
      "Receive instant, friendly tips when you're off track. Our AI guides you without judgement — helping you learn as you go.",
  },
  {
    icon: BarChart3,
    title: "Detailed Performance Reports",
    description:
      "Get comprehensive feedback at the end of each session covering communication, technical depth, and confidence.",
  },
  {
    icon: Users,
    title: "Multiple Interviewer Personas",
    description:
      "Practice with HR managers, tech leads, senior devs, and more. Each persona has a unique interview style.",
  },
  {
    icon: Shield,
    title: "Safe Space to Practice",
    description:
      "No pressure, no judgement. Make mistakes, learn from them, and build real confidence before your actual interview.",
  },
  {
    icon: Zap,
    title: "Instant Session Start",
    description:
      "No scheduling needed. Jump into a mock interview anytime, anywhere — practice on your own terms.",
  },
];

function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary">WHY INTERVIEWAI</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Interview Like a Pro
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Our AI-powered platform simulates real interview scenarios and gives you the tools
            to improve with every session.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <feature.icon
                  className="h-5 w-5 text-primary transition-transform group-hover:scale-110"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Interview Roles ───────────────────── */
const roles = [
  {
    icon: Briefcase,
    title: "HR Interview",
    description: "Practice behavioral questions, salary negotiation, and company culture fit.",
    tags: ["Behavioral", "Culture Fit", "Soft Skills"],
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Code2,
    title: "Software Developer",
    description: "Tackle coding challenges, system design, and technical problem-solving.",
    tags: ["DSA", "System Design", "Problem Solving"],
    gradient: "from-primary to-accent",
  },
  {
    icon: Monitor,
    title: "Web Developer",
    description: "Frontend, backend, and full-stack interview prep with real-world scenarios.",
    tags: ["React", "Node.js", "Full Stack"],
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Target,
    title: "Tech Lead",
    description: "Architecture decisions, team management, and technical leadership questions.",
    tags: ["Architecture", "Leadership", "Strategy"],
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: GraduationCap,
    title: "Fresher / Intern",
    description: "Entry-level questions, campus placement prep, and foundational concepts.",
    tags: ["Basics", "Campus Prep", "First Job"],
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Globe,
    title: "More Coming Soon",
    description: "Data Science, DevOps, Product Manager, and more roles on the way.",
    tags: ["Data Science", "DevOps", "PM"],
    gradient: "from-gray-500 to-slate-500",
  },
];

function InterviewRoles({ isLoggedIn }: { isLoggedIn: boolean }) {
  const ctaHref = isLoggedIn ? "/home" : "/auth";
  return (
    <section id="roles" className="relative bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary">INTERVIEW ROLES</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Practice for Any Role
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Choose from a variety of AI interview personas tailored to different job roles and
            experience levels.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <a
              key={role.title}
              href={ctaHref}
              className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${role.gradient}`}>
                <role.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{role.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{role.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {role.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-muted">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Start Interview <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── How It Works ───────────────────── */
const steps = [
  {
    step: "01",
    title: "Choose Your Role",
    description: "Select the job role you're preparing for — Software Developer, HR, Tech Lead, Intern, and more.",
  },
  {
    step: "02",
    title: "Start the Interview",
    description: "Our AI interviewer begins with realistic questions tailored to the role. Answer via text or voice.",
  },
  {
    step: "03",
    title: "Get Real-Time Guidance",
    description: "If you're stuck or heading the wrong way, the AI gently guides you with hints and tips.",
  },
  {
    step: "04",
    title: "Review Your Feedback",
    description: "After the session, get a detailed performance report with strengths, areas to improve, and action items.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary">HOW IT WORKS</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Your Interview Prep in 4 Simple Steps
          </h2>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item.step} className="relative text-center">
              {index < steps.length - 1 && (
                <div
                  className="pointer-events-none absolute top-8 left-[60%] hidden h-px w-[80%] bg-gradient-to-r from-primary/30 to-transparent lg:block"
                  aria-hidden="true"
                />
              )}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-xl font-bold text-white shadow-lg shadow-primary/20">
                {item.step}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Testimonials ───────────────────── */
const testimonials = [
  {
    name: "Priya Sharma",
    role: "Frontend Developer at Google",
    content:
      "InterviewAI helped me practice system design and React questions. The AI felt like a real interviewer. I cracked my Google interview on the first try!",
    rating: 5,
  },
  {
    name: "Rahul Mehta",
    role: "SDE-1 at Amazon",
    content:
      "As a fresher, I had no idea what to expect in interviews. The AI guided me through DSA questions patiently and gave me confidence I never had before.",
    rating: 5,
  },
  {
    name: "Sarah Chen",
    role: "Tech Lead at Stripe",
    content:
      "The leadership and architecture interview prep was exactly what I needed. The feedback report after each session pinpointed my weak areas precisely.",
    rating: 5,
  },
];

function Testimonials() {
  return (
    <section id="testimonials" className="relative bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary">TESTIMONIALS</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by Thousands of Candidates
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Hear from people who improved their interview skills and landed their dream jobs.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.name} className="rounded-2xl border border-border bg-background p-6">
              <div className="flex items-center gap-1">
                {[...Array(item.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">&ldquo;{item.content}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
                  {item.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Stats ───────────────────── */
const stats = [
  { value: "10,000+", label: "Mock Interviews" },
  { value: "95%", label: "Improvement Rate" },
  { value: "50+", label: "Question Categories" },
  { value: "4.9/5", label: "User Rating" },
];

function Stats() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── CTA ───────────────────── */
function CTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  const ctaHref = isLoggedIn ? "/home" : "/auth";
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent to-primary-dark px-6 py-16 text-center sm:px-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" aria-hidden="true" />
          <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to Nail Your Next Interview?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Join thousands of candidates who transformed their interview skills with
            InterviewAI. Start practicing for free — no credit card required.
          </p>
          <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={ctaHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl sm:w-auto"
            >
              {isLoggedIn ? "Go to Dashboard" : "Start Free Interview"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#roles"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/30 px-8 text-base font-semibold text-white transition-all hover:border-white/50 hover:bg-white/10 sm:w-auto"
            >
              View All Roles
            </a>
          </div>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {["Free to start", "No credit card needed", "Instant access"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-white/70" aria-hidden="true" />
                <span className="text-sm text-white/70">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Footer ───────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="/" className="flex items-center gap-2" aria-label="InterviewAI Home">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <BrainCircuit className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Interview<span className="text-primary">AI</span>
              </span>
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              AI-powered mock interview platform. Practice, learn, and ace your next job
              interview with confidence.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="#features"    className="text-sm text-muted transition-colors hover:text-foreground">Features</a></li>
              <li><a href="#roles"       className="text-sm text-muted transition-colors hover:text-foreground">Interview Roles</a></li>
              <li><a href="#how-it-works" className="text-sm text-muted transition-colors hover:text-foreground">How It Works</a></li>
              <li><a href="#testimonials" className="text-sm text-muted transition-colors hover:text-foreground">Testimonials</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">App</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="/home"      className="text-sm text-muted transition-colors hover:text-foreground">Start Interview</a></li>
              <li><a href="/dashboard" className="text-sm text-muted transition-colors hover:text-foreground">Dashboard</a></li>
              <li><a href="/profile"   className="text-sm text-muted transition-colors hover:text-foreground">Profile</a></li>
              <li><a href="/auth"      className="text-sm text-muted transition-colors hover:text-foreground">Sign In / Sign Up</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-3 space-y-2">
              {["About Us", "Contact", "Privacy Policy", "Terms of Service"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-muted transition-colors hover:text-foreground">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} InterviewAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ───────────────────── Page (Server Component) ───────────────────── */
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  // Fetch profile for avatar + name if logged in
  let userInitials = "";
  let userEmail = user?.email ?? "";
  let avatarUrl: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    const name = (profile as { full_name?: string | null } | null)?.full_name ?? user.email ?? "";
    userInitials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;
  }

  return (
    <>
      <LandingNavbar
        isLoggedIn={isLoggedIn}
        userInitials={userInitials}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
      />
      <main>
        <Hero isLoggedIn={isLoggedIn} />
        <Stats />
        <Features />
        <InterviewRoles isLoggedIn={isLoggedIn} />
        <HowItWorks />
        <Testimonials />
        <CTA isLoggedIn={isLoggedIn} />
      </main>
      <Footer />
    </>
  );
}
