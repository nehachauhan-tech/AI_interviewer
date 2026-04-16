"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  BrainCircuit, ArrowRight, LayoutDashboard, LogOut,
  User as UserIcon, ChevronDown,
} from "lucide-react";

interface Props {
  isLoggedIn: boolean;
  userInitials: string;
  userEmail: string;
  avatarUrl: string | null;
}

export default function LandingNavbar({ isLoggedIn, userInitials, userEmail, avatarUrl }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function handleLogout() {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2" aria-label="AI Interviewer Home">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <BrainCircuit className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            AI <span className="text-primary">Interviewer</span>
          </span>
        </a>

        {/* Nav links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted transition-colors hover:text-foreground">Features</a>
          <a href="#roles"    className="text-sm font-medium text-muted transition-colors hover:text-foreground">Interview Roles</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted transition-colors hover:text-foreground">How It Works</a>
          <a href="#testimonials" className="text-sm font-medium text-muted transition-colors hover:text-foreground">Testimonials</a>
        </div>

        {/* Right side — auth-aware */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* ── Logged-in state ── */
            <div className="flex items-center gap-2">
              <a
                href="/home"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:brightness-110"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                Dashboard
              </a>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-1 py-1 pr-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-surface focus:outline-none"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  {/* Avatar circle */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-white overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-border bg-background shadow-xl shadow-black/10"
                    role="menu"
                  >
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-xs font-semibold text-foreground truncate">{userInitials || "User"}</p>
                      <p className="text-xs text-muted truncate">{userEmail}</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <a
                        href="/home"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors"
                        role="menuitem"
                      >
                        <LayoutDashboard className="h-4 w-4 text-muted" />
                        Dashboard
                      </a>
                      <a
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors"
                        role="menuitem"
                      >
                        <UserIcon className="h-4 w-4 text-muted" />
                        Profile
                      </a>
                      <a
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors"
                        role="menuitem"
                      >
                        <LayoutDashboard className="h-4 w-4 text-muted" />
                        My Progress
                      </a>
                    </div>
                    <div className="border-t border-border p-1.5">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Logged-out state ── */
            <>
              <a
                href="/auth"
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-alt sm:inline-flex"
              >
                Sign In
              </a>
              <a
                href="/auth"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30 hover:brightness-110"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setDropdownOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
