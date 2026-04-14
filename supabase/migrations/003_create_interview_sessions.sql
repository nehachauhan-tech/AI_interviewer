-- ============================================================
-- Migration 003: Interview Sessions
-- ============================================================
-- Captures every interview the user does including metadata,
-- the full message transcript, AI-generated analysis, and
-- references to recorded audio/voice files in Supabase Storage.

-- ── Session Status Enum ───────────────────────────────────────
create type public.session_status as enum (
  'in_progress',
  'completed',
  'abandoned'
);

-- ── Interview Sessions ────────────────────────────────────────
create table if not exists public.interview_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  interviewer_id  uuid not null references public.interviewers(id),
  topic_id        uuid not null references public.interview_topics(id),

  -- Session lifecycle
  status          public.session_status not null default 'in_progress',
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_secs   integer,               -- computed when session ends

  -- Gemini Live session tracking
  gemini_session_id text,                -- the Live API session handle

  -- Audio recording stored in "interview-audio" bucket
  audio_file_path   text,               -- e.g. "user_id/session_id/recording.webm"
  audio_file_size   bigint,             -- bytes

  -- Full text transcript stored in "interview-transcripts" bucket
  transcript_file_path text,            -- e.g. "user_id/session_id/transcript.txt"

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger sessions_updated_at
  before update on public.interview_sessions
  for each row execute procedure public.handle_updated_at();

-- ── Session Messages ──────────────────────────────────────────
-- Every turn in the interview conversation is stored here
-- (both AI interviewer messages and user responses).
create type public.message_role as enum ('interviewer', 'user', 'system');

create table if not exists public.session_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.interview_sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,

  role         public.message_role not null,
  content      text not null,          -- plain text of the message

  -- Optional: per-message audio clip (voice output from AI or voice input from user)
  audio_clip_path text,                -- path in "interview-audio" bucket

  -- Metadata
  sequence_no  integer not null,       -- turn order within the session
  created_at   timestamptz not null default now()
);

create index idx_session_messages_session_id on public.session_messages(session_id);
create index idx_session_messages_user_id    on public.session_messages(user_id);

-- ── RLS for Sessions & Messages ───────────────────────────────
alter table public.interview_sessions enable row level security;
alter table public.session_messages    enable row level security;

create policy "Users see own sessions"
  on public.interview_sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own sessions"
  on public.interview_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users update own sessions"
  on public.interview_sessions for update
  using (auth.uid() = user_id);

create policy "Users see own messages"
  on public.session_messages for select
  using (auth.uid() = user_id);

create policy "Users insert own messages"
  on public.session_messages for insert
  with check (auth.uid() = user_id);
