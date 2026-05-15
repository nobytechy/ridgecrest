-- ─────────────────────────────────────────────────────────────────────────
--  Ridgecrest — schemes_module.sql
--
--  Teachers' scheme books. One scheme per (class × subject × term),
--  containing weekly entries with topic, sub-topics, objectives, methods,
--  resources, assessment strategy, and completion tracking.
--
--  Run AFTER install.sql + primary_reseed.sql + setup_demo_admin.sql.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Schemes ────────────────────────────────────────────────────────────
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

-- ─── Scheme weeks (the week-by-week breakdown) ──────────────────────────
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

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table public.rc_schemes      enable row level security;
alter table public.rc_scheme_weeks enable row level security;

drop policy if exists "staff reads schemes"       on public.rc_schemes;
drop policy if exists "staff writes schemes"      on public.rc_schemes;
drop policy if exists "staff reads scheme_weeks"  on public.rc_scheme_weeks;
drop policy if exists "staff writes scheme_weeks" on public.rc_scheme_weeks;
drop policy if exists "student reads schemes"     on public.rc_schemes;
drop policy if exists "student reads weeks"       on public.rc_scheme_weeks;
drop policy if exists "parent reads schemes"      on public.rc_schemes;
drop policy if exists "parent reads weeks"        on public.rc_scheme_weeks;

create policy "staff reads schemes"       on public.rc_schemes      for select using (public.rc_is_staff() or true);
create policy "staff writes schemes"      on public.rc_schemes      for all    using (public.rc_is_staff()) with check (public.rc_is_staff());
create policy "staff reads scheme_weeks"  on public.rc_scheme_weeks for select using (true);
create policy "staff writes scheme_weeks" on public.rc_scheme_weeks for all    using (public.rc_is_staff()) with check (public.rc_is_staff());

-- ═══════════════════════════════════════════════════════════════════════
--  Seed: Grade 3A · Term 2 2026 — five core subjects, 12-week schemes
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  v_term       uuid := '44444444-4444-4444-4444-000000002602';
  v_class      uuid := '55555555-5555-5555-5555-000000000104';   -- Grade 3A
  v_teacher    uuid := (select id from public.rc_staff where employee_id = 'EMP-002');
  v_scheme     uuid;
  v_start      date := '2026-05-13';   -- Term 2 start
  -- helper anonymous block to insert a scheme + 12 weeks
