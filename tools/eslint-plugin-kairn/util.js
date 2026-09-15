/**
 * Shared matchers for the kairn section rules.
 *
 * These guard the non-negotiables in CLAUDE.md and the rules in
 * `docs/03-animation-contract.md`. They are deliberately lexical and narrow:
 * a rule that reports a variant author's honest code is worse than a rule
 * that misses one case, because the first one gets disabled.
 */

/** Hex colours: #abc #abcd #aabbcc #aabbccdd */
export const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;

/** Colour notation functions. `color-mix()` included — it still bakes a value in. */
export const COLOR_FN =
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/;

/**
 * Named CSS colours worth catching. Not the full 148 — the ones a designer
 * actually types by hand. Extend when a real violation slips through.
 */
export const NAMED_COLORS = new Set([
  'white', 'black', 'red', 'blue', 'green', 'gray', 'grey', 'silver', 'gold',
  'ivory', 'beige', 'navy', 'teal', 'olive', 'maroon', 'purple', 'pink',
  'orange', 'yellow', 'brown', 'tan', 'wheat', 'linen', 'snow', 'salmon',
  'coral', 'crimson', 'khaki', 'lavender', 'plum', 'orchid', 'indigo',
  'violet', 'turquoise', 'aqua', 'cyan', 'magenta', 'fuchsia', 'lime',
  'whitesmoke', 'gainsboro', 'darkgray', 'darkgrey', 'lightgray', 'lightgrey',
  'dimgray', 'dimgrey', 'slategray', 'slategrey', 'rosybrown', 'peachpuff',
  'seashell', 'oldlace', 'floralwhite', 'antiquewhite', 'papayawhip',
  'blanchedalmond', 'bisque', 'moccasin', 'navajowhite', 'cornsilk',
  'honeydew', 'mintcream', 'azure', 'aliceblue', 'ghostwhite', 'lightyellow',
  'lemonchiffon',
]);

/** Property names that carry a colour, in CSS kebab and JS camel spelling. */
export const COLOR_PROPS = new Set([
  'color', 'background', 'background-color', 'backgroundColor',
  'border-color', 'borderColor', 'border-top-color', 'borderTopColor',
  'border-right-color', 'borderRightColor', 'border-bottom-color',
  'borderBottomColor', 'border-left-color', 'borderLeftColor',
  'outline-color', 'outlineColor', 'text-decoration-color',
  'textDecorationColor', 'caret-color', 'caretColor', 'accent-color',
  'accentColor', 'fill', 'stroke', 'stop-color', 'stopColor',
  'box-shadow', 'boxShadow', 'text-shadow', 'textShadow',
  'border', 'border-top', 'borderTop', 'border-right', 'borderRight',
  'border-bottom', 'borderBottom', 'border-left', 'borderLeft', 'outline',
]);

/**
 * Properties that create a containing block on an element. Any of these on a
 * section root breaks `position: fixed` inside it, which is how ScrollTrigger
 * pins. See 03-animation-contract.md rule 4.
 */
export const CONTAINING_BLOCK_PROPS = new Set([
  'transform', 'filter', 'will-change', 'willChange',
  'backdrop-filter', 'backdropFilter', 'perspective', 'contain',
  'translate', 'rotate', 'scale',
]);

/**
 * Properties that cannot be composited. Animating these runs layout or paint
 * on every frame — the fourth mobile killer.
 */
export const UNANIMATABLE_PROPS = new Set([
  'filter', 'webkitFilter', 'WebkitFilter', 'backdropFilter',
  'blur', 'boxShadow', 'textShadow', 'backgroundPosition',
  'background-position', 'box-shadow', 'text-shadow', 'backdrop-filter',
  'width', 'height', 'top', 'right', 'bottom', 'left', 'margin', 'padding',
]);

/**
 * A number immediately followed by `vh`. `100svh` does not match — no digit is
 * ever directly followed by `vh`, the `s` intervenes. The leading `\d+` is what
 * puts the whole number in the report instead of just its last digit.
 */
export const VH_UNIT = /\d+(?:\.\d+)?vh\b/;

/** Only these custom properties exist. Sections may reference nothing else. */
export const ALLOWED_TOKENS = new Set([
  '--c-bg', '--c-surface', '--c-accent', '--c-text', '--c-muted',
  '--font-display', '--font-body', '--font-scale',
]);

/**
 * The literal string a node represents, or null when it isn't statically one.
 * Template literals collapse to their raw text with `${}` holes left out, which
 * is enough for a substring scan.
 */
export function stringValueOf(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') return node.quasis.map((q) => q.value.raw).join(' ');
  return null;
}

/** The static name of an object property or JSX attribute key. */
export function keyNameOf(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

/** True when every token in the value comes from `var(--…)`. */
export function isTokenOnly(value) {
  const withoutVars = value.replace(/var\(\s*--[a-zA-Z0-9-]+\s*(?:,[^()]*)?\)/g, '');
  return !/[a-zA-Z0-9#]/.test(withoutVars);
}

/** Walks a member/call chain down to its root identifier: `gsap.timeline().to` → `gsap`. */
export function rootIdentifierOf(node) {
  let current = node;
  while (current) {
    if (current.type === 'Identifier') return current.name;
    if (current.type === 'MemberExpression') current = current.object;
    else if (current.type === 'CallExpression') current = current.callee;
    else return null;
  }
  return null;
}
