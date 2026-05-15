# Ridgecrest

Student information system for Ridgecrest School — public website, student portal, parent portal, and staff back-office in one app. PIN-only sign in for all three audiences.

**Stack:** React 19 · Vite · Tailwind v4 · Supabase · PWA

---

## Why this exists

Running a small-to-medium independent school in Zimbabwe today is still mostly paper-driven: marks recorded by hand, fee receipts in triplicate books, lease/parent communications via WhatsApp scattered across half the staff's phones. Parents wait two weeks to see their child's results. School admin spends Friday afternoons producing a single fee statement.

Ridgecrest's first working version fixes that with one platform every audience uses the same way:

| Pain point | What this app does |
|---|---|
| Marks distributed by paper after end-of-term | Teachers enter marks in the admin portal; parents + students see them the moment they're published |
| Fee statements requested every other week by parents | Live invoice + receipt view per child in the parent portal, including running outstanding balance |
| New tenant of staff / student / parent system = forgotten password | PIN-only sign-in everywhere — no email, no password reset emails, no tech-literacy barrier |
| Announcements lost in WhatsApp groups | One announcement → choose audience (public site, staff, students, parents) |
| Move-out / school-leaver disputes about "what was paid" | Receipts immutable, printable, queryable per student forever |

## Local development

```bash
npm install --legacy-peer-deps
cp .env.example .env.local       # fill in Supabase URL + anon key
npm run dev                      # http://localhost:5184/
```

Production preview: `npm run build && npm run preview` → http://localhost:4189/

## Supabase setup (one-time)

In Supabase → SQL Editor, run these files **in this order:**

1. `supabase/install.sql` — schema, RLS, helpers, PIN resolvers, seed (subjects, terms, classes, fee structures)
2. `supabase/setup_demo_admin.sql` — auth users + demo enrolment (admin + teacher + bursar + parent + 2 children + marks + invoices)
3. `supabase/admin_functions.sql` — admin RPCs (create/delete/reset PIN for staff / students / parents)

Demo PINs after seeding:

| Role | PIN | Identity | Sign-in URL |
|---|---|---|---|
| **Admin** | `1975` | EMP-001 (Admin Demo) | `/admin/login` |
| **Teacher** | `2002` | EMP-002 (Mrs. R. Mhembere) | `/admin/login` |
| **Bursar** | `3030` | EMP-003 (Mr. T. Ndoro) | `/admin/login` |
| **Parent** | `3344` | PAR-2026-001 (Mr. T. Mukamuri — 2 children) | `/parent/login` |
| **Student** | `2200` | STU-2026-001 (Tafara Mukamuri, Form 1A) | `/student/login` |
| **Student** | `2201` | STU-2026-002 (Rumbidzai Mukamuri, Form 2B) | `/student/login` |

## Deployment (Netlify)

```
1. Push to GitHub
2. Netlify → Add new site → Import from Git → pick ridgecrest
3. Build settings auto-load from netlify.toml (don't change)
4. Site settings → Environment variables → add:
   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_DEFAULT_CURRENCY=USD
5. Site settings → Site name → "ridgecrest" → URL becomes ridgecrest.netlify.app
```

Every push to `main` rebuilds and redeploys in ~60 seconds. SPA routing is handled by `public/_redirects` + `netlify.toml`.

## Project layout

```
src/
  components/       shared UI (PinInput, Logo, FileUpload, FloatingInquiry, etc.)
  context/          AuthContext (3-way PIN), SettingsContext
  lib/              supabase client, format helpers (formatMoney, formatDate, gradeOf)
  pages/
    public/         Home, About, Academics, Admissions, Contact
    admin/          Dashboard, Students, Parents, Staff, Classes, Subjects, Marks, Fees, Announcements, Settings
    student/        Dashboard, My Marks, My Fees, My Profile
    parent/         Dashboard, My Children, Per-child detail, My Profile
    print/          /print/receipt/:id printable fee receipt
supabase/           install.sql · setup_demo_admin.sql · admin_functions.sql
public/             PWA icons, _redirects, .htaccess, reset.html
```
