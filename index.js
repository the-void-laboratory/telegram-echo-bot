import { Telegraf, Markup } from 'telegraf';
import http from 'http';

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PUBLIC_HOST = process.env.RENDER_EXTERNAL_HOSTNAME || process.env.PUBLIC_HOST || 'localhost:3000';
const PORT = process.env.PORT || 3000;
const MAX_RICH_TEXT_LENGTH = 32768;
const MAX_NESTING_DEPTH = 16;

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN environment variable. Set BOT_TOKEN before launching the bot.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const sessions = new Map();

const MENU = [
  ['📖 Preview Text', '✨ Beautify Text (AI)'],
  ['🛠 Validate Formatting', '🔍 Fix Formatting'],
  ['🧠 Ask AI', '📚 Formatting Guide'],
  ['🆕 Rich Messages Examples', '⚙️ Settings'],
  ['❓ Help']
];

const RICH_HTML_TAGS = new Set([
  'a', 'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'mark',
  'sub', 'sup', 'tg-spoiler', 'tg-reference', 'tg-emoji', 'img', 'tg-time', 'tg-math',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'footer', 'hr', 'ul', 'ol', 'li', 'input',
  'blockquote', 'cite', 'aside', 'video', 'audio', 'figure', 'figcaption', 'tg-map',
  'tg-collage', 'tg-slideshow', 'table', 'caption', 'tr', 'th', 'td', 'details', 'summary',
  'tg-math-block', 'br'
]);

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'tg-map']);
const NAMED_ENTITIES = new Set(['lt', 'gt', 'amp', 'quot', 'apos', 'nbsp', 'hellip', 'mdash', 'ndash', 'lsquo', 'rsquo', 'ldquo', 'rdquo']);
function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, { mode: 'preview', format: 'rich-html', skipEntityDetection: false, isRtl: false, geminiApiKey: null });
const RICH_ONLY_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'footer', 'hr', 'ul', 'ol', 'li', 'blockquote', 'aside', 'figure', 'figcaption', 'tg-map', 'tg-collage', 'tg-slideshow', 'table', 'caption', 'tr', 'th', 'td', 'details', 'summary', 'tg-reference', 'tg-time', 'tg-math', 'tg-math-block', 'mark', 'sub', 'sup']);

