# Phase 3 — the adversarial harness

Build order step 3. A permanent fixture, run in CI forever.

```bash
pnpm --filter @kairn/inv build && pnpm run test:harness
```

Three fake sections, each engineered to be pathological, composed every way and
asserted to survive. When a real variant later breaks, these tell you it is the
variant and not the system.

| Section | What makes it hostile |
|---|---|
| `pinner` | Pins for 200vh. Pinning changes total page height, which shifts the computed start and end of every trigger below it. |
| `bleeder` | A decoration overflowing its own bottom edge by 120px, across the section seam. |
| `hog` | 300vh tall, forty children on a scrubbed timeline, a parallax layer, `weight: 'heavy'`. |

They are held to the same lint rules as a real variant — `packages/sections` and
`apps/inv/app/harness` share a config block — so the harness is also a fair
model of the code it is adversarial about.

## The load-bearing assertion

Every `[data-reveal]` on the page must end visible, and the **tail reveal** —
the last element, below every pathological section — must reach opacity 1.

If the single `refresh()` lands at the wrong moment, a 200vh pin leaves every
trigger below it measured against the pre-pin page height, and elements below
the pin never reveal. That failure is invisible in code review and unmissable
here.

The harness scrolls with real wheel events rather than `window.scrollTo`, since
Lenis smooths wheel input and driving scroll position directly would bypass the
thing under test. It runs at a Pixel 5 viewport: the performance target is a
mid-range Android, not a laptop.

## What it caught

Two real orchestrator defects, neither visible to lint, typecheck or the unit
tests. Both needed a browser.

**GSAP plugin registration was ordered wrong, by construction.** React runs
child effects before parent effects, so a section's `useEffect` created its
ScrollTriggers *before* the page shell's effect could call
`gsap.registerPlugin(ScrollTrigger)`. GSAP warned, the trigger silently did
nothing, and the next call threw and took the render tree with it:

```
[console:warning] Please gsap.registerPlugin(ScrollTrigger)
[pageerror]       nH is not a function
```

Registering inside `createOrchestrator` could never have worked. The fix is
`packages/orchestrator/src/gsap.ts`: one registration point at module scope,
ordering guaranteed by the import graph, and everything — orchestrator internals
and variants alike — imports GSAP from there rather than from `gsap` directly.
That also guarantees a single GSAP instance across the workspace; two copies
fail the same way and are much harder to see.

This is exactly the class of bug the harness exists for. It would have surfaced
at step 5 as "the cover variant is broken", and the hunt would have started in
the wrong place.

**The last screenful never revealed.** Every composition left exactly one
element hidden — the tail, the last thing on the page. An element inside the
final screenful can never reach `top 85%`, because the page runs out of scroll
before it gets there, so it stays invisible permanently.

On a real invitation that element is the closing section: the last line a guest
is meant to read. `reveal.ts` now creates one safety trigger at `bottom bottom`
that reveals anything still hidden when the page bottom meets the viewport
bottom, and `reveal()` is idempotent so the batch and the net can both reach an
element without double-tweening.

## What it settled about bleeding

A section-owned decoration **cannot** stay on top across the seam.
`isolation: isolate` scopes its z-index to its own section's stacking context,
so any later sibling paints over it no matter what z-index it sets. Nothing
clips it — the geometry is intact — it is simply covered.

That is the concrete reason seam-crossing decorations belong to the theme
layer rather than to a variant. Two tests hold the line: one asserts the
overhang exists and no ancestor clips it, the other asserts a following section
*does* cover it. The second will fail if anyone later tries to defeat this with
z-index, which is the point of keeping it.

A note for whoever writes that check next: `getBoundingClientRect` reports the
full box even when an ancestor clips it, so measuring the overhang proves
nothing about clipping. Walk the ancestors for non-visible overflow instead.

## Known gap in the lint guard

`tools/lint-css` flags containing-block properties on a section root by matching
the **selector text** for `.section-root`. A variant that styles its root
through its own class instead —

```css
.cover-editorial { transform: translateY(0); }   /* not flagged */
```

— escapes the check, because nothing static connects that class to the element
carrying `section-root`. Closing it properly means resolving JSX class names
against CSS, which is a great deal of machinery for one rule.

The harness covers it behaviourally instead: a containing block on a section
root breaks `position: fixed`, so the pin test fails. Keep that test.

## Running it

Eleven tests, ~40s, green. It needs a fresh build served by a fresh server:

```bash
pnpm --filter @kairn/inv build && pnpm run test:harness
```

`reuseExistingServer` is off deliberately. A server left over from an earlier
build serves a stale chunk manifest — every chunk 500s, hydration dies silently,
and the whole thing presents as "the gate never enables", which sends you
looking in entirely the wrong place.

The favicon and apple-touch-icon probes 404 because the renderer ships no icon
yet; the console assertion ignores those two paths and nothing else. Give the
renderer an icon and the exception can go.

## Also settled here

Relative imports inside `packages/orchestrator/src` carry an explicit `.ts`
extension. Node's type stripping requires it to run the unit tests directly, and
the bundler resolves it fine because the files really are `.ts` on disk — unlike
the `.js` convention, which Turbopack rejected in phase 1.
