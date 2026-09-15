/**
 * Build order step 2. Nothing here yet.
 *
 * The orchestrator owns smooth scroll (one Lenis instance), reveal-on-enter via
 * ScrollTrigger.batch() on [data-reveal], parallax via a single batched ticker
 * on [data-parallax], refresh() timing, prefers-reduced-motion, and audio.
 *
 * Variants own only their signature timeline. See docs/03-animation-contract.md
 * rule 2 — the split is what keeps the trigger count in the dozens instead of
 * the hundreds.
 */
export {};