function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, { mode: 'preview', format: 'rich-html', skipEntityDetection: false, isRtl: false });
  return sessions.get(userId);
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(value, limit = 3600) {
  const text = String(value || '');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function menuKeyboard() {
  return Markup.keyboard(MENU).resize();
}

function mainMenuText(firstName = 'Developer') {
  return `🛠️ <b>From Dev to Dev</b>\n\nHello <b>${escapeHTML(firstName)}</b>. Choose a workflow below, or send text directly to preview Telegram Rich Messages.\n\n<b>Main features</b>\n• Preview Rich HTML / Rich Markdown\n• Validate formatting and see exact issues\n• Auto-fix safe HTML mistakes\n• Beautify text with Gemini\n• Ask AI formatting questions\n• Browse examples and guide`;
}

function helpText(hasGlobalGeminiKey, hasSessionGeminiKey) {
  const geminiStatus = hasSessionGeminiKey
    ? 'configured for this chat session'
    : hasGlobalGeminiKey
      ? 'configured globally from GEMINI_API_KEY'
      : 'not configured yet';

  return `❓ <b>Help</b>\n\n<b>How to use</b>\n1. Tap <b>📖 Preview Text</b> and send Rich HTML, Rich Markdown, or JSON like <code>{"html":"&lt;h1&gt;Hi&lt;/h1&gt;"}</code>.\n2. Tap <b>🛠 Validate Formatting</b> to check code without sending it as a Rich Message.\n3. Tap <b>🔍 Fix Formatting</b> to repair simple HTML issues, such as unsupported tags or missing closing tags.\n4. Tap <b>✨ Beautify Text (AI)</b> and send plain text to generate valid Telegram Rich HTML.\n5. Tap <b>🧠 Ask AI</b> to ask Telegram formatting questions.\n\n<b>Gemini API key</b>\nCurrent status: <code>${geminiStatus}</code>.\nRecommended deployment method: set an environment variable named <code>GEMINI_API_KEY</code> in your hosting dashboard, then restart the bot.\nTemporary chat-session method: send <code>/setgemini YOUR_API_KEY</code>. This stores the key only in memory until the bot restarts. Use this only in a private chat.\nTo remove the temporary key, send <code>/cleargemini</code>.\n\n<b>Useful commands</b>\n/start - show start menu\n/menu - show main menu\n/help - show this help\n/settings - show settings\n/setgemini KEY - set Gemini key for this chat session\n/cleargemini - remove the session Gemini key`;
}

function settingsText(session) {
  return `⚙️ <b>Settings</b>\n\nMode: <code>${session.mode}</code>\nDefault preview format: <code>${session.format}</code>\nRTL: <code>${session.isRtl ? 'on' : 'off'}</code>\nSkip entity detection: <code>${session.skipEntityDetection ? 'on' : 'off'}</code>\nGemini session key: <code>${session.geminiApiKey ? 'configured' : 'not configured'}</code>\nGlobal Gemini key: <code>${DEFAULT_GEMINI_API_KEY ? 'configured' : 'not configured'}</code>\n\nSet Gemini globally with the <code>GEMINI_API_KEY</code> environment variable, or temporarily with <code>/setgemini YOUR_API_KEY</code>.`;
}

function modePrompt(mode) {
  const prompts = {
    preview: 'Send HTML, Markdown, or {"html":"..."}/{"markdown":"..."} to preview it as a Telegram Rich Message.',
    beautify: 'Send plain text. Gemini will convert it into valid Telegram Rich Message HTML.',
    validate: 'Send HTML, MarkdownV2/Rich Markdown, or an InputRichMessage JSON object to validate.',
    fix: 'Send broken formatting. I will explain the error and repair what can be repaired safely.',
    ask: 'Ask any Telegram formatting question. Gemini will answer using strict Bot API Rich Message rules.'
  };
  return prompts[mode] || prompts.preview;
}

function detectFormat(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.html === 'string') return { kind: 'rich-html', content: parsed.html, options: parsed };
      if (typeof parsed.markdown === 'string') return { kind: 'rich-markdown', content: parsed.markdown, options: parsed };
      return { kind: 'json', content: trimmed, options: parsed };
    } catch {
      return { kind: 'json-invalid', content: trimmed };
    }
  }
  if (/<[a-zA-Z][^>]*>/.test(trimmed) || /<\/[a-zA-Z][^>]*>/.test(trimmed)) return { kind: 'rich-html', content: trimmed };
  return { kind: 'rich-markdown', content: trimmed };
}

function validateRichMessageInput(input) {
  const detected = typeof input === 'string' ? detectFormat(input) : { kind: input.html ? 'rich-html' : 'rich-markdown', content: input.html || input.markdown, options: input };
  if (detected.kind === 'json-invalid') return { ok: false, errors: [{ index: 0, message: 'Invalid JSON.', fix: 'Use {"html":"..."} or {"markdown":"..."} for InputRichMessage.' }] };
  if (detected.kind === 'json') return { ok: false, errors: [{ index: 0, message: 'Unsupported JSON shape for sending.', fix: 'Bot API 10.1 InputRichMessage must contain exactly one of html or markdown; received structural RichMessage JSON, which is a response object, not a send payload.' }] };
  const options = detected.options || {};
  if (options.html && options.markdown) return { ok: false, errors: [{ index: 0, message: 'InputRichMessage uses both html and markdown.', fix: 'Use exactly one of html or markdown.' }] };
  if (!detected.content || detected.content.length === 0) return { ok: false, errors: [{ index: 0, message: 'Message is empty.', fix: 'Send non-empty rich message content.' }] };
  if (Buffer.byteLength(detected.content, 'utf8') > MAX_RICH_TEXT_LENGTH) return { ok: false, errors: [{ index: MAX_RICH_TEXT_LENGTH, message: 'Rich message exceeds 32768 UTF-8 characters.', fix: 'Shorten the message or split it.' }] };
  return detected.kind === 'rich-html' ? validateRichHTML(detected.content) : validateRichMarkdown(detected.content);
}

