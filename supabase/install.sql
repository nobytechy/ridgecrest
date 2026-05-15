-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest School — install.sql
--
--  Single-tenant school information system. Shares the CAG Supabase project
--  but every table uses the `rc_` prefix.
--
--  Auth model:
--    • Staff (admin, headmaster, teacher, accountant, etc.) login via PIN
--      at /admin/login. Email synthesised as emp-NNN@rc.local.
--    • Students login via PIN at /student/login.
--    • Parents login via PIN at /parent/login.
--    • Default admin PIN: 1975.
--
--  Apply order:
--    1.  install.sql               (this file)
--    2.  setup_demo_admin.sql      (creates demo users + seed enrolments + marks + fees)
--    3.  admin_functions.sql       (admin RPCs to create / delete / reset PIN)
--
--  Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create or replace function public.rc_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ─── Site settings ───────────────────────────────────────────────────────
create table if not exists public.rc_site_settings (
  id              int primary key default 1 check (id = 1),
  school_name     text not null default 'Ridgecrest',
  motto           text default 'Wisdom · Discipline · Excellence',
  tagline         text default 'A learning home for tomorrow''s leaders.',
  primary_phone   text default '+263 77 000 0000',
  whatsapp_phone  text default '+263 77 000 0000',
  email           text default 'enquiries@ridgecrest.co.zw',
  address_line    text default 'Borrowdale, Harare',
  google_maps_url text,
  facebook_url    text,
  instagram_url   text,
  logo_url        text,
  hero_image_url  text,
  hero_headline   text default 'A learning home for tomorrow''s leaders.',
  hero_subhead    text default 'Tradition, discipline, and modern teaching — every child known by name.',
  founded_year    int default 1982,
  current_term_id uuid,
  updated_at      timestamptz not null default now()
);
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
  ('admin',       'Administrator',         '{"all": true}'::jsonb,                   true),
  ('headmaster',  'Headmaster',            '{"all": true}'::jsonb,                   true),
  ('teacher',     'Teacher',               '{"marks": true, "attendance": true}'::jsonb, true),
  ('bursar',      'Bursar / Accountant',   '{"fees": true, "payments": true}'::jsonb,true),
  ('secretary',   'Secretary',             '{"students": true, "announcements": true}'::jsonb, true)
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
  name          text not null,         -- "Term 1 2026"
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
  code        text not null unique,    -- "MAT", "ENG"
  name        text not null,
  description text,
  is_core     boolean not null default true,
  position    int not null default 100,
  created_at  timestamptz not null default now()
);

