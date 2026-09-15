'use client';

/**
 * The adversarial harness — three fake sections, each engineered to be
 * pathological. They are a permanent fixture, not scaffolding.
 *
 * A coloured box with a heading doesn't pin, doesn't bleed, and doesn't run
 * forty absolutely-positioned children. A harness built from bland dummies
 * retires none of the risk it exists to retire, while feeling like it has.
 *
 * Any composition of these three that survives means the orchestrator is sound.
 * When a real variant later breaks, these tell you it is the variant and not
 * the system.
 *
 * They are written to the same rules as a real variant — the lint guard covers
 * this directory — so they also prove the rules hold on realistic section code.
 */

import { ScrollTrigger, gsap } from '@kairn/orchestrator';
import { type ComponentType, useEffect, useRef } from 'react';
import type { HarnessId } from './ids';

/**
 * Pins for 200vh. Pinning changes total page height, which shifts the computed
 * start and end of every trigger below it — the single most destructive thing a
 * section can do to a composition.
 */
function Pinner() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: '+=200%',
        pin: '[data-pin-target]',
        pinSpacing: true,
      });
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section ref={root} className="section-root harness harness--pinner" data-harness="pinner">
      <div className="harness__pin" data-pin-target>
        <p data-reveal="fade-up">pinner</p>
        <p data-reveal="fade-up" data-reveal-delay="0.1" data-testid="pinner-reveal">
          pinned for 200vh
        </p>
      </div>
    </section>
  );
}

/**
 * Overflows its own bottom edge by 120px. The section below might not exist, so
 * a decoration crossing the seam is the theme layer's job — but a variant that
 * genuinely must bleed declares `bleed: 'bottom'`, and the editor then forbids
 * a pinning section directly after it because the pin-spacer clips the bleed.
 *
 * This section exists to make that clipping observable rather than theoretical.
 */
function Bleeder() {
  const root = useRef<HTMLElement>(null);

  return (
    <section ref={root} className="section-root harness harness--bleeder" data-harness="bleeder">
      <p data-reveal="fade-up" data-testid="bleeder-reveal">
        bleeder
      </p>
      <div className="harness__bleed" data-testid="bleed-decoration" />
    </section>
  );
}

/**
 * 300vh tall, forty animated children on a scrubbed timeline, and a parallax
 * layer. Declares `data-weight="heavy"`, so the orchestrator toggles
 * `data-active` and the expensive work only runs while it is onscreen.
 */
function Hog() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.to('[data-hog-child]', {
        y: -120,
        stagger: 0.02,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section
      ref={root}
      className="section-root harness harness--hog"
      data-harness="hog"
      data-weight="heavy"
    >
      <p data-reveal="fade-up" data-testid="hog-reveal">
        hog
      </p>
      <div className="harness__parallax" data-parallax="0.3" data-testid="hog-parallax" />
      <div className="harness__swarm">
        {Array.from({ length: 40 }, (_, index) => (
          <span key={index} className="harness__child" data-hog-child />
        ))}
      </div>
    </section>
  );
}

export const HARNESS_SECTIONS: Record<HarnessId, ComponentType> = {
  pinner: Pinner,
  bleeder: Bleeder,
  hog: Hog,
};
