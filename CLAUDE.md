# CLAUDE.md

Read this before any work. It overrides your defaults.

---

## What this is

A web-based wedding invitation **template builder** for Indonesia. Couples pick
curated pre-designed sections. No canvas. No drag-and-drop.

Aesthetic family: **modern-minimal luxe**. One family, deep. Not many families, shallow.

Greenfield. Nothing carries over from any prior project.

---

## The 8 non-negotiables

1. Sections never hardcode a colour or font — CSS custom properties only
2. Triggers are element-relative, never absolute scroll position
3. One pinning section per invitation, enforced by the manifest
4. Uniform content schema per slot — variants differ in layout and motion, never in required fields
5. Publishing is a DB write, not a deploy
6. Tier enforced server-side at render
7. Never mutate a shipped variant — add new, deprecate old
8. Performance target is a mid-range Android, not a laptop

Breaking any of these is not a tradeoff. Stop and ask.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router, SSR |
| DB + Auth | Supabase Pro, one project, Singapore |
| Image storage + delivery | Cloudflare R2 |
| Animation | GSAP + ScrollTrigger, Lenis |
| Image processing | `sharp` |
| Hosting | Vercel, two projects |
| Errors | Sentry on the renderer |
| Payments | deferred — manual transfer until volume demands a gateway |

---

## Repo

```
kairn/                              pnpm monorepo
├─ packages/
│   ├─ sections/     variants + manifest.ts   ← the product
│   ├─ orchestrator/ Lenis, batched reveal, parallax, refresh
│   └─ db/           SQL migrations, RPCs, types
└─ apps/
    ├─ app/    app.<DOMAIN>    builder
    └─ inv/    inv.<DOMAIN>    renderer — must never break
```

Monorepo is mandatory: `sections` is consumed by both the builder preview and the
live renderer. That is the whole architecture.

Each Vercel project needs an Ignored Build Step, or a builder commit redeploys
the live renderer:

```bash
git diff --quiet HEAD^ HEAD -- ./apps/inv ./packages/sections ./packages/orchestrator
```

---

## Build order — do not reorder

```
1. repo + CI + lint rule
2. orchestrator
3. adversarial harness (pinner, bleeder, hog)
4. manifest + registry
5. 6 components
6. dev playground (ugly 3-panel, local state)
7. GATE — real Android, real device
8. real builder UI
9. Supabase
```

Currently at step 3. Step 1 is complete — see `docs/00-phase-1.md`. Step 2 is
complete: `packages/orchestrator` — the lifecycle is documented at the top of
its `src/index.ts`, and the adversarial harness is its first real consumer.

**Step 7 is a gate, not a checkpoint.** If any composition fails on the device,
stop and fix the orchestrator. Do not proceed to the builder.

No database until step 9. The config is a hardcoded object. You are the editor.

---

## Section rules

A variant may only reference its own root and its own children.

```css
.section-root { position: relative; isolation: isolate; }
```

Nothing else on the root. No `transform`, `filter`, or `will-change` — each creates
a containing block that breaks `position: fixed`, which is how ScrollTrigger pins.

**Orchestrator owns:** smooth scroll, reveal-on-enter via `ScrollTrigger.batch()`,
parallax via one batched ticker, `refresh()` timing, reduced motion, audio.

**Variant owns:** only its signature timeline.

Sections never call `refresh()`. One call, one place, after the cover gate opens.

Scope every GSAP context to the section root and revert on cleanup, or selectors
leak across sections and the editor preview accumulates animation sets on swap.

---

## Animation limits

- `transform` and `opacity` only inside scroll loops
- Never animate `filter`, `blur`, `box-shadow`, `background-position` — bake into the asset
- `will-change` applied in `onEnter`, stripped in `onLeave`
- Every image gets `aspect-ratio` from the manifest crop ratio
- `ScrollTrigger.config({ ignoreMobileResize: true })`
- `svh` not `vh`
- Only one `weight: 'heavy'` section active at a time

Every variant declares `pins`, `weight`, `bleed` honestly in the manifest.
Declared → the editor blocks bad combinations. Undeclared → the page desyncs silently.

Decorations that cross section seams belong to the **theme layer**, not the section.
The section below might not exist.

---

## Schema rules

Two levels:

```
config.content            main data — filled once, flows everywhere
config.sections[].content per-slot fields
```

The builder's right panel shows the **union of all fields for that slot**, never
one variant's subset. So the draft always holds the full set and swapping is
lossless in both directions.

Therefore every optional field needs a designed empty state. If a variant breaks
when a field is empty, that field is required, and the slot must be **split** —
never add a required field to a shipped slot.

---

## Tooling

| Tool | Scope | How |
|---|---|---|
| [`ponytail`](https://github.com/dietrichgebert/ponytail) | all code. The ladder runs before writing anything | Claude Code plugin. Agent-side only, no CI surface |
| [`impeccable`](https://github.com/pbakaus/impeccable) | `apps/app` and the landing page only | Claude Code plugin now; CI job at step 8 |

**Neither touches `packages/sections`.** Those are hand-designed from real
invitation references. A design agent will normalise them into genericness.

`ponytail` is vendored into `.claude/skills/`, so it loads in cloud sessions
too — a `/plugin install` only ever reaches the machine it ran on. **Load the
`ponytail` skill before writing code**, and treat its ladder as subordinate to
this file: the build order below is mandated, not speculative, so its first
rung never justifies skipping the orchestrator or the adversarial harness.
See `.claude/skills/README.md`.

`impeccable detect` refuses to scan a Next.js project statically and exits 0 —
it needs a running server URL. So its CI job must build, start, and scan the
URL, or it is a step that always passes. See `docs/00-phase-1.md`.

Do not install antislop or hallmark alongside impeccable. Overlapping rule sets fight.

---

## Never

- Store HTML in the database
- Serve images from Supabase Storage — R2 only
- Give a couple their own subdomain — path-based slugs
- Deploy to `inv.` on a Friday or Saturday
- Add a required content field to an existing slot
- Modify a shipped variant
- Build the builder before step 7 passes
- Reach for a library when the platform has it

---

## Reading order

```
01-product-brief.md            what and for whom
02-architecture.md             config model, registry, publish pipeline
03-animation-contract.md       hardest part — read before any section work
04-roadmap.md                  phases and exit criteria
05-decisions-and-open-questions.md
06-positioning.md              market, moat, pricing
07-component-spec.md           the 6 MVP components
```

Where 06 contradicts 01, 06 wins. It is later and market-grounded.
