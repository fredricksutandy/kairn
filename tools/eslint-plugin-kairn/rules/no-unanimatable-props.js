import { UNANIMATABLE_PROPS, keyNameOf, rootIdentifierOf } from '../util.js';

const TWEEN_METHODS = new Set(['to', 'from', 'fromTo', 'set']);

/**
 * Mobile killer #4: `transform` and `opacity` only inside scroll loops.
 *
 * `filter`, `box-shadow` and `background-position` run paint every frame.
 * Geometry properties run layout every frame, which is worse. If a variant
 * needs a blur reveal, bake it into the asset.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Animate transform and opacity only' },
    schema: [],
    messages: {
      prop:
        'Animating `{{prop}}` cannot be composited — it runs {{cost}} every frame on a mid-range Android. Use transform/opacity, or bake the effect into the asset.',
    },
  },

  create(context) {
    const LAYOUT_PROPS = new Set([
      'width', 'height', 'top', 'right', 'bottom', 'left', 'margin', 'padding',
    ]);

    function isTween(callee) {
      if (callee.type !== 'MemberExpression' || callee.computed) return false;
      if (callee.property.type !== 'Identifier') return false;
      if (!TWEEN_METHODS.has(callee.property.name)) return false;

      const root = rootIdentifierOf(callee.object);
      if (root === null) return false;
      return root === 'gsap' || /^(tl|timeline)/i.test(root);
    }

    return {
      CallExpression(node) {
        if (!isTween(node.callee)) return;

        for (const argument of node.arguments.slice(1)) {
          if (argument.type !== 'ObjectExpression') continue;
          for (const property of argument.properties) {
            if (property.type !== 'Property') continue;
            const name = keyNameOf(property.key);
            if (name && UNANIMATABLE_PROPS.has(name)) {
              context.report({
                node: property,
                messageId: 'prop',
                data: { prop: name, cost: LAYOUT_PROPS.has(name) ? 'layout' : 'paint' },
              });
            }
          }
        }
      },
    };
  },
};
