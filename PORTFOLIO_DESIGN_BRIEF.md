# Design Brief — Upwork Portfolio (handoff to Claude Design)

> **You (Claude Design) have full agency over the visual layer.** The structure,
> routes, and content are already built and wired. Your job is to make this a
> **10/10, top-tier portfolio** — the visual system, typography, layout, motion,
> spacing, color, and polish are entirely yours to define. Don't ask permission
> to be bold; the brand doesn't exist yet, so you're inventing it. Make it look
> like the work of an elite, expensive solo developer.

---

## What this is

A public portfolio whose single job is to **win high-budget web/AI projects on
Upwork**. It is not a résumé — it's proof. The whole strategy is speed: the
developer ships a working demo in ~48h and wins the well-defined, fixed-price
project. The site must make that visceral.

**Three things it must communicate in 5 seconds:**
1. **Speed** — "Production-ready AI web apps in days, not months."
2. **Proof, not promises** — every project is a real, clickable build.
3. **No risk** — fixed price, fixed timeline, clear scope.

## Positioning (locked)
- **Solo top-tier developer**, first person. Not an agency.
- **Audience:** US/UK Upwork clients with real budgets. English only.
- **Niches (order of emphasis):** MVPs, AI agents/chatbots, SaaS dashboards, LLM
  integrations, automation. Stack: Next.js / React / TypeScript / Node /
  Supabase / Postgres / Stripe.
- **Vibe target:** confident, fast, precise, expensive. Think Linear / Vercel /
  Raycast tier of craft — not a generic template, not a flashy agency splash.

---

## What's already built (don't rebuild — restyle)

Next.js 15 App Router · React 19 · Tailwind CSS v4 · shadcn/ui · next-themes.

**Public route group** `src/app/(site)/`:
- `page.tsx` — Home: hero, stats, stack strip, featured work, "How I work",
  testimonials, final CTA.
- `work/page.tsx` — work index (grid of `ProjectCard`).
- `work/[slug]/page.tsx` — case study (client / problem / scope / outcome / stack / demo CTA).
- `services/page.tsx` — fixed-price productized offers.
- `about/page.tsx` — bio + operating principles.
- `layout.tsx` — wraps `SiteNav` + `SiteFooter`.

**Components** `src/components/site/`: `site-nav.tsx`, `site-footer.tsx`, `project-card.tsx`.

**Content (typed, edit-friendly — layout maps over these; keep the data, restyle the presentation):**
- `src/content/site.ts` — name, role, tagline, subhead, stats, stack, CTA links.
- `src/content/projects.ts` — case studies (`Project` type).
- `src/content/services.ts` — services (`Service` type).

---

## Design constraints (hard)
- **Theme tokens live in `src/app/globals.css`** (shadcn oklch vars + a carefully
  tuned dark palette). Work *with* these tokens or extend them deliberately —
  don't hardcode hex all over. Both **light and dark** must look intentional and
  polished (next-themes, `.dark` class).
- **Reuse shadcn primitives** in `src/components/ui/*` where sensible.
- **Do not touch `/dashboard/*`, `/login`, `src/middleware.ts`, or the auth/
  Prisma/Upwork code.** This is a separate public surface; the dashboard is an
  unrelated internal tool that must keep working.
- Responsive and accessible: flawless on mobile and desktop, real focus states,
  no layout shift, no horizontal scroll.
- `framer-motion` is **not installed** — add it if you want motion (your call).

## Where to push craft (suggestions, not limits)
- A hero that lands the speed message instantly — consider a live/animated proof
  element over a static headline.
- `ProjectCard` and the case-study page are the conversion surface. Make them
  feel like premium product pages, not blog posts. Room for a demo preview /
  gif / video slot (`Project.loomUrl`, `Project.demoUrl` exist in the type).
- A distinctive type scale and one confident accent — not seven gradients.
- Trust layer (guarantees, testimonials, "Hire on Upwork" CTA) should feel
  earned, not sales-y.

## Out of scope for you
- Copywriting is done (English, in `src/content/*`) — tweak wording only if the
  design needs it.
- The interactive demos at `/demos/[slug]` are a separate build phase; they're
  currently marked `coming-soon` in `projects.ts`.

---

## How to verify
`npm run dev` → `/`, `/work`, `/work/[slug]`, `/services`, `/about` in both
themes, mobile + desktop. `/dashboard` must still redirect to `/login`.
`npx tsc --noEmit` clean. `npm run build` passes.
