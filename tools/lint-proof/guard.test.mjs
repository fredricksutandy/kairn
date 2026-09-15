import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import kairn from '../eslint-plugin-kairn/index.js';
import { lintCss } from '../lint-css/index.mjs';

/**
 * The guard on the guard.
 *
 * The rule unit tests prove each rule reports on a synthetic snippet. This
 * proves the whole pipeline — real ESLint, the real plugin config, the real CSS
 * scanner — rejects a realistic section that breaks the non-negotiables, and
 * accepts the same section written correctly.
 *
 * Without this, the lint setup can rot into a no-op (a bad glob, a config that
 * never matches, a plugin that fails to load) and every run stays green.
 */

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test('CSS scanner rejects every violation in a broken section', async () => {
  const source = await readFile(fixture('bad-section.css'), 'utf8');
  const rules = new Set(lintCss(source, 'bad-section.css').map((f) => f.rule));

  assert.deepEqual(
    [...rules].sort(),
    [
      'no-containing-block-on-root',
      'no-hardcoded-color',
      'no-hardcoded-font',
      'no-unknown-token',
      'no-vh-units',
    ],
    'the broken stylesheet must trip every CSS rule',
  );
});

test('CSS scanner accepts a correctly written section', async () => {
  const source = await readFile(fixture('good-section.css'), 'utf8');
  assert.deepEqual(lintCss(source, 'good-section.css'), []);
});

test('tokens.css is exempt from the literal rules', async () => {
  const source = await readFile(
    fileURLToPath(new URL('../../packages/sections/src/tokens.css', import.meta.url)),
    'utf8',
  );
  assert.deepEqual(lintCss(source, 'packages/sections/src/tokens.css'), []);
});

test('ESLint rejects every violation in a broken section component', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        ...kairn.configs.sections,
      },
    ],
  });

  const [result] = await eslint.lintFiles([fixture('bad-section.tsx')]);
  const rules = new Set(result.messages.map((m) => m.ruleId));

  assert.deepEqual(
    [...rules].sort(),
    [
      'kairn/no-absolute-trigger',
      'kairn/no-containing-block-on-root',
      'kairn/no-hardcoded-color',
      'kairn/no-hardcoded-font',
      'kairn/no-scrolltrigger-refresh',
      'kairn/no-unanimatable-props',
      'kairn/no-vh-units',
    ],
    'the broken component must trip all seven rules',
  );
  assert.equal(result.errorCount, result.messages.length, 'every rule must be an error, not a warning');
});
