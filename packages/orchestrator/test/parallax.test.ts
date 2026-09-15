import assert from 'node:assert/strict';
import test from 'node:test';
import { parallaxOffset } from '../src/parallax.ts';

/**
 * The orchestrator is DOM and rAF work that only a real browser proves out —
 * that is what the adversarial harness is for at build order step 3. This
 * covers the one piece of actual arithmetic in it, which is worth pinning
 * because a sign error here is invisible on a desktop and obvious on a phone.
 */

const VIEWPORT = 800;

// Math.abs, because the arithmetic yields -0 at rest and assert.equal uses
// Object.is, which separates it from 0. A -0 transform is identical to 0 to
// GSAP, so normalising in the source would be code written for the test.
test('no offset at the viewport centre', () => {
  assert.equal(Math.abs(parallaxOffset(VIEWPORT / 2, VIEWPORT, 0.25)), 0);
});

test('positive speed lags the scroll: above centre drifts down', () => {
  // An element that has travelled up past the centre is pushed back down, so
  // it appears to move slower than the page.
  assert.ok(parallaxOffset(VIEWPORT / 4, VIEWPORT, 0.25) > 0);
  assert.ok(parallaxOffset((VIEWPORT * 3) / 4, VIEWPORT, 0.25) < 0);
});

test('range is half the speed times viewport height at the edges', () => {
  assert.equal(parallaxOffset(0, VIEWPORT, 0.25), 100);
  assert.equal(parallaxOffset(VIEWPORT, VIEWPORT, 0.25), -100);
});

test('symmetric about the centre', () => {
  const above = parallaxOffset(VIEWPORT / 4, VIEWPORT, 0.4);
  const below = parallaxOffset((VIEWPORT * 3) / 4, VIEWPORT, 0.4);
  assert.equal(above, -below);
});

test('zero speed never moves', () => {
  assert.equal(Math.abs(parallaxOffset(0, VIEWPORT, 0)), 0);
  assert.equal(Math.abs(parallaxOffset(VIEWPORT, VIEWPORT, 0)), 0);
});