function validateRichHTML(html) {
  const errors = [];
  const stack = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?>/g;
  const entityPattern = /&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);/g;
  let match;

  while ((match = entityPattern.exec(html))) {
    const name = match[1];
    if (!name.startsWith('#') && !NAMED_ENTITIES.has(name)) errors.push({ index: match.index, message: `Unsupported named HTML entity &${name};`, fix: 'Use a supported named entity or a numeric HTML entity.' });
  }

  while ((match = tagPattern.exec(html))) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const attrs = match[2] || '';
    const closing = full.startsWith('</');
    const selfClosing = /\/\s*>$/.test(full) || VOID_TAGS.has(tag);

    if (!RICH_HTML_TAGS.has(tag)) errors.push({ index: match.index, message: `Unsupported Rich HTML tag <${tag}>.`, fix: 'Use only tags listed in Telegram Rich HTML formatting options.' });
    if (tag === 'tg-thinking') errors.push({ index: match.index, message: '<tg-thinking> is draft-only.', fix: 'Use it only with sendRichMessageDraft, not final sendRichMessage.' });
    if ((tag === 'img' || tag === 'video' || tag === 'audio') && /src\s*=\s*['"](?!https?:\/\/|tg:\/\/emoji\?id=)/i.test(attrs)) errors.push({ index: match.index, message: 'Media block src must be HTTP/HTTPS; custom emoji image may use tg://emoji.', fix: 'Use https:// URLs for media blocks.' });
    if (tag === 'code' && /class\s*=\s*['"]language-/i.test(attrs) && stack.at(-1) !== 'pre') errors.push({ index: match.index, message: 'Programming language cannot be specified for standalone code.', fix: 'Nest code inside pre: <pre><code class="language-js">...</code></pre>.' });

    if (closing) {
      const expected = stack.pop();
      if (expected !== tag) errors.push({ index: match.index, message: `Mismatched closing tag </${tag}>; expected </${expected || 'none'}>.`, fix: 'Close tags in strict LIFO order.' });
    } else if (!selfClosing) {
      stack.push(tag);
      if (stack.length > MAX_NESTING_DEPTH) errors.push({ index: match.index, message: 'Nesting exceeds 16 levels.', fix: 'Flatten nested formatting or blocks.' });

function detectFormat(input) {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.html === 'string') return { kind: 'rich-html', content: parsed.html, options: parsed };
      if (typeof parsed.markdown === 'string') return { kind: 'rich-markdown', content: parsed.markdown, options: parsed };
      return { kind: 'json', content: trimmed, options: parsed };
    } catch {
      return { kind: 'json-invalid', content: trimmed };
    }
  }
  if (/<[a-zA-Z][^>]*>/.test(trimmed) || /<\/[a-zA-Z][^>]*>/.test(trimmed)) return { kind: 'rich-html', content: trimmed };
  return { kind: 'rich-markdown', content: trimmed };
}

  while (stack.length) errors.push({ index: html.length, message: `Unclosed tag <${stack.pop()}>.`, fix: 'Add the missing closing tag.' });
  return { ok: errors.length === 0, errors };
}

function validateRichMarkdown(markdown) {
  const errors = [];
  const fences = (markdown.match(/```/g) || []).length;
  if (fences % 2 !== 0) errors.push({ index: markdown.lastIndexOf('```'), message: 'Unclosed fenced code block.', fix: 'Add a closing ``` fence.' });
  for (const token of ['**', '__', '~~', '==', '||']) {
    const count = (markdown.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count % 2 !== 0) errors.push({ index: markdown.lastIndexOf(token), message: `Unbalanced ${token} delimiter.`, fix: `Add the matching ${token} delimiter or escape the literal characters.` });
  }
  const singleBackticks = (markdown.replace(/```[\s\S]*?```/g, '').match(/`/g) || []).length;
  if (singleBackticks % 2 !== 0) errors.push({ index: markdown.lastIndexOf('`'), message: 'Unbalanced inline code backtick.', fix: 'Add a matching ` or escape the literal backtick.' });
  const htmlValidation = validateRichHTML(markdown);
  errors.push(...htmlValidation.errors.filter((error) => /Unsupported Rich HTML tag|Mismatched|Unclosed|draft-only|Media block/.test(error.message)));
  return { ok: errors.length === 0, errors };
}

function repairHTML(input) {
  let output = input.replace(/&(?!([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
  for (const entity of output.matchAll(/&([a-zA-Z]+);/g)) {
    if (!NAMED_ENTITIES.has(entity[1])) output = output.replaceAll(entity[0], `&amp;${entity[1]};`);
  }
  output = output.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?>/g, (full, tag) => RICH_HTML_TAGS.has(tag.toLowerCase()) ? full : escapeHTML(full));
  const stack = [];
  output.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?>/g, (full, tag) => {
    tag = tag.toLowerCase();
    if (full.startsWith('</')) {
      if (stack.at(-1) === tag) stack.pop();
    } else if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(full)) stack.push(tag);
    return full;
  });
  while (stack.length) output += `</${stack.pop()}>`;
  return output;
}

function buildRichMessage(input, session = {}) {
  const detected = detectFormat(input);
  const base = detected.options && (detected.options.html || detected.options.markdown)
    ? detected.options
    : detected.kind === 'rich-html'
      ? { html: detected.content }
      : { markdown: detected.content };
  return {
    ...('html' in base ? { html: base.html } : { markdown: base.markdown }),
    is_rtl: Boolean(base.is_rtl ?? session.isRtl),
    skip_entity_detection: Boolean(base.skip_entity_detection ?? session.skipEntityDetection)
  };
}

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) throw new Error(body.description || `Telegram ${method} failed with HTTP ${response.status}`);
  return body.result;
}

