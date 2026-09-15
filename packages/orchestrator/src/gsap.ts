import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The single registration point. Everything — orchestrator internals and
 * variants alike — imports gsap and ScrollTrigger from here, never from `gsap`
 * directly.
 *
 * Why this module exists, found by the adversarial harness on its first run:
 * React runs child effects before parent effects, so a section's `useEffect`
 * creates its ScrollTriggers *before* the page shell's effect can register the
 * plugin. GSAP then warns "Please gsap.registerPlugin(ScrollTrigger)", the
 * trigger silently does nothing, and the next call throws and takes the render
 * tree with it. Registering inside `createOrchestrator` is too late by
 * construction.
 *
 * Importing through here also guarantees one GSAP instance across the
 * workspace. Two copies would mean the plugin registered on one and used on the
 * other, which fails the same way and is far harder to see.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // Set before any section can create a trigger. The iOS URL bar collapses on
  // scroll, which fires resize, which refreshes mid-scroll and reads as a jump.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };
