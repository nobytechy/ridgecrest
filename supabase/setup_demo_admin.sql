-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — setup_demo_admin.sql
--
--  Run AFTER install.sql + primary_reseed.sql. Creates auth users and seeds
--  a full enrolment so all three portals come alive.
--
--  Demo PINs:
--    Admin            1975   EMP-001 (Admin Demo)
--    Headmaster       5050   EMP-005 (Mr. S. Moyo)
--    Grade-3 Teacher  2002   EMP-002 (Mrs. R. Mhembere)
--    Bursar           3030   EMP-003 (Mr. T. Ndoro)
--    ECD Teacher      4040   EMP-004 (Mrs. C. Sibanda)
--    Parent           3344   PAR-2026-001 Mr. T. Mukamuri (Tafara + Rumbidzai)
--    Parent           4455   PAR-2026-002 Mrs. M. Tebulo  (Manisha)
--    Parent           5566   PAR-2026-003 Mrs. P. Chiweshe (Daniel)
--    Student          2200   STU-2026-001 Tafara Mukamuri    (Grade 3)
--    Student          2201   STU-2026-002 Rumbidzai Mukamuri (Grade 5)
--    Student          3300   STU-2026-003 Manisha Tebulo     (Grade 3)
--    Student          4400   STU-2026-004 Daniel Chiweshe    (Grade 4)
--    Student          5500   STU-2026-005 Ratidzai Mukamuri  (ECD B)
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create or replace function public._rc_seed_user(p_email text, p_pin text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
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
      crypt(p_pin, gen_salt('bf')), now(),
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
       set encrypted_password = crypt(p_pin, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;
  end if;
  return v_id;
end $$;

-- ─── Staff ───────────────────────────────────────────────────────────────
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
update public.rc_classes set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-004') where name = 'ECD A';
update public.rc_classes set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-004') where name = 'ECD B';
update public.rc_classes set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-002') where name = 'Grade 3';
update public.rc_classes set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-005') where name = 'Grade 7';

-- Class subjects — Grade 3 (Mrs Mhembere teaches all core)
insert into public.rc_class_subjects (class_id, subject_id, teacher_id)
select '55555555-5555-5555-5555-000000000104', s.id,
       (select id from public.rc_staff where employee_id = 'EMP-002')
  from public.rc_subjects s where s.is_core
on conflict (class_id, subject_id) do nothing;

-- Class subjects — Grade 4 (also Mrs Mhembere for now)
insert into public.rc_class_subjects (class_id, subject_id, teacher_id)
select '55555555-5555-5555-5555-000000000106', s.id,
       (select id from public.rc_staff where employee_id = 'EMP-002')
  from public.rc_subjects s where s.is_core
on conflict (class_id, subject_id) do nothing;

-- Class subjects — Grade 5 (Mrs Mhembere)
insert into public.rc_class_subjects (class_id, subject_id, teacher_id)
select '55555555-5555-5555-5555-000000000107', s.id,
       (select id from public.rc_staff where employee_id = 'EMP-002')
  from public.rc_subjects s where s.is_core
on conflict (class_id, subject_id) do nothing;

-- ─── Parents + Students ─────────────────────────────────────────────────
do $$
declare
  v_pid uuid; v_sid uuid;
  v_class_ecdb  uuid := '55555555-5555-5555-5555-0000000000eb';
  v_class_g3    uuid := '55555555-5555-5555-5555-000000000104';
  v_class_g4    uuid := '55555555-5555-5555-5555-000000000106';
  v_class_g5    uuid := '55555555-5555-5555-5555-000000000107';
begin
  -- ── Parent 1: Mr. T. Mukamuri (Tafara + Rumbidzai + Ratidzai)
  v_pid := public._rc_seed_user('par-2026-001@rc.local', '3344', 'Mr. T. Mukamuri');
  insert into public.rc_parents (id, parent_code, display_name, phone, whatsapp_phone, email, id_number, relationship, pin, force_pin_reset, status)
  values (v_pid, 'PAR-2026-001', 'Mr. T. Mukamuri', '+263 77 334 4334', '+263 77 334 4334', 't.mukamuri@gmail.com', '63-1234567-A-12', 'Father', '3344', false, 'active')
  on conflict (parent_code) do update set id = excluded.id, pin = '3344', status = 'active', force_pin_reset = false;

  v_sid := public._rc_seed_user('stu-2026-001@rc.local', '2200', 'Tafara Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-001', 'Tafara Mukamuri', 'Taf', '2017-04-22', 'M', v_class_g3, 2025, '2200', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g3, pin = '2200', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict do update set is_primary = true;

  v_sid := public._rc_seed_user('stu-2026-002@rc.local', '2201', 'Rumbidzai Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-002', 'Rumbidzai Mukamuri', 'Rumbi', '2015-08-11', 'F', v_class_g5, 2023, '2201', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g5, pin = '2201', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict do update set is_primary = true;

  v_sid := public._rc_seed_user('stu-2026-005@rc.local', '5500', 'Ratidzai Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-005', 'Ratidzai Mukamuri', 'Rati', '2021-03-19', 'F', v_class_ecdb, 2026, '5500', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_ecdb, pin = '5500', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict do update set is_primary = true;

  -- ── Parent 2: Mrs. M. Tebulo (Manisha)
  v_pid := public._rc_seed_user('par-2026-002@rc.local', '4455', 'Mrs. M. Tebulo');
  insert into public.rc_parents (id, parent_code, display_name, phone, whatsapp_phone, email, id_number, relationship, pin, force_pin_reset, status)
  values (v_pid, 'PAR-2026-002', 'Mrs. M. Tebulo', '+263 77 445 5544', '+263 77 445 5544', 'm.tebulo@gmail.com', '63-9876543-B-12', 'Mother', '4455', false, 'active')
  on conflict (parent_code) do update set id = excluded.id, pin = '4455', status = 'active', force_pin_reset = false;

  v_sid := public._rc_seed_user('stu-2026-003@rc.local', '3300', 'Manisha Tebulo');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-003', 'Manisha Tebulo', 'Manny', '2017-07-15', 'F', v_class_g3, 2025, '3300', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g3, pin = '3300', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict do update set is_primary = true;

  -- ── Parent 3: Mrs. P. Chiweshe (Daniel)
  v_pid := public._rc_seed_user('par-2026-003@rc.local', '5566', 'Mrs. P. Chiweshe');
  insert into public.rc_parents (id, parent_code, display_name, phone, whatsapp_phone, email, id_number, relationship, pin, force_pin_reset, status)
  values (v_pid, 'PAR-2026-003', 'Mrs. P. Chiweshe', '+263 77 556 6655', '+263 77 556 6655', 'p.chiweshe@yahoo.com', '63-5555555-C-12', 'Mother', '5566', false, 'active')
  on conflict (parent_code) do update set id = excluded.id, pin = '5566', status = 'active', force_pin_reset = false;

  v_sid := public._rc_seed_user('stu-2026-004@rc.local', '4400', 'Daniel Chiweshe');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_sid, 'STU-2026-004', 'Daniel Chiweshe', 'Dan', '2016-11-02', 'M', v_class_g4, 2024, '4400', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_g4, pin = '4400', status = 'active', force_pin_reset = false;
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values (v_sid, v_pid, true) on conflict do update set is_primary = true;
end $$;

-- ─── Mid-term test + marks for Grade 3 + Grade 5 ─────────────────────────
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
  insert into public.rc_assessments (term_id, name, kind, max_mark, scheduled_for, is_published)
  values (v_term, 'Mid-Term Test', 'test', 100, current_date - interval '5 days', true)
  on conflict do nothing
  returning id into v_assessment;

  if v_assessment is null then
    select id into v_assessment from public.rc_assessments
     where term_id = v_term and name = 'Mid-Term Test' limit 1;
  end if;

  -- Tafara (Grade 3)
  insert into public.rc_results (student_id, assessment_id, subject_id, mark, grade, remarks, entered_by) values
    (v_tafara, v_assessment, '33333333-3333-3333-3333-000000000101', 78, 'B', 'Strong problem-solving.',         v_teacher),
    (v_tafara, v_assessment, '33333333-3333-3333-3333-000000000102', 72, 'B', 'Comprehension excellent.',        v_teacher),
    (v_tafara, v_assessment, '33333333-3333-3333-3333-000000000103', 65, 'C', 'Improving steadily in Shona.',    v_teacher),
    (v_tafara, v_assessment, '33333333-3333-3333-3333-000000000104', 81, 'A', 'Top of class in Heritage.',       v_teacher),
    (v_tafara, v_assessment, '33333333-3333-3333-3333-000000000105', 60, 'C', 'Pay attention in practical work.',v_teacher)
  on conflict (student_id, assessment_id, subject_id) do update set mark = excluded.mark, grade = excluded.grade, remarks = excluded.remarks;

  -- Manisha (Grade 3) — strong all-rounder
  insert into public.rc_results (student_id, assessment_id, subject_id, mark, grade, remarks, entered_by) values
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000101', 92, 'A', 'Excellent — fastest in mental maths.', v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000102', 88, 'A', 'Beautiful descriptive writing.',       v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000103', 85, 'A', 'Strong reading + ngano.',              v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000104', 90, 'A', 'Very engaged in class discussion.',    v_teacher),
    (v_manisha, v_assessment, '33333333-3333-3333-3333-000000000105', 87, 'A', 'Top mark on water-cycle project.',     v_teacher)
  on conflict (student_id, assessment_id, subject_id) do update set mark = excluded.mark, grade = excluded.grade, remarks = excluded.remarks;

  -- Rumbi (Grade 5)
  insert into public.rc_results (student_id, assessment_id, subject_id, mark, grade, remarks, entered_by) values
    (v_rumbi, v_assessment, '33333333-3333-3333-3333-000000000101', 84, 'A', 'Excellent.',                        v_teacher),
    (v_rumbi, v_assessment, '33333333-3333-3333-3333-000000000102', 76, 'B', 'Strong essays.',                    v_teacher),
    (v_rumbi, v_assessment, '33333333-3333-3333-3333-000000000103', 70, 'B', 'Polished delivery.',                v_teacher),
    (v_rumbi, v_assessment, '33333333-3333-3333-3333-000000000104', 68, 'C', 'Focus more on geography.',          v_teacher),
    (v_rumbi, v_assessment, '33333333-3333-3333-3333-000000000105', 74, 'B', 'Improved analysis.',                v_teacher)
  on conflict (student_id, assessment_id, subject_id) do update set mark = excluded.mark, grade = excluded.grade, remarks = excluded.remarks;

  -- Daniel (Grade 4)
  insert into public.rc_results (student_id, assessment_id, subject_id, mark, grade, remarks, entered_by) values
    (v_daniel, v_assessment, '33333333-3333-3333-3333-000000000101', 66, 'C', 'Needs more practice with fractions.', v_teacher),
    (v_daniel, v_assessment, '33333333-3333-3333-3333-000000000102', 70, 'B', 'Good vocabulary growth.',             v_teacher),
    (v_daniel, v_assessment, '33333333-3333-3333-3333-000000000103', 62, 'C', 'Practice oral Shona at home.',        v_teacher),
    (v_daniel, v_assessment, '33333333-3333-3333-3333-000000000104', 75, 'B', 'Engaged in class.',                   v_teacher),
    (v_daniel, v_assessment, '33333333-3333-3333-3333-000000000105', 68, 'C', 'Good project participation.',         v_teacher)
  on conflict (student_id, assessment_id, subject_id) do update set mark = excluded.mark, grade = excluded.grade, remarks = excluded.remarks;
end $$;

-- ─── Invoices for Term 2 2026 + sample payments ─────────────────────────
do $$
declare
  v_term    uuid := '44444444-4444-4444-4444-000000002602';
  rec       record;
  v_total   numeric;
  v_inv     uuid;
  v_invno   text;
  v_n       int := 0;
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

    -- Tafara: partial; Manisha: paid; Rumbi: open; Daniel: open; Ratidzai: open
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

select 'seed admin + parents + students complete' as status,
       (select count(*) from public.rc_staff)    as staff,
       (select count(*) from public.rc_parents)  as parents,
       (select count(*) from public.rc_students) as students,
       (select count(*) from public.rc_invoices) as invoices;

select public.rc_resolve_staff_pin('1975')   as admin_pin,
       public.rc_resolve_student_pin('3300') as manisha_pin,
       public.rc_resolve_parent_pin('4455')  as tebulo_pin;