async function sendRichMessage(ctx, richMessage) {
  return callTelegram('sendRichMessage', { chat_id: ctx.chat.id, rich_message: richMessage });
}

async function callGemini(task, userText, apiKey = DEFAULT_GEMINI_API_KEY) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured. Set it in the hosting environment or send /setgemini YOUR_API_KEY in a private chat.');
  const system = `You are a Telegram Bot API 10.1 Rich Messages expert. Output only valid Telegram Rich HTML unless asked a question. InputRichMessage uses exactly one of html or markdown. Do not emit structural RichMessage JSON for sending. Supported Rich HTML includes headings h1-h6, p, lists, blockquote, aside, details/summary, table, pre/code, mark, sub, sup, tg-spoiler, tg-emoji, tg-time, tg-math, tg-math-block, media blocks with HTTP/HTTPS URLs. Avoid unsupported tags and invalid nesting.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\nTask: ${task}\n\nUser input:\n${userText}` }] }] })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Gemini failed with HTTP ${response.status}`);
  return body.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim() || '';
}

async function replyValidation(ctx, input, autoFix = false) {
  const validation = validateRichMessageInput(input);
  const detected = detectFormat(input);
  let repaired = detected.kind === 'rich-html' ? repairHTML(detected.content) : detected.content;
  const repairedValidation = validateRichMessageInput(repaired);
  const issues = validation.ok ? 'No validation errors found.' : validation.errors.map((e, index) => `${index + 1}. offset ${e.index}: ${escapeHTML(e.message)}\n   Fix: ${escapeHTML(e.fix)}`).join('\n');
  let message = `${validation.ok ? '✅' : '❌'} <b>Formatting Validation</b>\n\n<pre>${issues}</pre>`;
  if (autoFix && !validation.ok && repairedValidation.ok) message += `\n\n<b>Auto-repaired ${detected.kind === 'rich-html' ? 'HTML' : 'Markdown'}:</b>\n<pre>${escapeHTML(truncate(repaired))}</pre>`;
  await ctx.reply(message, { parse_mode: 'HTML' });
}

async function preview(ctx, input) {
  const validation = validateRichMessageInput(input);
  if (!validation.ok) return replyValidation(ctx, input);
  const richMessage = buildRichMessage(input, getSession(ctx.from.id));
  await sendRichMessage(ctx, richMessage);
  await ctx.reply(`<b>Underlying InputRichMessage</b>\n<pre>${escapeHTML(JSON.stringify(richMessage, null, 2))}</pre>`, { parse_mode: 'HTML' });
}

bot.start((ctx) => ctx.reply(
  `${mainMenuText(ctx.from.first_name || 'Developer')}\n\n${modePrompt('preview')}`,
  { parse_mode: 'HTML', ...menuKeyboard() }
));

bot.command('menu', (ctx) => ctx.reply(mainMenuText(ctx.from.first_name || 'Developer'), { parse_mode: 'HTML', ...menuKeyboard() }));

bot.command('help', (ctx) => {
  const session = getSession(ctx.from.id);
  return ctx.reply(helpText(Boolean(DEFAULT_GEMINI_API_KEY), Boolean(session.geminiApiKey)), { parse_mode: 'HTML', ...menuKeyboard() });
});

bot.command('settings', (ctx) => ctx.reply(settingsText(getSession(ctx.from.id)), { parse_mode: 'HTML', ...menuKeyboard() }));

bot.command('setgemini', (ctx) => {
  const key = ctx.message.text.replace(/^\/setgemini(@\w+)?\s*/i, '').trim();
  if (!key) {
    return ctx.reply('Send your key like this in a private chat: <code>/setgemini YOUR_API_KEY</code>\n\nFor production, set <code>GEMINI_API_KEY</code> in your hosting environment instead.', { parse_mode: 'HTML' });
  }

  const session = getSession(ctx.from.id);
  session.geminiApiKey = key;
  return ctx.reply('✅ Gemini API key saved for this in-memory chat session. It will be lost when the bot restarts. For production, use the GEMINI_API_KEY environment variable.', menuKeyboard());
});

bot.command('cleargemini', (ctx) => {
  const session = getSession(ctx.from.id);
  session.geminiApiKey = null;
  return ctx.reply('✅ Temporary Gemini API key cleared for this chat session.', menuKeyboard());
});

bot.action(/^mode:(preview|beautify|validate|fix|ask)$/, async (ctx) => {
  const session = getSession(ctx.from.id);
  session.mode = ctx.match[1];
  await ctx.answerCbQuery();
  return ctx.reply(modePrompt(session.mode), menuKeyboard());
});

bot.action('help', async (ctx) => {
  const session = getSession(ctx.from.id);
  await ctx.answerCbQuery();
  return ctx.reply(helpText(Boolean(DEFAULT_GEMINI_API_KEY), Boolean(session.geminiApiKey)), { parse_mode: 'HTML', ...menuKeyboard() });
});
function validateRichMessageInput(input) {
  const detected = typeof input === 'string' ? detectFormat(input) : { kind: input.html ? 'rich-html' : 'rich-markdown', content: input.html || input.markdown, options: input };
  if (detected.kind === 'json-invalid') return { ok: false, errors: [{ index: 0, message: 'Invalid JSON.', fix: 'Use {"html":"..."} or {"markdown":"..."} for InputRichMessage.' }] };
  if (detected.kind === 'json') return { ok: false, errors: [{ index: 0, message: 'Unsupported JSON shape for sending.', fix: 'Bot API 10.1 InputRichMessage must contain exactly one of html or markdown; received structural RichMessage JSON, which is a response object, not a send payload.' }] };
  const options = detected.options || {};
  if (options.html && options.markdown) return { ok: false, errors: [{ index: 0, message: 'InputRichMessage uses both html and markdown.', fix: 'Use exactly one of html or markdown.' }] };
  if (!detected.content || detected.content.length === 0) return { ok: false, errors: [{ index: 0, message: 'Message is empty.', fix: 'Send non-empty rich message content.' }] };
  if (Buffer.byteLength(detected.content, 'utf8') > MAX_RICH_TEXT_LENGTH) return { ok: false, errors: [{ index: MAX_RICH_TEXT_LENGTH, message: 'Rich message exceeds 32768 UTF-8 characters.', fix: 'Shorten the message or split it.' }] };
  return detected.kind === 'rich-html' ? validateRichHTML(detected.content) : validateRichMarkdown(detected.content);
}

function validateRichHTML(html) {
  const errors = [];
  const stack = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?>/g;
  const entityPattern = /&([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);/g;
  let match;

  while ((match = entityPattern.exec(html))) {
    const name = match[1];
    if (!name.startsWith('#') && !NAMED_ENTITIES.has(name)) errors.push({ index: match.index, message: `Unsupported named HTML entity &${name};`, fix: 'Use a supported named entity or a numeric HTML entity.' });
  }

  while ((match = tagPattern.exec(html))) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const attrs = match[2] || '';
    const closing = full.startsWith('</');
    const selfClosing = /\/\s*>$/.test(full) || VOID_TAGS.has(tag);

    if (!RICH_HTML_TAGS.has(tag)) errors.push({ index: match.index, message: `Unsupported Rich HTML tag <${tag}>.`, fix: 'Use only tags listed in Telegram Rich HTML formatting options.' });
    if (tag === 'tg-thinking') errors.push({ index: match.index, message: '<tg-thinking> is draft-only.', fix: 'Use it only with sendRichMessageDraft, not final sendRichMessage.' });
    if ((tag === 'img' || tag === 'video' || tag === 'audio') && /src\s*=\s*['"](?!https?:\/\/|tg:\/\/emoji\?id=)/i.test(attrs)) errors.push({ index: match.index, message: 'Media block src must be HTTP/HTTPS; custom emoji image may use tg://emoji.', fix: 'Use https:// URLs for media blocks.' });
    if (tag === 'code' && /class\s*=\s*['"]language-/i.test(attrs) && stack.at(-1) !== 'pre') errors.push({ index: match.index, message: 'Programming language cannot be specified for standalone code.', fix: 'Nest code inside pre: <pre><code class="language-js">...</code></pre>.' });

    if (closing) {
      const expected = stack.pop();
      if (expected !== tag) errors.push({ index: match.index, message: `Mismatched closing tag </${tag}>; expected </${expected || 'none'}>.`, fix: 'Close tags in strict LIFO order.' });
    } else if (!selfClosing) {
      stack.push(tag);
      if (stack.length > MAX_NESTING_DEPTH) errors.push({ index: match.index, message: 'Nesting exceeds 16 levels.', fix: 'Flatten nested formatting or blocks.' });
    }
  }

  while (stack.length) errors.push({ index: html.length, message: `Unclosed tag <${stack.pop()}>.`, fix: 'Add the missing closing tag.' });
  return { ok: errors.length === 0, errors };
}

function validateRichMarkdown(markdown) {
  const errors = [];
  const fences = (markdown.match(/```/g) || []).length;
  if (fences % 2 !== 0) errors.push({ index: markdown.lastIndexOf('```'), message: 'Unclosed fenced code block.', fix: 'Add a closing ``` fence.' });
  for (const token of ['**', '__', '~~', '==', '||']) {
    const count = (markdown.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count % 2 !== 0) errors.push({ index: markdown.lastIndexOf(token), message: `Unbalanced ${token} delimiter.`, fix: `Add the matching ${token} delimiter or escape the literal characters.` });
  }
  const singleBackticks = (markdown.replace(/```[\s\S]*?```/g, '').match(/`/g) || []).length;
  if (singleBackticks % 2 !== 0) errors.push({ index: markdown.lastIndexOf('`'), message: 'Unbalanced inline code backtick.', fix: 'Add a matching ` or escape the literal backtick.' });
  const htmlValidation = validateRichHTML(markdown);
  errors.push(...htmlValidation.errors.filter((error) => /Unsupported Rich HTML tag|Mismatched|Unclosed|draft-only|Media block/.test(error.message)));
  return { ok: errors.length === 0, errors };
}

function repairHTML(input) {
  let output = input.replace(/&(?!([a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
  for (const entity of output.matchAll(/&([a-zA-Z]+);/g)) {
    if (!NAMED_ENTITIES.has(entity[1])) output = output.replaceAll(entity[0], `&amp;${entity[1]};`);
  }
  output = output.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?>/g, (full, tag) => RICH_HTML_TAGS.has(tag.toLowerCase()) ? full : escapeHTML(full));
  const stack = [];
  output.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^<>]*)?>/g, (full, tag) => {
    tag = tag.toLowerCase();
    if (full.startsWith('</')) {
      if (stack.at(-1) === tag) stack.pop();
    } else if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(full)) stack.push(tag);
    return full;
  });
  while (stack.length) output += `</${stack.pop()}>`;
  return output;
}

function buildRichMessage(input, session = {}) {
  const detected = detectFormat(input);
  const base = detected.options && (detected.options.html || detected.options.markdown)
    ? detected.options
    : detected.kind === 'rich-html'
      ? { html: detected.content }
      : { markdown: detected.content };
  return {
    ...('html' in base ? { html: base.html } : { markdown: base.markdown }),
    is_rtl: Boolean(base.is_rtl ?? session.isRtl),
    skip_entity_detection: Boolean(base.skip_entity_detection ?? session.skipEntityDetection)
  };
}

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) throw new Error(body.description || `Telegram ${method} failed with HTTP ${response.status}`);
  return body.result;
}

async function sendRichMessage(ctx, richMessage) {
  return callTelegram('sendRichMessage', { chat_id: ctx.chat.id, rich_message: richMessage });
}

async function callGemini(task, userText) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured.');
  const system = `You are a Telegram Bot API 10.1 Rich Messages expert. Output only valid Telegram Rich HTML unless asked a question. InputRichMessage uses exactly one of html or markdown. Do not emit structural RichMessage JSON for sending. Supported Rich HTML includes headings h1-h6, p, lists, blockquote, aside, details/summary, table, pre/code, mark, sub, sup, tg-spoiler, tg-emoji, tg-time, tg-math, tg-math-block, media blocks with HTTP/HTTPS URLs. Avoid unsupported tags and invalid nesting.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\nTask: ${task}\n\nUser input:\n${userText}` }] }] })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Gemini failed with HTTP ${response.status}`);
  return body.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim() || '';
}

