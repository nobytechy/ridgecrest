-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — modules_extra.sql
--
--  Adds the extra pitch-tier modules in one file:
--    • Timetable (rc_timetable_slots)         + seed: full Grade 3 Mon-Fri
--    • Homework  (rc_homework + submissions)  + seed: 3 active Grade 3 items
--    • Gallery   (rc_gallery_albums + photos) + seed: 2 albums × 3 photos
--    • Parent / class-teacher profile-update RPCs
--    • PayNow settings on rc_site_settings
--
--  Run AFTER install.sql + primary_reseed.sql + setup_demo_admin.sql +
--  admin_functions.sql + schemes_module.sql + holidays_module.sql.
-- ─────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════
--  1.  Timetable
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.rc_timetable_slots (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.rc_classes(id) on delete cascade,
  day_of_week   int  not null check (day_of_week between 1 and 5),   -- 1=Mon … 5=Fri
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

alter table public.rc_timetable_slots enable row level security;
drop policy if exists "anyone reads timetable" on public.rc_timetable_slots;
drop policy if exists "staff writes timetable" on public.rc_timetable_slots;
create policy "anyone reads timetable" on public.rc_timetable_slots for select using (true);
create policy "staff writes timetable" on public.rc_timetable_slots for all using (public.rc_is_staff()) with check (public.rc_is_staff());

-- Seed: Grade 3, Mon-Fri, 6 periods/day
do $$
declare
  v_class uuid := '55555555-5555-5555-5555-000000000104';
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
    -- Monday
    (v_class, 1, 1, '07:30', '08:15', v_mat, v_teacher, 'Room 3'),
    (v_class, 1, 2, '08:15', '09:00', v_eng, v_teacher, 'Room 3'),
    (v_class, 1, 3, '09:30', '10:15', v_sho, v_teacher, 'Room 3'),
    (v_class, 1, 4, '10:15', '11:00', v_hss, v_teacher, 'Room 3'),
    (v_class, 1, 5, '11:30', '12:15', v_sci, v_teacher, 'Lab 1'),
    (v_class, 1, 6, '12:15', '13:00', v_vpa, v_teacher, 'Art Room'),
    -- Tuesday
    (v_class, 2, 1, '07:30', '08:15', v_mat, v_teacher, 'Room 3'),
    (v_class, 2, 2, '08:15', '09:00', v_sho, v_teacher, 'Room 3'),
    (v_class, 2, 3, '09:30', '10:15', v_eng, v_teacher, 'Room 3'),
    (v_class, 2, 4, '10:15', '11:00', v_sci, v_teacher, 'Lab 1'),
    (v_class, 2, 5, '11:30', '12:15', v_pes, v_teacher, 'Sports Field'),
    (v_class, 2, 6, '12:15', '13:00', v_hss, v_teacher, 'Room 3'),
    -- Wednesday
    (v_class, 3, 1, '07:30', '08:15', v_eng, v_teacher, 'Room 3'),
    (v_class, 3, 2, '08:15', '09:00', v_mat, v_teacher, 'Room 3'),
    (v_class, 3, 3, '09:30', '10:15', v_sho, v_teacher, 'Room 3'),
    (v_class, 3, 4, '10:15', '11:00', v_ict, v_teacher, 'Computer Room'),
    (v_class, 3, 5, '11:30', '12:15', v_sci, v_teacher, 'Lab 1'),
    (v_class, 3, 6, '12:15', '13:00', v_hss, v_teacher, 'Room 3'),
    -- Thursday
    (v_class, 4, 1, '07:30', '08:15', v_mat, v_teacher, 'Room 3'),
    (v_class, 4, 2, '08:15', '09:00', v_eng, v_teacher, 'Room 3'),
    (v_class, 4, 3, '09:30', '10:15', v_sho, v_teacher, 'Room 3'),
    (v_class, 4, 4, '10:15', '11:00', v_hss, v_teacher, 'Room 3'),
    (v_class, 4, 5, '11:30', '12:15', v_vpa, v_teacher, 'Art Room'),
    (v_class, 4, 6, '12:15', '13:00', v_pes, v_teacher, 'Sports Field'),
    -- Friday
    (v_class, 5, 1, '07:30', '08:15', v_eng, v_teacher, 'Room 3'),
    (v_class, 5, 2, '08:15', '09:00', v_mat, v_teacher, 'Room 3'),
    (v_class, 5, 3, '09:30', '10:15', v_sci, v_teacher, 'Lab 1'),
    (v_class, 5, 4, '10:15', '11:00', v_sho, v_teacher, 'Room 3'),
    (v_class, 5, 5, '11:30', '12:15', v_hss, v_teacher, 'Room 3'),
    (v_class, 5, 6, '12:15', '13:00', v_ict, v_teacher, 'Computer Room')
  on conflict (class_id, day_of_week, period) do nothing;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
--  2.  Homework
-- ═══════════════════════════════════════════════════════════════════════

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

alter table public.rc_homework             enable row level security;
alter table public.rc_homework_submissions enable row level security;

drop policy if exists "staff reads hw"             on public.rc_homework;
drop policy if exists "staff writes hw"            on public.rc_homework;
drop policy if exists "student reads hw"           on public.rc_homework;
drop policy if exists "parent reads hw"            on public.rc_homework;
drop policy if exists "staff manages submissions"  on public.rc_homework_submissions;
drop policy if exists "student manages own sub"    on public.rc_homework_submissions;
drop policy if exists "parent reads kid sub"       on public.rc_homework_submissions;

create policy "staff reads hw"   on public.rc_homework for select using (true);
create policy "staff writes hw"  on public.rc_homework for all    using (public.rc_is_staff()) with check (public.rc_is_staff());

create policy "staff manages submissions" on public.rc_homework_submissions for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "student manages own sub"   on public.rc_homework_submissions for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "parent reads kid sub"      on public.rc_homework_submissions for select using (exists (select 1 from public.rc_student_parents sp where sp.student_id = rc_homework_submissions.student_id and sp.parent_id = auth.uid()));

-- Seed: 3 active Grade 3 homework items
do $$
declare
  v_class uuid := '55555555-5555-5555-5555-000000000104';
  v_teacher uuid := (select id from public.rc_staff where employee_id = 'EMP-002');
begin
  insert into public.rc_homework (class_id, subject_id, teacher_id, title, description, due_date) values
    (v_class, '33333333-3333-3333-3333-000000000101', v_teacher,
     'Mathematics — Times tables 6 and 7',
     'Practise the 6 and 7 times tables. Complete worksheet pages 14–15. Show all working.',
     current_date + interval '3 days'),
    (v_class, '33333333-3333-3333-3333-000000000102', v_teacher,
     'English — Reading comprehension',
     'Read "The Clever Hare" on pages 24–26 of your reader and answer the five questions in your exercise book.',
     current_date + interval '5 days'),
    (v_class, '33333333-3333-3333-3333-000000000103', v_teacher,
     'Shona — Tsumo dzeShona',
     'Nyora tsumo nhatu dzaunoziva uye chazvinoreva. Munhu wese ari kuyemurwa zvakanaka.',
     current_date + interval '7 days')
  on conflict do nothing;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
--  3.  Gallery
-- ═══════════════════════════════════════════════════════════════════════

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

alter table public.rc_gallery_albums enable row level security;
alter table public.rc_gallery_photos enable row level security;
drop policy if exists "public reads albums"  on public.rc_gallery_albums;
drop policy if exists "public reads photos"  on public.rc_gallery_photos;
drop policy if exists "staff writes albums"  on public.rc_gallery_albums;
drop policy if exists "staff writes photos"  on public.rc_gallery_photos;
create policy "public reads albums"  on public.rc_gallery_albums for select using (active);
create policy "public reads photos"  on public.rc_gallery_photos for select using (true);
create policy "staff writes albums"  on public.rc_gallery_albums for all using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff writes photos"  on public.rc_gallery_photos for all using (public.rc_is_staff()) with check (public.rc_is_staff());

-- Seed: 2 albums × 3 photos
do $$
declare
  v_album1 uuid := gen_random_uuid();
  v_album2 uuid := gen_random_uuid();
begin
  insert into public.rc_gallery_albums (id, title, description, cover_url, event_date, position) values
    (v_album1, 'Sports Day 2026', 'Annual sports day — every learner competing.',
     'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80',
     '2026-07-04', 10),
    (v_album2, 'Term 2 opens', 'The first morning back — welcome to Term 2!',
     'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&auto=format&fit=crop&q=80',
     '2026-05-13', 20)
  on conflict do nothing;

  insert into public.rc_gallery_photos (album_id, url, caption, position) values
    (v_album1, 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1600&auto=format&fit=crop&q=80', 'Sprint heats',          10),
    (v_album1, 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1600&auto=format&fit=crop&q=80', 'Long jump',             20),
    (v_album1, 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1600&auto=format&fit=crop&q=80', 'Tug of war',            30),
    (v_album2, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&auto=format&fit=crop&q=80', 'Classrooms ready',      10),
    (v_album2, 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1600&auto=format&fit=crop&q=80', 'New Grade 1 intake',    20),
    (v_album2, 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1600&auto=format&fit=crop&q=80', 'Welcome assembly',      30)
  on conflict do nothing;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
--  4.  PayNow + cash-office settings columns
-- ═══════════════════════════════════════════════════════════════════════

alter table public.rc_site_settings add column if not exists paynow_url      text;
alter table public.rc_site_settings add column if not exists paynow_account  text;
alter table public.rc_site_settings add column if not exists cash_office_hours text;

update public.rc_site_settings
   set paynow_url        = coalesce(paynow_url,
                                    'https://www.paynow.co.zw/Payment/Link/?q=YOUR-LINK'),
       paynow_account    = coalesce(paynow_account, 'Ridgecrest School (Demo merchant)'),
       cash_office_hours = coalesce(cash_office_hours,
                                    'Mon–Fri 8am–4pm at the Admin Block. Bursar: Mr. T. Ndoro.')
 where id = 1;

-- ═══════════════════════════════════════════════════════════════════════
--  5.  Parent-updates-own-child profile RPC
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.rc_parent_update_child(
  p_student_id     uuid,
  p_display_name   text default null,
  p_preferred_name text default null,
  p_dob            date default null,
  p_gender         text default null,
  p_notes          text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.rc_parent_update_child(uuid, text, text, date, text, text) from public;
grant execute on function public.rc_parent_update_child(uuid, text, text, date, text, text) to authenticated;

select 'modules_extra installed' as status,
       (select count(*) from public.rc_timetable_slots) as timetable_slots,
       (select count(*) from public.rc_homework)        as homework_items,
       (select count(*) from public.rc_gallery_albums)  as albums,
       (select count(*) from public.rc_gallery_photos)  as photos;
