-- ============================================================
-- Migration 008: Add transcript_json column to interview_sessions
-- ============================================================
-- Store the conversation transcript as JSON directly in the table
-- for faster loading instead of fetching from storage bucket.

-- Add transcript_json column (array of message objects)
alter table public.interview_sessions
add column if not exists transcript_json jsonb;

-- Add comment explaining the structure
comment on column public.interview_sessions.transcript_json is
'JSON array of conversation messages: [{role: "interviewer"|"user", content: string, timestamp: string}]';

-- Create index for faster JSON queries if needed
create index if not exists idx_sessions_transcript_json
on public.interview_sessions using gin (transcript_json);