async function replyValidation(ctx, input, autoFix = false) {
  const validation = validateRichMessageInput(input);
  const detected = detectFormat(input);
  let repaired = detected.kind === 'rich-html' ? repairHTML(detected.content) : detected.content;
  const repairedValidation = validateRichMessageInput(repaired);
  const issues = validation.ok ? 'No validation errors found.' : validation.errors.map((e, index) => `${index + 1}. offset ${e.index}: ${escapeHTML(e.message)}\n   Fix: ${escapeHTML(e.fix)}`).join('\n');
  let message = `${validation.ok ? '✅' : '❌'} <b>Formatting Validation</b>\n\n<pre>${issues}</pre>`;
  if (autoFix && !validation.ok && repairedValidation.ok) message += `\n\n<b>Auto-repaired ${detected.kind === 'rich-html' ? 'HTML' : 'Markdown'}:</b>\n<pre>${escapeHTML(truncate(repaired))}</pre>`;
  await ctx.reply(message, { parse_mode: 'HTML' });
}

async function preview(ctx, input) {
  const validation = validateRichMessageInput(input);
  if (!validation.ok) return replyValidation(ctx, input);
  const richMessage = buildRichMessage(input, getSession(ctx.from.id));
  await sendRichMessage(ctx, richMessage);
  await ctx.reply(`<b>Underlying InputRichMessage</b>\n<pre>${escapeHTML(JSON.stringify(richMessage, null, 2))}</pre>`, { parse_mode: 'HTML' });
}