-- ─── Classes ────────────────────────────────────────────────────────────
create table if not exists public.rc_classes (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,                 -- "Form 1A"
  level           int  not null,                        -- 1 = Form 1, 4 = Form 4, etc.
  stream          text,                                 -- "A", "B", "Sciences"
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

-- ─── Class subjects (subject taught in a class by a teacher) ────────────
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
  student_code    text not null unique,           -- "STU-2026-001"
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

-- ─── Parents / guardians ────────────────────────────────────────────────
create table if not exists public.rc_parents (
  id              uuid primary key references auth.users(id) on delete cascade,
  parent_code     text not null unique,           -- "PAR-2026-001"
  display_name    text not null,
  phone           text,
  whatsapp_phone  text,
  email           text,
  id_number       text,
  relationship    text,                           -- "Father", "Mother", "Guardian"
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

-- ─── Assessments (tests, exams) ─────────────────────────────────────────
create table if not exists public.rc_assessments (
  id            uuid primary key default gen_random_uuid(),
  term_id       uuid not null references public.rc_terms(id) on delete cascade,
  name          text not null,                   -- "Mid-Term Test", "End-of-Term Exam"
  kind          text not null default 'test' check (kind in ('test','exam','assignment','continuous')),
  max_mark      numeric(6,2) not null default 100,
  scheduled_for date,
  is_published  boolean not null default false,  -- students/parents only see published marks
  created_at    timestamptz not null default now()
);
create index if not exists rc_assessments_term_idx on public.rc_assessments(term_id);

-- ─── Results / marks ────────────────────────────────────────────────────
create table if not exists public.rc_results (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.rc_students(id) on delete cascade,
  assessment_id uuid not null references public.rc_assessments(id) on delete cascade,
  subject_id    uuid not null references public.rc_subjects(id) on delete cascade,
  mark          numeric(6,2),
  grade         text,                            -- "A", "B", "C", "D", "E", "U"
  remarks       text,
  entered_by    uuid references auth.users(id) on delete set null,
  entered_at    timestamptz not null default now(),
  unique (student_id, assessment_id, subject_id)
);
create index if not exists rc_results_student_idx    on public.rc_results(student_id);
create index if not exists rc_results_assessment_idx on public.rc_results(assessment_id);

-- ─── Fee structure ──────────────────────────────────────────────────────
create table if not exists public.rc_fee_structures (
  id            uuid primary key default gen_random_uuid(),
  term_id       uuid not null references public.rc_terms(id) on delete cascade,
  class_id      uuid not null references public.rc_classes(id) on delete cascade,
  item          text not null,                   -- "Tuition", "Transport", "Meals", "Levy"
  amount_usd    numeric(12,2) not null,
  is_mandatory  boolean not null default true,
  position      int not null default 100,
  created_at    timestamptz not null default now(),
  unique (term_id, class_id, item)
);

-- ─── Fee invoices ──────────────────────────────────────────────────────
create table if not exists public.rc_invoices (
  id            uuid primary key default gen_random_uuid(),
  invoice_no    text not null unique,            -- "INV-2026-T1-0001"
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

-- ─── Payments ──────────────────────────────────────────────────────────
create table if not exists public.rc_payments (
  id           uuid primary key default gen_random_uuid(),
  receipt_no   text not null unique,             -- "RCT-2026-0001"
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

-- ─── Announcements ─────────────────────────────────────────────────────
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

-- ─── Login audit ──────────────────────────────────────────────────────
create table if not exists public.rc_login_log (
  id           uuid primary key default gen_random_uuid(),
  who_kind     text not null check (who_kind in ('staff','student','parent')),
  who_id       uuid references auth.users(id) on delete set null,
  identifier   text,
  success      boolean not null default false,
  user_agent   text,
  attempted_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
--  Helper functions
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
--  RLS — relaxed per "easy to use" requirement.
--   • Public read on site settings + announcements (public audience)
--   • Staff reads + writes operational tables; admin gates config
--   • Student reads their own marks/fees + class info
--   • Parent reads their children's marks/fees + class info
-- ═══════════════════════════════════════════════════════════════════════

alter table public.rc_site_settings    enable row level security;
alter table public.rc_roles            enable row level security;
alter table public.rc_staff            enable row level security;
alter table public.rc_terms            enable row level security;
alter table public.rc_subjects         enable row level security;
alter table public.rc_classes          enable row level security;
alter table public.rc_class_subjects   enable row level security;
alter table public.rc_students         enable row level security;
alter table public.rc_parents          enable row level security;
alter table public.rc_student_parents  enable row level security;
alter table public.rc_assessments      enable row level security;
alter table public.rc_results          enable row level security;
alter table public.rc_fee_structures   enable row level security;
alter table public.rc_invoices         enable row level security;
alter table public.rc_payments         enable row level security;
alter table public.rc_announcements    enable row level security;
alter table public.rc_login_log        enable row level security;

-- Public reads
drop policy if exists "public reads settings"      on public.rc_site_settings;
drop policy if exists "public reads announcements" on public.rc_announcements;
drop policy if exists "anyone reads roles"         on public.rc_roles;
drop policy if exists "anyone reads terms"         on public.rc_terms;
drop policy if exists "anyone reads subjects"      on public.rc_subjects;
drop policy if exists "anyone reads classes"       on public.rc_classes;

create policy "public reads settings"      on public.rc_site_settings for select using (true);
create policy "public reads announcements" on public.rc_announcements for select using (active and (audience = 'public' or audience = 'all'));
create policy "anyone reads roles"         on public.rc_roles         for select using (true);
create policy "anyone reads terms"         on public.rc_terms         for select using (true);
create policy "anyone reads subjects"      on public.rc_subjects      for select using (true);
create policy "anyone reads classes"       on public.rc_classes       for select using (true);

-- Staff: read + write on everything operational
drop policy if exists "staff reads staff"          on public.rc_staff;
drop policy if exists "staff reads students"       on public.rc_students;
drop policy if exists "staff reads parents"        on public.rc_parents;
drop policy if exists "staff reads sp_links"       on public.rc_student_parents;
drop policy if exists "staff reads class_subjects" on public.rc_class_subjects;
drop policy if exists "staff reads assessments"    on public.rc_assessments;
drop policy if exists "staff reads results"        on public.rc_results;
drop policy if exists "staff reads fee_structures" on public.rc_fee_structures;
drop policy if exists "staff reads invoices"       on public.rc_invoices;
drop policy if exists "staff reads payments"       on public.rc_payments;
drop policy if exists "staff reads announce_all"   on public.rc_announcements;
drop policy if exists "staff reads login_log"      on public.rc_login_log;

create policy "staff reads staff"          on public.rc_staff           for select using (public.rc_is_staff() or id = auth.uid());
create policy "staff reads students"       on public.rc_students        for select using (public.rc_is_staff());
create policy "staff reads parents"        on public.rc_parents         for select using (public.rc_is_staff());
create policy "staff reads sp_links"       on public.rc_student_parents for select using (public.rc_is_staff());
create policy "staff reads class_subjects" on public.rc_class_subjects  for select using (true);
create policy "staff reads assessments"    on public.rc_assessments     for select using (true);
create policy "staff reads results"        on public.rc_results         for select using (public.rc_is_staff());
create policy "staff reads fee_structures" on public.rc_fee_structures  for select using (public.rc_is_staff());
create policy "staff reads invoices"       on public.rc_invoices        for select using (public.rc_is_staff());
create policy "staff reads payments"       on public.rc_payments        for select using (public.rc_is_staff());
create policy "staff reads announce_all"   on public.rc_announcements   for select using (public.rc_is_staff());
create policy "staff reads login_log"      on public.rc_login_log       for select using (public.rc_is_admin());

drop policy if exists "staff writes students"      on public.rc_students;
drop policy if exists "staff writes parents"       on public.rc_parents;
drop policy if exists "staff writes sp_links"      on public.rc_student_parents;
drop policy if exists "staff writes classes"       on public.rc_classes;
drop policy if exists "staff writes subjects"      on public.rc_subjects;
drop policy if exists "staff writes class_subj"    on public.rc_class_subjects;
drop policy if exists "staff writes terms"         on public.rc_terms;
drop policy if exists "staff writes assessments"   on public.rc_assessments;
drop policy if exists "staff writes results"       on public.rc_results;
drop policy if exists "staff writes fee_struct"    on public.rc_fee_structures;
drop policy if exists "staff writes invoices"      on public.rc_invoices;
drop policy if exists "staff writes payments"      on public.rc_payments;
drop policy if exists "staff writes announce"      on public.rc_announcements;
drop policy if exists "admin writes settings"      on public.rc_site_settings;
drop policy if exists "admin writes staff"         on public.rc_staff;
drop policy if exists "admin writes roles"         on public.rc_roles;
drop policy if exists "self updates staff"         on public.rc_staff;

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
create policy "admin writes settings"      on public.rc_site_settings   for all using (public.rc_is_admin()) with check (public.rc_is_admin());
create policy "admin writes staff"         on public.rc_staff           for all using (public.rc_is_admin() or id = auth.uid()) with check (public.rc_is_admin() or id = auth.uid());
create policy "admin writes roles"         on public.rc_roles           for all using (public.rc_is_admin()) with check (public.rc_is_admin());

-- Student self-reads
drop policy if exists "student reads self"          on public.rc_students;
drop policy if exists "student reads own marks"     on public.rc_results;
drop policy if exists "student reads own invoices"  on public.rc_invoices;
drop policy if exists "student reads own payments"  on public.rc_payments;
drop policy if exists "student reads sp_self"       on public.rc_student_parents;
drop policy if exists "student reads pub_assess"    on public.rc_assessments;

create policy "student reads self"          on public.rc_students        for select using (id = auth.uid());
create policy "student reads own marks"     on public.rc_results         for select using (student_id = auth.uid() and exists (select 1 from public.rc_assessments a where a.id = assessment_id and a.is_published));
create policy "student reads own invoices"  on public.rc_invoices        for select using (student_id = auth.uid());
create policy "student reads own payments"  on public.rc_payments        for select using (exists (select 1 from public.rc_invoices i where i.id = invoice_id and i.student_id = auth.uid()));
create policy "student reads sp_self"       on public.rc_student_parents for select using (student_id = auth.uid());

-- Parent self-reads (own row + their children's data)
drop policy if exists "parent reads self"          on public.rc_parents;
drop policy if exists "parent reads sp_self"       on public.rc_student_parents;
drop policy if exists "parent reads own kids"      on public.rc_students;
drop policy if exists "parent reads kid marks"     on public.rc_results;
drop policy if exists "parent reads kid invoices"  on public.rc_invoices;
drop policy if exists "parent reads kid payments"  on public.rc_payments;

create policy "parent reads self"         on public.rc_parents         for select using (id = auth.uid());
create policy "parent reads sp_self"      on public.rc_student_parents for select using (parent_id = auth.uid());
create policy "parent reads own kids"     on public.rc_students        for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = id and sp.parent_id = auth.uid()));
create policy "parent reads kid marks"    on public.rc_results         for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = student_id and sp.parent_id = auth.uid()) and exists (select 1 from public.rc_assessments a where a.id = assessment_id and a.is_published));
create policy "parent reads kid invoices" on public.rc_invoices        for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = student_id and sp.parent_id = auth.uid()));
create policy "parent reads kid payments" on public.rc_payments        for select using (exists (select 1 from public.rc_invoices i join public.rc_student_parents sp on sp.student_id = i.student_id where i.id = invoice_id and sp.parent_id = auth.uid()));

