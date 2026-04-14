-- ============================================================
-- Migration 004: AI Session Analyses
-- ============================================================
-- Stores the Gemini 1.5 Pro analysis produced after each
-- completed interview session.  One analysis row per session.

create table if not exists public.session_analyses (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null unique references public.interview_sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- ── Scores (0–100) ──────────────────────────────────────────
  overall_score         integer check (overall_score between 0 and 100),
  technical_score       integer check (technical_score between 0 and 100),
  communication_score   integer check (communication_score between 0 and 100),
  confidence_score      integer check (confidence_score between 0 and 100),
  problem_solving_score integer check (problem_solving_score between 0 and 100),
  leadership_score      integer check (leadership_score between 0 and 100),

  -- ── Qualitative Feedback (Gemini Pro output) ────────────────
  summary               text,          -- 2-3 sentence overall summary
  strengths             text[],        -- bullet list of strong points
  areas_to_improve      text[],        -- bullet list of improvement areas
  action_items          text[],        -- concrete next steps
  detailed_feedback     text,          -- full markdown feedback from Gemini
  keywords_mentioned    text[],        -- important tech keywords the user mentioned
  keywords_missed       text[],        -- important keywords the user should have said

  -- ── Sentiment & Engagement ───────────────────────────────────
  sentiment             text,          -- 'positive' | 'neutral' | 'negative'
  engagement_level      text,          -- 'high' | 'medium' | 'low'
  filler_word_count     integer default 0,

  -- ── Meta ─────────────────────────────────────────────────────
  gemini_model_used     text,          -- which model produced this analysis
  analysis_run_at       timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

create index idx_analyses_user_id    on public.session_analyses(user_id);
create index idx_analyses_session_id on public.session_analyses(session_id);

-- RLS
alter table public.session_analyses enable row level security;

create policy "Users see own analyses"
  on public.session_analyses for select
  using (auth.uid() = user_id);

create policy "Service role can insert analyses"
  on public.session_analyses for insert
  with check (auth.uid() = user_id);

-- ── Dashboard Aggregate View ─────────────────────────────────
-- Convenience view used by the Dashboard page.
create or replace view public.user_dashboard_stats as
select
  p.id                                        as user_id,
  p.full_name,
  count(distinct s.id)                        as total_sessions,
  count(distinct s.id) filter (
    where s.status = 'completed')             as completed_sessions,
  round(avg(a.overall_score))::integer        as avg_overall_score,
  round(avg(a.technical_score))::integer      as avg_technical_score,
  round(avg(a.communication_score))::integer  as avg_communication_score,
  round(avg(a.confidence_score))::integer     as avg_confidence_score,
  max(s.started_at)                           as last_session_at,
  sum(s.duration_secs)                        as total_practice_secs
from public.profiles p
left join public.interview_sessions s  on s.user_id = p.id
left join public.session_analyses   a  on a.session_id = s.id
group by p.id, p.full_name;
