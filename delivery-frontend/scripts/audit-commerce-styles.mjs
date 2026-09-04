import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const stylesDir = path.join(root, 'src', 'styles', 'commerce');
const sourceRoot = path.join(root, 'src');
const write = process.argv.includes('--write');

const walk = (directory, predicate) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(target, predicate);
  return predicate(target) ? [target] : [];
});

const source = walk(sourceRoot, (file) => /\.(?:ts|tsx|js|jsx)$/.test(file))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
const isReferenced = (name) => new RegExp(`(?<![A-Za-z0-9_-])${name}(?![A-Za-z0-9_-])`).test(source);

const localClasses = (selector) => [...selector.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)]
  .filter((match) => !selector.slice(Math.max(0, match.index - 8), match.index).includes(':global('))
  .map((match) => match[1]);

function cleanRange(input, start = 0, end = input.length) {
  let cursor = start;
  let chunkStart = start;
  let output = '';
  let removed = 0;
  while (cursor < end) {
    if (input.startsWith('/*', cursor)) {
      const close = input.indexOf('*/', cursor + 2);
      cursor = close < 0 ? end : close + 2;
      continue;
    }
    if (input[cursor] !== '{') {
      cursor += 1;
      continue;
    }
    let depth = 1;
    let quote = '';
    let index = cursor + 1;
    for (; index < end && depth > 0; index += 1) {
      const char = input[index];
      if (quote) {
        if (char === '\\') index += 1;
        else if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (input.startsWith('/*', index)) {
        const close = input.indexOf('*/', index + 2);
        index = close < 0 ? end : close + 1;
      } else if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
    }
    const blockEnd = index;
    let preludeStart = cursor - 1;
    while (preludeStart >= chunkStart && !['}', ';'].includes(input[preludeStart])) preludeStart -= 1;
    preludeStart += 1;
    const prelude = input.slice(preludeStart, cursor).trim();
    const classes = localClasses(prelude);
    const removable = classes.length > 0 && classes.every((name) => !isReferenced(name));
    output += input.slice(chunkStart, preludeStart);
    if (removable) {
      removed += 1;
    } else if (/^@(media|supports|container|layer)\b/.test(prelude)) {
      const inner = cleanRange(input, cursor + 1, blockEnd - 1);
      output += input.slice(preludeStart, cursor + 1) + inner.text + input.slice(blockEnd - 1, blockEnd);
      removed += inner.removed;
    } else {
      output += input.slice(preludeStart, blockEnd);
    }
    cursor = blockEnd;
    chunkStart = blockEnd;
  }
  return { text: output + input.slice(chunkStart, end), removed };
}

let totalRemoved = 0;
for (const file of walk(stylesDir, (target) => target.endsWith('.less'))) {
  const original = fs.readFileSync(file, 'utf8');
  const result = cleanRange(original);
  totalRemoved += result.removed;
  if (write && result.text !== original) fs.writeFileSync(file, result.text, 'utf8');
  if (result.removed > 0) console.log(`${path.relative(root, file)}: ${result.removed}`);
}
console.log(`${write ? 'Removed' : 'Would remove'} ${totalRemoved} unreferenced rule blocks.`);
