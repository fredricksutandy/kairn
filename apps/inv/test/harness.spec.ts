import { type Page, expect, test } from '@playwright/test';

/**
 * Build order step 3. Every composition of the three pathological sections,
 * asserted to survive.
 *
 * The load-bearing assertion is the tail reveal. A 200vh pin changes total page
 * height, which shifts the computed start and end of every trigger below it —
 * so if the orchestrator's single refresh lands at the wrong moment, elements
 * below the pin never reveal. That failure is silent in code review and obvious
 * here.
 */

const IDS = ['pinner', 'bleeder', 'hog'] as const;

/** Every ordering of all three. Adjacency is what breaks, so order matters. */
function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
      item,
      ...rest,
    ]),
  );
}

async function openGate(page: Page, order: readonly string[]) {
  await page.goto(`/harness?order=${order.join(',')}`);
  await page.getByTestId('gate').click();
  await expect(page.getByTestId('harness-root')).toHaveAttribute('data-opened', 'true');
}

/**
 * Scrolls with real wheel events rather than window.scrollTo — Lenis smooths
 * wheel input, and driving the scroll position directly would bypass the very
 * thing under test.
 */
async function scrollToBottom(page: Page) {
  // Loop on the real scroll position rather than a fixed number of steps.
  // Lenis animates toward a target, so the document lags a long way behind the
  // wheel events — a step count derived from page height stops a third of the
  // way down and every reveal below that point looks like an orchestrator bug.
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const atBottom = await page.evaluate(
      () =>
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4,
    );
    if (atBottom) break;
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(100);
  }
  // Reveals run 0.8s plus their own delay; let the last ones finish.
  await page.waitForTimeout(1500);
}

for (const order of permutations(IDS)) {
  const name = order.join(' → ');

  test(`composition survives: ${name}`, async ({ page }) => {
    const errors: string[] = [];

    // The renderer ships no icon yet, so the browser's automatic /favicon.ico
    // and /apple-touch-icon.png requests 404 on every page. That is noise from
    // the environment, not a signal from the orchestrator. Scoped narrowly on
    // purpose: any other failed request still fails the test.
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      const isIconProbe = path === '/favicon.ico' || path.startsWith('/apple-touch-icon');
      if (response.status() >= 400 && !isIconProbe) {
        errors.push(`HTTP ${response.status()} ${path}`);
      }
    });
    page.on('console', (message) => {
      // Console text carries no URL, so resource failures are matched by the
      // response listener above instead of here.
      const isResourceFailure = message.text().startsWith('Failed to load resource');
      if (message.type() === 'error' && !isResourceFailure) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await openGate(page, order);
    await scrollToBottom(page);

    // Nothing below the pin may be left hidden. This is the desync canary.
    const stillHidden = await page.$$eval('[data-reveal]', (elements) =>
      elements
        .filter((element) => Number(getComputedStyle(element).opacity) < 0.99)
        .map((element) => element.textContent?.trim() ?? '?'),
    );
    expect(stillHidden, 'every [data-reveal] must end visible').toEqual([]);

    // The last element on the page, below every pathological section.
    await expect(page.getByTestId('tail-reveal')).toHaveCSS('opacity', '1');

    expect(errors).toEqual([]);
  });
}

test('pinner holds its element fixed for the whole pin range', async ({ page }) => {
  await openGate(page, ['pinner', 'bleeder']);

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(700);
  const first = await page.locator('[data-pin-target]').boundingBox();

  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(700);
  const second = await page.locator('[data-pin-target]').boundingBox();

  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  // Pinned means the viewport position does not move while the page scrolls.
  expect(Math.abs(second!.y - first!.y)).toBeLessThan(12);
});

/** Is the pixel just inside the decoration's bottom edge actually the decoration? */
function hitTestBelowSeam(page: Page) {
  return page.evaluate(() => {
    const decoration = document.querySelector('[data-testid="bleed-decoration"]')!;
    const box = decoration.getBoundingClientRect();
    return document.elementFromPoint(box.left + box.width / 2, box.bottom - 10) === decoration;
  });
}

function seamOverhang(page: Page) {
  return page.evaluate(() => {
    const section = document.querySelector('[data-harness="bleeder"]')!;
    const decoration = document.querySelector('[data-testid="bleed-decoration"]')!;
    return decoration.getBoundingClientRect().bottom - section.getBoundingClientRect().bottom;
  });
}

test('bleeder decoration crosses the section seam, unclipped', async ({ page }) => {
  await openGate(page, ['bleeder']);
  await page.waitForTimeout(400);

  expect(await seamOverhang(page)).toBeGreaterThan(100);

  // getBoundingClientRect reports the full box even when an ancestor clips it,
  // so the overhang above proves nothing about clipping on its own. Walk the
  // ancestors instead: any non-visible overflow would cut the bleed off, and a
  // section root is one `overflow: hidden` away from doing exactly that.
  const clippingAncestor = await page.evaluate(() => {
    let element = document.querySelector('[data-testid="bleed-decoration"]')!.parentElement;
    while (element && element !== document.body) {
      const style = getComputedStyle(element);
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        return element.className || element.tagName;
      }
      element = element.parentElement;
    }
    return null;
  });
  expect(clippingAncestor).toBeNull();
});

/**
 * The reason seam-crossing decorations belong to the theme layer.
 *
 * `isolation: isolate` gives every section root its own stacking context, so a
 * decoration's z-index is scoped to its own section and cannot lift it above a
 * later sibling. The overhang is still there in geometry — nothing clips it —
 * but the next section paints straight over it.
 *
 * A variant therefore cannot own a decoration that crosses into the section
 * below, no matter what z-index it sets. Page-level layers keyed to the theme
 * can, because the section below might not exist.
 */
test('a following section paints over the bleed, geometry intact', async ({ page }) => {
  await openGate(page, ['bleeder', 'hog']);
  await page.waitForTimeout(400);

  expect(await seamOverhang(page)).toBeGreaterThan(100);
  expect(await hitTestBelowSeam(page)).toBe(false);
});

test('hog is active only while onscreen', async ({ page }) => {
  await openGate(page, ['hog', 'bleeder']);

  const hog = page.locator('[data-harness="hog"]');
  await page.waitForTimeout(500);
  await expect(hog).toHaveAttribute('data-active', '');

  await scrollToBottom(page);
  await expect(hog).not.toHaveAttribute('data-active', '');
});

test('reduced motion reveals everything without animating', async ({ browser, baseURL }) => {
  // A manually created context does not inherit `use`, so baseURL and the
  // viewport have to be passed through or the relative goto below throws.
  const context = await browser.newContext({
    ...devicesPixel5(),
    baseURL,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await openGate(page, IDS);
  // No scrolling at all: static fallback means visible from the start.
  const hidden = await page.$$eval('[data-reveal]', (elements) =>
    elements.filter((element) => Number(getComputedStyle(element).opacity) < 0.99).length,
  );
  expect(hidden).toBe(0);

  await context.close();
});

function devicesPixel5() {
  // Kept inline so the reduced-motion context matches the project viewport
  // without importing the device table twice.
  return { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true };
}
