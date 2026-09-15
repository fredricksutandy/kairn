# Architecture

> Scope note for agents: this file is the config model and data layer only.
> Anything marked **DEFERRED** is documented for shape, not for building.
> Do not implement a deferred section unless `CLAUDE.md` says the phase is active.

## The core model

**The user is not editing a page. They are producing a JSON config.**

One registry of section components renders both the editor preview and the live site.

```
Section registry (code)
   ├──> Editor UI ──> draft_config ──[Publish]──> published_config ──> /[slug]
   └──> Live renderer ─────────────────────────────────────────────────┘
```

## Config shape

Two levels. Main data is filled once and flows into every section.

```json
{
  "schemaVersion": 1,
  "theme": {
    "palette": "sage",
    "fontDisplay": "cormorant",
    "fontBody": "jost",
    "fontScale": 1.0
  },
  "content": {
    "groomName": "...",
    "brideName": "...",
    "groomShort": "...",
    "brideShort": "...",
    "dateISO": "2026-12-28",
    "dateDisplay": "28 • 12 • 2026",
    "hashtag": "...",
    "photos": ["inv_abc/raw/01.jpg", "..."]
  },
  "sections": [
    { "slot": "cover",  "variant": "cover-editorial", "enabled": true, "overrides": {},
      "content": { "prefix": "THE WEDDING OF", "monogram": "A&A", "ctaLabel": "Buka Undangan" } },
    { "slot": "couple", "variant": "couple-offset",   "enabled": true, "overrides": {}, "content": {} },
    { "slot": "event",  "variant": "event-cards",     "enabled": true, "overrides": {}, "content": {} }
  ]
}
```

`dateDisplay` is a free string — couples style their own separator. Never auto-format it.
`dateISO` is the machine value, used for countdown and calendar links.

## Section registry

**Never store HTML in the database.** Sections are real components in code, grouped by slot.

```
/packages/sections
  /cover     cover-editorial.tsx, cover-frame.tsx
  /couple    couple-offset.tsx, couple-stacked.tsx
  /event     event-cards.tsx, event-labeled.tsx
  manifest.ts
```

Manifest entry per variant:

```ts
{
  id: 'cover-editorial',
  slot: 'cover',
  name: 'Editorial',
  thumbnail: '/thumbs/cover-editorial.webp',
  tier: 'free' | 'premium',
  status: 'active' | 'deprecated',
  crops: { hero: '9:16' },
  animation: {
    pins: false,
    weight: 'light' | 'heavy',
    bleed: null | 'top' | 'bottom',
    usesOrchestrator: true,
    reducedMotionFallback: 'static'
  }
}
```

Payoff: git history, fix once and every client gets it, no XSS surface, tiny DB rows.

**DEFERRED — Phase 6.** Mirroring the manifest into a `section_variants` table so
tier gating and deprecation can change without a deploy. The manifest in code is
the source of truth until then.

## Slot taxonomy

> **See `07-component-spec.md` for the authoritative MVP slot list and field schemas.**
> MVP is three slots: `cover`, `couple`, `event`. Build those and nothing else.

Canonical narrative order, to be confirmed as slots are added:

```
cover → opening → couple → event → story → gallery → rsvp → gift → closing
```

Rules:
- Slots have a fixed canonical order; reordering is constrained, not free.
- **Uniform content schema per slot.** Every variant in a slot consumes the same fields.
- A variant needing something extra puts it in `overrides` as optional presentational config with a default — never a required content field.
- If a slot genuinely can't be uniform, **split it into two slots** rather than allowing per-variant schemas.

## Editor model

**DEFERRED until the Android gate passes.** Documented here so the config shape
accounts for it. Build the ugly local-state playground first.

