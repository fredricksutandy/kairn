import { COLOR_FN, COLOR_PROPS, HEX_COLOR, NAMED_COLORS, keyNameOf, stringValueOf } from '../util.js';

/**
 * Non-negotiable #1: sections never hardcode a colour.
 *
 * Hex and colour-function notation are flagged wherever they appear — in a
 * section there is no honest reason to write one. Bare named colours are only
 * flagged in a colour-bearing property, because `'white'` is a plausible
 * variant name and a false positive there teaches people to reach for the
 * disable comment.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Sections must reference theme custom properties, never colour literals',
    },
    schema: [],
    messages: {
      literal:
        'Hardcoded colour `{{value}}`. Sections must use a theme token — var(--c-bg), var(--c-surface), var(--c-accent), var(--c-text), var(--c-muted).',
      named:
        'Hardcoded colour `{{value}}` on `{{prop}}`. Sections must use a theme token.',
    },
  },

  create(context) {
    function checkLiteral(node) {
      const value = stringValueOf(node);
      if (value === null) return;
      const hex = value.match(HEX_COLOR);
      if (hex) {
        context.report({ node, messageId: 'literal', data: { value: hex[0] } });
        return;
      }
      const fn = value.match(COLOR_FN);
      if (fn) {
        context.report({ node, messageId: 'literal', data: { value: fn[0].trim() } });
      }
    }

    function checkNamed(propName, valueNode) {
      if (!COLOR_PROPS.has(propName)) return;
      const value = stringValueOf(valueNode);
      if (value === null) return;
      for (const word of value.toLowerCase().match(/[a-z]+/g) ?? []) {
        if (NAMED_COLORS.has(word)) {
          context.report({
            node: valueNode,
            messageId: 'named',
            data: { value: word, prop: propName },
          });
          return;
        }
      }
    }

    return {
      Literal: checkLiteral,
      TemplateLiteral: checkLiteral,

      Property(node) {
        const name = keyNameOf(node.key);
        if (name) checkNamed(name, node.value);
      },

      JSXAttribute(node) {
        const name = keyNameOf(node.name);
        if (name) checkNamed(name, node.value);
      },
    };
  },
};
