-- Migration: Update interviewer avatars to use WebP format for better performance
-- WebP images are 88% smaller than PNG, improving load times significantly
-- Original PNG images: 14.44 MB total
-- WebP images: 1.67 MB total (12.77 MB savings)

UPDATE interviewers SET avatar_url = '/interviewers/aria-singh.webp'   WHERE id = 'cf20f0e0-7c37-47fe-a73f-520eac9cab20';
UPDATE interviewers SET avatar_url = '/interviewers/marcus-chen.webp'  WHERE id = 'b202fc41-6918-4454-9e88-43da0a5d80ec';
UPDATE interviewers SET avatar_url = '/interviewers/priya-kapoor.webp' WHERE id = 'f56eb65a-216e-4907-b60e-c7010baf6e03';
UPDATE interviewers SET avatar_url = '/interviewers/leo-russo.webp'    WHERE id = 'ddceb844-2557-4289-81e4-6917a047e2b4';
UPDATE interviewers SET avatar_url = '/interviewers/zara-ahmed.webp'   WHERE id = 'ff445d03-62d8-4a75-ab79-48fa512b7f59';
UPDATE interviewers SET avatar_url = '/interviewers/victor-nwosu.webp' WHERE id = '5a9a8fda-f446-43b3-968c-053b3971f7ee';
