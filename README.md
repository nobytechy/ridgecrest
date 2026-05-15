# Ridgecrest School

A complete information system for **Ridgecrest Primary School** — public website, staff back-office, parent portal, student portal, and printable receipt + report-card pipeline, all in one app. PIN-only sign-in for every audience: no email addresses, no passwords, no reset emails.

**Stack:** React 19 · Vite 5 · Tailwind v4 · Supabase · Framer Motion · PWA
**Live:** continuously deployed from `main` via Netlify
**Repo:** https://github.com/nobytechy/ridgecrest

> For the full module walkthrough, test plan, and demo PINs, see **[Instructions.md](Instructions.md)**.

---

## The problem

Running a small-to-medium independent primary school in Zimbabwe today is still mostly paper-driven and WhatsApp-driven:

- **Marks** are recorded by hand in mark books and only seen by parents two weeks after end of term, on a typed sheet handed out at collection day.
- **Fee statements** are written up on request by the bursar, one parent at a time. Disputes about "what was paid" surface every term because receipts live in triplicate carbon books.
- **Attendance** is taken in a register book that nobody reviews until something goes wrong.
- **Report cards** are typed in Word at the end of every term, photocopied, manually distributed.
- **Class news** ("we have a field trip Friday, please send water") gets lost in WhatsApp groups and reaches only some parents.
- **Sibling discounts** are calculated by hand at fee time, applied inconsistently, and frequently forgotten.
- **The IT person** spends half their week resetting forgotten passwords for staff, students, and parents.

Every one of those tasks is repetitive, error-prone, and produces frustrated parents.

## The solution

Ridgecrest is one app that every audience uses the same way. It replaces all of the above with live, queryable, printable data:

| Pain point | What this app does |
|---|---|
| Marks distributed by paper after end of term | Teachers enter marks in the staff portal; parents + students see them the moment they are published. |
| Fee statements requested every other week | Live invoice + receipt view per child, running outstanding balance, A4 printable receipts on every payment. |
| Attendance recorded but never reviewed | Daily tap-to-cycle attendance grid (Present / Absent / Late / Excused). Parents see "Manisha was at school today" on their dashboard. |
| Report cards typed in Word, photocopied | Termly report cards generated on demand, A4-ready, with subject results + class position + class-teacher + headmaster remarks. |
| Class news scattered across WhatsApp | A Class-Dojo style class feed — teacher posts text + photo + pinned items, every linked parent sees it. |
| Sibling discounts calculated by hand | Auto-applied during bulk invoice generation: 2 children → 10%, 3+ → 15%, configurable in Settings. |
| Forgotten password = call the IT person | PIN-only sign-in everywhere; admin can reset any PIN in two clicks; no email or password infrastructure to maintain. |
| Move-out disputes about "what was paid" | Receipts immutable, printable, queryable per student forever. |
| Office bursar spending Friday on a single fee statement | One bulk action: pick a term × class, generates invoices for every active student in seconds, sibling discounts applied automatically. |
| Marketing site looks like a brochure-ware template | Animated landing page — gradient backdrop, scroll-triggered count-up stats, hover-lift on values, CTAs that fade in. Built to feel alive on the headmaster's phone, not like a 2010 school site. |

The whole system runs on a single Supabase project (Postgres + RLS + Storage) and deploys to Netlify in under a minute per push. The school office sets up new students, parents, and staff themselves — the developer is not in the loop for day-to-day operations.

---

## Quick start

### Local development

```bash
npm install --legacy-peer-deps
cp .env.example .env.local       # fill in Supabase URL + anon key
npm run dev                      # http://localhost:5184/
```

Production preview: `npm run build && npm run preview` → http://localhost:4189/

### Supabase setup

Run the eight SQL files in `supabase/` in the order listed in **[Instructions.md → Supabase setup order](Instructions.md#supabase-setup-order)**. Takes about two minutes total in the SQL Editor.

### Deployment (Netlify)

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
  components/       BirthdayWidget, UniversalSearch (⌘K), GradientBackdrop, CountUp,
                    FileUpload, PinInput, Logo, layout/*
  context/          AuthContext (3-way PIN), SettingsContext
  lib/              supabase client, format helpers (formatMoney, formatDate, gradeOf)
  pages/
    public/         Home, About, Academics, Admissions, Gallery, Contact
    admin/          Dashboard, Students, Parents, Staff, Classes, Subjects,
                    Schemes, Timetable, Attendance, Homework, Marks,
                    TermReports, ClassFeed, Fees, Gallery, Announcements, Settings
    student/        Dashboard, Marks, Timetable, Homework, Fees, Profile
    parent/         Dashboard, Children, ChildDetail, ChildEdit, Profile
    print/          PrintReceipt, PrintReport
supabase/           install.sql · primary_reseed.sql · holidays_module.sql ·
                    schemes_module.sql · admin_functions.sql · setup_demo_admin.sql ·
                    modules_extra.sql · modules_v2.sql
public/             PWA icons, _redirects, .htaccess, reset.html
```

See **[Instructions.md](Instructions.md)** for what every module does and how to test it end-to-end.