-- Login log: insert from anywhere (audit)
drop policy if exists "anyone writes login log" on public.rc_login_log;
create policy "anyone writes login log" on public.rc_login_log for insert with check (true);

-- Self-update PIN/password support for students + parents
drop policy if exists "student updates self" on public.rc_students;
drop policy if exists "parent updates self"  on public.rc_parents;
create policy "student updates self" on public.rc_students for update using (id = auth.uid()) with check (id = auth.uid());
create policy "parent updates self"  on public.rc_parents  for update using (id = auth.uid()) with check (id = auth.uid());

-- Storage bucket for student / staff photos
insert into storage.buckets (id, name, public) values ('rc-public', 'rc-public', true)
  on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
--  Seed: subjects, current term, classes, fee structures, announcements
-- ═══════════════════════════════════════════════════════════════════════

-- Subjects (Zim secondary-school staples)
insert into public.rc_subjects (id, code, name, is_core, position) values
  ('33333333-3333-3333-3333-000000000001', 'MAT', 'Mathematics',         true,  10),
  ('33333333-3333-3333-3333-000000000002', 'ENG', 'English Language',    true,  20),
  ('33333333-3333-3333-3333-000000000003', 'SHO', 'Shona',               true,  30),
  ('33333333-3333-3333-3333-000000000004', 'CSC', 'Combined Science',    true,  40),
  ('33333333-3333-3333-3333-000000000005', 'HIS', 'History',             false, 50),
  ('33333333-3333-3333-3333-000000000006', 'ICT', 'ICT',                 false, 60)
