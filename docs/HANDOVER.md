# Handover — cloud session → local

State as of the last cloud session. Branch `claude/great-thompson-5wj305`,
everything pushed, working tree clean.

```bash
git fetch origin claude/great-thompson-5wj305
git checkout claude/great-thompson-5wj305
pnpm install
```

---

## Where the build order actually stands

```
1. repo + CI + lint rule          done
2. orchestrator                   done
3. adversarial harness            done — 11/11, twice
4. manifest + registry            ← you are here
5. 6 components
6. dev playground
7. GATE — real Android            needs your hardware. Cloud cannot do this.
8. real builder UI
9. Supabase
```

Verify the inherited state before building on it:

```bash
pnpm lint && pnpm typecheck && pnpm test          # 50 tests, ~15s
pnpm --filter @kairn/inv build && pnpm test:harness   # 11 tests, ~40s
```

The harness **must** build first and run against a fresh server. If you skip the
build you are testing stale chunks.

---

## Build next: step 4, manifest + registry

Read `docs/02-architecture.md` §Section registry and
`docs/03-animation-contract.md` §Composition validation first. Both are short
and this step is entirely specified by them.

### What exists already

`packages/sections/src/manifest.ts` has the `VariantManifest` type, including
`status: 'active' | 'deprecated'` — the mechanism behind non-negotiable #7.
The array is deliberately empty; entries arrive with their components at step 5.

### What to build

**1. The registry.** Variant id → component. One registry renders both the
builder preview and the live site; that is the whole architecture, so it cannot
be two lookups that drift.

**2. The composition validator.** Pure functions over manifest data, no DOM:

| Rule | Why |
|---|---|
| Max 1 section with `pins: true` | Pin height changes desync every trigger below |
| Max 2 with `weight: 'heavy'` | Mobile frame budget |
| No `bleed: 'bottom'` directly above a `pins: true` section | The pin-spacer clips the bleed |

Invalid combinations grey out in the picker **with a stated reason** — so the
validator returns *why*, not just a boolean. The user never assembles something
broken.

**3. Tier gating is server-side at render.** The config is public JSON. This
holds from the first published invitation, whatever sets the tier.

### This is the superpowers moment

The validator is branching logic over plain data — no DOM, no rAF, no browser.
That is exactly what TDD suits, and it is the one part of this system the
harness cannot reach. Run superpowers locally here if you're going to run it
anywhere.

It is deliberately not vendored into the repo: it is an always-on methodology
and pairing two of those means one silently loses. See
`.claude/skills/README.md`.

---

## Keep in mind

Ordered by how expensive each is to rediscover.

### Things that will bite you silently

**Variants import GSAP from `@kairn/orchestrator`, never from `gsap`.** React
runs child effects before parent effects, so a section importing GSAP directly
creates its triggers before the plugin is registered — it warns, does nothing,
then throws and takes the render tree with it. `packages/orchestrator/src/gsap.ts`
is the single registration point. This cost a full debugging cycle in the cloud
session; do not re-derive it.

**Don't read plain data from a `'use client'` module in a server component.**
You get a client reference proxy, not the value — `id in OBJECT` silently
matches nothing and the route 404s with no error anywhere. See
`apps/inv/app/harness/ids.ts` for the pattern: shared data lives in its own
non-client module.

**Relative imports inside packages carry an explicit `.ts`.** Node's type
stripping needs it to run unit tests directly; the bundler resolves it fine.
`.js` does not work — Turbopack rejects it because the file isn't there.

**`getBoundingClientRect` reports the full box even when an ancestor clips it.**
Measuring an overhang proves nothing about clipping. Walk ancestors for
non-visible overflow instead.

### Architecture you cannot argue with

**A variant cannot own a decoration that crosses into the section below.**
`isolation: isolate` scopes its z-index to its own stacking context, so any
later sibling paints over it — no z-index defeats this. Cross-seam decoration is
the theme layer's job, because the section below might not exist. Two harness
tests hold this line from both sides; if one fails because someone reached for
z-index, the answer is no.

**Never add a required content field to a shipped slot.** If a variant breaks on
an empty field, that field is required, and the slot must be **split**. The
builder panel shows the union of all fields for a slot, so swapping stays
lossless in both directions — which means every optional field needs a designed
empty state.

**Never modify a shipped variant.** Add a new one, mark the old `deprecated`.
It stays hidden from the picker and keeps rendering. A live invitation must
never change under a couple who already sent 300 links.

### The lint guard's known hole

`tools/lint-css` matches `.section-root` in **selector text**. A variant styling
its root through its own class escapes it:

```css
.cover-editorial { transform: translateY(0); }   /* not flagged */
```

Closing it properly means resolving JSX class names against CSS — a lot of
machinery for one rule. The harness covers it behaviourally: a containing block
on a section root breaks `position: fixed`, so the pin test fails. **Keep that
test.**

### Working practice

**Never loosen a harness assertion to get it green.** Across four runs in the
cloud session every failure was either a real defect (2, both in the
orchestrator) or a defect in the test (3, all mine). Zero flakes. If it goes
red, something is actually wrong — the two orchestrator bugs it found were both
invisible to lint, typecheck and unit tests.

**`packages/sections` is off-limits to design agents.** Variants are
hand-designed from real invitation references; `code-simplifier` and
`impeccable` will normalise them into genericness. You need to bring the
references for step 5 — that step is not something a cloud session can source.

---

## Small open items

- **The renderer ships no favicon**, so the browser's `/favicon.ico` and
  `/apple-touch-icon.png` probes 404 on every page. The harness ignores those
  two paths specifically; add an icon and delete the exception.
- **`impeccable` lands at step 8**, not before. Its static scan refuses Next.js
  projects and exits 0 — a step that always passes is worse than no step. The
  verified build-start-scan recipe is in `docs/00-phase-1.md`, including the two
  things that cost an hour: it needs a real Chromium via `IMPECCABLE_BROWSER`,
  and it cannot run as root.
- **`packages/db` stays empty until step 9.** Until then the config is a
  hardcoded object and you are the editor.

## Do not

- Build the builder before step 7 passes. It is a gate, not a checkpoint — if a
  composition fails on the device, fix the orchestrator and do not proceed.
- Deploy to `inv.` on a Friday or Saturday.
- Reorder the build order.
