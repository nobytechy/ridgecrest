-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest School — install.sql  (consolidated)
--
--  Single file. Run once in Supabase → SQL Editor. Re-runnable.
--
--  Sets up:
--    • Schema + RLS for every module (students, parents, staff, classes,
--      subjects, terms, assessments, results, fees, payments, attendance,
--      term reports, class feed, schemes, timetable, homework, gallery,
--      holidays, announcements, inquiries, login log).
--    • PIN-only auth resolvers and admin RPCs.
--    • Seed data — primary-school configuration (ECD A/B + Grade 1-7),
--      Term 2 2026 active, fees structure, holidays, demo enrolment for
--      pitching (Tebulo + Mukamuri + Chiweshe families).
--
--  Demo PINs (after running):
--    Admin            1975   EMP-001 (Admin Demo)
--    Headmaster       5050   EMP-005 (Mr. S. Moyo)
--    Grade-3 Teacher  2002   EMP-002 (Mrs. R. Mhembere)
--    Bursar           3030   EMP-003 (Mr. T. Ndoro)
--    ECD Teacher      4040   EMP-004 (Mrs. C. Sibanda)
--    Parent           4455   PAR-2026-002 Mrs. M. Tebulo  (Manisha)
--    Parent           3344   PAR-2026-001 Mr. T. Mukamuri (Tafara + Rumbi + Rati)
--    Parent           5566   PAR-2026-003 Mrs. P. Chiweshe (Daniel)
--    Student          3300   STU-2026-003 Manisha Tebulo     (Grade 3)
--    Student          2200   STU-2026-001 Tafara Mukamuri    (Grade 3)
--    Student          2201   STU-2026-002 Rumbidzai Mukamuri (Grade 5)
--    Student          4400   STU-2026-004 Daniel Chiweshe    (Grade 4)
--    Student          5500   STU-2026-005 Ratidzai Mukamuri  (ECD B)
-- ─────────────────────────────────────────────────────────────────────────

-- Supabase keeps extensions in the `extensions` schema. We reference
-- gen_salt / crypt as `extensions.gen_salt(...)` / `extensions.crypt(...)`
-- explicitly below so search_path quirks never break the seed.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.rc_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ═══════════════════════════════════════════════════════════════════════
--  SCHEMA — tables, indexes, triggers
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Site settings ──────────────────────────────────────────────────────
create table if not exists public.rc_site_settings (
  id              int primary key default 1 check (id = 1),
  school_name     text not null default 'Ridgecrest Junior School',
  motto           text default 'Quality education · ECD A to Grade 7',
  tagline         text default 'Quality education from ECD A & B to Grade 7, supported by a state-of-the-art computer lab and safe, reliable transport.',
  primary_phone   text default '+263 77 389 2866',
  whatsapp_phone  text default '+263 77 389 2866',
  email           text default 'enquiries@ridgecrest.co.zw',
  address_line    text default '235 Chiremba Road, Hatfield, Harare',
  google_maps_url text,
  facebook_url    text default 'https://www.facebook.com/profile.php?id=61583900260420',
  instagram_url   text,
  logo_url        text,
  hero_image_url  text,
  hero_headline   text default 'A learning home for tomorrow''s leaders.',
  hero_subhead    text default 'Tradition, discipline, and modern teaching — every child known by name.',
  founded_year    int default 1982,
  current_term_id uuid,
  paynow_url      text,
  paynow_account  text,
  cash_office_hours text,
  sibling_discount_pct       numeric(5,2) default 10.00,
  sibling_discount_third_pct numeric(5,2) default 15.00,
  updated_at      timestamptz not null default now()
);
-- Idempotent column adds for upgrades from older installs
alter table public.rc_site_settings add column if not exists paynow_url      text;
alter table public.rc_site_settings add column if not exists paynow_account  text;
alter table public.rc_site_settings add column if not exists cash_office_hours text;
alter table public.rc_site_settings add column if not exists sibling_discount_pct       numeric(5,2) default 10.00;
alter table public.rc_site_settings add column if not exists sibling_discount_third_pct numeric(5,2) default 15.00;

drop trigger if exists trg_rc_settings_touch on public.rc_site_settings;
create trigger trg_rc_settings_touch before update on public.rc_site_settings
  for each row execute function public.rc_touch_updated_at();
insert into public.rc_site_settings (id) values (1) on conflict (id) do nothing;

-- ─── Roles ──────────────────────────────────────────────────────────────
create table if not exists public.rc_roles (
  id          text primary key,
  name        text not null,
  permissions jsonb not null default '{}'::jsonb,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now()
);
insert into public.rc_roles (id, name, permissions, is_system) values
  ('admin',       'Administrator',         '{"all": true}'::jsonb,                              true),
  ('headmaster',  'Headmaster',            '{"all": true}'::jsonb,                              true),
  ('teacher',     'Teacher',               '{"marks": true, "attendance": true}'::jsonb,        true),
  ('bursar',      'Bursar / Accountant',   '{"fees": true, "payments": true}'::jsonb,           true),
  ('secretary',   'Secretary',             '{"students": true, "announcements": true}'::jsonb,  true)
on conflict (id) do nothing;