bot.start((ctx) => ctx.reply(
  `🛠️ <b>From Dev to Dev</b>\n\nTelegram formatting laboratory for Rich Messages, HTML, MarkdownV2/Rich Markdown, validation, repair, and AI-assisted message design.\n\n${modePrompt('preview')}`,
  { parse_mode: 'HTML', ...menuKeyboard(), ...Markup.inlineKeyboard([[Markup.button.webApp('📖 Open Web Preview Hub', `https://${PUBLIC_HOST}/`)]]) }
));

bot.hears(MENU.flat(), async (ctx) => {
  const label = ctx.message.text;
  const session = getSession(ctx.from.id);
  const modes = { '📖 Preview Text': 'preview', '✨ Beautify Text (AI)': 'beautify', '🛠 Validate Formatting': 'validate', '🔍 Fix Formatting': 'fix', '🧠 Ask AI': 'ask' };
  if (modes[label]) {
    session.mode = modes[label];
    return ctx.reply(modePrompt(session.mode), menuKeyboard());
  }
  if (label === '📚 Formatting Guide') return ctx.reply('<b>Guide</b>\n• Rich Messages send <code>{html}</code> or <code>{markdown}</code>, never structural <code>blocks</code>.\n• HTML supports headings, lists, tables, quotes, details, media blocks, formulas, custom emoji, and inline styles.\n• Limits: 32768 UTF-8 chars, 500 blocks, 16 nesting levels, 50 media attachments, 20 table columns.', { parse_mode: 'HTML', ...menuKeyboard() });
  if (label === '🆕 Rich Messages Examples') return ctx.reply('<pre>' + escapeHTML('# Release Notes\n\n<details open><summary>Highlights</summary>\n- **Rich Markdown** with <u>HTML underline</u>\n- ||spoilers|| and ==marked text==\n</details>\n\n| Feature | Status |\n|:--|:--:|\n| Rich Messages | ✅ |') + '</pre>', { parse_mode: 'HTML', ...menuKeyboard() });
  if (label === '⚙️ Settings') return ctx.reply(settingsText(session), { parse_mode: 'HTML', ...menuKeyboard() });
  return ctx.reply(helpText(Boolean(DEFAULT_GEMINI_API_KEY), Boolean(session.geminiApiKey)), { parse_mode: 'HTML', ...menuKeyboard() });
  if (label === '⚙️ Settings') return ctx.reply(`Settings are per chat session. Current defaults: Rich HTML preview, entity detection ${session.skipEntityDetection ? 'off' : 'on'}, RTL ${session.isRtl ? 'on' : 'off'}.`, menuKeyboard());
  return ctx.reply('Send text after choosing a mode. I validate against Telegram Bot API 10.1 Rich Messages before sending.', menuKeyboard());
});

