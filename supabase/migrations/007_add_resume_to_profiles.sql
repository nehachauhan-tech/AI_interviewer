-- ============================================================
-- Migration 007: Add Resume Support to Profiles
-- ============================================================
-- Adds resume_url (storage path) and resume_analysis (JSON from Gemini)
-- columns to profiles, plus a "resumes" storage bucket.

-- ── Add columns to profiles ──────────────────────────────────
alter table public.profiles
  add column if not exists resume_url text,
  add column if not exists resume_analysis jsonb;

-- ── Bucket: resumes ──────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,              -- private; only owner can access
  5242880,            -- 5 MB limit
  ARRAY['application/pdf']
) on conflict (id) do nothing;

-- Allow authenticated users to upload/read/delete their own resume
create policy "Resume upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Resume read own"
  on storage.objects for select
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Resume update own"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Resume delete own"
  on storage.objects for delete
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
