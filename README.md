# kairn

A web-based wedding invitation template builder for Indonesia. Couples pick
curated pre-designed sections. No canvas, no drag-and-drop.

**Read [`CLAUDE.md`](./CLAUDE.md) before any work.** It overrides defaults, and
the build order in it is not reorderable.

## Layout

```
packages/
  sections/      variants + manifest — the product
  orchestrator/  Lenis, batched reveal, parallax, refresh
  db/            SQL migrations, RPCs, types
apps/
  app/           app.<DOMAIN>  builder
  inv/           inv.<DOMAIN>  renderer — must never break
tools/
  eslint-plugin-kairn/  the architectural guard (TS/TSX)
  lint-css/             the architectural guard (stylesheets)
  lint-proof/           proves the guard still has teeth
```

The monorepo is mandatory: `sections` is consumed by both the builder preview
and the live renderer. That is the whole architecture.

## Commands

```bash
pnpm install
pnpm lint          # eslint + the stylesheet scanner
pnpm typecheck
pnpm test          # rule unit tests + the lint guard proof
pnpm build
```

## The lint guard

`packages/sections` is hand-designed from real invitation references and is the
one place no design agent normalises. CI is the only check those files get, so
the non-negotiables are enforced mechanically rather than by memo. See
[`docs/00-phase-1.md`](./docs/00-phase-1.md) for the rule list and rationale.

## Where this is

Build order step 2 of 9. Steps 1 (repo + CI + lint rule) is done; the
orchestrator is next. No database until step 9 — until then the config is a
hardcoded object.

**Step 7 is a gate, not a checkpoint.** If any composition fails on a real
mid-range Android, the orchestrator gets fixed before the builder gets built.
