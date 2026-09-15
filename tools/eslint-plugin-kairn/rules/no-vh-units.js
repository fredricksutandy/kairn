import { VH_UNIT, stringValueOf } from '../util.js';

/**
 * Mobile killer #1. The iOS URL bar collapses on scroll, `vh` changes, every
 * full-height section resizes mid-scroll. `svh` is stable.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Use svh/dvh/lvh, never vh' },
    schema: [],
    messages: {
      vh: 'Uses `{{value}}`. The iOS URL bar makes `vh` unstable mid-scroll — use `svh`.',
    },
  },

  create(context) {
    function check(node) {
      const value = stringValueOf(node);
      if (value === null) return;
      const match = value.match(VH_UNIT);
      if (match) context.report({ node, messageId: 'vh', data: { value: match[0] } });
    }

    return { Literal: check, TemplateLiteral: check };
  },
};