begin
  -- 1. MATHEMATICS
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status)
  values (v_class, '33333333-3333-3333-3333-000000000101', v_term, v_teacher,
          'Mathematics — Grade 3 — Term 2 2026',
          'Number sense to 1000, basic operations with regrouping, multiplication tables, fractions, 2D shapes, money, and time.',
          'active')
  on conflict (class_id, subject_id, term_id) do update set
    title = excluded.title, overview = excluded.overview
  returning id into v_scheme;

  insert into public.rc_scheme_weeks (scheme_id, week_number, week_start_date, topic, subtopics, learning_objectives, teaching_methods, resources, assessment_strategy) values
    (v_scheme,  1, v_start +  0, 'Numbers up to 1 000',           'Counting, place value, ordering', 'Read, write, count and order numbers up to 1 000.',              'Demonstration; choral counting; group work', 'Number cards; place-value chart; abacus', 'Class exercise + quick oral quiz'),
    (v_scheme,  2, v_start +  7, 'Addition with regrouping',      'Carrying tens & hundreds',         'Add 3-digit numbers with regrouping.',                            'Demonstration; pair practice; worksheets',  'Workbook; place-value chart',             'Marked workbook exercise'),
    (v_scheme,  3, v_start + 14, 'Subtraction with regrouping',   'Borrowing across columns',          'Subtract 3-digit numbers with regrouping.',                       'Modelling; pair work; word problems',       'Workbook; counters',                       'Short class test'),
    (v_scheme,  4, v_start + 21, 'Multiplication tables 2, 3, 4', 'Repeated addition; arrays',         'Recite and apply 2, 3, 4 times tables.',                          'Choral; flash cards; games',                'Flash cards; times-table chart',           'Daily oral quiz'),
    (v_scheme,  5, v_start + 28, 'Multiplication tables 5, 6, 7', 'Number patterns',                   'Recite and apply 5, 6, 7 times tables.',                          'Choral; flash cards; songs',                'Flash cards; chart',                       'Oral + written quiz'),
    (v_scheme,  6, v_start + 35, 'Multiplication tables 8, 9, 10','Number patterns',                   'Recite and apply 8, 9, 10 times tables.',                         'Choral; pair drilling',                     'Flash cards; chart',                       'Oral + written quiz'),
    (v_scheme,  7, v_start + 42, 'Division basics',               'Sharing and grouping',              'Use division as the inverse of multiplication.',                  'Demonstration with counters; word problems','Counters; workbook',                       'Marked workbook exercise'),
    (v_scheme,  8, v_start + 49, 'Fractions',                     'Halves, thirds, quarters',          'Recognise and represent simple fractions of a whole.',            'Cutting paper shapes; drawing diagrams',    'Paper, scissors, fraction strips',         'Practical demonstration + worksheet'),
    (v_scheme,  9, v_start + 56, '2D shapes',                     'Properties of square, rectangle, triangle, circle', 'Identify and describe 2D shapes by sides and corners.',           'Shape sorting; drawing; group display',     'Shape cut-outs; geoboard',                 'Group display + short test'),
    (v_scheme, 10, v_start + 63, 'Money — Zimbabwe coins & notes','Recognising; making change',        'Identify Zim currency and compute simple change.',                'Role play (shop); demonstration',           'Play money; goods price tags',             'Role-play assessment'),
    (v_scheme, 11, v_start + 70, 'Time',                          'Reading clocks (hour, half-hour); days; months', 'Tell time on analogue clocks; sequence days and months.',         'Demonstration with clock model; songs',     'Demonstration clock; calendar',            'Practical demonstration'),
    (v_scheme, 12, v_start + 77, 'Revision & Term 2 assessment',  'Recap of weeks 1–11',               'Consolidate term skills; assess achievement.',                    'Revision; mock test; feedback',             'Revision sheets',                          'End-of-term test')
  on conflict (scheme_id, week_number) do nothing;

  -- 2. ENGLISH LANGUAGE
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status)
  values (v_class, '33333333-3333-3333-3333-000000000102', v_term, v_teacher,
          'English Language — Grade 3 — Term 2 2026',
          'Phonics, comprehension, parts of speech, sentence construction, descriptive writing, letter writing, and oral skills.',
          'active')
  on conflict (class_id, subject_id, term_id) do update set title = excluded.title
  returning id into v_scheme;

  insert into public.rc_scheme_weeks (scheme_id, week_number, week_start_date, topic, subtopics, learning_objectives, teaching_methods, resources, assessment_strategy) values
    (v_scheme,  1, v_start +  0, 'Phonics — long vowel sounds',   'a-e, i-e, o-e patterns',           'Read words with silent-e pattern.',                              'Reading aloud; phonics drill',              'Phonics flash cards',                       'Reading aloud check'),
    (v_scheme,  2, v_start +  7, 'Reading comprehension',         'Short stories with questions',     'Read short text and answer who/what/where questions.',           'Shared reading; Q&amp;A',                   'Reader; question sheet',                    'Marked comprehension'),
    (v_scheme,  3, v_start + 14, 'Nouns — singular & plural',     'Adding s, es, ies',                'Form plural nouns correctly.',                                    'Demonstration; sorting; worksheets',        'Worksheet; flash cards',                    'Marked worksheet'),
    (v_scheme,  4, v_start + 21, 'Verbs — present tense',         'Action words; subject-verb agreement', 'Use present-tense verbs to write simple sentences.',           'Demonstration; sentence building',          'Verb flash cards',                          'Sentence-writing task'),
    (v_scheme,  5, v_start + 28, 'Sentence construction',         'Capital letter, full stop',         'Write complete sentences with correct punctuation.',              'Modelling; pair editing',                   'Workbook',                                  'Marked workbook exercise'),
    (v_scheme,  6, v_start + 35, 'Adjectives & description',      'Describing people, places, things','Use adjectives to describe nouns.',                               'Description game; modelling',               'Picture cards',                             'Descriptive paragraph task'),
    (v_scheme,  7, v_start + 42, 'Punctuation',                   'Question mark, exclamation mark',  'Punctuate questions and exclamations.',                           'Demonstration; editing exercise',           'Worksheet',                                 'Editing test'),
    (v_scheme,  8, v_start + 49, 'Friendly letter writing',       'Greeting, body, sign-off',         'Compose a friendly letter to a peer or relative.',                'Modelling; drafting; peer review',          'Letter template',                           'Marked letter'),
    (v_scheme,  9, v_start + 56, 'Story writing',                 'Beginning, middle, end',           'Write a short narrative with clear sequence.',                    'Story planning; drafting',                  'Story map sheet',                           'Marked short story'),
    (v_scheme, 10, v_start + 63, 'Listening skills',              'Follow-up questions; instructions','Listen to a passage and answer questions.',                       'Read-aloud; oral Q&amp;A',                  'Audio / teacher reader',                    'Oral comprehension check'),
    (v_scheme, 11, v_start + 70, 'Oral presentation',             '"My favourite…" talks',            'Present a 1-minute talk on a chosen topic.',                      'Modelling; peer feedback',                  'Cue cards',                                 'Oral assessment'),
    (v_scheme, 12, v_start + 77, 'Revision & Term 2 assessment',  'Recap of weeks 1–11',              'Consolidate term skills.',                                       'Revision; mock test',                       'Revision sheets',                           'End-of-term test')
  on conflict (scheme_id, week_number) do nothing;

  -- 3. SHONA
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status)
  values (v_class, '33333333-3333-3333-3333-000000000103', v_term, v_teacher,
          'Shona — Grade 3 — Term 2 2026',
          'Mavara, mazwi, kuverenga ngano, kuyambuka kunyora, tsumo nemadimikira.',
          'active')
  on conflict (class_id, subject_id, term_id) do update set title = excluded.title
  returning id into v_scheme;

  insert into public.rc_scheme_weeks (scheme_id, week_number, week_start_date, topic, subtopics, learning_objectives, teaching_methods, resources, assessment_strategy) values
    (v_scheme,  1, v_start +  0, 'Mavara nemanzwi',               'A E I O U; manzwi anomira ari oga', 'Kuona uye kunyora mavara aShona.',                                'Kuverenga pamwe; kuburitsa mazwi',          'Kadhi yemavara',                            'Kuverenga muchidimbu'),
    (v_scheme,  2, v_start +  7, 'Mazwi anoreva chinhu',          'Chinhu chimwe / zvinhu zvakawanda', 'Kunzwisisa singular / plural muShona.',                          'Kupatsanisa mazwi; basa repaviri',          'Kadhi remazwi',                             'Basa repakanyorerwa'),
    (v_scheme,  3, v_start + 14, 'Kuverenga ngano dzipfupi',      'Mafuso enguva nenzvimbo',          'Kuverenga uye kupindura mibvunzo.',                                'Kuverenga pamwe; mibvunzo',                  'Bhuku rengano',                             'Mhinduro pakanyorwa'),
    (v_scheme,  4, v_start + 21, 'Mazita avanhu nezvinhu',        'Kunyora; kushandisa pamutsara',    'Kushandisa mazita zvakanaka.',                                    'Mienzaniso; basa rebepa',                    'Bhuku rebasa',                              'Kuongorora basa'),
    (v_scheme,  5, v_start + 28, 'Mashoko anomuka',               'Kushandiswa muzvirevo',            'Kuumba zvirevo zvakakwana.',                                       'Mienzaniso; kunyora pamwe',                  'Bhuku',                                     'Mhinduro yebasa'),
    (v_scheme,  6, v_start + 35, 'Mitauro yekutaurwa',            'Kutamba; kutiza; kuita',           'Kushandisa mashoko enzira zvakanaka.',                             'Kutamba mhuka; kunzwisisa',                 'Bhuku',                                     'Kunyora pakanyorerwa'),
    (v_scheme,  7, v_start + 42, 'Kunyora mhinduro',              'Mibvunzo neminhamba',               'Kunyora mhinduro pamibvunzo.',                                    'Mienzaniso; basa repaviri',                 'Bhuku',                                     'Basa repakanyorwa'),
    (v_scheme,  8, v_start + 49, 'Tsumo dzeShona',                'Zvinoreva uye nemienzaniso',       'Kunzwisisa tsumo dzakajairika.',                                  'Kutamba; kuverenga; kupopotedzana',          'Bhuku retsumo',                             'Kuongorora muchidimbu'),
    (v_scheme,  9, v_start + 56, 'Madimikira',                    'Kushanya pakati pemazwi',          'Kunzwisisa madimikira mashoma.',                                   'Mienzaniso; pamwe nevamwe',                 'Mienzaniso yakanyorwa',                     'Mhinduro yebasa'),
    (v_scheme, 10, v_start + 63, 'Kuverenga manhamba muShona',    'Zero kusvika ku zana',             'Kuverenga manhamba uchishandisa Shona.',                          'Kuverenga pamwe',                            'Kadhi yemanhamba',                          'Kuverenga oral'),
    (v_scheme, 11, v_start + 70, 'Kunyora rondedzero pfupi',      'Mufungo, mumvuri, mhedzisiro',     'Kunyora rondedzero pfupi pamusoro pechinhu chichi.',              'Kufungidzira; kunyora pamwe',                'Bhuku',                                     'Rondedzero yakanyorwa'),
    (v_scheme, 12, v_start + 77, 'Tarisazve & bvunzo yeTerm 2',   'Zvose zvenguva',                   'Kusimbisa zvedzidzo dzevhiki ne vhiki.',                          'Kuongorora; bvunzo',                         'Bvunzo dzakanyorwa',                        'Bvunzo yeTerm 2')
  on conflict (scheme_id, week_number) do nothing;

  -- 4. HERITAGE-SOCIAL STUDIES
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status)
  values (v_class, '33333333-3333-3333-3333-000000000104', v_term, v_teacher,
          'Heritage-Social Studies — Grade 3 — Term 2 2026',
          'Zimbabwean identity: national symbols, heroes, provinces, landmarks, traditional life, family, and community.',
          'active')
  on conflict (class_id, subject_id, term_id) do update set title = excluded.title
  returning id into v_scheme;

  insert into public.rc_scheme_weeks (scheme_id, week_number, week_start_date, topic, subtopics, learning_objectives, teaching_methods, resources, assessment_strategy) values
    (v_scheme,  1, v_start +  0, 'My country Zimbabwe',           'Location; capital; languages',     'Locate Zimbabwe on a map of Africa.',                              'Map demonstration; songs',                  'Map; globe',                                 'Map labelling exercise'),
    (v_scheme,  2, v_start +  7, 'National symbols',              'Flag, anthem, coat of arms',       'Identify and describe national symbols.',                          'Sing the anthem; flag-drawing',              'Flag; anthem lyrics',                        'Drawing + label task'),
    (v_scheme,  3, v_start + 14, 'Public holidays',               'Heroes Day, Independence, Unity Day','Match holidays to their significance.',                          'Calendar walk; class discussion',            'Calendar; pictures',                         'Matching exercise'),
    (v_scheme,  4, v_start + 21, 'Zimbabwean heroes',             'Joshua Nkomo, Solomon Mujuru, Vimbai Zimuto', 'Name selected heroes and one fact each.',                       'Storytelling; pictures',                     'Pictures of heroes',                          'Class quiz'),
    (v_scheme,  5, v_start + 28, 'Provinces of Zimbabwe',         '10 provinces named',                'List the 10 provinces.',                                          'Map drill; songs',                           'Provinces map',                              'Map labelling test'),
    (v_scheme,  6, v_start + 35, 'My province',                   'Where I live; landmarks',          'Describe own province and home town.',                            'Show-and-tell; drawing',                     'Provincial map',                              'Oral presentation'),
    (v_scheme,  7, v_start + 42, 'Famous places',                 'Victoria Falls, Great Zimbabwe, Hwange', 'Name and locate famous Zim landmarks.',                          'Picture walk; group display',                'Photos; map',                                 'Group poster'),
    (v_scheme,  8, v_start + 49, 'Traditional foods',             'Sadza, mufushwa, mukaka',          'Name common Zim traditional foods.',                              'Tasting (optional); discussion',             'Food pictures',                              'Drawing + naming'),
    (v_scheme,  9, v_start + 56, 'Family',                        'Nuclear, extended; roles',          'Describe own family and roles within it.',                        'Family tree drawing',                        'Worksheet',                                  'Family-tree poster'),
    (v_scheme, 10, v_start + 63, 'Community helpers',             'Teacher, nurse, police, farmer',   'Identify community helpers and their roles.',                     'Role play; pictures',                        'Cards',                                      'Role-play assessment'),
    (v_scheme, 11, v_start + 70, 'Personal responsibility',       'Helping at home and school',       'Identify personal responsibilities at home + school.',            'Discussion; story',                          'Story sheet',                                'Short essay'),
    (v_scheme, 12, v_start + 77, 'Revision & Term 2 assessment',  'Recap',                            'Consolidate term skills.',                                       'Revision; quiz',                              'Revision sheets',                            'End-of-term test')
  on conflict (scheme_id, week_number) do nothing;

  -- 5. SCIENCE & TECHNOLOGY
  insert into public.rc_schemes (class_id, subject_id, term_id, teacher_id, title, overview, status)
  values (v_class, '33333333-3333-3333-3333-000000000105', v_term, v_teacher,
          'Science & Technology — Grade 3 — Term 2 2026',
          'Living things, plants & animals, materials, water cycle, weather, forces, simple machines, and health.',
          'active')
  on conflict (class_id, subject_id, term_id) do update set title = excluded.title
  returning id into v_scheme;

  insert into public.rc_scheme_weeks (scheme_id, week_number, week_start_date, topic, subtopics, learning_objectives, teaching_methods, resources, assessment_strategy) values
    (v_scheme,  1, v_start +  0, 'Living things',                 'Characteristics of life',          'Identify what makes something living.',                            'Observation walk; chart',                   'Chart; nature walk',                          'Observation log'),
    (v_scheme,  2, v_start +  7, 'Animals — wild & domestic',     'Examples; habitats',                'Classify animals by habitat.',                                    'Sorting cards; pictures',                    'Animal flash cards',                          'Sorting task'),
    (v_scheme,  3, v_start + 14, 'Plants',                        'Roots, stem, leaves, flowers, fruit', 'Name the parts of a plant.',                                      'Drawing; live plant demonstration',         'Live plant; worksheet',                       'Labelled diagram'),
    (v_scheme,  4, v_start + 21, 'Food chains',                   'Producer, consumer',                'Construct simple food chains.',                                   'Modelling with cards; group work',           'Picture cards',                              'Group display'),
    (v_scheme,  5, v_start + 28, 'Materials',                     'Natural vs man-made',               'Classify everyday materials.',                                    'Sorting activity; touch box',                'Material samples',                            'Sorting exercise'),
    (v_scheme,  6, v_start + 35, 'States of matter',              'Solid, liquid, gas',                'Identify and compare the three states.',                          'Demonstrations with water + ice',           'Water; ice; balloons',                       'Practical observation log'),
    (v_scheme,  7, v_start + 42, 'Water cycle',                   'Evaporation, condensation, rain',  'Describe the water cycle.',                                       'Diagram drawing; song',                      'Water cycle poster',                          'Labelled diagram'),
    (v_scheme,  8, v_start + 49, 'Weather',                       'Sunny, cloudy, rainy, windy',      'Record weather over a week.',                                     'Daily observation chart',                    'Weather chart',                              'Weekly weather log'),
    (v_scheme,  9, v_start + 56, 'Forces',                        'Push, pull',                        'Identify push vs pull in everyday actions.',                      'Demonstration; class examples',              'Toys; objects',                              'Practical task'),
    (v_scheme, 10, v_start + 63, 'Simple machines',               'Lever, pulley, wheel',              'Name simple machines and their uses.',                            'Demonstration; classroom examples',          'Toy machines; pictures',                     'Identification quiz'),
    (v_scheme, 11, v_start + 70, 'Health and hygiene',            'Washing hands; brushing teeth',     'Demonstrate proper hygiene practices.',                           'Demonstration; song; role play',             'Soap; toothbrush',                           'Practical demonstration'),
    (v_scheme, 12, v_start + 77, 'Revision & Term 2 assessment',  'Recap',                            'Consolidate term skills.',                                       'Revision; quiz',                              'Revision sheets',                            'End-of-term test')
  on conflict (scheme_id, week_number) do nothing;

end $$;

select 'schemes module installed' as status,
       (select count(*) from public.rc_schemes) as schemes,
       (select count(*) from public.rc_scheme_weeks) as weeks;
