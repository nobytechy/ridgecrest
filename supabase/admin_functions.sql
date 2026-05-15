-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — admin_functions.sql
--
--  SECURITY DEFINER RPCs so the React admin app can create / delete /
--  reset PINs for staff, students, and parents without ever exposing a
--  service-role key to the browser. All gated on rc_is_admin().
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─── Generic helper to provision an auth user (admin-only callers) ──────
create or replace function public._rc_provision_user(p_email text, p_pin text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
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
    crypt(p_pin, gen_salt('bf')), now(),
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

-- ─── Create staff ───────────────────────────────────────────────────────
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

-- ─── Create student ─────────────────────────────────────────────────────
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

-- ─── Create parent ──────────────────────────────────────────────────────
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

-- ─── Reset PIN (works for staff, students, parents — auto-detects) ──────
create or replace function public.rc_admin_reset_pin(
  p_user_id uuid, p_new_pin text, p_force_pin_reset boolean default true
) returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.rc_is_admin() then raise exception 'Only admins can reset PINs'; end if;
  if p_new_pin is null or length(p_new_pin) < 4 then raise exception 'PIN must be at least 4 digits'; end if;

  update auth.users set encrypted_password = crypt(p_new_pin, gen_salt('bf')), updated_at = now() where id = p_user_id;

  update public.rc_staff    set pin = p_new_pin                                              where id = p_user_id;
  update public.rc_students set pin = p_new_pin, force_pin_reset = p_force_pin_reset         where id = p_user_id;
  update public.rc_parents  set pin = p_new_pin, force_pin_reset = p_force_pin_reset         where id = p_user_id;
end $$;

-- ─── Delete (cascade through auth.users) ────────────────────────────────
create or replace function public.rc_admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.rc_is_admin() then raise exception 'Only admins can delete users'; end if;
  delete from auth.users where id = p_user_id;
end $$;

-- ─── Link / unlink parent to a child ────────────────────────────────────
create or replace function public.rc_admin_link_parent_child(
  p_parent_id uuid, p_student_id uuid, p_is_primary boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.rc_is_staff() then raise exception 'Only staff can link parents'; end if;
  insert into public.rc_student_parents (parent_id, student_id, is_primary)
    values (p_parent_id, p_student_id, p_is_primary)
    on conflict (student_id, parent_id) do update set is_primary = excluded.is_primary;
end $$;

-- ─── Grants ─────────────────────────────────────────────────────────────
revoke all on function public.rc_admin_create_staff(text, text, text, text, text, text)                               from public;
revoke all on function public.rc_admin_create_student(text, text, text, uuid, date, text, int, text)                  from public;
revoke all on function public.rc_admin_create_parent(text, text, text, text, text, text, text, text)                  from public;
revoke all on function public.rc_admin_reset_pin(uuid, text, boolean)                                                  from public;
revoke all on function public.rc_admin_delete_user(uuid)                                                               from public;
revoke all on function public.rc_admin_link_parent_child(uuid, uuid, boolean)                                          from public;

grant execute on function public.rc_admin_create_staff(text, text, text, text, text, text)                              to authenticated;
grant execute on function public.rc_admin_create_student(text, text, text, uuid, date, text, int, text)                 to authenticated;
grant execute on function public.rc_admin_create_parent(text, text, text, text, text, text, text, text)                 to authenticated;
grant execute on function public.rc_admin_reset_pin(uuid, text, boolean)                                                 to authenticated;
grant execute on function public.rc_admin_delete_user(uuid)                                                              to authenticated;
grant execute on function public.rc_admin_link_parent_child(uuid, uuid, boolean)                                         to authenticated;

select 'ridgecrest admin functions installed' as status;
