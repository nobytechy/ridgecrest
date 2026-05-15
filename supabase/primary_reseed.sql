-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — primary_reseed.sql
--
--  Re-seeds Ridgecrest as a *primary school*. Class structure simplified:
--  ECD A, ECD B, Grade 1, 2, 3, 4, 5, 6, 7 — no streams.
--
--  Run AFTER install.sql.
-- ─────────────────────────────────────────────────────────────────────────

-- Wipe operational seed data so we can replace cleanly. Cascades handle children.
delete from public.rc_results;
delete from public.rc_assessments;
delete from public.rc_invoices;
delete from public.rc_class_subjects;
delete from public.rc_fee_structures;
delete from public.rc_subjects;
delete from public.rc_classes;
delete from public.rc_terms;

-- ─── Primary terms (2026) ───────────────────────────────────────────────
insert into public.rc_terms (id, name, academic_year, term_number, start_date, end_date, is_current) values
  ('44444444-4444-4444-4444-000000002601', 'Term 1 2026', 2026, 1, '2026-01-13', '2026-04-10', false),
  ('44444444-4444-4444-4444-000000002602', 'Term 2 2026', 2026, 2, '2026-05-13', '2026-08-14', true),
  ('44444444-4444-4444-4444-000000002603', 'Term 3 2026', 2026, 3, '2026-09-09', '2026-12-04', false);

update public.rc_site_settings set current_term_id = '44444444-4444-4444-4444-000000002602' where id = 1;

-- ─── Primary subjects (Zimbabwean primary curriculum) ───────────────────
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
  ('33333333-3333-3333-3333-000000000110', 'ICT', 'ICT',                             false, 100);

-- ─── Classes — ECD A, ECD B, Grade 1 to Grade 7 ─────────────────────────
-- UUIDs kept stable so the schemes/timetable/homework seeds (which reference
-- the Grade 3 UUID specifically) keep working.
insert into public.rc_classes (id, name, level, stream, capacity, description, position) values
  ('55555555-5555-5555-5555-0000000000ea', 'ECD A',   0, null, 24, 'Early Childhood — first year',         5),
  ('55555555-5555-5555-5555-0000000000eb', 'ECD B',   0, null, 26, 'Early Childhood — second year',        7),
  ('55555555-5555-5555-5555-000000000101', 'Grade 1', 1, null, 30, 'Foundation phase',                     10),
  ('55555555-5555-5555-5555-000000000103', 'Grade 2', 2, null, 32, 'Foundation phase',                     20),
  ('55555555-5555-5555-5555-000000000104', 'Grade 3', 3, null, 32, 'Junior phase',                         30),
  ('55555555-5555-5555-5555-000000000106', 'Grade 4', 4, null, 33, 'Junior phase',                         40),
  ('55555555-5555-5555-5555-000000000107', 'Grade 5', 5, null, 33, 'Junior phase',                         50),
  ('55555555-5555-5555-5555-000000000108', 'Grade 6', 6, null, 34, 'Senior phase',                         60),
  ('55555555-5555-5555-5555-000000000109', 'Grade 7', 7, null, 34, 'Senior phase — ZIMSEC Grade 7 cohort', 70);

-- ─── Fee structure for Term 2 2026 ──────────────────────────────────────
do $$
declare
  v_term uuid := '44444444-4444-4444-4444-000000002602';
  c record;
  base_tuition numeric;
begin
  for c in select id, level from public.rc_classes loop
    -- Lower fees for ECD, scaling gently up through Grade 7
    base_tuition := case
      when c.level = 0 then 140.00
      else 180 + (c.level - 1) * 12
    end;
    insert into public.rc_fee_structures (term_id, class_id, item, amount_usd, is_mandatory, position) values
      (v_term, c.id, 'Tuition',          base_tuition, true,  10),
      (v_term, c.id, 'Development levy', 25.00,         true,  20),
      (v_term, c.id, 'Stationery pack',  18.00,         true,  30),
      (v_term, c.id, 'Sports & clubs',   15.00,         false, 40);
  end loop;
end $$;

-- ─── Cleanup announcements ──────────────────────────────────────────────
delete from public.rc_announcements where title like 'Term 1%' or title like 'Term 2%';
insert into public.rc_announcements (title, body, audience, type, active) values
  ('Term 2 opens 13 May 2026',
   'Welcome back to Term 2! Classes resumed on Wednesday. Grade 7 ZIMSEC mock exams begin 23 June.',
   'public', 'info', true),
  ('Sports Day — 4 July 2026',
   'All grades will compete on Saturday 4 July at the school grounds. Parents welcome from 8am.',
   'parents', 'info', true),
  ('Term 2 Parents Day — 27 June',
   'Teacher consultations 9am to 12pm. Bookings open from 15 June through the parent portal.',
   'parents', 'info', true);

select 'primary reseed complete' as status,
       (select count(*) from public.rc_subjects)  as subjects,
       (select count(*) from public.rc_classes)   as classes,
       (select count(*) from public.rc_fee_structures) as fee_lines;
