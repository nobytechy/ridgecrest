-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — holidays_module.sql
--
--  Public-holiday and school-calendar table seeded with all 2026 Zimbabwean
--  public holidays plus school-term boundaries. Drives the calendar widget
--  on the public home page.
-- ─────────────────────────────────────────────────────────────────────────

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

alter table public.rc_holidays enable row level security;
drop policy if exists "public reads holidays" on public.rc_holidays;
drop policy if exists "admin writes holidays" on public.rc_holidays;
create policy "public reads holidays" on public.rc_holidays for select using (true);
create policy "admin writes holidays" on public.rc_holidays for all
  using (public.rc_is_admin()) with check (public.rc_is_admin());

-- ─── 2026 Zimbabwean public holidays ────────────────────────────────────
insert into public.rc_holidays (date, name, description, kind, is_school_closed) values
  ('2026-01-01', 'New Year''s Day',         'Public holiday',                                      'public',  true),
  ('2026-02-21', 'National Youth Day',      'Robert Mugabe National Youth Day',                    'public',  true),
  ('2026-04-03', 'Good Friday',             'Public holiday (Easter)',                             'religious', true),
  ('2026-04-04', 'Easter Saturday',         'Public holiday',                                       'religious', true),
  ('2026-04-06', 'Easter Monday',           'Public holiday',                                       'religious', true),
  ('2026-04-18', 'Independence Day',        'Independence of Zimbabwe (1980)',                     'public',  true),
  ('2026-05-01', 'Workers'' Day',           'Labour Day',                                          'public',  true),
  ('2026-05-25', 'Africa Day',              'Commemoration of the founding of the OAU/AU',         'public',  true),
  ('2026-08-10', 'Heroes'' Day',            'Honouring liberation-war heroes',                     'public',  true),
  ('2026-08-11', 'Defence Forces Day',      'Honouring the Zimbabwe Defence Forces',               'public',  true),
  ('2026-12-22', 'Unity Day',               'National Unity Day',                                  'public',  true),
  ('2026-12-25', 'Christmas Day',           'Public holiday',                                       'religious', true),
  ('2026-12-26', 'Boxing Day',              'Public holiday',                                       'religious', true)
on conflict (date) do nothing;

-- ─── 2026 school-term boundaries ────────────────────────────────────────
insert into public.rc_holidays (date, name, description, kind, is_school_closed) values
  ('2026-01-13', 'Term 1 begins',      'School opens for Term 1',  'term_start', false),
  ('2026-04-10', 'Term 1 ends',        'School closes for Term 1', 'term_end',   true),
  ('2026-05-13', 'Term 2 begins',      'School opens for Term 2',  'term_start', false),
  ('2026-06-27', 'Parents'' Day',      'Mid-term parent meetings', 'school',     false),
  ('2026-08-14', 'Term 2 ends',        'School closes for Term 2', 'term_end',   true),
  ('2026-09-09', 'Term 3 begins',      'School opens for Term 3',  'term_start', false),
  ('2026-12-04', 'Term 3 ends',        'School closes for the year','term_end',  true)
on conflict (date) do nothing;

select 'holidays module installed' as status, count(*) as entries from public.rc_holidays;
