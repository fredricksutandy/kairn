// Deliberately broken — see bad-section.css for why this file exists.
// @ts-nocheck
import { ScrollTrigger, gsap } from 'gsap';

export function BadSection({ root }: { root: HTMLElement }) {
  gsap.to('.title', { filter: 'blur(4px)' });
  ScrollTrigger.create({ trigger: root, start: '1200px top' });
  ScrollTrigger.refresh();

  return (
    <div data-section-root style={{ transform: 'translateY(8px)' }}>
      <span style={{ color: '#ffffff', fontFamily: 'Cormorant', minHeight: '100vh' }} />
    </div>
  );
}
