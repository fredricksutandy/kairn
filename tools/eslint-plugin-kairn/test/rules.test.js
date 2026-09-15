import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import plugin from '../index.js';

// RuleTester emits one node:test case per fixture when these are global.
globalThis.describe = describe;
globalThis.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const rule = (id) => plugin.rules[id];

ruleTester.run('no-hardcoded-color', rule('no-hardcoded-color'), {
  valid: [
    "const bg = 'var(--c-bg)';",
    "const style = { color: 'var(--c-text)' };",
    // A variant id that happens to contain a colour word is not a colour.
    "const id = 'cover-editorial';",
    "const label = 'White Lily';",
  ],
  invalid: [
    { code: "const bg = '#8B7355';", errors: [{ messageId: 'literal' }] },
    { code: "const bg = 'rgba(0,0,0,.4)';", errors: [{ messageId: 'literal' }] },
    // One report per literal, not per occurrence — the author fixes the string.
    { code: "const s = `linear-gradient(#fff, #000)`;", errors: 1 },
    { code: "const s = { color: 'white' };", errors: [{ messageId: 'named' }] },
    { code: "const s = { borderColor: 'crimson' };", errors: [{ messageId: 'named' }] },
  ],
});

ruleTester.run('no-hardcoded-font', rule('no-hardcoded-font'), {
  valid: [
    "const s = { fontFamily: 'var(--font-display)' };",
    "const s = { fontFamily: 'var(--font-body)' };",
    "const s = { color: 'var(--c-text)' };",
  ],
  invalid: [
    { code: "const s = { fontFamily: 'Cormorant Garamond, serif' };", errors: 1 },
    { code: "const s = { fontFamily: 'var(--font-display), Georgia' };", errors: 1 },
  ],
});

ruleTester.run('no-scrolltrigger-refresh', rule('no-scrolltrigger-refresh'), {
  valid: ['lenis.refresh();', 'instance.refresh();', 'ScrollTrigger.create({});'],
  invalid: [
    { code: 'ScrollTrigger.refresh();', errors: 1 },
    { code: 'queueMicrotask(ScrollTrigger.refresh);', errors: 1 },
  ],
});

ruleTester.run('no-vh-units', rule('no-vh-units'), {
  valid: [
    "const h = '100svh';",
    "const h = '50dvh';",
    "const h = 'calc(100svh - 2rem)';",
  ],
  invalid: [
    { code: "const h = '100vh';", errors: 1 },
    { code: "const h = `calc(100vh - 2rem)`;", errors: 1 },
  ],
});

ruleTester.run('no-containing-block-on-root', rule('no-containing-block-on-root'), {
  valid: [
    // Containing-block props on an inner wrapper are exactly right.
    "const a = <div data-section-root><div style={{ transform: 'translateY(8px)' }} /></div>;",
    "const a = <div className=\"section-root\" style={{ opacity: 0 }} />;",
    "const a = <div style={{ filter: 'blur(2px)' }} />;",
  ],
  invalid: [
    {
      code: "const a = <div data-section-root style={{ transform: 'translateY(8px)' }} />;",
      errors: [{ messageId: 'prop', data: { prop: 'transform' } }],
    },
    {
      code: "const a = <section className=\"section-root cover\" style={{ willChange: 'transform' }} />;",
      errors: 1,
    },
    {
      code: "const a = <div className={'section-root'} style={{ filter: 'none', contain: 'paint' }} />;",
      errors: 2,
    },
  ],
});

ruleTester.run('no-unanimatable-props', rule('no-unanimatable-props'), {
  valid: [
    "gsap.to('.x', { y: 40, opacity: 1 });",
    "tl.fromTo('.x', { autoAlpha: 0 }, { autoAlpha: 1 });",
    // Not a tween: an unrelated object with a `filter` key is fine.
    "api.set({ filter: 'active' });",
  ],
  invalid: [
    { code: "gsap.to('.x', { filter: 'blur(4px)' });", errors: 1 },
    { code: "gsap.timeline().to('.x', { boxShadow: '0 0 4px' });", errors: 1 },
    { code: "tl.fromTo('.x', { height: 0 }, { height: 200 });", errors: 2 },
  ],
});

ruleTester.run('no-absolute-trigger', rule('no-absolute-trigger'), {
  valid: [
    "ScrollTrigger.create({ trigger: root, start: 'top 80%', end: '+=120%' });",
    "gsap.to('.x', { scrollTrigger: { trigger: root, start: 'top bottom', end: '-=50' } });",
    // No trigger and no ScrollTrigger context — not a scroll config.
    "const opts = { start: '100 top' };",
  ],
  invalid: [
    {
      code: "ScrollTrigger.create({ trigger: root, start: '1200px top' });",
      errors: [{ messageId: 'absolute' }],
    },
    {
      code: "gsap.to('.x', { scrollTrigger: { start: '1200px top', end: '2400px top' } });",
      errors: 2,
    },
  ],
});
