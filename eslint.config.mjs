import js from '@eslint/js';
import kairn from 'eslint-plugin-kairn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/next-env.d.ts',
      // Deliberately-broken code. tools/lint-proof lints it on purpose and
      // asserts that it fails; a clean repo-wide run must not see it.
      'tools/lint-proof/fixtures/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Node tooling. Avoids a `globals` dependency for the three names actually used.
  {
    files: ['tools/**/*.{js,mjs}', '*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        globalThis: 'readonly',
        URL: 'readonly',
      },
    },
  },

  /*
   * The architectural guard.
   *
   * Scoped to packages/sections because that is where it matters: those files
   * are hand-designed from real invitation references and are the one place no
   * design agent normalises. CI is the only check they get.
   */
  /*
   * The harness sections are held to the same rules as a real variant,
   * including never calling refresh() — that is the point of them. If the rules
   * did not apply here, the harness would stop being a fair model of what it is
   * supposed to be adversarial about.
   */
  {
    files: ['packages/sections/**/*.{ts,tsx}', 'apps/inv/app/harness/**/*.{ts,tsx}'],
    ...kairn.configs.sections,
  },

  /*
   * The orchestrator gets the same rules, minus one.
   *
   * It is the highest-risk file in the repo and the mobile-performance rules
   * matter more here than anywhere — but `ScrollTrigger.refresh()` is not a
   * violation here, it is this package's job. One call, one place, after the
   * cover gate opens. That is exactly what the rule forbids everywhere else.
   */
  {
    files: ['packages/orchestrator/**/*.{ts,tsx}'],
    ...kairn.configs.sections,
    rules: {
      ...kairn.configs.sections.rules,
      'kairn/no-scrolltrigger-refresh': 'off',
    },
  },
);
