import { escapeHTML } from '../../utils/html.js';
import { RICH_HTML_TAGS, VOID_TAGS } from '../../validators/richMessageValidator.js';
const NAMED_ENTITIES = new Set(['lt','gt','amp','quot','apos','nbsp','hellip','mdash','ndash','lsquo','rsquo','ldquo','rdquo']);
export function repairHTML(input) {
  let output = String(input || '').replace(/&(?!([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
  for (const entity of output.matchAll(/&([a-zA-Z]+);/g)) if (!NAMED_ENTITIES.has(entity[1])) output = output.replaceAll(entity[0], `&amp;${entity[1]};`);
  output = output.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?>/g, (full, tag) => RICH_HTML_TAGS.has(tag.toLowerCase()) ? full : escapeHTML(full));
  const stack = [];
  output.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?>/g, (full, tag) => { tag = tag.toLowerCase(); if (full.startsWith('</')) { if (stack.at(-1) === tag) stack.pop(); } else if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(full)) stack.push(tag); return full; });
  while (stack.length) output += `</${stack.pop()}>`;
  return output;
}