on conflict (id) do nothing;

-- Current term — Term 1 2026, ~May→Aug
insert into public.rc_terms (id, name, academic_year, term_number, start_date, end_date, is_current) values
  ('44444444-4444-4444-4444-000000000001', 'Term 1 2026', 2026, 1, '2026-05-13', '2026-08-15', true)
on conflict (id) do nothing;

update public.rc_site_settings set current_term_id = '44444444-4444-4444-4444-000000000001' where id = 1;

-- Classes
insert into public.rc_classes (id, name, level, stream, capacity, description, position) values
  ('55555555-5555-5555-5555-000000000001', 'Form 1A', 1, 'A', 32, 'Mathematics + Sciences stream',  10),
  ('55555555-5555-5555-5555-000000000002', 'Form 2B', 2, 'B', 30, 'Commercial subjects stream',     20),
  ('55555555-5555-5555-5555-000000000003', 'Form 3A', 3, 'A', 28, 'O-Level Sciences group',         30)
on conflict (id) do nothing;

-- Fee structure for Term 1 2026 (per class)
insert into public.rc_fee_structures (term_id, class_id, item, amount_usd, is_mandatory, position) values
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000001', 'Tuition',         320.00, true,  10),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000001', 'Development levy', 40.00, true,  20),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000001', 'Sports & clubs',   20.00, false, 30),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000002', 'Tuition',         340.00, true,  10),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000002', 'Development levy', 40.00, true,  20),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000002', 'Sports & clubs',   20.00, false, 30),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000003', 'Tuition',         380.00, true,  10),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000003', 'Lab levy',         50.00, true,  20),
  ('44444444-4444-4444-4444-000000000001', '55555555-5555-5555-5555-000000000003', 'Sports & clubs',   20.00, false, 30)
on conflict do nothing;

-- Public announcement
insert into public.rc_announcements (title, body, audience, type) values
  ('Term 1 opens 13 May 2026', 'Welcome back. Classes resume Wednesday 13 May. First-day uniform is full school uniform with the navy blazer.', 'public', 'info')
  on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- Done. Now run setup_demo_admin.sql to create the EMP-001 admin + the
-- demo parent/students with marks/fees so all three portals come alive.
-- ─────────────────────────────────────────────────────────────────────────
