import { isTokenOnly, keyNameOf, stringValueOf } from '../util.js';

const FONT_PROPS = new Set(['fontFamily', 'font-family', 'font']);

/**
 * Non-negotiable #1, font half. Only `--font-display` and `--font-body` exist.
 *
 * Scoped to font-bearing properties rather than every string: a font name is
 * just a word, and scanning for words would report half the copy in a variant.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Sections must reference font tokens, never family names' },
    schema: [],
    messages: {
      literal:
        'Hardcoded font `{{value}}`. Sections must use var(--font-display) or var(--font-body).',
    },
  },

  create(context) {
    function check(propName, valueNode) {
      if (!FONT_PROPS.has(propName)) return;
      const value = stringValueOf(valueNode);
      if (value === null || value.trim() === '') return;
      if (isTokenOnly(value)) return;
      context.report({ node: valueNode, messageId: 'literal', data: { value: value.trim() } });
    }

    return {
      Property(node) {
        const name = keyNameOf(node.key);
        if (name) check(name, node.value);
      },
      JSXAttribute(node) {
        const name = keyNameOf(node.name);
        if (name) check(name, node.value);
      },
    };
  },
};
