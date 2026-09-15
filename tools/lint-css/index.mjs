import {
  ALLOWED_TOKENS,
  COLOR_FN,
  COLOR_PROPS,
  CONTAINING_BLOCK_PROPS,
  HEX_COLOR,
  NAMED_COLORS,
  VH_UNIT,
} from '../eslint-plugin-kairn/util.js';

/**
 * The stylesheet half of the section guard.
 *
 * ESLint cannot parse CSS, and a section's colours, fonts and root rules live
 * almost entirely in its stylesheet — so the ESLint plugin alone would guard
 * the smaller half of the surface. This is a scanner rather than a real parser
 * because the checks are lexical, and the platform already has everything it
 * needs to do them.
 *
 * The file that declares the tokens is exempt from the literal rules. That is
 * the one place a hex value is correct.
 */

const TOKEN_DEFINITION_FILE = /(^|[/\\])tokens\.css$/;

/** Blanks out comments, keeping every byte offset and line break intact. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n]/g, ' '),
  );
}

/** Blanks out nested `{ … }` blocks so a body yields only its own declarations. */
function stripNestedBlocks(body) {
  let depth = 0;
  let out = '';
  for (const char of body) {
    if (char === '{') depth += 1;
    if (depth === 0) out += char;
    else if (char === '\n') out += '\n';
    else out += ' ';
    if (char === '}') depth = Math.max(0, depth - 1);
  }
  return out;
}

function lineColumnAt(source, index) {
  const before = source.slice(0, index);
  const line = before.split('\n').length;
  const column = index - (before.lastIndexOf('\n') + 1) + 1;
  return { line, column };
}

/** Yields every `selector { body }` pair, at any nesting depth. */
function* blocksOf(source) {
  const stack = [];
  let selectorStart = 0;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') {
      stack.push({ selector: source.slice(selectorStart, i).trim(), bodyStart: i + 1 });
      selectorStart = i + 1;
    } else if (char === '}') {
      const open = stack.pop();
      if (open) {
        yield {
          selector: open.selector,
          body: source.slice(open.bodyStart, i),
          bodyStart: open.bodyStart,
        };
      }
      selectorStart = i + 1;
    }
  }
}

/** Splits a declaration body into `{ property, value, index }` triples. */
function declarationsOf(body, bodyStart) {
  const own = stripNestedBlocks(body);
  const declarations = [];
  let offset = 0;

  for (const chunk of own.split(';')) {
    const colon = chunk.indexOf(':');
    if (colon !== -1) {
      const property = chunk.slice(0, colon).trim();
      // A selector fragment left behind by a stripped block has no property name.
      if (/^[-a-zA-Z][-a-zA-Z0-9]*$/.test(property)) {
        declarations.push({
          property,
          value: chunk.slice(colon + 1).trim(),
          index: bodyStart + offset + (chunk.length - chunk.trimStart().length),
        });
      }
    }
    offset += chunk.length + 1;
  }
  return declarations;
}

export function lintCss(source, filename) {
  const findings = [];
  const code = stripComments(source);
  const isTokenFile = TOKEN_DEFINITION_FILE.test(filename);

  const report = (index, rule, message) => {
    const { line, column } = lineColumnAt(code, index);
    findings.push({ file: filename, line, column, rule, message });
  };

  // --- Literals anywhere in the file -------------------------------------
  if (!isTokenFile) {
    for (const pattern of [HEX_COLOR, COLOR_FN]) {
      const global = new RegExp(pattern.source, 'g');
      for (const match of code.matchAll(global)) {
        report(
          match.index,
          'no-hardcoded-color',
          `Hardcoded colour \`${match[0].trim()}\`. Sections must use a theme token — ${[...ALLOWED_TOKENS].filter((t) => t.startsWith('--c-')).map((t) => `var(${t})`).join(', ')}.`,
        );
      }
    }
  }

  for (const match of code.matchAll(new RegExp(VH_UNIT.source, 'g'))) {
    report(
      match.index,
      'no-vh-units',
      `Uses \`${match[0]}\`. The iOS URL bar makes \`vh\` unstable mid-scroll — use \`svh\`.`,
    );
  }

  for (const match of code.matchAll(/@font-face/g)) {
    report(
      match.index,
      'no-hardcoded-font',
      '`@font-face` belongs to the theme layer, not a section. Sections reference var(--font-display) and var(--font-body).',
    );
  }

  // --- Custom property references ----------------------------------------
  // A section may define its own local property, but referencing one that is
  // neither local nor a theme token renders as nothing, silently.
  const declared = new Set(
    [...code.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((match) => match[1]),
  );
  for (const match of code.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
    const token = match[1];
    if (!ALLOWED_TOKENS.has(token) && !declared.has(token)) {
      report(
        match.index,
        'no-unknown-token',
        `Unknown custom property \`${token}\`. It is neither a theme token nor declared in this file, so it resolves to nothing. Theme tokens: ${[...ALLOWED_TOKENS].join(', ')}.`,
      );
    }
  }

  // --- Per-declaration checks --------------------------------------------
  for (const block of blocksOf(code)) {
    if (block.selector.startsWith('@')) continue;
    const isSectionRoot = /(\.section-root\b|\[data-section-root\])/.test(block.selector);

    for (const declaration of declarationsOf(block.body, block.bodyStart)) {
      const { property, value, index } = declaration;

      if (isSectionRoot && CONTAINING_BLOCK_PROPS.has(property)) {
        report(
          index,
          'no-containing-block-on-root',
          `\`${property}\` on a section root creates a containing block, which breaks \`position: fixed\` and therefore ScrollTrigger pinning. Animate an inner wrapper instead.`,
        );
      }

      if (!isTokenFile && COLOR_PROPS.has(property)) {
        for (const word of value.toLowerCase().match(/[a-z]+/g) ?? []) {
          if (NAMED_COLORS.has(word)) {
            report(
              index,
              'no-hardcoded-color',
              `Hardcoded colour \`${word}\` on \`${property}\`. Sections must use a theme token.`,
            );
            break;
          }
        }
      }

      if (!isTokenFile && (property === 'font-family' || property === 'font')) {
        const withoutVars = value.replace(/var\(\s*--[a-zA-Z0-9-]+\s*(?:,[^()]*)?\)/g, '');
        if (/[a-zA-Z0-9"']/.test(withoutVars)) {
          report(
            index,
            'no-hardcoded-font',
            `Hardcoded font \`${value}\`. Sections must use var(--font-display) or var(--font-body).`,
          );
        }
      }
    }
  }

  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}
