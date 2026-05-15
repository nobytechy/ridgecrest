# Ridgecrest — Module walkthrough & test plan

Companion to `README.md`. The README explains *what the app does and why*; this file explains *how to use it, module by module, and how to test it.*

---

## Table of contents

1. [Demo credentials](#demo-credentials)
2. [Module-by-module walkthrough](#module-by-module-walkthrough)
   - [Public website](#public-website-no-login)
   - [Staff portal](#staff-portal-adminlogin--admin)
   - [Student portal](#student-portal-studentlogin--student)
   - [Parent portal](#parent-portal-parentlogin--parent)
   - [Print pipeline](#print-pipeline-server-rendered-a4-from-the-spa)
   - [Cross-cutting features](#cross-cutting-features)
3. [Test plan](#test-plan)
   - [Golden-path scenarios](#golden-path-scenarios)
   - [Edge cases](#edge-cases-worth-manually-verifying)
   - [Known limits](#known-limits-of-the-demo)
4. [Supabase setup order](#supabase-setup-order)

---

## Demo credentials

After running the seed SQLs, these PINs work:

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

---

## Module-by-module walkthrough

### Public website (no login)

| Route | What it is |
|---|---|
| `/` | Marketing landing page — animated hero, scroll-triggered stats (CountUp), values cards, current term, latest news, "Apply" CTA. Animated grey backdrop (drifting blobs + shimmer) layered on white sections so the page feels alive. |
| `/about` | History, headmaster letter, milestones timeline, school values, parent quotes |
| `/academics` | Primary curriculum, subjects per grade, school day structure |
| `/admissions` | How to apply, fees overview, inquiry form (writes to `rc_inquiries`) |
| `/gallery` | Photo gallery filtered by tag (pulls from `rc_gallery_items`) |
| `/contact` | Contact details + inquiry form |

Footer carries "Powered by Noby" with a WhatsApp link.

### Staff portal `/admin/login` → `/admin`

Everything a school office, teacher, bursar, or headmaster needs.

| Module | Route | What it does |
|---|---|---|
| **Overview** | `/admin` | KPIs (students, parents, staff, classes, published marks). Fee-collection % bar. Outstanding total. Recent receipts table. Birthday widget (next 30 days, school-wide). ⌘K hint card. |
| **Students** | `/admin/students` | Create, edit, deactivate students. Auto-generates `STU-YYYY-NNNN` codes + PIN + portal login. Photo upload. Class + parent links. |
| **Parents** | `/admin/parents` | Create + link to children. `PAR-YYYY-NNNN` codes. Reset PIN. Mark primary contact. |
| **Staff** | `/admin/staff` | Roles (Admin, Teacher, Bursar). `EMP-NNN` codes + PIN. RLS-gated by role. |
| **Classes** | `/admin/classes` | ECD A, ECD B, Grade 1 → Grade 7 (no streams). Assign class teacher. |
| **Subjects** | `/admin/subjects` | Curriculum subjects + per-class subject map. |
| **Scheme books** | `/admin/schemes` | Per term × class × subject scheme of work. Topics + week numbers + objectives + resources. |
| **Timetable** | `/admin/timetable` | Class × day × period grid sourced from `rc_timetable_slots`. |
| **Attendance** | `/admin/attendance` | Pick class + date. Each student tile cycles through Present → Absent → Late → Excused. Bulk save with one click. Counts shown per status. |
| **Homework** | `/admin/homework` | Teacher posts homework per class + subject. Parents + students see it. |
| **Marks** | `/admin/marks` | Per class → per subject → per assessment. Enter, edit, publish. Toggle `is_published` to release to parents/students. |
| **Term reports** | `/admin/term-reports` | Pick class + term. Edit class-teacher + headmaster remarks per student, set conduct + position, toggle published. "Preview" opens the A4 printable report card. |
| **Class feed** | `/admin/class-feed` | Class-Dojo style daily wall. Teacher posts text + optional photo to a class. Pin important posts to the top. Author + timestamp shown. |
| **Fees & Payments** | `/admin/fees` | Invoice ledger. Bulk-generate invoices per term × class from `rc_fee_structures`. **Sibling discount auto-applied** (2 kids → 10%, 3+ → 15%, configurable in Settings). Record cash/PayNow/EcoCash/transfer payments. Print A4 receipt. |
| **Gallery** | `/admin/gallery` | Upload photos to `rc-public` storage. Tag + caption. |
| **Announcements** | `/admin/announcements` | Compose + target audience (public, staff, parents, students, all). Active toggle. |
| **Settings** | `/admin/settings` | School name, motto, founded year, hero copy, fee currency, sibling-discount percentages, current term, contact details. |

**Power features available everywhere in the staff portal:**
- **⌘K / Ctrl-K** universal search — opens a modal; search students, parents, staff, classes; click a result to navigate.
- **Sticky header** with logo + search trigger.
- **Sidebar nav** stays mounted, route changes are instant (SPA).

### Student portal `/student/login` → `/student`

| Module | Route | What it does |
|---|---|---|
| **Dashboard** | `/student` | Welcome + class. Latest published marks chips. Upcoming homework. Outstanding fee. |
| **My Marks** | `/student/marks` | All published assessments grouped by subject. Term filter. |
| **Timetable** | `/student/timetable` | This week's timetable for the student's class. |
| **Homework** | `/student/homework` | Open homework + due dates. |
| **My Fees** | `/student/fees` | Invoices + payments + outstanding balance for this student. |
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
| `/print/report/:studentId/:termId` | Termly report card: school header, student photo + class + admission no, subject results table for that term's published assessments, attendance %, class position, class-teacher remarks, headmaster remarks, signature blocks. |

### Cross-cutting features

Used by every portal:

- **PWA** with `vite-plugin-pwa` — installable, offline shell, auto-update.
- **Auth timeout** — every Supabase call wrapped in a 12-second `withTimeout()` helper so a flaky network never leaves the UI stuck.
- **Toast notifications** via `react-hot-toast` on every write.
- **Framer Motion** animations app-wide: marketing scroll-reveals, dashboard fade-ins, modal transitions.
- **PIN-only auth** — three sign-in flows (staff/student/parent), each resolved server-side via `rc_resolve_*_pin()` SECURITY DEFINER RPCs. One auth.user pool, three RLS-gated entry points.

---

## Test plan

### Golden-path scenarios

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
- Print preview — receipt and report-card pages should render cleanly at A4 without the sidebar/nav.
- Sibling discount edge: a student with 1 sibling → 10%; with 2 → 15%; with 0 → no discount.
- Attendance double-tap on same student/date should overwrite, not duplicate (unique constraint on `student_id + date`).

### Known limits of the demo

- All demo PINs are 4-digit and visible above. In production, the school office hands out PINs in person; admin can reset any PIN at any time.
- The Supabase free tier sleeps after inactivity — first request after a long idle may take 2–3 seconds.
- Photo uploads use the `rc-public` Storage bucket; you must create it (public, ~5 MB per file) in Supabase Storage once before testing photo features.

---

## Supabase setup

Open Supabase → SQL Editor → paste **`supabase/install.sql`** → Run.

One file, one click. The script is re-runnable (re-run any time you want to refresh the demo). It sets up:

- Every table + index + trigger
- All RLS policies (public / staff / student / parent)
- PIN resolvers + admin RPCs (`rc_admin_create_staff`, `rc_admin_create_student`, `rc_admin_create_parent`, `rc_admin_reset_pin`, `rc_admin_delete_user`, `rc_admin_link_parent_child`, `rc_parent_update_child`)
- Storage bucket `rc-public`
- Site settings (school name, motto, PayNow URL, sibling-discount %)
- Term 2 2026 active + all three 2026 terms
- Primary curriculum subjects + ECD A/B + Grade 1-7
- Fee structure for every class for Term 2
- 2026 Zimbabwe national calendar
- Auth users + staff (5) + parents (3) + students (5) + marks + invoices + payments
- Grade 3 timetable, homework, attendance, term reports, class feed, schemes of work
- Sample gallery (2 albums × 3 photos)

When it finishes, the last `select` echoes counts and verifies the three demo PINs resolve correctly.
