# Animation Contract
 
> The highest-risk part of this system. Read before writing any section variant.
> Indonesian digital invitations rely on scroll-driven motion for their impact — heavy ScrollTrigger use, abundant absolute positioning and transforms. The animation layer *is* the product.
 
## Rule 1 — Sections are position-independent
 
Every trigger must be element-relative, never viewport-absolute.
 
```js
// dies the moment a section above is toggled off
ScrollTrigger.create({ start: "1200px top", end: "2400px top" })
 
// survives any composition
ScrollTrigger.create({ trigger: rootEl, start: "top 80%", end: "+=120%" })
```
 
A variant may only reference its own root and its own children. The moment it knows its absolute position on the page, it stops being a template.
 
## Rule 2 — Split the ownership
 
Don't let every variant author its own scroll wiring. That ends in 200 ScrollTrigger instances with no way to reason about them.
 
**The page orchestrator owns:**
- Smooth scroll — one Lenis instance
- Reveal-on-enter via `ScrollTrigger.batch()` on `[data-reveal]`
- Parallax via a single batched ticker on `[data-parallax]`
- `ScrollTrigger.refresh()` timing
- `prefers-reduced-motion`
- Audio
**The variant owns:** only its signature timeline. The thing that makes it different from the other variants in its slot.
 
So ~80% of motion is declared as attributes, not code:
 
```html
<div data-reveal="fade-up" data-reveal-delay="0.1">
<img data-parallax="0.25">
```
 
Two payoffs: trigger count drops from hundreds to a dozen, and reveal timing stays consistent across variants authored at different times — which is what makes a mix-and-match invitation still read as one designed piece rather than a collage.
 
## Rule 3 — The cover gate is the measurement window
 
The *Buka Undangan* convention isn't just design — it solves the hardest technical problem. While the cover is up, the body is scroll-locked and nothing is measured yet. That's the window to load fonts, decode images, and mount everything. The tap is also the user gesture browsers require before audio can play.
 
**Boot sequence:**
 
1. Mount all sections — scroll locked, no triggers created
2. Assets settle — `document.fonts.ready` + above-fold image decode
3. Cover gate opens — guest taps
4. Unlock scroll, start audio
5. `ScrollTrigger.refresh()` — **once**
After boot, refresh only on debounced resize and orientation change.
 
**Sections must never call `refresh()` themselves.** One call, one place.
 
## Rule 4 — Containment
 
**Section roots are untouchable:**
 
```css
.section-root { position: relative; isolation: isolate; }
```
 
Nothing else. No `transform`, no `filter`, no `will-change` on the root — any of those create a containing block that breaks `position: fixed` inside, which is exactly how ScrollTrigger pins by default. Variants animate inner wrappers only.
 
`isolation: isolate` gives every section its own stacking context, so variants use `z-index: 1..99` freely with no global registry.
 
**Decorations that cross section seams belong to the theme, not the section.** A floral spilling from the cover into the couple section is a page-level absolutely-positioned layer keyed to the theme — because the section below it might not exist.
 
If a variant genuinely must bleed, it declares `bleed: 'bottom'` and the editor forbids placing a pinning section immediately after it (the pin-spacer would clip it).
 
## Rule 5 — Pinning is the scarce resource
 
`pin: true` changes total page height, which shifts the computed start/end of every trigger below it. One pinned cover can desync the entire page.
 
**Max one pinning section per invitation.** Declared in the manifest, enforced by the editor.
 
## Rule 6 — Scope every context
 
```js
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.to('.title', { ... })   // now scoped to this section only
  }, rootRef)
  return () => ctx.revert()
}, [])
```
 
Unscoped selectors leak across sections — `.title` in the cover will happily grab `.title` in the gallery. Without cleanup, the editor preview accumulates animation sets on every variant swap and gets progressively stranger.
 
## The four mobile killers
 
Target device is a mid-range Android, not a laptop.
 
**1. The iOS URL bar.** Scrolling collapses it → viewport height changes → `resize` fires → refresh mid-scroll → visible jump.
 
```js
ScrollTrigger.config({ ignoreMobileResize: true })
```
 
Use `svh` not `vh` for full-screen sections.
 
**2. Unreserved images.** Set `aspect-ratio` from the manifest crop ratio on every image. Layout shift after measurement desyncs every trigger below it — this alone causes most "the animation fires at the wrong time" bugs.
 
**3. Permanent `will-change`.** Twenty elements with `will-change: transform` is a GPU memory blowup and a hard crash on low-end devices. Apply in `onEnter`, strip in `onLeave`.
 
**4. Compositor-unfriendly properties.** `transform` and `opacity` only inside scroll loops. Never animate `filter`, `blur`, `box-shadow`, or `background-position`. If a variant needs a blur reveal, bake it into the image asset.
 
Also: only one `weight: 'heavy'` section active at a time. Use `onEnter`/`onLeave` to set a `data-active` attribute; canvas, particle, and video work runs only while active.
 
## Composition validation
 
The editor validates the assembled config against the manifest:
 
| Rule | Reason |
|---|---|
| Max 1 section with `pins: true` | Height changes desync everything below |
| Max 2 sections with `weight: 'heavy'` | Mobile frame budget |
| No `bleed: 'bottom'` directly above a `pins: true` section | Pin-spacer clips the bleed |
| Smooth scroll is page-level | Never a section-level decision |
 
Invalid combinations grey out in the picker with a stated reason. The user never assembles something broken.
 
## The adversarial test harness
 
Not placeholder sections — a permanent fixture. Three fake sections, each engineered to be pathological:
 
1. **Pinner** — pins for 200vh
2. **Bleeder** — decoration overflowing 120px past its bottom edge
3. **Hog** — 300vh tall, heavy timeline, forty animated children
Any composition of the three that survives means the orchestrator is sound. Keep them in the repo forever and run them in CI. When a real variant breaks, you'll know it's the variant, not the system.
 
**Bland dummy sections prove nothing.** A coloured box with a heading doesn't pin, doesn't bleed, doesn't run fifteen absolutely-positioned children. A builder that works with bland dummies has retired none of the risk it was built to retire — while feeling like it has.
 
## Testing strategy
 
Nine slots × three variants ≈ 20,000 possible pages. You cannot test that.
 
- Ship **curated presets as the default path** — five or six complete, hand-tuned invitations, QA'd on real devices. Free composition is the advanced mode behind them.
- Most couples want "the pretty one," not a design tool.
- Presets give you a known-good baseline to diff against when someone reports stutter.