-- ─── Staff ──────────────────────────────────────────────────────────────
create table if not exists public.rc_staff (
  id            uuid primary key references auth.users(id) on delete cascade,
  employee_id   text not null unique,
  display_name  text not null,
  role_id       text not null references public.rc_roles(id),
  phone         text,
  email         text,
  pin           text,
  photo_url     text,
  status        text not null default 'active' check (status in ('active','suspended','left')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists rc_staff_pin_idx     on public.rc_staff(pin);
create index if not exists rc_staff_status_idx  on public.rc_staff(status);
drop trigger if exists trg_rc_staff_touch on public.rc_staff;
create trigger trg_rc_staff_touch before update on public.rc_staff
  for each row execute function public.rc_touch_updated_at();

-- ─── Academic terms ─────────────────────────────────────────────────────
create table if not exists public.rc_terms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  academic_year int  not null,
  term_number   int  not null check (term_number in (1, 2, 3)),
  start_date    date not null,
  end_date      date not null,
  is_current    boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists rc_terms_current_idx on public.rc_terms(is_current) where is_current;

-- ─── Subjects ───────────────────────────────────────────────────────────
create table if not exists public.rc_subjects (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  is_core     boolean not null default true,
  position    int not null default 100,
  created_at  timestamptz not null default now()
);

-- ─── Classes ────────────────────────────────────────────────────────────
create table if not exists public.rc_classes (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  level           int  not null,
  stream          text,
  class_teacher_id uuid references public.rc_staff(id) on delete set null,
  capacity        int  default 35,
  description     text,
  position        int not null default 100,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists rc_classes_level_idx on public.rc_classes(level);
drop trigger if exists trg_rc_classes_touch on public.rc_classes;
create trigger trg_rc_classes_touch before update on public.rc_classes
  for each row execute function public.rc_touch_updated_at();

-- ─── Class subjects ─────────────────────────────────────────────────────
create table if not exists public.rc_class_subjects (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.rc_classes(id) on delete cascade,
  subject_id  uuid not null references public.rc_subjects(id) on delete cascade,
  teacher_id  uuid references public.rc_staff(id) on delete set null,
  unique (class_id, subject_id)
);

-- ─── Students ───────────────────────────────────────────────────────────
create table if not exists public.rc_students (
  id              uuid primary key references auth.users(id) on delete cascade,
  student_code    text not null unique,
  display_name    text not null,
  preferred_name  text,
  dob             date,
  gender          text check (gender in ('M','F','other')),
  current_class_id uuid references public.rc_classes(id) on delete set null,
  admission_year  int,
  pin             text,
  force_pin_reset boolean not null default true,
  photo_url       text,
  status          text not null default 'active' check (status in ('active','suspended','graduated','withdrawn')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists rc_students_pin_idx       on public.rc_students(pin);
create index if not exists rc_students_class_idx     on public.rc_students(current_class_id);
create index if not exists rc_students_status_idx    on public.rc_students(status);
drop trigger if exists trg_rc_students_touch on public.rc_students;
create trigger trg_rc_students_touch before update on public.rc_students
  for each row execute function public.rc_touch_updated_at();

-- ─── Parents ────────────────────────────────────────────────────────────
create table if not exists public.rc_parents (
  id              uuid primary key references auth.users(id) on delete cascade,
  parent_code     text not null unique,
  display_name    text not null,
  phone           text,
  whatsapp_phone  text,
  email           text,
  id_number       text,
  relationship    text,
  pin             text,
  force_pin_reset boolean not null default true,
  status          text not null default 'active' check (status in ('active','suspended','past')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists rc_parents_pin_idx    on public.rc_parents(pin);
create index if not exists rc_parents_status_idx on public.rc_parents(status);
drop trigger if exists trg_rc_parents_touch on public.rc_parents;
create trigger trg_rc_parents_touch before update on public.rc_parents
  for each row execute function public.rc_touch_updated_at();

-- ─── Parent ↔ student link ──────────────────────────────────────────────
create table if not exists public.rc_student_parents (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.rc_students(id) on delete cascade,
  parent_id   uuid not null references public.rc_parents(id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (student_id, parent_id)
);
create index if not exists rc_sp_student_idx on public.rc_student_parents(student_id);
create index if not exists rc_sp_parent_idx  on public.rc_student_parents(parent_id);

-- ─── Assessments + results ──────────────────────────────────────────────
create table if not exists public.rc_assessments (
  id            uuid primary key default gen_random_uuid(),
  term_id       uuid not null references public.rc_terms(id) on delete cascade,
  name          text not null,
  kind          text not null default 'test' check (kind in ('test','exam','assignment','continuous')),
  max_mark      numeric(6,2) not null default 100,
  scheduled_for date,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists rc_assessments_term_idx on public.rc_assessments(term_id);

create table if not exists public.rc_results (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.rc_students(id) on delete cascade,
  assessment_id uuid not null references public.rc_assessments(id) on delete cascade,
  subject_id    uuid not null references public.rc_subjects(id) on delete cascade,
  mark          numeric(6,2),
  grade         text,
  remarks       text,
  entered_by    uuid references auth.users(id) on delete set null,
  entered_at    timestamptz not null default now(),
  unique (student_id, assessment_id, subject_id)
);
create index if not exists rc_results_student_idx    on public.rc_results(student_id);
create index if not exists rc_results_assessment_idx on public.rc_results(assessment_id);

-- ─── Fees: structures + invoices + payments ─────────────────────────────
create table if not exists public.rc_fee_structures (
  id            uuid primary key default gen_random_uuid(),
  term_id       uuid not null references public.rc_terms(id) on delete cascade,
  class_id      uuid not null references public.rc_classes(id) on delete cascade,
  item          text not null,
  amount_usd    numeric(12,2) not null,
  is_mandatory  boolean not null default true,
  position      int not null default 100,
  created_at    timestamptz not null default now(),
  unique (term_id, class_id, item)
);

create table if not exists public.rc_invoices (
  id            uuid primary key default gen_random_uuid(),
  invoice_no    text not null unique,
  student_id    uuid not null references public.rc_students(id) on delete cascade,
  term_id       uuid not null references public.rc_terms(id)    on delete cascade,
  total_usd     numeric(12,2) not null,
  paid_usd      numeric(12,2) not null default 0,
  due_date      date,
  status        text not null default 'open' check (status in ('open','partial','paid','void')),
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists rc_invoices_student_idx on public.rc_invoices(student_id);
create index if not exists rc_invoices_status_idx  on public.rc_invoices(status);

create table if not exists public.rc_payments (
  id           uuid primary key default gen_random_uuid(),
  receipt_no   text not null unique,
  invoice_id   uuid not null references public.rc_invoices(id) on delete restrict,
  amount_usd   numeric(12,2) not null,
  currency     text not null default 'USD' check (currency in ('USD','ZWL')),
  method       text not null check (method in ('cash','paynow','bank_transfer','ecocash','onemoney')),
  reference    text,
  paid_at      timestamptz not null default now(),
  received_by  uuid references auth.users(id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists rc_payments_invoice_idx on public.rc_payments(invoice_id);

-- ─── Announcements ──────────────────────────────────────────────────────
create table if not exists public.rc_announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  audience    text not null default 'all' check (audience in ('all','staff','students','parents','public')),
  type        text not null default 'info' check (type in ('info','warning','success')),
  starts_at   timestamptz,
  ends_at     timestamptz,
  active      boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists rc_announcements_active_idx on public.rc_announcements(active, created_at desc);

-- ─── Login audit ────────────────────────────────────────────────────────
create table if not exists public.rc_login_log (
  id           uuid primary key default gen_random_uuid(),
  who_kind     text not null check (who_kind in ('staff','student','parent')),
  who_id       uuid references auth.users(id) on delete set null,
  identifier   text,
  success      boolean not null default false,
  user_agent   text,
  attempted_at timestamptz not null default now()
);

-- ─── Holidays / calendar ────────────────────────────────────────────────
create table if not exists public.rc_holidays (
  id                uuid primary key default gen_random_uuid(),
  date              date not null unique,
  name              text not null,
  description       text,
  kind              text not null default 'public' check (kind in ('public','school','religious','term_start','term_end','exam')),
  is_school_closed  boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists rc_holidays_date_idx on public.rc_holidays(date);

-- ─── Schemes of work ────────────────────────────────────────────────────
create table if not exists public.rc_schemes (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.rc_classes(id)  on delete cascade,
  subject_id  uuid not null references public.rc_subjects(id) on delete cascade,
  term_id     uuid not null references public.rc_terms(id)    on delete cascade,
  teacher_id  uuid references public.rc_staff(id) on delete set null,
  title       text not null,
  overview    text,
  status      text not null default 'active' check (status in ('draft','active','completed','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (class_id, subject_id, term_id)
);
create index if not exists rc_schemes_class_idx    on public.rc_schemes(class_id);
create index if not exists rc_schemes_subject_idx  on public.rc_schemes(subject_id);
create index if not exists rc_schemes_term_idx     on public.rc_schemes(term_id);
drop trigger if exists trg_rc_schemes_touch on public.rc_schemes;
create trigger trg_rc_schemes_touch before update on public.rc_schemes
  for each row execute function public.rc_touch_updated_at();

create table if not exists public.rc_scheme_weeks (
  id                   uuid primary key default gen_random_uuid(),
  scheme_id            uuid not null references public.rc_schemes(id) on delete cascade,
  week_number          int  not null,
  week_start_date      date,
  topic                text not null,
  subtopics            text,
  learning_objectives  text,
  teaching_methods     text,
  resources            text,
  assessment_strategy  text,
  completed            boolean not null default false,
  completion_notes     text,
  created_at           timestamptz not null default now(),
  unique (scheme_id, week_number)
);
create index if not exists rc_scheme_weeks_idx on public.rc_scheme_weeks(scheme_id, week_number);

-- ─── Timetable ──────────────────────────────────────────────────────────
create table if not exists public.rc_timetable_slots (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.rc_classes(id) on delete cascade,
  day_of_week   int  not null check (day_of_week between 1 and 5),
  period        int  not null check (period between 1 and 10),
  start_time    time,
  end_time      time,
  subject_id    uuid references public.rc_subjects(id) on delete set null,
  teacher_id    uuid references public.rc_staff(id)    on delete set null,
  room          text,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (class_id, day_of_week, period)
);
create index if not exists rc_tt_class_idx on public.rc_timetable_slots(class_id, day_of_week, period);

-- ─── Homework ───────────────────────────────────────────────────────────
create table if not exists public.rc_homework (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.rc_classes(id)  on delete cascade,
  subject_id   uuid references public.rc_subjects(id)          on delete set null,
  teacher_id   uuid references public.rc_staff(id)             on delete set null,
  title        text not null,
  description  text,
  due_date     date,
  attachment_url text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists rc_hw_class_idx on public.rc_homework(class_id, active, due_date);
drop trigger if exists trg_rc_hw_touch on public.rc_homework;
create trigger trg_rc_hw_touch before update on public.rc_homework
  for each row execute function public.rc_touch_updated_at();

create table if not exists public.rc_homework_submissions (
  id           uuid primary key default gen_random_uuid(),
  homework_id  uuid not null references public.rc_homework(id) on delete cascade,
  student_id   uuid not null references public.rc_students(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','submitted','graded','late')),
  submitted_at timestamptz,
  mark         numeric,
  feedback     text,
  unique (homework_id, student_id)
);

-- ─── Gallery ────────────────────────────────────────────────────────────
create table if not exists public.rc_gallery_albums (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  cover_url   text,
  event_date  date,
  active      boolean not null default true,
  position    int not null default 100,
  created_at  timestamptz not null default now()
);
create index if not exists rc_albums_active_idx on public.rc_gallery_albums(active, position);

create table if not exists public.rc_gallery_photos (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.rc_gallery_albums(id) on delete cascade,
  url         text not null,
  caption     text,
  position    int not null default 100,
  uploaded_at timestamptz not null default now()
);
create index if not exists rc_photos_album_idx on public.rc_gallery_photos(album_id, position);

-- ─── Attendance ─────────────────────────────────────────────────────────
create table if not exists public.rc_attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.rc_students(id) on delete cascade,
  date        date not null,
  status      text not null default 'present' check (status in ('present','absent','late','excused')),
  marked_by   uuid references auth.users(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists rc_att_date_idx    on public.rc_attendance(date);
create index if not exists rc_att_student_idx on public.rc_attendance(student_id, date desc);

-- ─── Term reports ───────────────────────────────────────────────────────
create table if not exists public.rc_term_reports (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.rc_students(id) on delete cascade,
  term_id               uuid not null references public.rc_terms(id)    on delete cascade,
  class_teacher_remark  text,
  headmaster_remark     text,
  conduct               text,
  position_in_class     int,
  published             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (student_id, term_id)
);
drop trigger if exists trg_rc_term_reports_touch on public.rc_term_reports;
create trigger trg_rc_term_reports_touch before update on public.rc_term_reports
  for each row execute function public.rc_touch_updated_at();

-- ─── Class feed (Class-Dojo style) ──────────────────────────────────────
create table if not exists public.rc_class_feed (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.rc_classes(id) on delete cascade,
  author_id   uuid references auth.users(id) on delete set null,
  body        text not null,
  photo_url   text,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists rc_feed_class_idx on public.rc_class_feed(class_id, pinned desc, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════
--  HELPER + RESOLVER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.rc_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_staff where id = auth.uid() and status = 'active');
$$;

create or replace function public.rc_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rc_staff
    where id = auth.uid() and role_id in ('admin','headmaster') and status = 'active'
  );
$$;

create or replace function public.rc_is_student() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_students where id = auth.uid() and status = 'active');
$$;

create or replace function public.rc_is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rc_parents where id = auth.uid() and status = 'active');
$$;

create or replace function public.rc_resolve_staff_pin(p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text; v_count int;
begin
  select count(*) into v_count from public.rc_staff where pin = p_pin and status = 'active';
  if v_count <> 1 then return null; end if;
  select employee_id into v_id from public.rc_staff where pin = p_pin and status = 'active' limit 1;
  return v_id;
end $$;

create or replace function public.rc_resolve_student_pin(p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text; v_count int;
begin
  select count(*) into v_count from public.rc_students where pin = p_pin and status = 'active';
  if v_count <> 1 then return null; end if;
  select student_code into v_id from public.rc_students where pin = p_pin and status = 'active' limit 1;
  return v_id;
end $$;

create or replace function public.rc_resolve_parent_pin(p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text; v_count int;
begin
  select count(*) into v_count from public.rc_parents where pin = p_pin and status = 'active';
  if v_count <> 1 then return null; end if;
  select parent_code into v_id from public.rc_parents where pin = p_pin and status = 'active' limit 1;
  return v_id;
end $$;

revoke all on function public.rc_resolve_staff_pin(text)   from public;
revoke all on function public.rc_resolve_student_pin(text) from public;
revoke all on function public.rc_resolve_parent_pin(text)  from public;
grant execute on function public.rc_resolve_staff_pin(text)   to anon, authenticated;
grant execute on function public.rc_resolve_student_pin(text) to anon, authenticated;
grant execute on function public.rc_resolve_parent_pin(text)  to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
--  ADMIN RPCs — user provisioning, PIN reset, parent-child link
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public._rc_provision_user(p_email text, p_pin text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_id uuid;
begin
  if not public.rc_is_admin() then raise exception 'Only admins can provision users'; end if;
  if p_pin is null or length(p_pin) < 4 then raise exception 'PIN must be at least 4 digits'; end if;
  if exists (select 1 from auth.users where email = p_email) then
    raise exception 'User with that email already exists';
  end if;

  v_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id,
    'authenticated', 'authenticated', p_email,
    extensions.crypt(p_pin, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', p_display_name),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id,
            jsonb_build_object('sub', v_id::text, 'email', p_email),
            'email', p_email, now(), now(), now());
  return v_id;
end $$;

create or replace function public.rc_admin_create_staff(
  p_employee_id text, p_display_name text, p_role_id text, p_pin text,
  p_phone text default null, p_email text default null
) returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text;
begin
  v_email := lower(p_employee_id) || '@rc.local';
  v_id := public._rc_provision_user(v_email, p_pin, p_display_name);
  insert into public.rc_staff (id, employee_id, display_name, role_id, phone, email, pin, status)
    values (v_id, p_employee_id, p_display_name, p_role_id, p_phone, p_email, p_pin, 'active');
  return json_build_object('id', v_id, 'employee_id', p_employee_id);
end $$;

create or replace function public.rc_admin_create_student(
  p_student_code text, p_display_name text, p_pin text,
  p_class_id uuid default null, p_dob date default null,
  p_gender text default null, p_admission_year int default null,
  p_preferred_name text default null
) returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text;
begin
  v_email := lower(p_student_code) || '@rc.local';
  v_id := public._rc_provision_user(v_email, p_pin, p_display_name);
  insert into public.rc_students (
    id, student_code, display_name, preferred_name, dob, gender,
    current_class_id, admission_year, pin, force_pin_reset, status
  ) values (
    v_id, p_student_code, p_display_name, p_preferred_name, p_dob, p_gender,
    p_class_id, p_admission_year, p_pin, true, 'active'
  );
  return json_build_object('id', v_id, 'student_code', p_student_code);
end $$;

create or replace function public.rc_admin_create_parent(
  p_parent_code text, p_display_name text, p_pin text,
  p_phone text default null, p_whatsapp_phone text default null,
  p_email text default null, p_id_number text default null,
  p_relationship text default 'Guardian'
) returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text;
begin
  v_email := lower(p_parent_code) || '@rc.local';
  v_id := public._rc_provision_user(v_email, p_pin, p_display_name);
  insert into public.rc_parents (
    id, parent_code, display_name, phone, whatsapp_phone, email, id_number,
    relationship, pin, force_pin_reset, status
  ) values (
    v_id, p_parent_code, p_display_name, p_phone, p_whatsapp_phone, p_email,
    p_id_number, p_relationship, p_pin, true, 'active'
  );
  return json_build_object('id', v_id, 'parent_code', p_parent_code);
end $$;

create or replace function public.rc_admin_reset_pin(
  p_user_id uuid, p_new_pin text, p_force_pin_reset boolean default true
) returns void language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.rc_is_admin() then raise exception 'Only admins can reset PINs'; end if;
  if p_new_pin is null or length(p_new_pin) < 4 then raise exception 'PIN must be at least 4 digits'; end if;

  update auth.users set encrypted_password = extensions.crypt(p_new_pin, extensions.gen_salt('bf')), updated_at = now() where id = p_user_id;

  update public.rc_staff    set pin = p_new_pin                                              where id = p_user_id;
  update public.rc_students set pin = p_new_pin, force_pin_reset = p_force_pin_reset         where id = p_user_id;
  update public.rc_parents  set pin = p_new_pin, force_pin_reset = p_force_pin_reset         where id = p_user_id;
end $$;

create or replace function public.rc_admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.rc_is_admin() then raise exception 'Only admins can delete users'; end if;
  delete from auth.users where id = p_user_id;
end $$;

create or replace function public.rc_admin_link_parent_child(
  p_parent_id uuid, p_student_id uuid, p_is_primary boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.rc_is_staff() then raise exception 'Only staff can link parents'; end if;
  insert into public.rc_student_parents (parent_id, student_id, is_primary)
    values (p_parent_id, p_student_id, p_is_primary)
    on conflict (student_id, parent_id) do update set is_primary = excluded.is_primary;
end $$;

create or replace function public.rc_parent_update_child(
  p_student_id     uuid,
  p_display_name   text default null,
  p_preferred_name text default null,
  p_dob            date default null,
  p_gender         text default null,
  p_notes          text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.rc_student_parents
     where parent_id = auth.uid() and student_id = p_student_id
  ) then
    raise exception 'Not authorised — this is not your child';
  end if;

  update public.rc_students set
    display_name   = coalesce(p_display_name,   display_name),
    preferred_name = coalesce(p_preferred_name, preferred_name),
    dob            = coalesce(p_dob,            dob),
    gender         = coalesce(p_gender,         gender),
    notes          = coalesce(p_notes,          notes)
  where id = p_student_id;
end $$;

revoke all on function public.rc_admin_create_staff(text, text, text, text, text, text)                  from public;
revoke all on function public.rc_admin_create_student(text, text, text, uuid, date, text, int, text)     from public;
revoke all on function public.rc_admin_create_parent(text, text, text, text, text, text, text, text)     from public;
revoke all on function public.rc_admin_reset_pin(uuid, text, boolean)                                     from public;
revoke all on function public.rc_admin_delete_user(uuid)                                                  from public;
revoke all on function public.rc_admin_link_parent_child(uuid, uuid, boolean)                             from public;
revoke all on function public.rc_parent_update_child(uuid, text, text, date, text, text)                  from public;

grant execute on function public.rc_admin_create_staff(text, text, text, text, text, text)                 to authenticated;
grant execute on function public.rc_admin_create_student(text, text, text, uuid, date, text, int, text)    to authenticated;
grant execute on function public.rc_admin_create_parent(text, text, text, text, text, text, text, text)    to authenticated;
grant execute on function public.rc_admin_reset_pin(uuid, text, boolean)                                    to authenticated;
grant execute on function public.rc_admin_delete_user(uuid)                                                 to authenticated;
grant execute on function public.rc_admin_link_parent_child(uuid, uuid, boolean)                            to authenticated;
grant execute on function public.rc_parent_update_child(uuid, text, text, date, text, text)                 to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════

alter table public.rc_site_settings        enable row level security;
alter table public.rc_roles                enable row level security;
alter table public.rc_staff                enable row level security;
alter table public.rc_terms                enable row level security;
alter table public.rc_subjects             enable row level security;
alter table public.rc_classes              enable row level security;
alter table public.rc_class_subjects       enable row level security;
alter table public.rc_students             enable row level security;
alter table public.rc_parents              enable row level security;
alter table public.rc_student_parents      enable row level security;
alter table public.rc_assessments          enable row level security;
alter table public.rc_results              enable row level security;
alter table public.rc_fee_structures       enable row level security;
alter table public.rc_invoices             enable row level security;
alter table public.rc_payments             enable row level security;
alter table public.rc_announcements        enable row level security;
alter table public.rc_login_log            enable row level security;
alter table public.rc_holidays             enable row level security;
alter table public.rc_schemes              enable row level security;
alter table public.rc_scheme_weeks         enable row level security;
alter table public.rc_timetable_slots      enable row level security;
alter table public.rc_homework             enable row level security;
alter table public.rc_homework_submissions enable row level security;
alter table public.rc_gallery_albums       enable row level security;
alter table public.rc_gallery_photos       enable row level security;
alter table public.rc_attendance           enable row level security;
alter table public.rc_term_reports         enable row level security;
alter table public.rc_class_feed           enable row level security;

-- Drop-and-recreate (re-runnable)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename like 'rc_%' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Public reads
create policy "public reads settings"      on public.rc_site_settings   for select using (true);
create policy "public reads announcements" on public.rc_announcements   for select using (active and (audience = 'public' or audience = 'all'));
create policy "anyone reads roles"         on public.rc_roles           for select using (true);
create policy "anyone reads terms"         on public.rc_terms           for select using (true);
create policy "anyone reads subjects"      on public.rc_subjects        for select using (true);
create policy "anyone reads classes"       on public.rc_classes         for select using (true);
create policy "anyone reads class_subj"    on public.rc_class_subjects  for select using (true);
create policy "anyone reads assessments"   on public.rc_assessments     for select using (true);
create policy "public reads holidays"      on public.rc_holidays        for select using (true);
create policy "anyone reads timetable"     on public.rc_timetable_slots for select using (true);
create policy "public reads albums"        on public.rc_gallery_albums  for select using (active);
create policy "public reads photos"        on public.rc_gallery_photos  for select using (true);

-- Staff reads
create policy "staff reads staff"          on public.rc_staff           for select using (public.rc_is_staff() or id = auth.uid());
create policy "staff reads students"       on public.rc_students        for select using (public.rc_is_staff());
create policy "staff reads parents"        on public.rc_parents         for select using (public.rc_is_staff());
create policy "staff reads sp_links"       on public.rc_student_parents for select using (public.rc_is_staff());
create policy "staff reads results"        on public.rc_results         for select using (public.rc_is_staff());
create policy "staff reads fee_structures" on public.rc_fee_structures  for select using (public.rc_is_staff());
create policy "staff reads invoices"       on public.rc_invoices        for select using (public.rc_is_staff());
create policy "staff reads payments"       on public.rc_payments        for select using (public.rc_is_staff());
create policy "staff reads announce_all"   on public.rc_announcements   for select using (public.rc_is_staff());
create policy "staff reads login_log"      on public.rc_login_log       for select using (public.rc_is_admin());
create policy "staff reads schemes"        on public.rc_schemes         for select using (true);
create policy "staff reads scheme_weeks"   on public.rc_scheme_weeks    for select using (true);
create policy "staff reads hw"             on public.rc_homework        for select using (true);

-- Staff writes
create policy "staff writes students"      on public.rc_students        for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes parents"       on public.rc_parents         for all using (public.rc_is_staff() or id = auth.uid()) with check (public.rc_is_staff() or id = auth.uid());
create policy "staff writes sp_links"      on public.rc_student_parents for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes classes"       on public.rc_classes         for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes subjects"      on public.rc_subjects        for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes class_subj"    on public.rc_class_subjects  for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes terms"         on public.rc_terms           for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes assessments"   on public.rc_assessments     for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes results"       on public.rc_results         for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes fee_struct"    on public.rc_fee_structures  for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes invoices"      on public.rc_invoices        for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes payments"      on public.rc_payments        for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes announce"      on public.rc_announcements   for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes schemes"       on public.rc_schemes         for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes scheme_weeks"  on public.rc_scheme_weeks    for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes timetable"     on public.rc_timetable_slots for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes hw"            on public.rc_homework        for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff manages submissions"  on public.rc_homework_submissions for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes albums"        on public.rc_gallery_albums  for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes photos"        on public.rc_gallery_photos  for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff manages attendance"   on public.rc_attendance      for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff manages term reports" on public.rc_term_reports    for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff manages feed"         on public.rc_class_feed      for all using (public.rc_is_staff()) with check (public.rc_is_staff());

-- Admin-only writes
create policy "admin writes settings"      on public.rc_site_settings   for all using (public.rc_is_admin()) with check (public.rc_is_admin());
create policy "admin writes staff"         on public.rc_staff           for all using (public.rc_is_admin() or id = auth.uid()) with check (public.rc_is_admin() or id = auth.uid());
create policy "admin writes roles"         on public.rc_roles           for all using (public.rc_is_admin()) with check (public.rc_is_admin());
create policy "admin writes holidays"      on public.rc_holidays        for all using (public.rc_is_admin()) with check (public.rc_is_admin());

-- Student self-reads
create policy "student reads self"         on public.rc_students        for select using (id = auth.uid());
create policy "student reads own marks"    on public.rc_results         for select using (student_id = auth.uid() and exists (select 1 from public.rc_assessments a where a.id = assessment_id and a.is_published));
create policy "student reads own invoices" on public.rc_invoices        for select using (student_id = auth.uid());
create policy "student reads own payments" on public.rc_payments        for select using (exists (select 1 from public.rc_invoices i where i.id = invoice_id and i.student_id = auth.uid()));
create policy "student reads sp_self"      on public.rc_student_parents for select using (student_id = auth.uid());
create policy "student reads own att"      on public.rc_attendance      for select using (student_id = auth.uid());
create policy "student reads own report"   on public.rc_term_reports    for select using (student_id = auth.uid() and published);
create policy "student manages own sub"    on public.rc_homework_submissions for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "student reads class feed"   on public.rc_class_feed      for select using (
  exists (select 1 from public.rc_students s where s.id = auth.uid() and s.current_class_id = rc_class_feed.class_id)
);

-- Parent self-reads + children
create policy "parent reads self"         on public.rc_parents         for select using (id = auth.uid());
create policy "parent reads sp_self"      on public.rc_student_parents for select using (parent_id = auth.uid());
create policy "parent reads own kids"     on public.rc_students        for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = id and sp.parent_id = auth.uid()));
create policy "parent reads kid marks"    on public.rc_results         for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = student_id and sp.parent_id = auth.uid()) and exists (select 1 from public.rc_assessments a where a.id = assessment_id and a.is_published));
create policy "parent reads kid invoices" on public.rc_invoices        for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = student_id and sp.parent_id = auth.uid()));
create policy "parent reads kid payments" on public.rc_payments        for select using (exists (select 1 from public.rc_invoices i join public.rc_student_parents sp on sp.student_id = i.student_id where i.id = invoice_id and sp.parent_id = auth.uid()));
create policy "parent reads kid att"      on public.rc_attendance      for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = rc_attendance.student_id and sp.parent_id = auth.uid()));
create policy "parent reads kid report"   on public.rc_term_reports    for select using (published and exists (select 1 from public.rc_student_parents sp where sp.student_id = rc_term_reports.student_id and sp.parent_id = auth.uid()));
create policy "parent reads kid sub"      on public.rc_homework_submissions for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = rc_homework_submissions.student_id and sp.parent_id = auth.uid()));
create policy "parent reads kid feed"     on public.rc_class_feed      for select using (
  exists (select 1 from public.rc_students s join public.rc_student_parents sp on sp.student_id = s.id
          where s.current_class_id = rc_class_feed.class_id and sp.parent_id = auth.uid())
);

-- Self-updates
create policy "student updates self"      on public.rc_students        for update using (id = auth.uid()) with check (id = auth.uid());
create policy "parent updates self"       on public.rc_parents         for update using (id = auth.uid()) with check (id = auth.uid());

-- Login log: insert from anywhere (audit)
create policy "anyone writes login log"   on public.rc_login_log       for insert with check (true);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('rc-public', 'rc-public', true)
  on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
--  SEED — primary-school configuration (Term 2 2026 active)
-- ═══════════════════════════════════════════════════════════════════════

-- Terms — 2026
insert into public.rc_terms (id, name, academic_year, term_number, start_date, end_date, is_current) values
  ('44444444-4444-4444-4444-000000002601', 'Term 1 2026', 2026, 1, '2026-01-13', '2026-04-10', false),
  ('44444444-4444-4444-4444-000000002602', 'Term 2 2026', 2026, 2, '2026-05-13', '2026-08-14', true),
  ('44444444-4444-4444-4444-000000002603', 'Term 3 2026', 2026, 3, '2026-09-09', '2026-12-04', false)
on conflict (id) do nothing;

-- Always sync the public-facing school details (re-runnable refresh).
update public.rc_site_settings
   set school_name    = 'Ridgecrest Junior School',
       motto          = 'Quality education · ECD A to Grade 7',
       tagline        = 'Quality education from ECD A & B to Grade 7, supported by a state-of-the-art computer lab and safe, reliable transport.',
       primary_phone  = '+263 77 389 2866',
       whatsapp_phone = '+263 77 389 2866',
       email          = 'enquiries@ridgecrest.co.zw',
       address_line   = '235 Chiremba Road, Hatfield, Harare',
       facebook_url   = 'https://www.facebook.com/profile.php?id=61583900260420',
       hero_headline  = 'A learning home for tomorrow''s leaders.',
       hero_subhead   = 'ECD A through Grade 7 in Hatfield, Harare. Modern classrooms, a state-of-the-art computer lab, and safe school transport.',
       current_term_id = '44444444-4444-4444-4444-000000002602'
 where id = 1;

update public.rc_site_settings
   set paynow_url        = coalesce(paynow_url,        'https://www.paynow.co.zw/Payment/Link/?q=YOUR-LINK'),
       paynow_account    = coalesce(paynow_account,    'Ridgecrest School'),
       cash_office_hours = coalesce(cash_office_hours, 'Mon–Fri 8am–4pm at the Admin Block. Bursar: Mr. T. Ndoro.'),
       sibling_discount_pct       = coalesce(sibling_discount_pct,       10.00),
       sibling_discount_third_pct = coalesce(sibling_discount_third_pct, 15.00)
 where id = 1;

-- Subjects (Zim primary curriculum)
insert into public.rc_subjects (id, code, name, is_core, position) values
  ('33333333-3333-3333-3333-000000000101', 'MAT', 'Mathematics',                     true,  10),
  ('33333333-3333-3333-3333-000000000102', 'ENG', 'English Language',                true,  20),
  ('33333333-3333-3333-3333-000000000103', 'SHO', 'Shona',                           true,  30),
  ('33333333-3333-3333-3333-000000000104', 'HSS', 'Heritage-Social Studies',         true,  40),
  ('33333333-3333-3333-3333-000000000105', 'SCI', 'Science & Technology',            true,  50),
  ('33333333-3333-3333-3333-000000000106', 'AGR', 'Agriculture',                     false, 60),
  ('33333333-3333-3333-3333-000000000107', 'PER', 'Family, Religion & Moral Ed',     false, 70),
  ('33333333-3333-3333-3333-000000000108', 'VPA', 'Visual & Performing Arts',        false, 80),
  ('33333333-3333-3333-3333-000000000109', 'PES', 'Physical Education & Sport',      false, 90),
  ('33333333-3333-3333-3333-000000000110', 'ICT', 'ICT',                             false, 100)
on conflict (id) do nothing;

-- Classes — ECD A, ECD B, Grade 1-7
insert into public.rc_classes (id, name, level, stream, capacity, description, position) values
  ('55555555-5555-5555-5555-0000000000ea', 'ECD A',   0, null, 24, 'Early Childhood — first year',         5),
  ('55555555-5555-5555-5555-0000000000eb', 'ECD B',   0, null, 26, 'Early Childhood — second year',        7),
  ('55555555-5555-5555-5555-000000000101', 'Grade 1', 1, null, 30, 'Foundation phase',                     10),
  ('55555555-5555-5555-5555-000000000103', 'Grade 2', 2, null, 32, 'Foundation phase',                     20),
  ('55555555-5555-5555-5555-000000000104', 'Grade 3', 3, null, 32, 'Junior phase',                         30),
  ('55555555-5555-5555-5555-000000000106', 'Grade 4', 4, null, 33, 'Junior phase',                         40),
  ('55555555-5555-5555-5555-000000000107', 'Grade 5', 5, null, 33, 'Junior phase',                         50),
  ('55555555-5555-5555-5555-000000000108', 'Grade 6', 6, null, 34, 'Senior phase',                         60),
  ('55555555-5555-5555-5555-000000000109', 'Grade 7', 7, null, 34, 'Senior phase — ZIMSEC Grade 7 cohort', 70)
on conflict (id) do nothing;

-- Fee structure for Term 2 2026
do $$
declare
  v_term uuid := '44444444-4444-4444-4444-000000002602';
  c record;
  base_tuition numeric;
begin
  for c in select id, level from public.rc_classes loop
    base_tuition := case
      when c.level = 0 then 140.00
      else 180 + (c.level - 1) * 12
    end;
    insert into public.rc_fee_structures (term_id, class_id, item, amount_usd, is_mandatory, position) values
      (v_term, c.id, 'Tuition',          base_tuition, true,  10),
      (v_term, c.id, 'Development levy', 25.00,        true,  20),
      (v_term, c.id, 'Stationery pack',  18.00,        true,  30),
      (v_term, c.id, 'Sports & clubs',   15.00,        false, 40)
    on conflict (term_id, class_id, item) do nothing;
  end loop;
end $$;

-- Announcements
insert into public.rc_announcements (title, body, audience, type, active) values
  ('Term 2 opens 13 May 2026',
   'Welcome back to Term 2! Classes resumed on Wednesday. Grade 7 ZIMSEC mock exams begin 23 June.',
   'public', 'info', true),
  ('Sports Day — 4 July 2026',
   'All grades will compete on Saturday 4 July at the school grounds. Parents welcome from 8am.',
   'parents', 'info', true),
  ('Term 2 Parents Day — 27 June',
   'Teacher consultations 9am to 12pm. Bookings open from 15 June through the parent portal.',
   'parents', 'info', true)
on conflict do nothing;

-- Holidays — 2026 Zimbabwe national + school terms
insert into public.rc_holidays (date, name, description, kind, is_school_closed) values
  ('2026-01-01', 'New Year''s Day',         'Public holiday',                                'public',   true),
  ('2026-02-21', 'National Youth Day',      'Robert Mugabe National Youth Day',              'public',   true),
  ('2026-04-03', 'Good Friday',             'Public holiday (Easter)',                       'religious',true),
  ('2026-04-04', 'Easter Saturday',         'Public holiday',                                'religious',true),
  ('2026-04-06', 'Easter Monday',           'Public holiday',                                'religious',true),
  ('2026-04-18', 'Independence Day',        'Independence of Zimbabwe (1980)',               'public',   true),
  ('2026-05-01', 'Workers'' Day',           'Labour Day',                                    'public',   true),
  ('2026-05-25', 'Africa Day',              'Founding of the OAU/AU',                        'public',   true),
  ('2026-08-10', 'Heroes'' Day',            'Honouring liberation-war heroes',               'public',   true),
  ('2026-08-11', 'Defence Forces Day',      'Honouring the Zimbabwe Defence Forces',         'public',   true),
  ('2026-12-22', 'Unity Day',               'National Unity Day',                            'public',   true),
  ('2026-12-25', 'Christmas Day',           'Public holiday',                                'religious',true),
  ('2026-12-26', 'Boxing Day',              'Public holiday',                                'religious',true),
  ('2026-01-13', 'Term 1 begins',           'School opens for Term 1',                       'term_start', false),
  ('2026-04-10', 'Term 1 ends',             'School closes for Term 1',                      'term_end',   true),
  ('2026-05-13', 'Term 2 begins',           'School opens for Term 2',                       'term_start', false),
  ('2026-06-27', 'Parents'' Day',           'Mid-term parent meetings',                      'school',     false),
  ('2026-08-14', 'Term 2 ends',             'School closes for Term 2',                      'term_end',   true),
  ('2026-09-09', 'Term 3 begins',           'School opens for Term 3',                       'term_start', false),
  ('2026-12-04', 'Term 3 ends',             'School closes for the year',                    'term_end',   true)
on conflict (date) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
--  DEMO ENROLMENT — auth users + staff + parents + students + marks + fees
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public._rc_seed_user(p_email text, p_pin text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id,
      'authenticated', 'authenticated', p_email,
      extensions.crypt(p_pin, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', p_display_name),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_id,
              jsonb_build_object('sub', v_id::text, 'email', p_email),
              'email', p_email, now(), now(), now());
  else
    update auth.users
       set encrypted_password = extensions.crypt(p_pin, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;
  end if;
  return v_id;
end $$;

-- Staff
do $$
declare v_id uuid;
begin
  v_id := public._rc_seed_user('emp-001@rc.local', '1975', 'Admin (Demo)');
  insert into public.rc_staff (id, employee_id, display_name, role_id, status, pin, phone)
  values (v_id, 'EMP-001', 'Admin (Demo)', 'admin', 'active', '1975', '+263 77 000 0001')
  on conflict (employee_id) do update set id = excluded.id, role_id = 'admin', status = 'active', pin = '1975';

  v_id := public._rc_seed_user('emp-002@rc.local', '2002', 'Mrs. R. Mhembere');
  insert into public.rc_staff (id, employee_id, display_name, role_id, status, pin, phone)
  values (v_id, 'EMP-002', 'Mrs. R. Mhembere', 'teacher', 'active', '2002', '+263 77 222 2002')
  on conflict (employee_id) do update set id = excluded.id, role_id = 'teacher', status = 'active', pin = '2002';

  v_id := public._rc_seed_user('emp-003@rc.local', '3030', 'Mr. T. Ndoro');
  insert into public.rc_staff (id, employee_id, display_name, role_id, status, pin, phone)
  values (v_id, 'EMP-003', 'Mr. T. Ndoro', 'bursar', 'active', '3030', '+263 77 303 0303')
  on conflict (employee_id) do update set id = excluded.id, role_id = 'bursar', status = 'active', pin = '3030';

  v_id := public._rc_seed_user('emp-004@rc.local', '4040', 'Mrs. C. Sibanda');
  insert into public.rc_staff (id, employee_id, display_name, role_id, status, pin, phone)
  values (v_id, 'EMP-004', 'Mrs. C. Sibanda', 'teacher', 'active', '4040', '+263 77 404 0404')
  on conflict (employee_id) do update set id = excluded.id, role_id = 'teacher', status = 'active', pin = '4040';

  v_id := public._rc_seed_user('emp-005@rc.local', '5050', 'Mr. S. Moyo');
  insert into public.rc_staff (id, employee_id, display_name, role_id, status, pin, phone)
  values (v_id, 'EMP-005', 'Mr. S. Moyo', 'headmaster', 'active', '5050', '+263 77 505 0505')
  on conflict (employee_id) do update set id = excluded.id, role_id = 'headmaster', status = 'active', pin = '5050';
end $$;

-- Class teachers
update public.rc_classes set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-004') where name in ('ECD A', 'ECD B');
update public.rc_classes set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-002') where name = 'Grade 3';
update public.rc_classes set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-005') where name = 'Grade 7';

-- Class subjects — Mrs Mhembere covers core for Grade 3/4/5
insert into public.rc_class_subjects (class_id, subject_id, teacher_id)
select c.id, s.id, (select id from public.rc_staff where employee_id = 'EMP-002')
  from public.rc_classes c cross join public.rc_subjects s
 where c.name in ('Grade 3', 'Grade 4', 'Grade 5') and s.is_core
on conflict (class_id, subject_id) do nothing;

-- Parents + students
do $$
declare
  v_pid uuid; v_sid uuid;
  v_class_ecdb  uuid := '55555555-5555-5555-5555-0000000000eb';
  v_class_g3    uuid := '55555555-5555-5555-5555-000000000104';
  v_class_g4    uuid := '55555555-5555-5555-5555-000000000106';
  v_class_g5    uuid := '55555555-5555-5555-5555-000000000107';
begin
  -- Mukamuri family (3 kids — sibling discount kicks in at 3+)
  v_pid := public._rc_seed_user('par-2026-001@rc.local', '3344', 'Mr. T. Mukamuri');
  insert into public.rc_parents (id, parent_code, display_name, phone, whatsapp_phone, email, id_number, relationship, pin, force_pin_reset, status)
  values (v_pid, 'PAR-2026-001', 'Mr. T. Mukamuri', '+263 77 334 4334', '+263 77 334 4334', 't.mukamuri@gmail.com', '63-1234567-A-12', 'Father', '3344', false, 'active')
  on conflict (parent_code) do update set id = excluded.id, pin = '3344', status = 'active', force_pin_reset = false;

  v_sid := public._rc_seed_user('stu-2026-001@rc.local', '2200', 'Tafara Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-001', 'Tafara Mukamuri', 'Taf', '2017-04-22', 'M', v_class_g3, 2025, '2200', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g3, pin = '2200', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict (student_id, parent_id) do update set is_primary = true;

  v_sid := public._rc_seed_user('stu-2026-002@rc.local', '2201', 'Rumbidzai Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-002', 'Rumbidzai Mukamuri', 'Rumbi', '2015-08-11', 'F', v_class_g5, 2023, '2201', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g5, pin = '2201', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict (student_id, parent_id) do update set is_primary = true;

  v_sid := public._rc_seed_user('stu-2026-005@rc.local', '5500', 'Ratidzai Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-005', 'Ratidzai Mukamuri', 'Rati', '2021-03-19', 'F', v_class_ecdb, 2026, '5500', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_ecdb, pin = '5500', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict (student_id, parent_id) do update set is_primary = true;

  -- Tebulo family (Manisha — single child)
  v_pid := public._rc_seed_user('par-2026-002@rc.local', '4455', 'Mrs. M. Tebulo');
  insert into public.rc_parents (id, parent_code, display_name, phone, whatsapp_phone, email, id_number, relationship, pin, force_pin_reset, status)
  values (v_pid, 'PAR-2026-002', 'Mrs. M. Tebulo', '+263 77 445 5544', '+263 77 445 5544', 'm.tebulo@gmail.com', '63-9876543-B-12', 'Mother', '4455', false, 'active')
  on conflict (parent_code) do update set id = excluded.id, pin = '4455', status = 'active', force_pin_reset = false;

  v_sid := public._rc_seed_user('stu-2026-003@rc.local', '3300', 'Manisha Tebulo');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-003', 'Manisha Tebulo', 'Manny', '2017-07-15', 'F', v_class_g3, 2025, '3300', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g3, pin = '3300', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict (student_id, parent_id) do update set is_primary = true;

  -- Chiweshe family (Daniel — single child)
  v_pid := public._rc_seed_user('par-2026-003@rc.local', '5566', 'Mrs. P. Chiweshe');
  insert into public.rc_parents (id, parent_code, display_name, phone, whatsapp_phone, email, id_number, relationship, pin, force_pin_reset, status)
  values (v_pid, 'PAR-2026-003', 'Mrs. P. Chiweshe', '+263 77 556 6655', '+263 77 556 6655', 'p.chiweshe@yahoo.com', '63-5555555-C-12', 'Mother', '5566', false, 'active')
  on conflict (parent_code) do update set id = excluded.id, pin = '5566', status = 'active', force_pin_reset = false;

  v_sid := public._rc_seed_user('stu-2026-004@rc.local', '4400', 'Daniel Chiweshe');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-004', 'Daniel Chiweshe', 'Dan', '2016-11-02', 'M', v_class_g4, 2024, '4400', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g4, pin = '4400', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict (student_id, parent_id) do update set is_primary = true;
end $$;

-- Mid-term test + marks (Grade 3 + Grade 4 + Grade 5)
do $$
declare
  v_term       uuid := '44444444-4444-4444-4444-000000002602';
  v_assessment uuid;
  v_tafara     uuid := (select id from public.rc_students where student_code = 'STU-2026-001');
  v_rumbi      uuid := (select id from public.rc_students where student_code = 'STU-2026-002');
  v_manisha    uuid := (select id from public.rc_students where student_code = 'STU-2026-003');
  v_daniel     uuid := (select id from public.rc_students where student_code = 'STU-2026-004');
  v_teacher    uuid := (select id from public.rc_staff    where employee_id  = 'EMP-002');
begin
  select id into v_assessment from public.rc_assessments where term_id = v_term and name = 'Mid-Term Test' limit 1;
  if v_assessment is null then
    insert into public.rc_assessments (term_id, name, kind, max_mark, scheduled_for, is_published)
    values (v_term, 'Mid-Term Test', 'test', 100, current_date - interval '5 days', true)
    returning id into v_assessment;
  end if;

  insert into public.rc_results (student_id, assessment_id, subject_id, mark, grade, remarks, entered_by) values
    (v_tafara,  v_assessment, '33333333-3333-3333-3333-000000000101', 78, 'B', 'Strong problem-solving.',         v_teacher),
    (v_tafara,  v_assessment, '33333333-3333-3333-3333-000000000102', 72, 'B', 'Comprehension excellent.',        v_teacher),
    (v_tafara,  v_assessment, '33333333-3333-3333-3333-000000000103', 65, 'C', 'Improving steadily in Shona.',    v_teacher),
    (v_tafara,  v_assessment, '33333333-3333-3333-3333-000000000104', 81, 'A', 'Top of class in Heritage.',       v_teacher),
    (v_tafara,  v_assessment, '33333333-3333-3333-3333-000000000105', 60, 'C', 'Pay attention in practical work.',v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000101', 92, 'A', 'Excellent — fastest in mental maths.', v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000102', 88, 'A', 'Beautiful descriptive writing.',       v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000103', 85, 'A', 'Strong reading + ngano.',              v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000104', 90, 'A', 'Very engaged in class discussion.',    v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000105', 87, 'A', 'Top mark on water-cycle project.',     v_teacher),
    (v_rumbi,   v_assessment, '33333333-3333-3333-3333-000000000101', 84, 'A', 'Excellent.',                        v_teacher),
    (v_rumbi,   v_assessment, '33333333-3333-3333-3333-000000000102', 76, 'B', 'Strong essays.',                    v_teacher),
    (v_rumbi,   v_assessment, '33333333-3333-3333-3333-000000000103', 70, 'B', 'Polished delivery.',                v_teacher),
    (v_rumbi,   v_assessment, '33333333-3333-3333-3333-000000000104', 68, 'C', 'Focus more on geography.',          v_teacher),
    (v_rumbi,   v_assessment, '33333333-3333-3333-3333-000000000105', 74, 'B', 'Improved analysis.',                v_teacher),
    (v_daniel,  v_assessment, '33333333-3333-3333-3333-000000000101', 66, 'C', 'Needs more practice with fractions.', v_teacher),
    (v_daniel,  v_assessment, '33333333-3333-3333-3333-000000000102', 70, 'B', 'Good vocabulary growth.',             v_teacher),
    (v_daniel,  v_assessment, '33333333-3333-3333-3333-000000000103', 62, 'C', 'Practice oral Shona at home.',        v_teacher),
    (v_daniel,  v_assessment, '33333333-3333-3333-3333-000000000104', 75, 'B', 'Engaged in class.',                   v_teacher),
    (v_daniel,  v_assessment, '33333333-3333-3333-3333-000000000105', 68, 'C', 'Good project participation.',         v_teacher)
  on conflict (student_id, assessment_id, subject_id) do update set mark = excluded.mark, grade = excluded.grade, remarks = excluded.remarks;
end $$;

-- Invoices for Term 2 2026 + sample payments
do $$
declare
  v_term   uuid := '44444444-4444-4444-4444-000000002602';
  rec      record;
  v_total  numeric;
  v_inv    uuid;
  v_invno  text;
  v_n      int := 0;
begin
  for rec in
    select s.id as student_id, s.student_code, s.current_class_id
      from public.rc_students s
     where s.status = 'active' and s.current_class_id is not null
  loop
    v_n := v_n + 1;
    select coalesce(sum(amount_usd), 0) into v_total
      from public.rc_fee_structures
     where term_id = v_term and class_id = rec.current_class_id and is_mandatory;
    v_invno := 'INV-2026-T2-' || lpad(v_n::text, 4, '0');
    insert into public.rc_invoices (invoice_no, student_id, term_id, total_usd, paid_usd, due_date, status, notes)
    values (v_invno, rec.student_id, v_term, v_total, 0, current_date + interval '30 days', 'open', 'Term 2 2026 fees')
    on conflict (invoice_no) do nothing;
    select id into v_inv from public.rc_invoices where invoice_no = v_invno;

    if rec.student_code = 'STU-2026-001' then
      insert into public.rc_payments (receipt_no, invoice_id, amount_usd, currency, method, notes)
      values ('RCT-2026-0001', v_inv, 150.00, 'USD', 'cash', 'Demo seed — partial deposit') on conflict do nothing;
      update public.rc_invoices set paid_usd = 150.00, status = 'partial' where id = v_inv;
    elsif rec.student_code = 'STU-2026-003' then
      insert into public.rc_payments (receipt_no, invoice_id, amount_usd, currency, method, notes)
      values ('RCT-2026-0002', v_inv, v_total, 'USD', 'paynow', 'Demo seed — full payment via PayNow') on conflict do nothing;
      update public.rc_invoices set paid_usd = v_total, status = 'paid' where id = v_inv;
    end if;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
--  SEED — Grade 3 timetable, homework, attendance, term reports, feed,
--          schemes of work (Term 2), gallery
-- ═══════════════════════════════════════════════════════════════════════

-- Timetable — Grade 3 Mon-Fri, 6 periods/day
do $$
declare
  v_class   uuid := '55555555-5555-5555-5555-000000000104';
  v_teacher uuid := (select id from public.rc_staff where employee_id = 'EMP-002');
  v_mat uuid := '33333333-3333-3333-3333-000000000101';
  v_eng uuid := '33333333-3333-3333-3333-000000000102';
  v_sho uuid := '33333333-3333-3333-3333-000000000103';
  v_hss uuid := '33333333-3333-3333-3333-000000000104';
  v_sci uuid := '33333333-3333-3333-3333-000000000105';
  v_vpa uuid := '33333333-3333-3333-3333-000000000108';
  v_pes uuid := '33333333-3333-3333-3333-000000000109';
  v_ict uuid := '33333333-3333-3333-3333-000000000110';
begin
  insert into public.rc_timetable_slots (class_id, day_of_week, period, start_time, end_time, subject_id, teacher_id, room) values
    (v_class, 1, 1, '07:30', '08:15', v_mat, v_teacher, 'Room 3'),
    (v_class, 1, 2, '08:15', '09:00', v_eng, v_teacher, 'Room 3'),
    (v_class, 1, 3, '09:30', '10:15', v_sho, v_teacher, 'Room 3'),
    (v_class, 1, 4, '10:15', '11:00', v_hss, v_teacher, 'Room 3'),
    (v_class, 1, 5, '11:30', '12:15', v_sci, v_teacher, 'Lab 1'),
    (v_class, 1, 6, '12:15', '13:00', v_vpa, v_teacher, 'Art Room'),
    (v_class, 2, 1, '07:30', '08:15', v_mat, v_teacher, 'Room 3'),
    (v_class, 2, 2, '08:15', '09:00', v_sho, v_teacher, 'Room 3'),
    (v_class, 2, 3, '09:30', '10:15', v_eng, v_teacher, 'Room 3'),
    (v_class, 2, 4, '10:15', '11:00', v_sci, v_teacher, 'Lab 1'),
    (v_class, 2, 5, '11:30', '12:15', v_pes, v_teacher, 'Sports Field'),
    (v_class, 2, 6, '12:15', '13:00', v_hss, v_teacher, 'Room 3'),
    (v_class, 3, 1, '07:30', '08:15', v_eng, v_teacher, 'Room 3'),
    (v_class, 3, 2, '08:15', '09:00', v_mat, v_teacher, 'Room 3'),
    (v_class, 3, 3, '09:30', '10:15', v_sho, v_teacher, 'Room 3'),
    (v_class, 3, 4, '10:15', '11:00', v_ict, v_teacher, 'Computer Room'),
    (v_class, 3, 5, '11:30', '12:15', v_sci, v_teacher, 'Lab 1'),
    (v_class, 3, 6, '12:15', '13:00', v_hss, v_teacher, 'Room 3'),
    (v_class, 4, 1, '07:30', '08:15', v_mat, v_teacher, 'Room 3'),
    (v_class, 4, 2, '08:15', '09:00', v_eng, v_teacher, 'Room 3'),
    (v_class, 4, 3, '09:30', '10:15', v_sho, v_teacher, 'Room 3'),
    (v_class, 4, 4, '10:15', '11:00', v_hss, v_teacher, 'Room 3'),
    (v_class, 4, 5, '11:30', '12:15', v_vpa, v_teacher, 'Art Room'),
    (v_class, 4, 6, '12:15', '13:00', v_pes, v_teacher, 'Sports Field'),
    (v_class, 5, 1, '07:30', '08:15', v_eng, v_teacher, 'Room 3'),
    (v_class, 5, 2, '08:15', '09:00', v_mat, v_teacher, 'Room 3'),
    (v_class, 5, 3, '09:30', '10:15', v_sci, v_teacher, 'Lab 1'),
    (v_class, 5, 4, '10:15', '11:00', v_sho, v_teacher, 'Room 3'),
    (v_class, 5, 5, '11:30', '12:15', v_hss, v_teacher, 'Room 3'),
    (v_class, 5, 6, '12:15', '13:00', v_ict, v_teacher, 'Computer Room')
  on conflict (class_id, day_of_week, period) do nothing;
end $$;

-- Homework — 3 active Grade 3 items
do $$
declare
  v_class   uuid := '55555555-5555-5555-5555-000000000104';
  v_teacher uuid := (select id from public.rc_staff where employee_id = 'EMP-002');
begin
  insert into public.rc_homework (class_id, subject_id, teacher_id, title, description, due_date) values
    (v_class, '33333333-3333-3333-3333-000000000101', v_teacher,
     'Mathematics — Times tables 6 and 7',
     'Practise the 6 and 7 times tables. Complete worksheet pages 14–15. Show all working.',
     current_date + interval '3 days'),
    (v_class, '33333333-3333-3333-3333-000000000102', v_teacher,
     'English — Reading comprehension',
     'Read "The Clever Hare" on pages 24–26 and answer the five questions.',
     current_date + interval '5 days'),
    (v_class, '33333333-3333-3333-3333-000000000103', v_teacher,
     'Shona — Tsumo dzeShona',
     'Nyora tsumo nhatu dzaunoziva uye chazvinoreva.',
     current_date + interval '7 days')
  on conflict do nothing;
end $$;

-- Attendance — today: whole Grade 3 present; yesterday: Tafara absent
insert into public.rc_attendance (student_id, date, status, marked_by)
  select s.id, current_date, 'present',
         (select id from public.rc_staff where employee_id = 'EMP-002')
    from public.rc_students s
   where s.current_class_id = '55555555-5555-5555-5555-000000000104'
on conflict (student_id, date) do nothing;

insert into public.rc_attendance (student_id, date, status, marked_by, notes)
  select id, current_date - 1, 'absent',
         (select id from public.rc_staff where employee_id = 'EMP-002'),
         'Flu — parent called school office.'
    from public.rc_students where student_code = 'STU-2026-001'
on conflict (student_id, date) do nothing;

-- Term reports — Manisha (top of class) + Tafara
insert into public.rc_term_reports (student_id, term_id, class_teacher_remark, headmaster_remark, conduct, position_in_class, published)
  select s.id, '44444444-4444-4444-4444-000000002602',
         'Manisha is a joy to teach. She finishes her work quickly and helps her classmates. Strong in mathematics and science.',
         'A well-rounded learner with excellent results. Keep it up.',
         'Excellent', 1, true
    from public.rc_students s where s.student_code = 'STU-2026-003'
on conflict (student_id, term_id) do nothing;

insert into public.rc_term_reports (student_id, term_id, class_teacher_remark, headmaster_remark, conduct, position_in_class, published)
  select s.id, '44444444-4444-4444-4444-000000002602',
         'Tafara is making steady progress. He should focus more on reading at home.',
         'Has the ability — needs to apply himself consistently. We see growth.',
         'Good', 5, true
    from public.rc_students s where s.student_code = 'STU-2026-001'
on conflict (student_id, term_id) do nothing;

-- Class feed — Grade 3
do $$
declare
  v_class  uuid := '55555555-5555-5555-5555-000000000104';
  v_author uuid := (select id from public.rc_staff where employee_id = 'EMP-002');
begin
  insert into public.rc_class_feed (class_id, author_id, body, photo_url, pinned, created_at) values
    (v_class, v_author,
     'Grade 3 parents — a quick note. We will start the water-cycle project on Monday. Please bring an empty 2L bottle, a small plant, and a notebook.',
     null, true,
     current_timestamp - interval '1 day'),
    (v_class, v_author,
     'What a great morning! Today we did our timetable drill and Manisha got every single 7-times-table answer right. Tafara was off school today (we hope he feels better soon).',
     '/photos/rc-cafe-kids.jpg',
     false,
     current_timestamp - interval '6 hours'),
    (v_class, v_author,
     'Friendly reminder: spelling test tomorrow on Unit 4 (long-vowel patterns).',
     null, false,
     current_timestamp - interval '2 hours');
end $$;

-- Gallery — 2 albums × 3 photos
do $$
declare
  v_album1 uuid; v_album2 uuid;
begin
  -- Refresh: clear existing seed albums so we can re-seed with the real Ridgecrest photos
  delete from public.rc_gallery_photos where album_id in (
    select id from public.rc_gallery_albums where title in
      ('Heritage Trip — Kumusha Crescent', 'A day on campus', 'Computer Lab',
       'Sports Day 2026', 'Term 2 opens', 'Practical Learning')
  );
  delete from public.rc_gallery_albums where title in
    ('Heritage Trip — Kumusha Crescent', 'A day on campus', 'Computer Lab',
     'Sports Day 2026', 'Term 2 opens', 'Practical Learning');

  v_album1 := gen_random_uuid();
  insert into public.rc_gallery_albums (id, title, description, cover_url, event_date, position) values
    (v_album1, 'Heritage Trip — Kumusha Crescent',
     'Ridgecrest Junior on a heritage visit — our heritage, our pride. Pounding maize, traditional storytelling, and learning the old ways.',
     '/photos/rc-heritage-wide-1.jpg', '2026-06-15', 10);
  insert into public.rc_gallery_photos (album_id, url, caption, position) values
    (v_album1, '/photos/rc-heritage-wide-1.jpg',  'At the kraal',                   10),
    (v_album1, '/photos/rc-heritage-wide-2.jpg',  'Pounding maize',                 20),
    (v_album1, '/photos/rc-heritage-line.jpg',    'Learning together',              30),
    (v_album1, '/photos/rc-heritage-portrait.jpg','One of our learners',            40);

  v_album2 := gen_random_uuid();
  insert into public.rc_gallery_albums (id, title, description, cover_url, event_date, position) values
    (v_album2, 'Cultural Day on campus',
     'Traditional dress, traditional cloth, and traditional stories — celebrating Zimbabwe at Ridgecrest Junior.',
     '/photos/rc-classroom-cultural-2.jpg', '2026-05-20', 20);
  insert into public.rc_gallery_photos (album_id, url, caption, position) values
    (v_album2, '/photos/rc-classroom-cultural-1.jpg', 'Cultural day — group',  10),
    (v_album2, '/photos/rc-classroom-cultural-2.jpg', 'In their colours',      20),
    (v_album2, '/photos/rc-classroom-cultural-3.jpg', 'Listening to elders',   30);

  declare v_album3 uuid := gen_random_uuid();
  begin
    insert into public.rc_gallery_albums (id, title, description, cover_url, event_date, position) values
      (v_album3, 'Practical Learning — Pizza-making at Pastino',
       'Hands-on learning beyond the classroom — our learners measuring, mixing, and making their own meals.',
       '/photos/rc-pizza-class.jpg', '2026-04-22', 30);
    insert into public.rc_gallery_photos (album_id, url, caption, position) values
      (v_album3, '/photos/rc-pizza-class.jpg', 'Building the pizzas',  10),
      (v_album3, '/photos/rc-cafe-kids.jpg',   'A well-earned break',  20);
  end;
end $$;

-- Schemes of work — Grade 3 · Term 2 · five core subjects, 12 weeks each
do $$
declare
  v_term    uuid := '44444444-4444-4444-4444-000000002602';
  v_class   uuid := '55555555-5555-5555-5555-000000000104';
  v_teacher uuid := (select id from public.rc_staff where employee_id = 'EMP-002');
  v_scheme  uuid;
  v_start   date := '2026-05-13';
begin
  -- MATHEMATICS
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status)
  values (v_class, '33333333-3333-3333-3333-000000000101', v_term, v_teacher,
          'Mathematics — Grade 3 — Term 2 2026',
          'Number sense to 1000, basic operations with regrouping, multiplication tables, fractions, 2D shapes, money, and time.',
          'active')
  on conflict (class_id, subject_id, term_id) do update set title = excluded.title, overview = excluded.overview
  returning id into v_scheme;

  insert into public.rc_scheme_weeks (scheme_id, week_number, week_start_date, topic, subtopics, learning_objectives, teaching_methods, resources, assessment_strategy) values
    (v_scheme,  1, v_start +  0, 'Numbers up to 1 000',           'Counting, place value, ordering',  'Read, write, count and order numbers up to 1 000.',           'Demonstration; choral counting; group work', 'Number cards; place-value chart; abacus', 'Class exercise + quick oral quiz'),
    (v_scheme,  2, v_start +  7, 'Addition with regrouping',      'Carrying tens & hundreds',          'Add 3-digit numbers with regrouping.',                         'Demonstration; pair practice; worksheets',  'Workbook; place-value chart',             'Marked workbook exercise'),
    (v_scheme,  3, v_start + 14, 'Subtraction with regrouping',   'Borrowing across columns',          'Subtract 3-digit numbers with regrouping.',                    'Modelling; pair work; word problems',       'Workbook; counters',                       'Short class test'),
    (v_scheme,  4, v_start + 21, 'Multiplication tables 2, 3, 4', 'Repeated addition; arrays',         'Recite and apply 2, 3, 4 times tables.',                       'Choral; flash cards; games',                'Flash cards; times-table chart',           'Daily oral quiz'),
    (v_scheme,  5, v_start + 28, 'Multiplication tables 5, 6, 7', 'Number patterns',                   'Recite and apply 5, 6, 7 times tables.',                       'Choral; flash cards; songs',                'Flash cards; chart',                       'Oral + written quiz'),
    (v_scheme,  6, v_start + 35, 'Multiplication tables 8, 9, 10','Number patterns',                   'Recite and apply 8, 9, 10 times tables.',                      'Choral; pair drilling',                     'Flash cards; chart',                       'Oral + written quiz'),
    (v_scheme,  7, v_start + 42, 'Division basics',               'Sharing and grouping',              'Use division as the inverse of multiplication.',               'Demonstration with counters; word problems','Counters; workbook',                       'Marked workbook exercise'),
    (v_scheme,  8, v_start + 49, 'Fractions',                     'Halves, thirds, quarters',          'Recognise and represent simple fractions of a whole.',         'Cutting paper shapes; drawing diagrams',    'Paper, scissors, fraction strips',         'Practical demonstration + worksheet'),
    (v_scheme,  9, v_start + 56, '2D shapes',                     'Properties of square, rectangle, triangle, circle', 'Identify and describe 2D shapes.',           'Shape sorting; drawing; group display',     'Shape cut-outs; geoboard',                 'Group display + short test'),
    (v_scheme, 10, v_start + 63, 'Money — Zimbabwe coins & notes','Recognising; making change',        'Identify Zim currency and compute simple change.',             'Role play (shop); demonstration',           'Play money; goods price tags',             'Role-play assessment'),
    (v_scheme, 11, v_start + 70, 'Time',                          'Reading clocks; days; months',      'Tell time on analogue clocks; sequence days and months.',      'Demonstration with clock model; songs',     'Demonstration clock; calendar',            'Practical demonstration'),
    (v_scheme, 12, v_start + 77, 'Revision & Term 2 assessment',  'Recap of weeks 1–11',               'Consolidate term skills; assess achievement.',                 'Revision; mock test; feedback',             'Revision sheets',                          'End-of-term test')
  on conflict (scheme_id, week_number) do nothing;

  -- ENGLISH
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status)
  values (v_class, '33333333-3333-3333-3333-000000000102', v_term, v_teacher,
          'English Language — Grade 3 — Term 2 2026',
          'Phonics, comprehension, parts of speech, sentence construction, descriptive writing, letter writing, oral skills.',
          'active')
  on conflict (class_id, subject_id, term_id) do update set title = excluded.title
  returning id into v_scheme;

  insert into public.rc_scheme_weeks (scheme_id, week_number, week_start_date, topic, subtopics, learning_objectives, teaching_methods, resources, assessment_strategy) values
    (v_scheme,  1, v_start +  0, 'Phonics — long vowel sounds',   'a-e, i-e, o-e patterns',           'Read words with silent-e pattern.',                              'Reading aloud; phonics drill',              'Phonics flash cards',                       'Reading aloud check'),
    (v_scheme,  2, v_start +  7, 'Reading comprehension',         'Short stories with questions',     'Read short text and answer who/what/where questions.',           'Shared reading; Q&A',                       'Reader; question sheet',                    'Marked comprehension'),
    (v_scheme,  3, v_start + 14, 'Nouns — singular & plural',     'Adding s, es, ies',                'Form plural nouns correctly.',                                    'Demonstration; sorting; worksheets',        'Worksheet; flash cards',                    'Marked worksheet'),
    (v_scheme,  4, v_start + 21, 'Verbs — present tense',         'Action words',                     'Use present-tense verbs in sentences.',                          'Demonstration; sentence building',          'Verb flash cards',                          'Sentence-writing task'),
    (v_scheme,  5, v_start + 28, 'Sentence construction',         'Capital letter, full stop',         'Write complete sentences with correct punctuation.',              'Modelling; pair editing',                   'Workbook',                                  'Marked workbook exercise'),
    (v_scheme,  6, v_start + 35, 'Adjectives & description',      'Describing people, places, things','Use adjectives to describe nouns.',                               'Description game; modelling',               'Picture cards',                             'Descriptive paragraph task'),
    (v_scheme,  7, v_start + 42, 'Punctuation',                   'Question mark, exclamation mark',  'Punctuate questions and exclamations.',                           'Demonstration; editing exercise',           'Worksheet',                                 'Editing test'),
    (v_scheme,  8, v_start + 49, 'Friendly letter writing',       'Greeting, body, sign-off',         'Compose a friendly letter.',                                      'Modelling; drafting; peer review',          'Letter template',                           'Marked letter'),
    (v_scheme,  9, v_start + 56, 'Story writing',                 'Beginning, middle, end',           'Write a short narrative with clear sequence.',                    'Story planning; drafting',                  'Story map sheet',                           'Marked short story'),
    (v_scheme, 10, v_start + 63, 'Listening skills',              'Follow-up questions; instructions','Listen to a passage and answer questions.',                       'Read-aloud; oral Q&A',                      'Audio / teacher reader',                    'Oral comprehension check'),
    (v_scheme, 11, v_start + 70, 'Oral presentation',             '"My favourite…" talks',            'Present a 1-minute talk on a chosen topic.',                      'Modelling; peer feedback',                  'Cue cards',                                 'Oral assessment'),
    (v_scheme, 12, v_start + 77, 'Revision & Term 2 assessment',  'Recap of weeks 1–11',              'Consolidate term skills.',                                       'Revision; mock test',                       'Revision sheets',                           'End-of-term test')
  on conflict (scheme_id, week_number) do nothing;

  -- SHONA, HERITAGE, SCIENCE seeded as schemes only (week-level content already exists in long form;
  -- omitted here to keep this single install file readable. Add via /admin/schemes when needed.)
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status) values
    (v_class, '33333333-3333-3333-3333-000000000103', v_term, v_teacher, 'Shona — Grade 3 — Term 2 2026',                'Mavara, mazwi, kuverenga ngano, kunyora, tsumo nemadimikira.',                            'active'),
    (v_class, '33333333-3333-3333-3333-000000000104', v_term, v_teacher, 'Heritage-Social Studies — Grade 3 — Term 2',   'Zimbabwean identity: symbols, heroes, provinces, landmarks, traditional life, community.','active'),
    (v_class, '33333333-3333-3333-3333-000000000105', v_term, v_teacher, 'Science & Technology — Grade 3 — Term 2',      'Living things, plants & animals, materials, water cycle, weather, forces, simple machines.','active')
  on conflict (class_id, subject_id, term_id) do update set title = excluded.title;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
--  DONE
-- ═══════════════════════════════════════════════════════════════════════

select 'Ridgecrest install complete' as status,
       (select count(*) from public.rc_staff)             as staff,
       (select count(*) from public.rc_parents)           as parents,
       (select count(*) from public.rc_students)          as students,
       (select count(*) from public.rc_classes)           as classes,
       (select count(*) from public.rc_subjects)          as subjects,
       (select count(*) from public.rc_invoices)          as invoices,
       (select count(*) from public.rc_payments)          as payments,
       (select count(*) from public.rc_attendance)        as attendance,
       (select count(*) from public.rc_term_reports)      as term_reports,
       (select count(*) from public.rc_class_feed)        as feed_posts,
       (select count(*) from public.rc_holidays)          as holidays,
       (select count(*) from public.rc_timetable_slots)   as timetable_slots,
       (select count(*) from public.rc_schemes)           as schemes,
       (select count(*) from public.rc_gallery_albums)    as albums;

select public.rc_resolve_staff_pin('1975')   as admin_pin_check,
       public.rc_resolve_student_pin('3300') as manisha_pin_check,
       public.rc_resolve_parent_pin('4455')  as tebulo_pin_check;
