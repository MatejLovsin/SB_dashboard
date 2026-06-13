# Dashboard

A private, single-user "second brain" for **Fitness**, **School**, and **Work**, with
AI-generated section summaries. Next.js 16 + Supabase + Tailwind, deployed on Vercel.

The full build plan (schema, structure, session roadmap) lives at
`~/.claude/plans/peppy-finding-ember.md`. See `AGENTS.md` for conventions.

## One-time setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. **Run the schema:** open the SQL Editor and paste/run `supabase/migrations/0001_init.sql`.
3. **Create your single user:** Authentication → Users → *Add user* → enter your email +
   a password (check "Auto Confirm User").
4. **Lock down sign-ups:** Authentication → Providers/Sign In → disable "Allow new users to
   sign up" (this app has no public registration — you log in with the user above).

### 2. Environment
Copy `.env.local.example` to `.env.local` and fill in from Supabase → Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...        # only needed from Session 8 onward
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`. Sign in with your user.

### 4. Deploy (Vercel)
1. Push this repo to GitHub and import it in Vercel.
2. Add the same env vars in Vercel → Project → Settings → Environment Variables.
3. Deploy, then add the URL to your phone's home screen.

## Scripts
- `npm run dev` — local dev server
- `npm run build` — production build (passes without secrets; authenticated pages are dynamic)
- `npx tsc --noEmit` — type-check
