/**
 * Parallax for `[data-parallax]`, driven by one ticker for the whole page.
 *
 * Per-element ScrollTriggers would put the trigger count in the hundreds; the
 * contract says one batched ticker, so this is it.
 */
import { gsap } from './gsap.ts';

/**
 * Vertical offset in pixels for an element, from how far its centre sits from
 * the viewport centre. Pure so it can be checked without a DOM — it is the only
 * real arithmetic in the orchestrator.
 *
 * Returns 0 at the exact centre and ±(speed * viewportHeight / 2) when the
 * element centre reaches a viewport edge. Positive `speed` lags the scroll —
 * the element drifts downward as it travels up, the classic slow-background
 * look. Negative leads it.
 */
export function parallaxOffset(
  elementCentre: number,
  viewportHeight: number,
  speed: number,
): number {
  const fromCentre = (elementCentre - viewportHeight / 2) / viewportHeight;
  return -fromCentre * speed * viewportHeight;
}

interface Item {
  el: HTMLElement;
  speed: number;
  onscreen: boolean;
}

export function startParallax(root: HTMLElement): () => void {
  const items: Item[] = [...root.querySelectorAll<HTMLElement>('[data-parallax]')].map(
    (el) => ({ el, speed: Number(el.dataset.parallax) || 0, onscreen: false }),
  );
  if (items.length === 0) return () => {};

  // Read every rect, then write every transform. Interleaving them makes each
  // write invalidate the next read, and forty children turn one frame into
  // forty forced reflows.
  const offsets = new Array<number>(items.length);

  const update = () => {
    const viewportHeight = window.innerHeight;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]!;
      const rect = item.el.getBoundingClientRect();
      const onscreen = rect.bottom > 0 && rect.top < viewportHeight;

      if (onscreen !== item.onscreen) {
        item.onscreen = onscreen;
        // will-change only while it can actually move. Twenty permanent layers
        // is a GPU memory blowup on a mid-range Android.
        item.el.style.willChange = onscreen ? 'transform' : '';
      }

      offsets[i] = onscreen
        ? parallaxOffset(rect.top + rect.height / 2, viewportHeight, item.speed)
        : Number.NaN;
    }

    for (let i = 0; i < items.length; i += 1) {
      const offset = offsets[i]!;
      if (!Number.isNaN(offset)) gsap.set(items[i]!.el, { y: offset });
    }
  };

  gsap.ticker.add(update);
  return () => {
    gsap.ticker.remove(update);
    for (const item of items) item.el.style.willChange = '';
  };
}
