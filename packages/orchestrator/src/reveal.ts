/**
 * Reveal-on-enter for `[data-reveal]`, batched into one ScrollTrigger.
 *
 * This is ~80% of the motion in an invitation, declared as an attribute rather
 * than authored per variant. That is what keeps reveal timing identical across
 * variants written months apart — which is what makes a mix-and-match page read
 * as one designed piece instead of a collage.
 */
import { ScrollTrigger, gsap } from './gsap.ts';

const DISTANCE = 24;
const DURATION = 0.8;

export function startReveal(root: HTMLElement): void {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (elements.length === 0) return;

  // The hidden state is set from JS, never CSS. If this bundle fails to load,
  // the page renders plain instead of blank — an invitation that shows nothing
  // is worse than one that shows everything at once.
  gsap.set(elements, { opacity: 0, y: DISTANCE });

  ScrollTrigger.batch(elements, {
    start: 'top 85%',
    onEnter: (batch) => {
      for (const element of batch as HTMLElement[]) {
        element.style.willChange = 'transform, opacity';
        gsap.to(element, {
          opacity: 1,
          y: 0,
          duration: DURATION,
          delay: Number(element.dataset.revealDelay) || 0,
          ease: 'power2.out',
          // Stripped on completion rather than onLeave: once revealed the
          // element never animates again, so the layer has nothing left to do.
          onComplete: () => {
            element.style.willChange = '';
          },
        });
      }
    },
  });
}

/**
 * `prefers-reduced-motion` fallback: everything visible, nothing animated.
 * The manifest calls this `reducedMotionFallback: 'static'`.
 */
export function revealStatic(root: HTMLElement): void {
  gsap.set([...root.querySelectorAll<HTMLElement>('[data-reveal]')], {
    opacity: 1,
    y: 0,
  });
}
