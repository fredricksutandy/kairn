/**
 * The page orchestrator.
 *
 * Owns smooth scroll, reveal batching, parallax, refresh timing, reduced
 * motion and audio — everything that has to be decided once for the whole page.
 * Variants own only their signature timeline.
 *
 * The split is not tidiness. Letting each variant wire its own scroll leads to
 * hundreds of ScrollTriggers with no way to reason about them, and reveal
 * timing that drifts between variants authored months apart.
 *
 * Lifecycle, matching the boot sequence in docs/03-animation-contract.md:
 *
 *   createOrchestrator()  sections mounted, scroll locked, no triggers yet
 *   await assetsReady()   fonts loaded, above-fold images decoded
 *   ── guest taps the cover ──
 *   await open()          unlock, audio, create triggers, refresh once
 *   destroy()             revert everything
 *
 * The cover gate is what makes this safe: while it is up nothing is measured,
 * so fonts and images can settle without desyncing a trigger. The tap is also
 * the user gesture browsers demand before audio may play.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { startParallax } from './parallax';
import { revealStatic, startReveal } from './reveal';

export { parallaxOffset } from './parallax';

export interface OrchestratorOptions {
  /** The page element containing every section. */
  root: HTMLElement;
  /** Played on gate open. Autoplay refusal is not fatal. */
  audio?: HTMLAudioElement | null;
}

export interface Orchestrator {
  /** Resolves when fonts are ready and above-fold images have decoded. */
  assetsReady(): Promise<void>;
  /** Call from the cover's CTA. Safe to call twice; the second is a no-op. */
  open(): Promise<void>;
  destroy(): void;
}

const REFRESH_DEBOUNCE_MS = 200;

export function createOrchestrator({ root, audio }: OrchestratorOptions): Orchestrator {
  gsap.registerPlugin(ScrollTrigger);

  // The iOS URL bar collapses on scroll, which fires resize, which refreshes
  // mid-scroll and shows as a visible jump. Full-height sections use svh so
  // they do not need the resize either.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { documentElement, body } = document;
  const scrollLock = [documentElement.style.overflow, body.style.overflow];

  documentElement.style.overflow = 'hidden';
  body.style.overflow = 'hidden';

  let lenis: Lenis | null = null;
  let context: gsap.Context | null = null;
  let stopParallax: (() => void) | null = null;
  let driveLenis: ((time: number) => void) | null = null;
  let refreshTimer: number | undefined;
  let opened = false;

  const onResize = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), REFRESH_DEBOUNCE_MS);
  };

  async function assetsReady(): Promise<void> {
    // Unreserved images are the top cause of desynced triggers: the box has to
    // exist before measurement, and decoding here means it does.
    const aboveFold = [...root.querySelectorAll('img')].filter(
      (image) => image.getBoundingClientRect().top < window.innerHeight,
    );

    await Promise.all([
      document.fonts.ready,
      // A broken image must not hold the gate shut forever.
      ...aboveFold.map((image) => image.decode().catch(() => undefined)),
    ]);
  }

  async function open(): Promise<void> {
    if (opened) return;
    opened = true;

    documentElement.style.overflow = scrollLock[0]!;
    body.style.overflow = scrollLock[1]!;

    if (!reducedMotion) {
      lenis = new Lenis({ autoRaf: false });
      lenis.on('scroll', ScrollTrigger.update);
      // One ticker drives Lenis too, so smooth scroll and every tween share a
      // single rAF. lagSmoothing off: GSAP's catch-up jump after a stall would
      // fight Lenis for the scroll position.
      driveLenis = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(driveLenis);
      gsap.ticker.lagSmoothing(0);
    }

    // Scoped to root and reverted on destroy. Unscoped selectors leak across
    // sections — `.title` in the cover would happily grab `.title` in the
    // gallery — and the editor preview accumulates animation sets on every
    // variant swap.
    context = gsap.context(() => {
      if (reducedMotion) {
        revealStatic(root);
      } else {
        startReveal(root);
        stopParallax = startParallax(root);
      }

      // Heavy sections do canvas, particle or video work only while onscreen.
      for (const section of root.querySelectorAll<HTMLElement>('[data-weight="heavy"]')) {
        ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => section.toggleAttribute('data-active', self.isActive),
        });
      }
    }, root);

    // The one refresh. Everything is mounted, decoded and laid out by now, so
    // this is the only moment the page measures correctly. Sections never call
    // it themselves.
    ScrollTrigger.refresh();

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // Autoplay can still be refused even after a gesture. Not worth failing the
    // gate over — the invitation works silently.
    await audio?.play().catch(() => undefined);
  }

  function destroy(): void {
    window.clearTimeout(refreshTimer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);

    stopParallax?.();
    context?.revert();

    if (driveLenis) gsap.ticker.remove(driveLenis);
    lenis?.destroy();

    documentElement.style.overflow = scrollLock[0]!;
    body.style.overflow = scrollLock[1]!;

    lenis = null;
    context = null;
    stopParallax = null;
    driveLenis = null;
  }

  return { assetsReady, open, destroy };
}
