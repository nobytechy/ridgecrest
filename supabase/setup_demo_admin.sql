-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — setup_demo_admin.sql
--
--  Run AFTER install.sql. Creates the auth users + demo enrolment data so
--  all three portals (admin, student, parent) work end-to-end.
--
--  Demo PINs:
--    Admin   1975  → EMP-001 (Admin Demo)
--    Teacher 2002  → EMP-002 (Mrs. Mhembere — Form 1A class teacher)
--    Bursar  3030  → EMP-003 (Mr. Ndoro — fees + payments)
--    Parent  3344  → PAR-2026-001 (Mr. T. Mukamuri — two children)
--    Student 2200  → STU-2026-001 (Tafara Mukamuri, Form 1A)
--    Student 2201  → STU-2026-002 (Rumbidzai Mukamuri, Form 2B)
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- Helper to create or refresh a Supabase auth user with a PIN as password.
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
end $$;

-- Class teacher = Mrs. Mhembere for Form 1A
update public.rc_classes
   set class_teacher_id = (select id from public.rc_staff where employee_id = 'EMP-002')
 where name = 'Form 1A';

-- ─── Class subjects (which subjects each class takes, taught by whom) ────
insert into public.rc_class_subjects (class_id, subject_id, teacher_id)
select c.id, s.id, (select id from public.rc_staff where employee_id = 'EMP-002')
  from public.rc_classes c
 cross join public.rc_subjects s
 where c.name = 'Form 1A'
on conflict (class_id, subject_id) do nothing;

insert into public.rc_class_subjects (class_id, subject_id, teacher_id)
select c.id, s.id, (select id from public.rc_staff where employee_id = 'EMP-002')
  from public.rc_classes c
 cross join public.rc_subjects s
 where c.name = 'Form 2B'
on conflict (class_id, subject_id) do nothing;

-- ─── Parent + 2 children ─────────────────────────────────────────────────
do $$
declare
  v_parent  uuid;
  v_stu_1   uuid;
  v_stu_2   uuid;
  v_class_1a uuid := '55555555-5555-5555-5555-000000000001';
  v_class_2b uuid := '55555555-5555-5555-5555-000000000002';
begin
  v_parent := public._rc_seed_user('par-2026-001@rc.local', '3344', 'Mr. T. Mukamuri');
  insert into public.rc_parents (id, parent_code, display_name, phone, whatsapp_phone, email, id_number, relationship, pin, force_pin_reset, status)
  values (v_parent, 'PAR-2026-001', 'Mr. T. Mukamuri', '+263 77 334 4334', '+263 77 334 4334', 't.mukamuri@gmail.com', '63-1234567-A-12', 'Father', '3344', false, 'active')
  on conflict (parent_code) do update set id = excluded.id, pin = '3344', status = 'active', force_pin_reset = false;

  v_stu_1 := public._rc_seed_user('stu-2026-001@rc.local', '2200', 'Tafara Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_stu_1, 'STU-2026-001', 'Tafara Mukamuri', 'Taf', '2013-04-22', 'M', v_class_1a, 2026, '2200', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_1a, pin = '2200', status = 'active', force_pin_reset = false;

  v_stu_2 := public._rc_seed_user('stu-2026-002@rc.local', '2201', 'Rumbidzai Mukamuri');
  insert into public.rc_students (id, student_code, display_name, preferred_name, dob, gender, current_class_id, admission_year, pin, force_pin_reset, status)
  values (v_stu_2, 'STU-2026-002', 'Rumbidzai Mukamuri', 'Rumbi', '2012-08-11', 'F', v_class_2b, 2025, '2201', false, 'active')
  on conflict (student_code) do update set id = excluded.id, current_class_id = v_class_2b, pin = '2201', status = 'active', force_pin_reset = false;

  -- Link parent to both children (primary contact for both)
  insert into public.rc_student_parents (student_id, parent_id, is_primary) values
    (v_stu_1, v_parent, true),
    (v_stu_2, v_parent, true)
  on conflict (student_id, parent_id) do update set is_primary = true;
end $$;

-- ─── Assessment (Mid-Term Test, Term 1 2026) + marks for both kids ────────
do $$
declare
  v_term       uuid := '44444444-4444-4444-4444-000000000001';
  v_assessment uuid;
  v_stu_1      uuid := (select id from public.rc_students where student_code = 'STU-2026-001');
  v_stu_2      uuid := (select id from public.rc_students where student_code = 'STU-2026-002');
  v_teacher    uuid := (select id from public.rc_staff    where employee_id  = 'EMP-002');
begin
  insert into public.rc_assessments (term_id, name, kind, max_mark, scheduled_for, is_published)
  values (v_term, 'Mid-Term Test', 'test', 100, current_date - interval '7 days', true)
  on conflict do nothing
  returning id into v_assessment;

  if v_assessment is null then
    select id into v_assessment from public.rc_assessments
     where term_id = v_term and name = 'Mid-Term Test' limit 1;
  end if;

  -- Marks for Tafara (Form 1A)
  insert into public.rc_results (student_id, assessment_id, subject_id, mark, grade, remarks, entered_by) values
    (v_stu_1, v_assessment, '33333333-3333-3333-3333-000000000001', 78, 'B', 'Strong problem-solving.',           v_teacher),
    (v_stu_1, v_assessment, '33333333-3333-3333-3333-000000000002', 72, 'B', 'Comprehension excellent.',          v_teacher),
    (v_stu_1, v_assessment, '33333333-3333-3333-3333-000000000003', 65, 'C', 'Improving steadily.',               v_teacher),
    (v_stu_1, v_assessment, '33333333-3333-3333-3333-000000000004', 81, 'A', 'Top of class in practicals.',       v_teacher),
    (v_stu_1, v_assessment, '33333333-3333-3333-3333-000000000005', 60, 'C', 'Needs to revise more dates.',       v_teacher),
    (v_stu_1, v_assessment, '33333333-3333-3333-3333-000000000006', 88, 'A', 'Outstanding in coding tasks.',      v_teacher)
  on conflict (student_id, assessment_id, subject_id) do update set mark = excluded.mark, grade = excluded.grade, remarks = excluded.remarks;

  -- Marks for Rumbi (Form 2B)
  insert into public.rc_results (student_id, assessment_id, subject_id, mark, grade, remarks, entered_by) values
    (v_stu_2, v_assessment, '33333333-3333-3333-3333-000000000001', 84, 'A', 'Excellent.',                         v_teacher),
    (v_stu_2, v_assessment, '33333333-3333-3333-3333-000000000002', 76, 'B', 'Strong essays.',                     v_teacher),
    (v_stu_2, v_assessment, '33333333-3333-3333-3333-000000000003', 70, 'B', 'Polished delivery.',                 v_teacher),
    (v_stu_2, v_assessment, '33333333-3333-3333-3333-000000000004', 68, 'C', 'Focus more on the second paper.',    v_teacher),
    (v_stu_2, v_assessment, '33333333-3333-3333-3333-000000000005', 74, 'B', 'Improved analysis.',                 v_teacher),
    (v_stu_2, v_assessment, '33333333-3333-3333-3333-000000000006', 92, 'A', 'Distinction-level work.',            v_teacher)
  on conflict (student_id, assessment_id, subject_id) do update set mark = excluded.mark, grade = excluded.grade, remarks = excluded.remarks;
end $$;

-- ─── Invoices (Term 1 2026) for both children + a partial payment ────────
do $$
declare
  v_term    uuid := '44444444-4444-4444-4444-000000000001';
  v_stu_1   uuid := (select id from public.rc_students where student_code = 'STU-2026-001');
  v_stu_2   uuid := (select id from public.rc_students where student_code = 'STU-2026-002');
  v_inv_1   uuid;
  v_inv_2   uuid;
  v_total_1 numeric(12,2);
  v_total_2 numeric(12,2);
begin
  -- Sum fee structure per class
  select coalesce(sum(amount_usd), 0) into v_total_1
    from public.rc_fee_structures
   where term_id = v_term and class_id = '55555555-5555-5555-5555-000000000001';
  select coalesce(sum(amount_usd), 0) into v_total_2
    from public.rc_fee_structures
   where term_id = v_term and class_id = '55555555-5555-5555-5555-000000000002';

  insert into public.rc_invoices (invoice_no, student_id, term_id, total_usd, paid_usd, due_date, status, notes)
  values
    ('INV-2026-T1-0001', v_stu_1, v_term, v_total_1, 200.00, current_date + interval '30 days', 'partial',
     'Term 1 2026 — partial payment received, balance due before mid-term.'),
    ('INV-2026-T1-0002', v_stu_2, v_term, v_total_2, 0.00,   current_date + interval '30 days', 'open',
     'Term 1 2026 — full balance outstanding.')
  on conflict (invoice_no) do nothing;

  select id into v_inv_1 from public.rc_invoices where invoice_no = 'INV-2026-T1-0001';
  select id into v_inv_2 from public.rc_invoices where invoice_no = 'INV-2026-T1-0002';

  -- A partial payment of $200 on invoice 1
  insert into public.rc_payments (receipt_no, invoice_id, amount_usd, currency, method, reference, notes)
  values ('RCT-2026-0001', v_inv_1, 200.00, 'USD', 'cash', null, 'Demo seed — partial fees deposit.')
  on conflict (receipt_no) do nothing;
end $$;

-- ─── Sanity check ────────────────────────────────────────────────────────
select 'staff' as kind, employee_id as code, display_name, role_id::text as role_or_class, status, pin
  from public.rc_staff
union all
select 'student', student_code, display_name,
       (select name from public.rc_classes c where c.id = s.current_class_id),
       status, pin
  from public.rc_students s
union all
select 'parent', parent_code, display_name, relationship, status, pin
  from public.rc_parents;

select public.rc_resolve_staff_pin('1975')   as admin_pin_resolves,
       public.rc_resolve_student_pin('2200') as student_pin_resolves,
       public.rc_resolve_parent_pin('3344')  as parent_pin_resolves;
