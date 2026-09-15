import { keyNameOf, stringValueOf } from '../util.js';

/**
 * Non-negotiable #2 / animation contract rule 1: triggers are element-relative.
 *
 *   start: "1200px top"   dies the moment a section above is toggled off
 *   start: "top 80%"      survives any composition
 *
 * A start or end value beginning with a number is an absolute scroll position.
 * `+=120%` and `-=50` are relative and pass.
 */
const ABSOLUTE_POSITION = /^\s*\d/;
const TRIGGER_KEYS = new Set(['start', 'end']);

export default {
  meta: {
    type: 'problem',
    docs: { description: 'ScrollTrigger start/end must be element-relative' },
    schema: [],
    messages: {
      absolute:
        'Absolute scroll position `{{value}}` in `{{key}}`. It breaks the moment a section above this one is toggled off. Use an element-relative value like "top 80%" or "+=120%".',
    },
  },

  create(context) {
    function isTriggerConfig(object, parent) {
      if (object.properties.some((p) => p.type === 'Property' && keyNameOf(p.key) === 'trigger')) {
        return true;
      }
      if (parent?.type === 'Property' && keyNameOf(parent.key) === 'scrollTrigger') return true;
      if (parent?.type === 'CallExpression') {
        const callee = parent.callee;
        return (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'ScrollTrigger'
        );
      }
      return false;
    }

    return {
      ObjectExpression(node) {
        if (!isTriggerConfig(node, node.parent)) return;

        for (const property of node.properties) {
          if (property.type !== 'Property') continue;
          const key = keyNameOf(property.key);
          if (!key || !TRIGGER_KEYS.has(key)) continue;

          const value = stringValueOf(property.value);
          if (value !== null && ABSOLUTE_POSITION.test(value)) {
            context.report({
              node: property.value,
              messageId: 'absolute',
              data: { value: value.trim(), key },
            });
          }
        }
      },
    };
  },
};
