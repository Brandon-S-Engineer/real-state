# Handoff: Upwork Portfolio — Visual Restyle

## Overview
A complete visual restyle of the **public portfolio** (`src/app/(site)/*`) for Brandon Soria — a solo full-stack/AI developer selling fixed-price builds on Upwork. Content, routes, and data are unchanged; this handoff is **the visual layer only** (type, color, layout, motion, polish). Target vibe: Linear / Vercel / Raycast tier of craft — confident, fast, expensive.

## About the Design Files
The `.dc.html` files in this bundle are **design references** — HTML prototypes that show the intended look, layout, and behavior. They are **not** production code to paste in. Your job is to **recreate these designs inside the existing Next.js codebase** using its established patterns: Tailwind v4 utility classes, the shadcn/ui primitives in `src/components/ui/*`, `next-themes` for dark/light, and the oklch token system in `src/app/globals.css`. Keep the content from `src/content/*` exactly as-is (restyle the presentation, don't rewrite copy).

Each `.dc.html` maps 1:1 to an existing route:
| Design file | Route / file to restyle |
|---|---|
| `Home.dc.html` | `src/app/(site)/page.tsx` |
| `Work.dc.html` | `src/app/(site)/work/page.tsx` + `src/components/site/project-card.tsx` |
| `Case Study.dc.html` | `src/app/(site)/work/[slug]/page.tsx` |
| `Services.dc.html` | `src/app/(site)/services/page.tsx` |
| `About.dc.html` | `src/app/(site)/about/page.tsx` |
| nav/footer (in every file) | `src/components/site/site-nav.tsx`, `site-footer.tsx` |

**Do not touch** `/dashboard/*`, `/login`, `middleware.ts`, or the Prisma/auth/Upwork code — this is a separate public surface.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified below. Recreate pixel-perfectly. The `.dc.html` files use inline styles + CSS custom properties because of the prototype environment — in the real repo, express the same values as Tailwind classes and shadcn components, and drive theming through `globals.css` tokens (below) rather than hardcoding oklch everywhere.

---

## Design Tokens

The prototype defines two token sets on `:root` (light) and `:root[data-theme="dark"]` (dark). In the repo, map these onto the **existing** shadcn oklch vars in `globals.css` — extend, don't replace, the token names shadcn expects (`--background`, `--card`, `--primary`, etc.). Add the new ones (`--accent-coral`, `--live`, `--code-bg`) as custom vars.

### Light (`:root`)
```
--bg            oklch(0.982 0.004 70)     /* page background */
--bg-2          oklch(0.963 0.005 70)     /* muted section / tinted surfaces */
--card          oklch(1 0 0)              /* cards */
--fg            oklch(0.22 0.01 60)       /* primary text */
--muted         oklch(0.505 0.01 60)      /* secondary text */
--border        oklch(0.19 0.01 60 / 0.12)
--border-strong oklch(0.19 0.01 60 / 0.20)
--accent        oklch(0.605 0.2 39)       /* CORAL — the one accent */
--accent-fg     oklch(0.995 0 0)          /* text on accent */
--accent-soft   oklch(0.605 0.2 39 / 0.10)/* accent tint bg */
--live          oklch(0.58 0.16 155)      /* green "available/shipped" dot + checks */
--code-bg       oklch(0.965 0.005 70)     /* terminal / mono panels */
--code-fg       oklch(0.30 0.01 60)
--shadow        0 1px 2px oklch(0.2 0.01 60 / .04), 0 8px 30px oklch(0.2 0.01 60 / .06)
```

### Dark (`:root[data-theme="dark"]`, ≈ `.dark` in repo) — **default theme**
```
--bg            oklch(0.168 0.006 60)     /* near-black warm canvas */
--bg-2          oklch(0.205 0.006 60)
--card          oklch(0.216 0.007 60)
--fg            oklch(0.95 0.004 75)
--muted         oklch(0.66 0.006 75)
--border        oklch(1 0 0 / 0.10)
--border-strong oklch(1 0 0 / 0.18)
--accent        oklch(0.72 0.185 44)      /* CORAL, lifted for dark */
--accent-fg     oklch(0.18 0.03 44)
--accent-soft   oklch(0.72 0.185 44 / 0.14)
--live          oklch(0.76 0.15 158)
--code-bg       oklch(0.235 0.008 60)
--code-fg       oklch(0.82 0.006 75)
--shadow        0 1px 2px oklch(0 0 0 / .3), 0 12px 40px oklch(0 0 0 / .35)
```
> Note: existing dark theme in `globals.css` is a warm gray tuned for the dashboard. The portfolio's dark canvas is a shade deeper/near-black. Since the portfolio is a separate route group, either (a) scope these overrides to `(site)` via a wrapper class, or (b) accept the dashboard/site sharing the same `.dark` — recommended: scope with a `.site-theme` wrapper on the `(site)/layout.tsx` root so the dashboard tokens are untouched.

### Typography (Google Fonts — add via `next/font/google`)
- **Space Grotesk** — display/headings. Weights 500/600/700. Tight tracking (`letter-spacing: -.02em` to `-.035em`).
- **Onest** — body / UI text. Weights 400/500/600/700.
- **JetBrains Mono** — technical labels, kickers, stats, terminal, badges. Weights 400/500/600.

Replace the current Inter/Geist-Mono setup **for the (site) group only** (keep them for the dashboard if desired). Add to `layout.tsx`:
```ts
import { Space_Grotesk, Onest, JetBrains_Mono } from 'next/font/google'
```
Expose as `--font-display`, `--font-sans`, `--font-mono`.

**Type scale used:**
- H1 hero: Space Grotesk 700, `clamp(40px,5.4vw,64px)`, line-height 1.02, tracking -.035em, `text-wrap: balance`
- H1 sub-pages: `clamp(38px,5vw,56px)`
- H2 section: Space Grotesk 700, `clamp(28px,3.4vw,38px)`, tracking -.03em
- H3 card title: Space Grotesk 600, 18–22px, tracking -.02em
- Body large: Onest 400, 18–19px, line-height 1.55, `text-wrap: pretty`
- Body: Onest 400, 14–16px, line-height 1.5–1.6
- Kicker/label: JetBrains Mono, 11px, `letter-spacing: .14em`, `text-transform: uppercase`, color `--accent`
- Stat number: Space Grotesk 700, 30–34px, tracking -.03em

### Spacing & radii
- Content max-width: **1120px** (article/case-study: **820px**), horizontal padding 24px.
- Section vertical rhythm: ~80–96px between major sections.
- Radii: cards **16–20px**, buttons **11–12px**, pills/badges **999px**, big CTA panel **24–26px**, small mono chips **6–8px**.
- Card padding: 24–30px. Button height: 44–50px, padding 0 22–26px.

---

## Screens / Views

### Shared chrome — Nav (`site-nav.tsx`)
- Sticky top, `z-50`, height 64px. Background `color-mix(in oklch, var(--bg) 82%, transparent)` + `backdrop-filter: blur(14px)`, bottom border `--border`.
- Left: name "Brandon Soria" (Space Grotesk 700, 16px) + mono sublabel `full-stack · AI` (JetBrains Mono 11.5px, `--muted`).
- Right: text links Work / Services / About (14px, `--muted`, active link uses `--accent` + weight 600) → **theme toggle button** (36×36, bordered, shows `☾`/`☀` glyph) → **"Book a call"** solid button using `--fg` bg / `--bg` text (inverse), radius 9px.
- Keep the existing mobile hamburger behavior from `site-nav.tsx`.

### Shared chrome — Footer (`site-footer.tsx`)
- Top border. Row: left = name (Space Grotesk 600) + tagline (`--muted` 13.5px); right = Work / Services / About / Upwork / email links (13.5px `--muted`). Bottom sub-bar centered: JetBrains Mono 11.5px `© 2026 Brandon Soria · Built with Next.js`.

### Home (`page.tsx`)
1. **Hero** — two columns (`1.05fr .95fr`, gap 56px, 88px top padding), collapses to one column on mobile.
   - Left: availability pill (bordered, pulsing `--live` dot 7px, `pulseDot` animation) → H1 with the phrase **"days, not months."** colored `--accent` → subhead (`--muted`, max-width 32ch) → two buttons: primary "See live demos" (accent bg, arrow icon) + secondary "Book a call" (card bg, strong border).
   - Right: **animated deploy-log terminal** — a card with mac traffic-light dots, a mono title `spec → shipped`, and a live status pill (`building` → `live`, `--live`). Body is a mono panel (`--code-bg`) that types out these lines one per ~850ms, then holds ~2.6s and loops:
     ```
     $  claude ship --spec acme-brief.md          (prefix accent)
     →  scaffolding Next.js · TypeScript · Tailwind
     →  wiring auth · Stripe · Postgres
     →  building core feature + admin panel
     ✓  deployed to production  ·  42h 18m         (green --live)
     ```
     Blinking accent cursor block at the end (`blink` 1.05s step-end). This is the hero's "live proof" element — implement as a small client component (`'use client'`, `useState`/`useEffect` interval). Respect `prefers-reduced-motion` (show the full log statically).
2. **Stats** — 3 equal cards (`5 days`, `Fixed`, `48h` where 48h number is `--accent`). Number = Space Grotesk 700 34px; label = 14px `--muted`.
3. **Stack strip** — full-bleed band (`--bg-2`, top+bottom border). Mono uppercase kicker "Built with a modern, production stack", then an **infinite horizontal marquee** of the 11 stack items (duplicate the array, `marquee` keyframe translateX(-50%), 26s linear infinite, edge mask gradient). Pause on `prefers-reduced-motion`.
4. **Featured work** — header row (kicker + H2 "Real builds, not screenshots." + "View all →" underlined accent link) then 3 `ProjectCard`s.
5. **How I work** — `--bg-2` band. Centered kicker+H2+sub. 3 cards, each: accent-soft icon chip (lucide `FileText`, a custom "spark/graph" for demo, `Check`), mono step number top-right, title, body.
6. **Testimonials** — 2 cards, each with a big accent `"` glyph, quote (Space Grotesk-adjacent 19px), and figcaption with a round accent-soft initial avatar.
7. **Final CTA** — full inverted panel: `background: var(--fg)`, `color: var(--bg)`, radius 26px, a subtle radial `--accent-soft` glow overlay at top. H2 "Have a project with a clear scope?", sub, two buttons (accent solid + outlined-on-dark "Hire me on Upwork"), then 3 guarantee items with green check icons.

### Work index (`work/page.tsx` + `ProjectCard`)
- Header: kicker "Selected work" + H1 "Every project is a real, running build." + subhead.
- 2-col grid (gap 20px) of enhanced `ProjectCard`s. **New ProjectCard** = vertical card, radius 20px, `--shadow`:
  - Top: **16:9 preview slot** with a diagonal repeating-stripe placeholder (`repeating-linear-gradient(135deg, --bg-2 12px, --code-bg 12px→24px)`), a mono "demo preview" chip bottom-left, a status pill top-left ("demo soon"), and a **time-to-build badge top-right** (accent bg, e.g. "4 days").
  - Body: mono niche label (`--accent`), H3 title (Space Grotesk 600 22px), tagline (`--muted`), stack chips (mono 11px, `--bg-2` bg), and a "Read case study →" row with accent arrow-up-right icon.
- Use real data from `projects.ts` (`timeToBuild`, `niche`, `title`, `tagline`, `stack`, `demoStatus`).

### Case study (`work/[slug]/page.tsx`)
- 820px column. "← All work" back link.
- Header: accent time-to-build badge + mono niche → H1 (`clamp(34px,4.6vw,50px)`) → tagline (`--muted` 19px).
- **Demo slot**: 16:9 bordered panel, stripe placeholder, centered play-icon chip + mono "demo · loom walkthrough slot", "Interactive demo coming soon" pill bottom-left. When `demoStatus === 'live'`, replace with an actual embed / "Open live demo" button using `demoUrl`/`loomUrl`.
- Body sections (gap 44px), each led by a mono uppercase accent label: **The client**, **The problem**, **What I built** (check-list, green `--live` checks), **The outcome** (in a highlighted card, `--live` label, big Space Grotesk 500 22px statement), **Stack** (mono chips).
- Bottom CTA = same inverted panel as Home's final CTA (smaller).

### Services (`services/page.tsx`)
- Header: kicker + H1 "Fixed price. Fixed timeline. No surprises." + subhead.
- 2-col grid of service cards (radius 20px, `--shadow`): title (Space Grotesk 600 21px) + timeline (mono, right) → **price** (Space Grotesk 700 30px, `--accent`) → summary → check-list of includes (green checks) → footer row (top border): "Start this" accent button (flex-1) + "See example" outlined button (only if `service.work` exists → links to that case study).
- Bottom band (`--bg-2`): "Something else in mind?" + inverse "Email me the scope" button.

### About (`about/page.tsx`)
- 820px column. Header row: rounded accent-soft "BS" monogram (64px) + kicker "About" + H1 "Brandon Soria".
- Two intro paragraphs (first 20px full-color with the niches bolded, second 18px `--muted`).
- "How I operate" mono label → **2-col grid of principle cards** (bordered, radius 14px, green check + text) from the `principles` array.
- Two buttons: accent "Book a call" + outlined "Hire me on Upwork".

---

## Interactions & Behavior
- **Theme toggle**: default **dark**. Persist choice to `localStorage` — in the repo use `next-themes` (`useTheme`, `setTheme`), not a manual `data-theme` attribute (the prototype uses `data-theme` only because it can't use next-themes). Toggle glyph `☾` (dark) / `☀` (light).
- **Hero terminal**: interval-driven line reveal, loop with a pause on the final line; status pill flips `building`→`live`. Gate behind `prefers-reduced-motion`.
- **Stack marquee**: CSS keyframe `marquee`, 26s linear infinite; static on reduced-motion.
- **Entrance**: hero + page headers fade/rise in (`riseIn`, translateY 14px→0, opacity, ~0.6–0.7s ease, slight stagger). Keep subtle; no scroll-jacking.
- **Hover states** (add these — prototype shows the resting state):
  - Cards: lift `translateY(-2px)`, border → `--border-strong`, slightly stronger shadow, ~150ms.
  - Primary buttons: brightness/opacity ~0.92 on hover.
  - Nav links: `--muted` → `--fg`.
  - ProjectCard arrow: nudges up-right on hover.
- **Focus states**: visible ring using `--ring` / accent — required for a11y. Buttons and links keyboard-navigable.
- **Responsive**: hero 2-col → 1-col under ~900px; all 2–3-col grids → 1-col on mobile; nav collapses to the existing hamburger. No horizontal scroll, no layout shift.

## State Management
- Theme: `next-themes` (already installed). No new global state.
- Hero terminal: local component state (current step index) + `useEffect` interval; clean up on unmount.
- Everything else is static, server-rendered from `src/content/*`.

## Assets
- **Fonts**: Space Grotesk, Onest, JetBrains Mono — via `next/font/google` (no files to copy).
- **Icons**: lucide-react (already installed) — `ArrowRight`, `ArrowUpRight`, `ArrowLeft`, `Check`, `Play`, `FileText`, `Rocket`/spark, `ShieldCheck`, `Clock`, `ExternalLink`. The prototype inlines equivalent stroke SVGs; use the lucide components in the repo.
- **Preview/demo slots**: currently diagonal-stripe placeholders. Replace with real screenshots / Loom embeds / GIFs when available (`Project.demoUrl`, `Project.loomUrl` fields already exist).
- No raster images required for the base restyle.

## Files (design references in this bundle)
- `Home.dc.html`
- `Work.dc.html`
- `Case Study.dc.html`
- `Services.dc.html`
- `About.dc.html`

Open any of them in a browser to see the intended result (toggle dark/light with the ☾/☀ button in the nav). All five share one token + type system — implement the shared nav/footer/tokens once, then each page.

## Verification (from the brief)
`/`, `/work`, `/work/[slug]`, `/services`, `/about` in **both themes**, mobile + desktop. `/dashboard` must still redirect to `/login`. `npx tsc --noEmit` clean, `npm run build` passes.
