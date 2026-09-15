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
  {
    files: ['packages/sections/**/*.{ts,tsx}'],
    ...kairn.configs.sections,
  },
);
