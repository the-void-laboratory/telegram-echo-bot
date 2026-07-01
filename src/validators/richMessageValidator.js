import { config } from '../config/env.js';
import { detectFormat } from '../parsers/formatParser.js';
export const RICH_HTML_TAGS = new Set(['a','b','strong','i','em','u','ins','s','strike','del','code','pre','mark','sub','sup','tg-spoiler','tg-reference','tg-emoji','img','tg-time','tg-math','h1','h2','h3','h4','h5','h6','p','footer','hr','ul','ol','li','input','blockquote','cite','aside','video','audio','figure','figcaption','tg-map','tg-collage','tg-slideshow','table','caption','tr','th','td','details','summary','tg-math-block','br']);
export const VOID_TAGS = new Set(['br','hr','img','input','tg-map']);
const NAMED_ENTITIES = new Set(['lt','gt','amp','quot','apos','nbsp','hellip','mdash','ndash','lsquo','rsquo','ldquo','rdquo']);
export function validateRichMessageInput(input) {
  const detected = typeof input === 'string' ? detectFormat(input) : { kind: input.html ? 'rich-html' : 'rich-markdown', content: input.html || input.markdown, options: input };
  if (detected.kind === 'json-invalid') return { ok:false, errors:[{ index:0, message:'Invalid JSON.', fix:'Use {"html":"..."} or {"markdown":"..."}.' }] };
  if (detected.kind === 'json') return { ok:false, errors:[{ index:0, message:'Unsupported JSON shape for sending.', fix:'Use exactly one of html or markdown.' }] };
  const options = detected.options || {};
  if (options.html && options.markdown) return { ok:false, errors:[{ index:0, message:'Input uses both html and markdown.', fix:'Use exactly one.' }] };
  if (!detected.content) return { ok:false, errors:[{ index:0, message:'Message is empty.', fix:'Send non-empty content.' }] };
  if (Buffer.byteLength(detected.content, 'utf8') > config.maxRichTextLength) return { ok:false, errors:[{ index:config.maxRichTextLength, message:'Rich message exceeds 32768 UTF-8 characters.', fix:'Shorten or split it.' }] };
  return detected.kind === 'rich-html' ? validateRichHTML(detected.content) : validateRichMarkdownInput(detected.content);
}
export function validateRichHTML(html) {
  const errors = [], stack = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?>/g, entityPattern = /&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);/g;
  let match;
  while ((match = entityPattern.exec(html))) if (!match[1].startsWith('#') && !NAMED_ENTITIES.has(match[1])) errors.push({ index:match.index, message:`Unsupported named HTML entity &${match[1]};`, fix:'Use a supported named or numeric entity.' });
  while ((match = tagPattern.exec(html))) {
    const [full,, attrs=''] = match; const tag = match[1].toLowerCase(); const closing = full.startsWith('</'); const selfClosing = /\/\s*>$/.test(full) || VOID_TAGS.has(tag);
    if (!RICH_HTML_TAGS.has(tag)) errors.push({ index:match.index, message:`Unsupported Rich HTML tag <${tag}>.`, fix:'Use supported Telegram Rich HTML tags.' });
    if ((tag === 'img' || tag === 'video' || tag === 'audio') && /src\s*=\s*['"](?!https?:\/\/|tg:\/\/emoji\?id=)/i.test(attrs)) errors.push({ index:match.index, message:'Media src must be HTTP/HTTPS; custom emoji may use tg://emoji.', fix:'Use https:// URLs.' });
    if (tag === 'code' && /class\s*=\s*['"]language-/i.test(attrs) && stack.at(-1) !== 'pre') errors.push({ index:match.index, message:'Programming language cannot be specified for standalone code.', fix:'Nest code inside pre.' });
    if (closing) { const expected = stack.pop(); if (expected !== tag) errors.push({ index:match.index, message:`Mismatched closing tag </${tag}>; expected </${expected || 'none'}>.`, fix:'Close tags in strict order.' }); }
    else if (!selfClosing) { stack.push(tag); if (stack.length > config.maxNestingDepth) errors.push({ index:match.index, message:'Nesting exceeds 16 levels.', fix:'Flatten nested formatting.' }); }
  }
  while (stack.length) errors.push({ index:html.length, message:`Unclosed tag <${stack.pop()}>.`, fix:'Add missing closing tag.' });
  return { ok: errors.length === 0, errors };
}
export function validateRichMarkdownInput(markdown) {
  const errors = [];
  if ((markdown.match(/```/g) || []).length % 2) errors.push({ index:markdown.lastIndexOf('```'), message:'Unclosed fenced code block.', fix:'Add closing fence.' });
  for (const token of ['**','__','~~','==','||']) if ((markdown.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length % 2) errors.push({ index:markdown.lastIndexOf(token), message:`Unbalanced ${token} delimiter.`, fix:'Add matching delimiter or escape literal characters.' });
  if ((markdown.replace(/```[\s\S]*?```/g, '').match(/`/g) || []).length % 2) errors.push({ index:markdown.lastIndexOf('`'), message:'Unbalanced inline code backtick.', fix:'Add matching backtick.' });
  errors.push(...validateRichHTML(markdown).errors.filter((e) => /Unsupported|Mismatched|Unclosed|Media/.test(e.message)));
  return { ok: errors.length === 0, errors };
}
