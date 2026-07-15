# Nollywood Film Club

The [`NFC`](https://twitter.com/irokocritic) community web app for discovering, watching, and discussing Nollywood movies and TV series. Each week the club features a **Movie of the Week**, members watch it on their streaming platform of choice, then come together to rate it, read reviews, and join live discussion spaces.

## What it does

- **Movie of the Week** — a featured film is highlighted on the homepage with its synopsis, trailer, rating, and direct links to where it streams (Netflix, Prime Video, etc.).
- **Movies & TV series catalog** — browse the club's full catalog, with detail pages for each title.
- **Community ratings** — signed-in members rate each film on a simple scale: didn't like it (0), it was okay (5), or liked it (10), optionally with a written review.
- **Discussion spaces** — each featured title links to a live Twitter/X Space and follow-up podcast episodes, so discussion happens where the community already is.
- **Reviews** — curated external reviews (e.g. from publications/blogs) are attached to each title with a score and a link to the full article.
- **Blog** — club-authored posts with a draft/publish workflow.
- **User dashboard** — members pick a unique username during onboarding and manage their ratings from a personal dashboard.
- **Admin dashboard** — role-gated management of movies, reviews, and blog posts, including setting the Movie of the Week.

## How it works

The app is a [Next.js 16](https://nextjs.org) App Router project written in TypeScript.

| Concern | Technology |
| --- | --- |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix primitives), Lucide icons |
| State/data fetching | Redux Toolkit, TanStack Query, React Hook Form + Zod |
| Database | Neon serverless Postgres via Drizzle ORM |
| Auth | [Stack Auth](https://stack-auth.com) (`@stackframe/stack`) with cookie-based sessions |
| Images | Cloudinary via `next-cloudinary` (`CldImage`) |
| Analytics | Vercel Analytics |

Key places in the codebase:

- `app/` — routes: homepage, `movies/[id]`, `onboarding`, `user-dashboard`, `admin`, and `app/api/` route handlers (public read endpoints plus admin CRUD under `app/api/admin/`).
- `db/schema.ts` — Drizzle schema: `content` (movies/TV shows), `user_ratings`, `reviews` (external reviews), and `blog_posts`.
- `stack.tsx` — Stack Auth server app; `lib/admin-auth.ts` gates admin routes by checking the `role: "admin"` flag in a user's client metadata.
- `components/sections/` — homepage sections (movie hero, movie of the week, discussions, reviews); `components/ui/` — shadcn/ui primitives.
- `lib/server-queries.ts` and `lib/queries.ts` — server- and client-side data access.

Authentication flows through Stack's handler at `app/handler/[...stack]`; after sign-in users are routed through `/auth/callback` and, if they have no username yet, into `/onboarding`. Ratings and reviews are written through the API routes, which validate the session server-side.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env.local` and fill in:

   - `DATABASE_URL` — Neon Postgres connection string
   - `NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY` — from your Stack Auth project
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — your Cloudinary cloud

3. **Push the database schema**

   ```bash
   npx drizzle-kit push
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

To access the admin dashboard, set `{ "role": "admin" }` in your user's client metadata in the Stack Auth dashboard.

## Contributing

1. Fork the repo (or create a branch if you have write access) — `master` is the main branch.
2. Make your changes. Match the existing conventions: TypeScript, shadcn/ui components in `components/ui`, feature sections in `components/sections`, Drizzle for all database access.
3. Run `npm run lint` and `npm run build` to verify before pushing.
4. Open a pull request against `master` describing what changed and why.

Schema changes go in `db/schema.ts` and are applied with `drizzle-kit push` (config in `drizzle.config.ts`).

## Deployment

The app is designed for [Vercel](https://vercel.com): connect the repo, set the environment variables above in project settings, and deploy. Neon, Stack Auth, and Cloudinary are all serverless-friendly, so no additional infrastructure is needed.