bot.on('message', async (ctx) => {
  if (!ctx.message?.text || ctx.message.text.startsWith('/')) return;
  const session = getSession(ctx.from.id);
  const input = ctx.message.text.trim();
  try {
    if (session.mode === 'validate') return replyValidation(ctx, input);
    if (session.mode === 'fix') return replyValidation(ctx, input, true);
    if (session.mode === 'beautify') {
      const html = await callGemini('Beautify this plain text into valid Telegram Rich HTML. Return only the Rich HTML.', input, session.geminiApiKey || DEFAULT_GEMINI_API_KEY);
      const html = await callGemini('Beautify this plain text into valid Telegram Rich HTML. Return only the Rich HTML.', input);
      const repaired = repairHTML(html.replace(/^```(?:html)?\s*|```$/g, '').trim());
      const validation = validateRichMessageInput(repaired);
      if (!validation.ok) return replyValidation(ctx, repaired, true);
      await sendRichMessage(ctx, { html: repaired });
      return ctx.reply(`<b>Generated Rich HTML</b>\n<pre>${escapeHTML(truncate(repaired))}</pre>`, { parse_mode: 'HTML' });
    }
    if (session.mode === 'ask') {
      const answer = await callGemini('Answer this Telegram formatting question concisely and accurately. If giving examples, use valid Rich HTML.', input, session.geminiApiKey || DEFAULT_GEMINI_API_KEY);
      const answer = await callGemini('Answer this Telegram formatting question concisely and accurately. If giving examples, use valid Rich HTML.', input);
      return ctx.reply(escapeHTML(truncate(answer)), { parse_mode: 'HTML' });
    }
    return preview(ctx, input);
  } catch (error) {
    console.error('Handler error:', error);
    await ctx.reply(`❌ <b>Error</b>\n<code>${escapeHTML(error.message || String(error))}</code>`, { parse_mode: 'HTML' });
  }
});

bot.catch((err) => console.error('Unhandled bot error:', err));

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><title>From Dev to Dev</title><style>body{font-family:system-ui;max-width:860px;margin:3rem auto;line-height:1.5}code,pre{background:#f4f4f5;padding:.15rem .35rem;border-radius:.35rem}pre{padding:1rem;overflow:auto}</style></head><body><h1>From Dev to Dev</h1><p>Telegram Rich Messages preview, validation, repair, and AI formatting assistant.</p><pre>{"html":"&lt;h1&gt;Hello&lt;/h1&gt;&lt;p&gt;Valid Rich HTML&lt;/p&gt;"}</pre></body></html>`);
});

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
bot.launch().then(() => console.log('Bot launched')).catch((err) => console.error('Failed to launch bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
