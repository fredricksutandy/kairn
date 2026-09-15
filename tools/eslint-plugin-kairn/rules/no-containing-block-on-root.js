import { CONTAINING_BLOCK_PROPS, keyNameOf, stringValueOf } from '../util.js';

/**
 * 03-animation-contract.md rule 4: section roots are untouchable.
 *
 *   .section-root { position: relative; isolation: isolate; }
 *
 * Nothing else. `transform`, `filter` and `will-change` each create a
 * containing block, which breaks `position: fixed` inside the section — and
 * `position: fixed` is exactly how ScrollTrigger pins. The failure is silent
 * and looks like an orchestrator bug. Variants animate inner wrappers.
 *
 * The CSS half of this rule lives in tools/lint-css; this half catches inline
 * styles in TSX, which the stylesheet linter cannot see.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Section roots may not create a containing block' },
    schema: [],
    messages: {
      prop:
        '`{{prop}}` on a section root creates a containing block, which breaks `position: fixed` and therefore ScrollTrigger pinning. Animate an inner wrapper instead.',
    },
  },

  create(context) {
    function marksSectionRoot(attribute) {
      const name = keyNameOf(attribute.name);
      if (name === 'data-section-root') return true;
      if (name !== 'className' && name !== 'class') return false;
      const value =
        attribute.value?.type === 'JSXExpressionContainer'
          ? stringValueOf(attribute.value.expression)
          : stringValueOf(attribute.value);
      return value !== null && /\bsection-root\b/.test(value);
    }

    return {
      JSXOpeningElement(node) {
        const attributes = node.attributes.filter((a) => a.type === 'JSXAttribute');
        if (!attributes.some(marksSectionRoot)) return;

        const style = attributes.find((a) => keyNameOf(a.name) === 'style');
        if (style?.value?.type !== 'JSXExpressionContainer') return;
        const object = style.value.expression;
        if (object.type !== 'ObjectExpression') return;

        for (const property of object.properties) {
          if (property.type !== 'Property') continue;
          const name = keyNameOf(property.key);
          if (name && CONTAINING_BLOCK_PROPS.has(name)) {
            context.report({ node: property, messageId: 'prop', data: { prop: name } });
          }
        }
      },
    };
  },
};
