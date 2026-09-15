import noAbsoluteTrigger from './rules/no-absolute-trigger.js';
import noContainingBlockOnRoot from './rules/no-containing-block-on-root.js';
import noHardcodedColor from './rules/no-hardcoded-color.js';
import noHardcodedFont from './rules/no-hardcoded-font.js';
import noScrolltriggerRefresh from './rules/no-scrolltrigger-refresh.js';
import noUnanimatableProps from './rules/no-unanimatable-props.js';
import noVhUnits from './rules/no-vh-units.js';

/**
 * The architectural guard for `packages/sections`.
 *
 * Sections are hand-designed from real invitation references and are the one
 * place no design agent touches. That makes CI the only thing standing between
 * a variant and a hardcoded `#8B7355`. Every rule here maps to a line in
 * CLAUDE.md or docs/03-animation-contract.md; none of them are style opinions.
 */
const plugin = {
  meta: { name: 'eslint-plugin-kairn', version: '0.0.0' },
  rules: {
    'no-absolute-trigger': noAbsoluteTrigger,
    'no-containing-block-on-root': noContainingBlockOnRoot,
    'no-hardcoded-color': noHardcodedColor,
    'no-hardcoded-font': noHardcodedFont,
    'no-scrolltrigger-refresh': noScrolltriggerRefresh,
    'no-unanimatable-props': noUnanimatableProps,
    'no-vh-units': noVhUnits,
  },
};

/** Every rule on, as an error. There is no "warn" tier for a non-negotiable. */
plugin.configs = {
  sections: {
    plugins: { kairn: plugin },
    rules: Object.fromEntries(Object.keys(plugin.rules).map((id) => [`kairn/${id}`, 'error'])),
  },
};

export default plugin;
