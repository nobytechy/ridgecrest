-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — modules_v2.sql
--
--  Pitch-tier upgrades on top of the existing modules:
--    • rc_attendance         — daily class register
--    • rc_term_reports       — class-teacher + headmaster remarks per term
--    • rc_class_feed         — Class-Dojo style daily diary
--    • Sibling discount tier on rc_site_settings
--    • Seed today's attendance + a few class-feed posts + remarks
--
--  Run AFTER everything else (install + primary_reseed + setup_demo_admin
--  + admin_functions + schemes + holidays + modules_extra).
-- ─────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════
--  1. Attendance
-- ═══════════════════════════════════════════════════════════════════════

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

alter table public.rc_attendance enable row level security;
drop policy if exists "staff manages attendance" on public.rc_attendance;
drop policy if exists "student reads own att"    on public.rc_attendance;
drop policy if exists "parent reads kid att"     on public.rc_attendance;
create policy "staff manages attendance" on public.rc_attendance for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "student reads own att"    on public.rc_attendance for select using (student_id = auth.uid());
create policy "parent reads kid att"     on public.rc_attendance for select using (
  exists (select 1 from public.rc_student_parents sp where sp.student_id = rc_attendance.student_id and sp.parent_id = auth.uid())
);

-- Seed: today's attendance for Grade 3 (Manisha + Tafara present, others present)
insert into public.rc_attendance (student_id, date, status, marked_by)
  select s.id, current_date, 'present',
         (select id from public.rc_staff where employee_id = 'EMP-002')
    from public.rc_students s
   where s.current_class_id = '55555555-5555-5555-5555-000000000104'
on conflict (student_id, date) do nothing;

-- Yesterday: Tafara absent (demonstrate visibility)
insert into public.rc_attendance (student_id, date, status, marked_by, notes)
  select id, current_date - 1, 'absent',
         (select id from public.rc_staff where employee_id = 'EMP-002'),
         'Flu — parent called school office.'
    from public.rc_students where student_code = 'STU-2026-001'
on conflict (student_id, date) do nothing;

-- ═══════════════════════════════════════════════════════════════════════
--  2. Term reports — remarks store
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.rc_term_reports (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.rc_students(id) on delete cascade,
  term_id               uuid not null references public.rc_terms(id)    on delete cascade,
  class_teacher_remark  text,
  headmaster_remark     text,
  conduct               text,        -- "Excellent" / "Good" / "Needs improvement"
  position_in_class     int,
  published             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (student_id, term_id)
);
drop trigger if exists trg_rc_term_reports_touch on public.rc_term_reports;
create trigger trg_rc_term_reports_touch before update on public.rc_term_reports
  for each row execute function public.rc_touch_updated_at();

alter table public.rc_term_reports enable row level security;
drop policy if exists "staff manages term reports" on public.rc_term_reports;
drop policy if exists "student reads own report"    on public.rc_term_reports;
drop policy if exists "parent reads kid report"     on public.rc_term_reports;
create policy "staff manages term reports" on public.rc_term_reports for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "student reads own report"   on public.rc_term_reports for select using (student_id = auth.uid() and published);
create policy "parent reads kid report"    on public.rc_term_reports for select using (
  published and exists (select 1 from public.rc_student_parents sp where sp.student_id = rc_term_reports.student_id and sp.parent_id = auth.uid())
);

-- Seed: Manisha's Term 2 report (published)
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

-- ═══════════════════════════════════════════════════════════════════════
--  3. Class feed (Class-Dojo style daily diary)
-- ═══════════════════════════════════════════════════════════════════════

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

alter table public.rc_class_feed enable row level security;
drop policy if exists "staff manages feed"    on public.rc_class_feed;
drop policy if exists "student reads class feed" on public.rc_class_feed;
drop policy if exists "parent reads kid feed"    on public.rc_class_feed;
create policy "staff manages feed" on public.rc_class_feed for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "student reads class feed" on public.rc_class_feed for select using (
  exists (select 1 from public.rc_students s where s.id = auth.uid() and s.current_class_id = rc_class_feed.class_id)
);
create policy "parent reads kid feed" on public.rc_class_feed for select using (
  exists (select 1 from public.rc_students s join public.rc_student_parents sp on sp.student_id = s.id
          where s.current_class_id = rc_class_feed.class_id and sp.parent_id = auth.uid())
);

-- Seed: a few Grade 3 feed posts
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
     'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=80',
     false,
     current_timestamp - interval '6 hours'),
    (v_class, v_author,
     'Friendly reminder: spelling test tomorrow on Unit 4 (long-vowel patterns).',
     null, false,
     current_timestamp - interval '2 hours');
end $$;

-- ═══════════════════════════════════════════════════════════════════════
--  4. Sibling discount setting
-- ═══════════════════════════════════════════════════════════════════════

alter table public.rc_site_settings add column if not exists sibling_discount_pct numeric(5,2) default 10.00;
alter table public.rc_site_settings add column if not exists sibling_discount_third_pct numeric(5,2) default 15.00;

update public.rc_site_settings
   set sibling_discount_pct       = coalesce(sibling_discount_pct, 10.00),
       sibling_discount_third_pct = coalesce(sibling_discount_third_pct, 15.00)
 where id = 1;

select 'modules_v2 installed' as status,
       (select count(*) from public.rc_attendance)    as attendance_records,
       (select count(*) from public.rc_term_reports)  as term_reports,
       (select count(*) from public.rc_class_feed)    as feed_posts;
