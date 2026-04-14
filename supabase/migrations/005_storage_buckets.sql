-- ============================================================
-- Migration 005: Supabase Storage Buckets
-- ============================================================
-- Run this in the Supabase SQL editor or via the CLI.
-- Alternatively create buckets through the Supabase Dashboard UI.

-- ── Bucket: avatars ───────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,               -- public so avatar images load without auth
  2097152,            -- 2 MB limit
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) on conflict (id) do nothing;

-- Allow authenticated users to upload/update/delete their own avatar
create policy "Avatar upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatar update own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatar delete own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ── Bucket: interview-audio ───────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-audio',
  'interview-audio',
  false,              -- private; access via signed URLs
  524288000,          -- 500 MB
  ARRAY['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav']
) on conflict (id) do nothing;

create policy "Audio upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'interview-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Audio read own"
  on storage.objects for select
  using (
    bucket_id = 'interview-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Audio delete own"
  on storage.objects for delete
  using (
    bucket_id = 'interview-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Bucket: interview-transcripts ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-transcripts',
  'interview-transcripts',
  false,
  10485760,           -- 10 MB
  ARRAY['text/plain','application/json']
) on conflict (id) do nothing;

create policy "Transcript upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'interview-transcripts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Transcript read own"
  on storage.objects for select
  using (
    bucket_id = 'interview-transcripts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Transcript delete own"
  on storage.objects for delete
  using (
    bucket_id = 'interview-transcripts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
