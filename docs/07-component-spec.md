# Component Spec — MVP

Six components, three slots. Derived from real invitation references.
Enough to prove the contract and demo the swap.

---

## Scope

```
cover   → cover-editorial, cover-frame
couple  → couple-offset,   couple-stacked
event   → event-cards,     event-labeled
```

Deferred to later variants: envelope cover (custom artwork + open animation),
arch cover (typography-dominant), polaroid gallery.

Deferred slots: opening, story, gallery, rsvp, gift, closing.

---

## Data model

Two levels. Main data is filled once and flows everywhere.

```ts
config.content = {
  groomName, brideName,
  groomShort, brideShort,        // "Anin", "Ariq"
  dateISO,                        // machine — countdown, calendar
  dateDisplay,                    // free string — "28 • 12 • 2024"
  hashtag,
  photos: string[],               // storage paths
}
```

`dateDisplay` is a free string. Couples style their own separator. Never auto-format it.

---

## Slot: cover

Only slot with no ScrollTriggers. It is on screen at load, so its motion is an
**entrance timeline on mount**, not scroll-driven.

### Fields

```ts
{
  guestName,      // resolved server-side from ?to=<token>, falls back to
                  // "Bapak/Ibu/Saudara/i"
  prefix,         // "THE WEDDING OF"
  monogram,       // optional — "A&A" mark or calligraphy upload
  venueShort,     // optional
  ctaLabel,       // "Buka Undangan" / "Klik untuk melihat detail"
}
```

Both variants consume the same fields and render `ctaLabel` differently — one as a
button, one as a chevron with a caption. Same field, different treatment.
That is the pattern.

### Gate ownership

| Owner | Job |
|---|---|
| Page shell | scroll lock, `document.fonts.ready`, above-fold decode, audio start, `refresh()` once, unlock |
| Cover variant | layout only. Renders the CTA, fires one callback |

Never let a cover variant reimplement the boot sequence. They will drift.

### Variants

| | `cover-editorial` | `cover-frame` |
|---|---|---|
| Photo | full-bleed, no border | full-bleed, ornamental border inset |
| Text | bottom-anchored | centred |
| Monogram | top-right | above names |
| CTA | chevron + small caption | labelled button |
| Crop | `hero: 9:16` | `hero: 9:16` |

Contrast is bottom-anchored-and-bare vs centred-and-framed. Visibly different
invitation from the same photo.

---

## Slot: couple

### Fields

```ts
{
  heading,        // optional — "the couple"
  groom: { photo, fatherName, motherName, descriptor, instagram? },
  bride: { photo, fatherName, motherName, descriptor, instagram? },
}
```

`descriptor` — "The Son of" / "Putra Pertama dari". Free string, not an enum.
The reference set uses both English and Indonesian phrasings.

`instagram` optional → variant hides the button when empty.

### Variants

| | `couple-offset` | `couple-stacked` |
|---|---|---|
| Layout | asymmetric, photo beside name | vertical, centred, name under photo |
| Joiner | oversized `&` behind photos | "and" between blocks |
| Crop | `portrait: 1:1` | `portrait: 3:4` |

Different crop ratios per variant is correct and intentional. The focal point
derives both. No re-upload on swap.

---

## Slot: event

Repeater. Handles akad + resepsi as **one invitation**, not two.
Every variant must lay out gracefully for 1–3 events.

### Fields

```ts
{
  heading,        // optional — "the celebration" / "SAVE the DATE"
  events: [{
    label,        // "Holy Matrimony" / "Akad" / "Reception"
    dateDisplay,
    startTime,
    endTime,      // optional
    venueName,
    address,
    mapsUrl,
  }],
  dresscode,      // optional
  note,           // optional — "*) Dihadiri Keluarga Inti"
}
```

### Variants

| | `event-cards` | `event-labeled` |
|---|---|---|
| Structure | one card per event | label-overlay rows |
| Date | per event | shared across events |
| Dividers | card edges | hairline rules |
| CTA | button per card | one button |
| Crop | none | none |

---

## Manifest

All six are the safest possible first set: no pins, no bleed, light weight.

```ts
const BASE = {
  pins: false,
  weight: 'light',
  bleed: null,
  usesOrchestrator: true,
  reducedMotionFallback: 'static',
}

export const manifest = [
  { id:'cover-editorial', slot:'cover',  name:'Editorial', tier:'free',
    crops:{ hero:'9:16' },
    animation:{ ...BASE, usesOrchestrator:false } },

  { id:'cover-frame',     slot:'cover',  name:'Framed',    tier:'free',
    crops:{ hero:'9:16' },
    animation:{ ...BASE, usesOrchestrator:false } },

  { id:'couple-offset',   slot:'couple', name:'Offset',    tier:'free',
    crops:{ portrait:'1:1' }, animation: BASE },

  { id:'couple-stacked',  slot:'couple', name:'Stacked',   tier:'free',
    crops:{ portrait:'3:4' }, animation: BASE },

  { id:'event-cards',     slot:'event',  name:'Cards',     tier:'free',
    crops:{}, animation: BASE },

  { id:'event-labeled',   slot:'event',  name:'Labeled',   tier:'free',
    crops:{}, animation: BASE },
]
```

`usesOrchestrator: false` on cover only. It opts out of reveal batching because it
runs an entrance timeline instead.

---

## Motion — v1

Fade-up only, orchestrator-owned.

```html
<div data-reveal="fade-up" data-reveal-delay="0.1">
```

Variants own zero motion in v1. Simplest possible proof of the contract.

**Known cost:** the swap demo is weaker — layout changes, motion does not.
Add one signature timeline per slot in v2, once the contract is proven.

---

## Theme layer, not sections

Several references have florals bleeding past section edges. Those are
**page-level absolutely-positioned layers keyed to the theme**, never part of a
section — the section below might not exist.

Build the theme decoration layer from day one. Retrofitting it means auditing
every variant.

---

## Builder panel rule

The right panel shows the **union of all fields for the selected slot**, not the
current variant's subset.

```
select a SECTION  → panel switches to that slot's fields
swap  a VARIANT   → panel unchanged, canvas re-renders
```

If the panel flickered on variant swap, the user would think data was lost.

Consequence: every optional field needs a designed empty state. A variant that
breaks on an empty field means that field is required, which means the slot must
be split — never add a required field to a shipped slot.

---

## Growth path

| Next | Slot | Notes |
|---|---|---|
| `cover-arch` | cover | typography-dominant — fills the gap both current covers share |
| `cover-envelope` | cover | custom artwork, open animation, uses `photos[0,1]` |
| `gallery-grid` | gallery | light, no pins |
| `gallery-polaroid` | gallery | `pins:true, weight:'heavy'` — first variant to use the scarce resource |

`photos` is an array in main data specifically so the envelope variant lands later
without a schema change.
