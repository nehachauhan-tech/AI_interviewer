-- ============================================================
-- Migration 002: Interviewers & Interview Topics
-- ============================================================

-- ── Interviewers ─────────────────────────────────────────────
-- Each row is an AI interviewer persona shown on the Home page.
create table if not exists public.interviewers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  title       text not null,           -- e.g. "Senior Software Engineer"
  company     text,                    -- e.g. "Google", "Startup"
  avatar_url  text,                    -- optional portrait image
  bio         text,
  personality text,                    -- e.g. "Strict", "Friendly", "Analytical"
  specialties text[] default '{}',     -- e.g. ARRAY['DSA','System Design']
  created_at  timestamptz not null default now()
);

-- Seed interviewers
insert into public.interviewers (name, title, company, bio, personality, specialties) values
  ('Aria Singh',   'HR Manager',               'TechCorp',      'Focuses on culture-fit, behavioural questions, and soft skills.',                  'Friendly',   ARRAY['Behavioral','Culture Fit','Soft Skills','Salary Negotiation']),
  ('Marcus Chen',  'Senior Software Engineer',  'FAANG',         'Asks deep algorithm and data-structure questions with a rigorous style.',          'Strict',     ARRAY['DSA','Problem Solving','Complexity Analysis','Coding']),
  ('Priya Kapoor', 'Tech Lead',                 'Unicorn Startup','Combines architecture questions with team-dynamics and leadership scenarios.',     'Analytical', ARRAY['System Design','Architecture','Leadership','Scalability']),
  ('Leo Russo',    'Full-Stack Engineer',        'Product Studio','Covers frontend, backend, databases and deployment in a conversational style.',    'Relaxed',    ARRAY['React','Node.js','Databases','Full Stack','APIs']),
  ('Zara Ahmed',   'Campus Recruiter',           'MNC',           'Helps freshers and interns prepare for their very first job interview.',            'Encouraging',ARRAY['Basics','Campus Prep','Entry Level','First Job']),
  ('Victor Nwosu', 'Engineering Manager',        'Scale-up',      'Evaluates both technical depth and people-management ability.',                   'Direct',     ARRAY['System Design','Leadership','Team Management','Estimation'])
;

-- ── Interview Topics ─────────────────────────────────────────
-- Topics/domains that users can choose from when starting a session.
create table if not exists public.interview_topics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text not null,           -- e.g. "Technical", "HR", "Leadership"
  description text,
  created_at  timestamptz not null default now()
);

insert into public.interview_topics (name, category, description) values
  -- Technical
  ('Data Structures & Algorithms',    'Technical',   'Arrays, trees, graphs, sorting, searching and complexity.'),
  ('System Design',                   'Technical',   'Designing scalable distributed systems and architectures.'),
  ('Object-Oriented Programming',     'Technical',   'OOP principles, patterns, and real-world design scenarios.'),
  ('Database Design & SQL',           'Technical',   'Schema design, queries, indexing, and normalization.'),
  ('Frontend Development',            'Technical',   'HTML, CSS, JavaScript, React, performance, and accessibility.'),
  ('Backend Development',             'Technical',   'REST APIs, Node.js/Python, auth, caching, and microservices.'),
  ('Full-Stack Web Development',      'Technical',   'End-to-end project design covering both frontend and backend.'),
  ('DevOps & Cloud',                  'Technical',   'CI/CD, Docker, Kubernetes, AWS/GCP/Azure basics.'),
  ('Machine Learning Basics',         'Technical',   'ML concepts, model evaluation, and applied ML scenarios.'),
  -- HR & Behavioural
  ('Behavioural Questions',           'HR',          'Tell-me-about-yourself, STAR method, and behavioural scenarios.'),
  ('Salary & Negotiation',            'HR',          'How to discuss compensation, offers, and counter-offers.'),
  ('Culture Fit & Values',            'HR',          'Company culture, team collaboration, and professional values.'),
  -- Leadership
  ('Leadership & Management',         'Leadership',  'Team management, conflict resolution, and leading projects.'),
  ('Product Thinking',                'Leadership',  'Feature prioritisation, metrics, and product-level decisions.'),
  -- General
  ('General Aptitude',                'General',     'Logical reasoning, verbal ability, and problem-solving.'),
  ('Resume & Portfolio Walkthrough',  'General',     'Walking the interviewer through your experience and projects.')
;

-- Public read access (no auth needed to read the catalogue)
alter table public.interviewers      enable row level security;
alter table public.interview_topics  enable row level security;

create policy "Public read interviewers"
  on public.interviewers for select using (true);

create policy "Public read topics"
  on public.interview_topics for select using (true);
