-- Migration: set generated portrait images as avatar_url for all interviewers
-- Images are served from /interviewers/*.png in the Next.js public/ folder

UPDATE interviewers SET avatar_url = '/interviewers/aria-singh.png'   WHERE id = 'cf20f0e0-7c37-47fe-a73f-520eac9cab20';
UPDATE interviewers SET avatar_url = '/interviewers/marcus-chen.png'  WHERE id = 'b202fc41-6918-4454-9e88-43da0a5d80ec';
UPDATE interviewers SET avatar_url = '/interviewers/priya-kapoor.png' WHERE id = 'f56eb65a-216e-4907-b60e-c7010baf6e03';
UPDATE interviewers SET avatar_url = '/interviewers/leo-russo.png'    WHERE id = 'ddceb844-2557-4289-81e4-6917a047e2b4';
UPDATE interviewers SET avatar_url = '/interviewers/zara-ahmed.png'   WHERE id = 'ff445d03-62d8-4a75-ab79-48fa512b7f59';
UPDATE interviewers SET avatar_url = '/interviewers/victor-nwosu.png' WHERE id = '5a9a8fda-f446-43b3-968c-053b3971f7ee';