- Three columns: slot list (20%), iframe preview in a phone bezel (60%), content panel (20%).
- Left column has two tabs: **Sections** (what's in this invitation) and **Library** (grouped by slot; adding enables a slot, position comes from canonical order).
- The right panel shows the **union of all fields for the selected slot**, never one variant's subset. Selecting a section switches the panel; swapping a variant leaves it untouched.
- Reorder is an array move. `dnd-kit` sortable on desktop; up/down chevrons on mobile.
- `postMessage` the config on change, debounced ~300ms.
- **Full iframe remount on variant change.** Don't hot-swap animations — remount is simpler and always correct. Scroll to the changed section after remount.
- Composition validation from the manifest: invalid combinations grey out in the picker with a stated reason.
- The 20/60/20 grid breaks below ~900px. Mobile becomes a tabbed single column — Sections / Preview / Content. Decide before building, not during.

## Theme layer

Sections may only reference CSS custom properties:

```css
--c-bg  --c-surface  --c-accent  --c-text  --c-muted
--font-display  --font-body  --font-scale
```

Zero hardcoded colours or fonts in any variant. This single discipline is what makes
theme customization free. Enforce with a lint rule in CI.

Ship curated palettes first. Arbitrary colour picking produces bad output.

**Decoration layer.** Florals and ornaments that cross section seams are page-level
absolutely-positioned layers keyed to the theme — never part of a section, because
the section below might not exist. Build this layer from day one; retrofitting it
means auditing every variant.

## Images — store originals, derive crops

**Storage and delivery is Cloudflare R2.** Not Supabase Storage. Egress is the only
meter that grows with client count, and R2 charges none.

**Decision: non-destructive.** Store the uploaded original plus crop metadata; derive
rendered variants on demand and cache.

```json
"heroImage": {
  "path": "inv_abc/raw/couple-01.jpg",
  "focal": { "x": 0.52, "y": 0.34 },
  "crops": { "4:5": {...}, "16:9": {...} }
}
```

Rationale:
- Variant switching is the core product promise. Destructive crops would force re-uploads on every switch.
- Couples upload once, on a phone, over mobile data. There's one good shot at getting the files.
- `sharp` derivation is already solved work. Cache by content hash of `path + ratio + crop`.

**Default interaction is a single focal point** — tap the faces, derive every ratio
automatically. Per-ratio manual adjustment is an escape hatch, not the primary flow.

Variants in the same slot may declare different crop ratios. That is intentional —
the focal point derives all of them, so swapping never triggers a re-upload.

Every image needs `aspect-ratio` set from the manifest crop ratio so the box exists
before the file arrives. See `03-animation-contract.md` — unreserved images are the
top cause of desynced triggers.

## Draft and publish

```sql
invitations (
  id, user_id, slug,
  brand_id uuid null,          -- reseller / white-label. Nullable, unused for now.
  draft_config jsonb,
  published_config jsonb,
  schema_version int,
  tier text,
  published_at timestamptz,
  expires_at timestamptz,
  status text
)
```

`brand_id` is nullable and unused in MVP. It exists now because adding it later
means a migration across live invitations.

- Autosave writes `draft_config`.
- Publish copies draft → published, bumps version, stamps `published_at`.
- `/[slug]` server-renders from `published_config`.
- **Publishing is a DB write, not a deploy.** No per-client build, no build minutes.
- Server-render for OG tags. WhatsApp sharing is the distribution channel.
- Cache with ISR + **on-demand revalidation on publish**, never time-based. A couple hitting Publish and seeing no change for 60 seconds is a support ticket every time.

### Slug rules

Once 300 guests have the link it is permanently immutable. Decide before building:
- Changeable before first publish only.
- Keep redirects if ever changed.
- Reserve system words now: `app`, `api`, `admin`, `preview`, `www`, `static`, `assets`.

Path-based, never subdomain-per-couple. `inv.<DOMAIN>/andi-rina`.

### Guest name on the cover

The config is shared; the guest token is per-recipient.

```
inv.<DOMAIN>/<slug>?to=<token>
```

Resolved server-side, rendered into the cover slot. Falls back to
*Bapak/Ibu/Saudara/i* when absent. The cover cannot be built without this decided.

## Schema versioning

- `schemaVersion` lives in every config.
- **Never mutate a shipped variant.** Add a new one; mark the old `deprecated` — hidden from the picker, still renders.
- A live invitation must never change under a couple who already sent links.

## Other tables

```sql
orders (id, user_id, invitation_id, package, amount, status, gateway_ref)
invitation_assets (id, invitation_id, storage_path, role, focal, crops)

-- DEFERRED, Phase 5:
guests (id, invitation_id, name, token, is_test, ...)
rsvps (id, invitation_id, guest_id, attending, headcount)
```

`orders` exists from day one even though payment is collected manually by transfer —
rows are inserted by hand. The gateway is only bolt-on if this row already exists.

Guest and RSVP data is scoped per invitation. Two weddings must be able to run the
same weekend without their data touching.

## Payments — DEFERRED, Phase 4

Do not build any of this. Recorded so the schema above doesn't have to change later.

- Midtrans Snap or Xendit. QRIS, VA, e-wallet.
- The webhook is the source of truth, never the browser redirect.
- Verify signature. Use order ID as idempotency key. Expect duplicate deliveries.

**Not deferred:** tier is enforced **server-side at render time**, because the config
is public JSON. That holds from the first published invitation, whether the tier was
set by a webhook or by hand.

## Deployment

Two Vercel projects from one monorepo, plus a separate static landing site.

| Project | Root | Domain | Cadence |
|---|---|---|---|
| builder | `apps/app` | `app.<DOMAIN>` | constantly |
| renderer | `apps/inv` | `inv.<DOMAIN>` | rarely, never Fri/Sat |

Each needs an Ignored Build Step, or a builder commit redeploys the live renderer
and the blast-radius separation is decorative:

```bash
git diff --quiet HEAD^ HEAD -- ./apps/inv ./packages/sections ./packages/orchestrator
```

Preview deployments of the renderer must be `noindex`.
