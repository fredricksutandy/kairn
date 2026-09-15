# Phase 1 — repo, CI, lint rule

Build order step 1. Complete.

The interesting part of this phase is not the workspace scaffold. It is that
the 8 non-negotiables in `CLAUDE.md` and the rules in
`03-animation-contract.md` are now **mechanically enforced** for
`packages/sections` instead of being a memo.

That matters because of a gap in the tooling table: `ponytail` and `impeccable`
both explicitly skip `packages/sections`, since those files are hand-designed
from real invitation references and a design agent would normalise them into
genericness. So nothing reviews them automatically. CI is the only thing
standing between a variant and a hardcoded `#8B7355`.

---

## The rules

Scoped to `packages/sections`. Every one maps to a stated rule; none is a style
opinion. All are errors — there is no warn tier for a non-negotiable.

| Rule | Enforces | Why it fails silently otherwise |
|---|---|---|
| `no-hardcoded-color` | Non-negotiable #1 | Theme customization stops being free |
| `no-hardcoded-font` | Non-negotiable #1 | Same |
| `no-unknown-token` *(CSS only)* | Theme layer | `var(--c-acccent)` resolves to nothing, renders as unstyled |
| `no-absolute-trigger` | Non-negotiable #2 | `start: "1200px top"` works until a section above is toggled off |
| `no-scrolltrigger-refresh` | Contract rule 3 | A second `refresh()` re-measures mid-composition, desyncs everything below |
| `no-containing-block-on-root` | Contract rule 4 | `transform` on a root breaks `position: fixed`, which breaks pinning — and reads as an orchestrator bug |
| `no-vh-units` | Mobile killer #1 | iOS URL bar collapses, every full-height section resizes mid-scroll |
| `no-unanimatable-props` | Mobile killer #4 | Paint or layout every frame on a mid-range Android |

### Two linters, one guard

ESLint cannot parse CSS, and a section's colours, fonts and root rules live
almost entirely in its stylesheet. An ESLint-only setup would guard the smaller
half of the surface.

- `tools/eslint-plugin-kairn` — `.ts`/`.tsx`. Catches inline styles, GSAP call
  sites, and trigger configs.
- `tools/lint-css` — `.css`. A zero-dependency scanner; the checks are lexical
  and the platform already has what they need.

`packages/sections/src/tokens.css` is the one exemption from the literal rules.
It is the definition site, and the scanner exempts it by name.

### What is deliberately not enforced yet

**Contract rule 6** — scope every `gsap.context` to the section root and revert
on cleanup. It needs real control-flow analysis, and no section exists yet to
test a rule against. Add it at step 5, when there is something to lint.

**Composition validation** — max one `pins: true`, max two `weight: 'heavy'`,
no `bleed: 'bottom'` above a pin. These are manifest-level and run in the
editor, not the linter. Step 4.

---

## Proving the guard works

A lint setup can rot into a no-op — a bad glob, a config that never matches, a
plugin that fails to load — and every run stays green. So the guard is itself
under test:

```bash
pnpm test
```

- `tools/eslint-plugin-kairn/test/` — 41 rule fixtures, valid and invalid.
- `tools/lint-proof/` — runs real ESLint and the real scanner over a
  deliberately-broken section, and asserts **all seven rules fire**; then over
  the same section written correctly, and asserts it passes clean.

A linter that rejects everything is as useless as one that rejects nothing,
which is why the good fixture is as load-bearing as the bad one.

---

## Also in this phase

- **`tokens.css`** declares the eight theme custom properties from
  `02-architecture.md`. Values are placeholders; the names are the API.
- **`manifest.ts`** carries the `VariantManifest` type — including `status:
  'active' | 'deprecated'`, which is the mechanism behind non-negotiable #7.
  The array is empty until step 5.
- **Ignored Build Steps** in `scripts/`, so a builder commit never redeploys
  the live renderer.
- **`noindex` on renderer previews**, keyed off `VERCEL_ENV`.

## Open

`ponytail` and `impeccable` are named in the tooling table but are not wired
into CI, because it is not yet established what they are or where they come
from. Decide before step 5 — they cover `apps/app` and the landing page, which
step 8 builds.
