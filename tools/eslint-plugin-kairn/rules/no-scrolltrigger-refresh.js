/**
 * 03-animation-contract.md rule 3: one refresh, one place.
 *
 * The page shell calls `ScrollTrigger.refresh()` once, after the cover gate
 * opens. A section calling it re-measures mid-composition and desyncs every
 * trigger below it.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Sections must never call ScrollTrigger.refresh()' },
    schema: [],
    messages: {
      refresh:
        'Sections must never call ScrollTrigger.refresh(). The page shell owns it — one call, once, after the cover gate opens.',
    },
  },

  create(context) {
    return {
      MemberExpression(node) {
        if (node.computed) return;
        if (node.property.type !== 'Identifier' || node.property.name !== 'refresh') return;
        if (node.object.type !== 'Identifier' || node.object.name !== 'ScrollTrigger') return;
        context.report({ node, messageId: 'refresh' });
      },
    };
  },
};
