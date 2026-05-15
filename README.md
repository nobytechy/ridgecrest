# Ridgecrest School

A complete school information system for **Ridgecrest Primary School** — one app that runs the public website, the staff back-office, the parent portal, the student portal, and the printable receipt + report-card pipeline. PIN-only sign-in for every audience: no email addresses, no passwords, no reset emails.

**Stack:** React 19 · Vite 5 · Tailwind v4 · Supabase (Postgres + RLS + Storage) · Framer Motion · vite-plugin-pwa
**Live:** deployed continuously from `main` via Netlify
**Repo:** https://github.com/nobytechy/ridgecrest

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [Module-by-module walkthrough](#module-by-module-walkthrough)
3. [Test plan & demo credentials](#test-plan--demo-credentials)
4. [Local development](#local-development)
5. [Supabase setup (one-time)](#supabase-setup-one-time)
6. [Deployment (Netlify)](#deployment-netlify)
7. [Project layout](#project-layout)

---

## Why this exists

Running a small-to-medium independent school in Zimbabwe today is still mostly paper-driven: marks recorded by hand, fee receipts in triplicate books, parent communications scattered across half the staff's phones. Parents wait two weeks to see their child's results. School admin spends Friday afternoons producing a single fee statement.

Ridgecrest fixes that with one platform every audience uses the same way:

| Pain point | What this app does |
|---|---|
| Marks distributed by paper after end-of-term | Teachers enter marks in the staff portal; parents + students see them the moment they're published |
| Fee statements requested every other week | Live invoice + receipt view per child, including running outstanding balance and printable A4 receipts |
| Attendance recorded in a register book, never reviewed | Daily tap-to-cycle attendance grid, parent sees "Manisha was at school today" on the dashboard |
| End-of-term report cards typed in Word, photocopied | Termly report cards generated on demand, A4-ready, with subject results + class position + remarks |
| Class news lost in WhatsApp groups | Class Feed (Class-Dojo style) — teacher posts text + photo, parents see it on the portal |
| Sibling discounts calculated by hand at fee time | Auto-applied during bulk invoice generation (2 children → 10%, 3+ → 15%) |
| Forgotten password = call the IT person | PIN-only sign-in everywhere; admin can reset any PIN in two clicks |
| Move-out disputes about "what was paid" | Receipts immutable, printable, queryable per student forever |

---

## Module-by-module walkthrough

### Public website (no login)

| Route | What it is |
|---|---|
| `/` | Marketing landing page — animated hero, scroll-triggered stats (CountUp), values, current term, latest news, "Apply" CTA. Animated grey backdrop (drifting blobs + shimmer) layered on white sections so the page feels alive. |
| `/about` | History, headmaster letter, milestones timeline, school values, parent quotes |
| `/academics` | Primary curriculum, subjects per grade, school day structure |
| `/admissions` | How to apply, fees overview, inquiry form (writes to `rc_inquiries`) |
| `/gallery` | Photo gallery (filtered by tag), pulls from `rc_gallery_items` |
| `/contact` | Contact details + inquiry form |

Footer carries "Powered by Noby" with the developer's WhatsApp link.

### Staff portal `/admin/login` → `/admin`

Everything a school office, teacher, bursar, or headmaster needs.

| Module | Route | What it does |
|---|---|---|
| **Overview** | `/admin` | KPIs (students, parents, staff, classes, published marks). Fee-collection % bar. Outstanding total. Recent receipts table. Birthday widget (next 30 days, school-wide). ⌘K hint card. |
| **Students** | `/admin/students` | Create, edit, deactivate students. Auto-generates `STU-YYYY-NNNN` codes + PIN + portal login. Photo upload supported. Class + parent links. |
| **Parents** | `/admin/parents` | Create + link to children. `PAR-YYYY-NNNN` codes. Reset PIN. Mark primary contact. |
| **Staff** | `/admin/staff` | Roles (Admin, Teacher, Bursar). `EMP-NNN` codes + PIN. RLS-gated by role. |
| **Classes** | `/admin/classes` | ECD A, ECD B, Grade 1 → Grade 7 (no streams). Assign class teacher. |
| **Subjects** | `/admin/subjects` | Curriculum subjects + per-class subject map. |
| **Scheme books** | `/admin/schemes` | Per term × class × subject scheme of work. Topics + week numbers + objectives + resources. |
| **Timetable** | `/admin/timetable` | Class × day × period grid. Sourced from `rc_timetable_slots`. |
| **Attendance** | `/admin/attendance` | **NEW.** Pick class + date. Each student tile cycles through Present → Absent → Late → Excused. Bulk save with one click. Counts shown per status. |
| **Homework** | `/admin/homework` | Teacher posts homework per class + subject. Parents + students see it. |
| **Marks** | `/admin/marks` | Per class → per subject → per assessment. Enter, edit, publish. Toggle `is_published` to release to parents/students. |
| **Term reports** | `/admin/term-reports` | **NEW.** Pick class + term. Edit class-teacher + headmaster remarks per student, set conduct + position, toggle published. "Preview" opens the A4 printable report card. |
| **Class feed** | `/admin/class-feed` | **NEW.** Class-Dojo style daily wall. Teacher posts text + optional photo to a class. Pin important posts to the top. Author + timestamp shown. |
| **Fees & Payments** | `/admin/fees` | Invoice ledger. Bulk-generate invoices per term × class from `rc_fee_structures`. **Sibling discount auto-applied** (2 kids → 10%, 3+ → 15%, configurable in Settings). Record cash/PayNow/EcoCash/transfer payments. Print A4 receipt. |
| **Gallery** | `/admin/gallery` | Upload photos to `rc-public` storage. Tag + caption. |
| **Announcements** | `/admin/announcements` | Compose + target audience (public, staff, parents, students, all). Active toggle. |
| **Settings** | `/admin/settings` | School name, motto, founded year, hero copy, fee currency, sibling-discount percentages, current term, contact details. |

**Power features available everywhere in the staff portal:**
- **⌘K / Ctrl-K** universal search — opens a modal, search students, parents, staff, classes. Click a result to navigate.
- **Sticky header** with logo + search trigger.
- **Sidebar nav** stays mounted, route changes are instant (SPA).

### Student portal `/student/login` → `/student`

| Module | Route | What it does |
|---|---|---|
| **Dashboard** | `/student` | Welcome + class. Latest published marks chips. Upcoming homework. Outstanding fee. |
| **My Marks** | `/student/marks` | All published assessments grouped by subject. Term filter. |
| **Timetable** | `/student/timetable` | This week's timetable for the student's class. |
| **Homework** | `/student/homework` | Open homework + due dates. |
| **My Fees** | `/student/fees` | Invoices + payments + outstanding balance for the student. |
| **My Profile** | `/student/profile` | View own profile. Change PIN. |

### Parent portal `/parent/login` → `/parent`

| Module | Route | What it does |
|---|---|---|
| **Dashboard** | `/parent` | All linked children as cards: latest average, recent marks, outstanding fees, "open child" link. Total outstanding banner if any. Birthday widget filtered to own children. Latest news. |
| **My Children** | `/parent/children` | List of linked children, each clickable. |
| **Child detail** | `/parent/children/:id` | All marks, fees, attendance, class feed, homework, profile for a specific child. |
| **Edit child** | `/parent/children/:id/edit` | Parents may update a limited set of fields (phone, allergies, photo) via the `rc_parent_update_child` RPC. |
| **My Profile** | `/parent/profile` | Change own contact + PIN. |

### Print pipeline (server-rendered A4 from the SPA)

| Route | Output |
|---|---|
| `/print/receipt/:id` | Fee receipt: school header, receipt no, payer, line items, total, method, signature. `window.print()` ready. |
| `/print/report/:studentId/:termId` | **NEW.** Termly report card: school header, student photo + class + admission no, subject results table for that term's published assessments, attendance %, class position, class-teacher remarks, headmaster remarks, signature blocks. |

### Cross-cutting features (used by all portals)

- **PWA** with `vite-plugin-pwa` — installable, offline shell, auto-update.
- **Auth timeout** — every Supabase call wrapped in a 12-second `withTimeout()` helper so a flaky network never leaves the UI stuck.
- **Toast notifications** via `react-hot-toast` on every write.
- **Framer Motion** animations app-wide: marketing scroll-reveals, dashboard fade-ins, modal transitions.
- **PIN-only auth** — three sign-in flows (staff/student/parent), each resolved server-side via `rc_resolve_*_pin()` SECURITY DEFINER RPCs. One auth.user pool, three RLS-gated entry points.

---

## Test plan & demo credentials

### Demo PINs (after running the seed SQLs)

| Role | PIN | Identity | Sign-in URL |
|---|---|---|---|
| **Admin** | `1975` | EMP-001 (Admin Demo) | `/admin/login` |
| **Teacher** | `2002` | EMP-002 (Mrs. R. Mhembere) | `/admin/login` |
| **Bursar** | `3030` | EMP-003 (Mr. T. Ndoro) | `/admin/login` |
| **Parent** | `4455` | PAR-2026-001 (Mrs. M. Tebulo) | `/parent/login` |
| **Student (Manisha)** | `3300` | STU-2026-003 (Manisha Tebulo, Grade 3) | `/student/login` |
| **Parent** | `3344` | PAR-2026-002 (Mr. T. Mukamuri) | `/parent/login` |
| **Student** | `2200` | STU-2026-001 (Tafara Mukamuri) | `/student/login` |
| **Student** | `2201` | STU-2026-002 (Rumbidzai Mukamuri) | `/student/login` |

### Test scenarios — golden paths

**1. Marketing site (no login required)**
- Open `/` — hero rotates between two images; stats count up on scroll; values cards stagger in and lift on hover; CTA fades in at the bottom.
- Tab through `/about`, `/academics`, `/admissions`, `/gallery`, `/contact` — all should render with the gradient backdrop on white sections.
- Submit the inquiry form on `/contact` — toast confirms, row appears in `rc_inquiries`.

**2. Staff portal — daily routine**
- Sign in as Admin (`1975`).
- Press **⌘K** anywhere → search "manisha" → click → land on Students.
- Go to **Attendance** → pick *Grade 3* → today's date → tap one tile to cycle status → click Save. Reload, confirm persisted.
- Go to **Term reports** → pick *Grade 3* → *Term 2 · 2026* → edit Manisha's remarks → toggle Published → click Preview. A new tab opens with the printable report. Press Ctrl-P to print to PDF.
- Go to **Class feed** → pick *Grade 3* → post "Field trip Friday — bring water" + photo → check it appears. Pin it.
- Go to **Fees & Payments** → click *Bulk generate* → pick *Grade 3* + *Term 2* → confirm. Look at Tafara's and Rumbidzai's invoices: each should show "sibling discount 10% (2 children)" in notes, totals reduced by 10%.
- Click *Pay* on an open invoice → record cash payment → printable receipt opens automatically.

**3. Parent portal — what a parent sees**
- Sign in as Mrs. M. Tebulo (`4455`).
- Dashboard: Manisha's card with her average + outstanding. Birthday widget filtered to her own children.
- Click Manisha's card → child detail → see her marks, attendance, class feed posts from step 2.
- Open `/parent/children/:id/edit` → update her phone number → save. Confirm parent RLS allows this.
- Change own PIN on `/parent/profile`.

**4. Student portal — what a child sees**
- Sign in as Manisha (`3300`).
- Dashboard shows recent published marks, today's homework, this week's timetable preview.
- `/student/marks` shows only assessments where `is_published = true`.
- `/student/fees` shows her own invoices only.

**5. Cross-portal data integrity**
- Sign in as Admin, post a school-wide announcement.
- Sign out, open `/` — see it under "Latest news".
- Sign in as Parent — see the same announcement on the parent dashboard.

### Edge cases worth manually verifying

- Wrong PIN → "PIN not recognised" toast, no leak about which type was tried.
- Stale PWA cache — visit `/reset.html` if a deploy seems stuck; one click clears the service worker.
- Reduced motion — enable "reduce motion" in OS settings, the gradient blobs should stop animating (CSS already honors `prefers-reduced-motion`).
- Print preview — the receipt and report-card pages should render cleanly at A4 without the sidebar/nav.

### Known limits of the demo

- All demo PINs are 4-digit and visible above. In production, school office hands out PINs in person; admin can reset any PIN at any time.
- The Supabase free tier sleeps after inactivity — first request after a long idle may take 2-3 seconds.

---

## Local development

```bash
npm install --legacy-peer-deps
cp .env.example .env.local       # fill in Supabase URL + anon key
npm run dev                      # http://localhost:5184/
```

Production preview: `npm run build && npm run preview` → http://localhost:4189/

---

## Supabase setup (one-time)

In Supabase → SQL Editor, run these files **in this order:**

1. `supabase/install.sql` — schema, RLS policies, PIN resolvers, helpers, base seed (subjects, terms, classes, fee structures)
2. `supabase/primary_reseed.sql` — primary-school specific class reseed (ECD A/B + Grade 1-7)
3. `supabase/holidays_module.sql` — Zimbabwe national calendar + holiday rendering
4. `supabase/schemes_module.sql` — scheme-of-work tables + Grade 3 Term 2 seed
5. `supabase/admin_functions.sql` — admin RPCs (create/delete/reset PIN for staff, students, parents)
6. `supabase/setup_demo_admin.sql` — auth users + demo enrolment (admin + teacher + bursar + Mukamuri family + Tebulo family + marks + invoices)
7. `supabase/modules_extra.sql` — homework, timetable, gallery, inquiries
8. **`supabase/modules_v2.sql`** — attendance, term reports, class feed + sibling-discount settings (NEW)

After running all eight, the database is fully seeded and the demo credentials in the table above work.

---

## Deployment (Netlify)

```
1. Push to GitHub
2. Netlify → Add new site → Import from Git → pick ridgecrest
3. Build settings auto-load from netlify.toml (don't change)
4. Site settings → Environment variables → add:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_DEFAULT_CURRENCY=USD
5. Site settings → Site name → choose subdomain
```

Every push to `main` rebuilds and redeploys in ~60 seconds. SPA routing is handled by `public/_redirects` + `netlify.toml`.

---

## Project layout

```
src/
  components/
    BirthdayWidget.jsx      next-30-days widget (admin + parent variants)
    UniversalSearch.jsx     ⌘K modal — students / parents / staff / classes
    GradientBackdrop.jsx    animated grey/slate blobs + shimmer for marketing
    CountUp.jsx             scroll-triggered number animation
    FileUpload.jsx          drag/drop image upload to Supabase Storage
    PinInput.jsx            4-digit PIN entry
    Logo.jsx                school crest + wordmark
    layout/                 PublicLayout, AdminLayout, StudentLayout, ParentLayout
  context/
    AuthContext.jsx         3-way PIN auth, role detection, withTimeout helper
    SettingsContext.jsx     site settings, current term
  lib/
    supabase.js             client + withTimeout
    format.js               formatMoney, formatDate, gradeOf
    utils.js                cn() classname helper
  pages/
    public/                 Home, About, Academics, Admissions, Gallery, Contact
    admin/                  Dashboard, Students, Parents, Staff, Classes, Subjects,
                            Schemes, Timetable, Attendance, Homework, Marks,
                            TermReports, ClassFeed, Fees, Gallery, Announcements, Settings
    student/                Dashboard, Marks, Timetable, Homework, Fees, Profile
    parent/                 Dashboard, Children, ChildDetail, ChildEdit, Profile
    print/                  PrintReceipt, PrintReport
supabase/
  install.sql               base schema + RLS + PIN resolvers
  primary_reseed.sql        ECD A/B + Grade 1-7 class reseed
  holidays_module.sql       ZW national calendar
  schemes_module.sql        scheme-of-work tables + Grade 3 Term 2 seed
  admin_functions.sql       admin RPCs
  setup_demo_admin.sql      auth users + Mukamuri + Tebulo demo enrolment
  modules_extra.sql         homework, timetable, gallery, inquiries
  modules_v2.sql            attendance, term reports, class feed, sibling discount
public/
  _redirects                Netlify SPA fallback
  .htaccess                 Apache SPA fallback (XAMPP / cPanel)
  reset.html                emergency service-worker buster
  pwa-*.png                 PWA icons
netlify.toml                build config, headers, redirects
```
