-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — primary_reseed.sql
--
--  Re-seeds Ridgecrest as a *primary school* (Grade 1–7) instead of the
--  initial secondary-school placeholder. Wipes the prior seed for classes,
--  subjects, terms, and fee structures only — leaves staff / students /
--  parents alone unless setup_demo_admin.sql runs again afterwards.
--
--  Run AFTER install.sql, BEFORE setup_demo_admin.sql (or rerun
--  setup_demo_admin.sql after this to re-tag the demo students into
--  Grade 3A).
-- ─────────────────────────────────────────────────────────────────────────

-- Remove anything tied to old IDs so we can replace cleanly. We delete
-- in dependency order; cascades take care of children.
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
  ('33333333-3333-3333-3333-000000000105', 'SCI', 'Science &amp; Technology',        true,  50),
  ('33333333-3333-3333-3333-000000000106', 'AGR', 'Agriculture',                     false, 60),
  ('33333333-3333-3333-3333-000000000107', 'PER', 'Family, Religion &amp; Moral Ed', false, 70),
  ('33333333-3333-3333-3333-000000000108', 'VPA', 'Visual &amp; Performing Arts',    false, 80),
  ('33333333-3333-3333-3333-000000000109', 'PES', 'Physical Education &amp; Sport',  false, 90),
  ('33333333-3333-3333-3333-000000000110', 'ICT', 'ICT',                             false, 100);

-- ─── Primary classes (Grade 1 → Grade 7) ────────────────────────────────
insert into public.rc_classes (id, name, level, stream, capacity, description, position) values
  ('55555555-5555-5555-5555-000000000101', 'Grade 1A', 1, 'A', 30, 'Foundation phase — Stream A', 10),
  ('55555555-5555-5555-5555-000000000102', 'Grade 1B', 1, 'B', 30, 'Foundation phase — Stream B', 20),
  ('55555555-5555-5555-5555-000000000103', 'Grade 2',  2, null, 32, 'Foundation phase', 30),
  ('55555555-5555-5555-5555-000000000104', 'Grade 3A', 3, 'A', 32, 'Junior phase — Stream A', 40),
  ('55555555-5555-5555-5555-000000000105', 'Grade 3B', 3, 'B', 32, 'Junior phase — Stream B', 50),
  ('55555555-5555-5555-5555-000000000106', 'Grade 4',  4, null, 33, 'Junior phase', 60),
  ('55555555-5555-5555-5555-000000000107', 'Grade 5',  5, null, 33, 'Junior phase', 70),
  ('55555555-5555-5555-5555-000000000108', 'Grade 6',  6, null, 34, 'Senior phase', 80),
  ('55555555-5555-5555-5555-000000000109', 'Grade 7',  7, null, 34, 'Senior phase — ZIMSEC Grade 7 exam cohort', 90);

-- ─── Fee structure for Term 2 2026 (primary fees per grade) ─────────────
do $$
declare
  v_term uuid := '44444444-4444-4444-4444-000000002602';
  c record;
  base_tuition numeric;
begin
  for c in select id, level from public.rc_classes loop
    -- Tuition scales gently with grade
    base_tuition := 180 + (c.level - 1) * 12;     -- Grade 1 = $180 ... Grade 7 = $252
    insert into public.rc_fee_structures (term_id, class_id, item, amount_usd, is_mandatory, position) values
      (v_term, c.id, 'Tuition',             base_tuition, true,  10),
      (v_term, c.id, 'Development levy',    25.00,         true,  20),
      (v_term, c.id, 'Stationery pack',     18.00,         true,  30),
      (v_term, c.id, 'Sports & clubs',      15.00,         false, 40)
    on conflict do nothing;
  end loop;
end $$;

-- ─── Cleanup announcement (replace generic with primary-flavoured) ──────
delete from public.rc_announcements where title like 'Term 1 opens%';
insert into public.rc_announcements (title, body, audience, type, active) values
  ('Term 2 opens 13 May 2026',
   'Welcome back. Classes resume Wednesday 13 May. Grade 7 ZIMSEC parents — first feedback letter goes out at the end of Week 2.',
   'public', 'info', true),
  ('Parents'' day — 27 June',
   'Parents'' day for all grades will be held on Saturday 27 June. Teacher consultations 9am–12pm.',
   'parents', 'info', true)
on conflict do nothing;

select 'primary reseed complete' as status,
       (select count(*) from public.rc_subjects)  as subjects,
       (select count(*) from public.rc_classes)   as classes,
       (select count(*) from public.rc_terms)     as terms,
       (select count(*) from public.rc_fee_structures) as fee_lines;
