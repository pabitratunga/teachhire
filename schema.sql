-- ============================================================
-- TeachHire — Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text unique not null,
  name        text,
  role        text not null default 'candidate', -- candidate | recruiter | admin
  phone       text,
  avatar      text,
  institution jsonb,  -- { name, category, verified, location }
  created_at  timestamptz default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'candidate')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. JOBS
create table if not exists public.jobs (
  id               bigint generated always as identity primary key,
  title            text not null,
  institution      text,
  categories       text[]  default '{}',
  subjects         text[]  default '{}',
  states           text[]  default '{}',
  cities           text[]  default '{}',
  ownership        text,
  academic_level   text,
  employment_type  text,
  work_mode        text    default 'Onsite',
  salary_min       integer default 0,
  salary_max       integer default 0,
  deadline         date,
  description      text,
  status           text    default 'Pending',  -- Pending | Published | Rejected | Archived
  posted_date      date    default current_date,
  recruiter_id     uuid    references public.profiles(id),
  verified         boolean default false,
  featured         boolean default false,
  applicants       integer default 0,
  source_url       text,
  posted_by        text    default 'recruiter', -- recruiter | admin
  vacancies        integer default 1,
  demo_class       boolean default false,
  written_test     boolean default false,
  rounds           integer default 1,
  institution_category text,
  min_qualification    text,
  archived_date    date,
  archived_by      text,
  created_at       timestamptz default now()
);

-- 3. APPLICATIONS
create table if not exists public.applications (
  id             bigint generated always as identity primary key,
  job_id         bigint references public.jobs(id) on delete cascade,
  candidate_id   uuid   references public.profiles(id) on delete cascade,
  status         text   default 'Applied',
  applied_date   date   default current_date,
  notes          jsonb  default '[]',
  rounds         jsonb  default '[]',
  created_at     timestamptz default now(),
  unique(job_id, candidate_id)
);

-- 4. SCRAPED JOBS
create table if not exists public.scraped_jobs (
  id              text primary key,
  title           text,
  institution     text,
  description     text,
  source_url      text,
  source_site     text,
  source_name     text,
  scraped_at      timestamptz default now(),
  published_at    timestamptz,
  deadline        date,
  status          text    default 'pending_review',  -- pending_review | published | rejected
  categories      text[]  default '{}',
  subjects        text[]  default '{}',
  states          text[]  default '{}',
  cities          text[]  default '{}',
  ownership       text    default 'Government',
  employment_type text,
  academic_level  text,
  salary_min      integer default 0,
  salary_max      integer default 0,
  vacancies       integer default 1,
  created_at      timestamptz default now()
);

-- 5. CUSTOM SOURCES
create table if not exists public.custom_sources (
  id                 text primary key,
  url                text unique not null,
  name               text not null,
  icon               text    default '🔗',
  category           text    default 'Custom',
  notes              text,
  added_date         date    default current_date,
  last_fetched_at    timestamptz,
  last_fetched_count integer,
  fetch_status       text    default 'never',
  created_at         timestamptz default now()
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- This controls who can read/write each table

alter table public.profiles      enable row level security;
alter table public.jobs          enable row level security;
alter table public.applications  enable row level security;
alter table public.scraped_jobs  enable row level security;
alter table public.custom_sources enable row level security;

-- PROFILES: users can read all profiles, only edit their own
create policy "Profiles are viewable by everyone"  on public.profiles for select using (true);
create policy "Users can update own profile"       on public.profiles for update using (auth.uid() = id);

-- JOBS: anyone can read published jobs; recruiters/admins can insert; admins can update
create policy "Anyone can read published jobs"     on public.jobs for select using (true);
create policy "Authenticated users can post jobs"  on public.jobs for insert with check (auth.role() = 'authenticated');
create policy "Recruiters can update own jobs"     on public.jobs for update using (auth.uid() = recruiter_id or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- APPLICATIONS: candidates see own apps; recruiters see apps for their jobs
create policy "Candidates see own applications"    on public.applications for select using (auth.uid() = candidate_id or exists (select 1 from jobs where id = job_id and recruiter_id = auth.uid()) or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Candidates can apply"               on public.applications for insert with check (auth.uid() = candidate_id);
create policy "Can update application status"      on public.applications for update using (exists (select 1 from jobs where id = job_id and recruiter_id = auth.uid()) or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- SCRAPED JOBS: admins only
create policy "Admins can manage scraped jobs"     on public.scraped_jobs for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- CUSTOM SOURCES: admins only
create policy "Admins can manage custom sources"   on public.custom_sources for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ── SEED ADMIN ACCOUNT ──────────────────────────────────────────────────────
-- After running schema, create your admin via Supabase Auth dashboard,
-- then run this to make them admin (replace the email):
--
-- update public.profiles set role = 'admin' where email = 'your@email.com';
