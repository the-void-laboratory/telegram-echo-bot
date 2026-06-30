// name=index.js
import { Telegraf, Markup } from 'telegraf';
import http from 'http';
import fetch from 'node-fetch'; // if your environment doesn't include fetch, install node-fetch

// IMPORTANT: Use environment variable for bot token
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN environment variable. Set BOT_TOKEN before launching the bot.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Utility string filter to sanitize text against UI presentation breaks
const escapeHTML = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Allowed inline HTML tags per Telegram subset (keep this conservative)
const ALLOWED_HTML_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'tg-spoiler', 'code', 'pre', 'a'
];

// Lightweight validator for Telegram-style HTML: checks allowed tags and basic balancing
function validateTelegramHTML(input) {
  const tagRegex = /<\/?([a-zA-Z0-9-]+)(?:\s+[^>]*)?>/g;
  const stack = [];
  let match;

  while ((match = tagRegex.exec(input)) !== null) {
    const full = match[0];
    const tag = match[1];
    const isClosing = /^<\//.test(full);

    if (!ALLOWED_HTML_TAGS.includes(tag)) {
      return { ok: false, error: `Unsupported HTML tag: <${tag}>` };
    }

    if (isClosing) {
      if (stack.length === 0 || stack[stack.length - 1] !== tag) {
        return { ok: false, error: `Mismatched or unexpected closing tag: </${tag}>` };
      }
      stack.pop();
    } else {
      // treat <br> as no-op
      if (/^<br\s*\/?>$/i.test(full)) continue;
      stack.push(tag);
    }
  }

  if (stack.length !== 0) {
    return { ok: false, error: `Unclosed tag: <${stack[stack.length - 1]}>` };
  }

  return { ok: true };
}

// Basic Markdown-ish validator to catch unbalanced *, _, and backticks
function validateSimpleMarkdown(input) {
  const counts = {
    '*': (input.match(/\*/g) || []).length,
    '_': (input.match(/_/g) || []).length,
    '`': (input.match(/`/g) || []).length,
  };

  if (counts['*'] % 2 !== 0) return { ok: false, error: "Unbalanced '*' characters (bold/italic)." };
  if (counts['_'] % 2 !== 0) return { ok: false, error: "Unbalanced '_' characters (italic)." };
  if (counts['`'] % 2 !== 0) return { ok: false, error: "Unbalanced '`' characters (inline/pre code)." };

  return { ok: true };
}

// Minimal example InputRichMessage to use as a test payload
const SAMPLE_RICH_MESSAGE = {
  blocks: [
    { type: 'heading', level: 1, text: { text: 'Example' } },
    { type: 'paragraph', text: { text: 'Hello — this is a rich message test.' } }
  ]
};

// Helper to call Telegram sendRichMessage with robust logging and a fallback raw request
async function safeSendRichMessage(ctx, richMessage) {
  try {
    // Primary: use Telegraf's callApi
    return await ctx.telegram.callApi('sendRichMessage', {
      chat_id: ctx.chat.id,
      rich_message: richMessage
    });
  } catch (err) {
    // log full error for debugging
    console.error('callApi sendRichMessage error:', err && err.response ? err.response : err);

    // If Telegram says unknown method or the library can't call it, try a raw HTTP POST to the Bot API
    // This helps differentiate "method not available" vs "payload invalid"
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendRichMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: ctx.chat.id, rich_message: richMessage })
      });
      const body = await res.json();
      if (!res.ok || !body || body.ok === false) {
        const info = body && body.description ? `${body.description} (${JSON.stringify(body)})` : JSON.stringify(body);
        const e = new Error(`Telegram API raw POST failed: ${info}`);
        e.telegram = body;
        throw e;
      }
      return body;
    } catch (rawErr) {
      // Surface the most useful messages back to the user
      console.error('Raw POST sendRichMessage error:', rawErr && rawErr.telegram ? rawErr.telegram : rawErr);
      throw rawErr;
    }
  }
}

// Bot handlers
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Developer';
  const miniAppUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:3000'}/`;

  ctx.reply(
    `🛠️ <b>Telegram Rich Message & Layout Engine Playground</b>\n\n` +
    `Hello <b>${escapeHTML(firstName)}</b>! Use this environment canvas to dry-run and stress-test your layout rendering outputs against the native Telegram Bot API rules.\n\n` +
    `🔹 <b>Validation Rules:</b>\n` +
    `• <b>HTML Engine:</b> Send native code patterns (e.g., <code>&lt;tg-spoiler&gt;text&lt;/tg-spoiler&gt;</code>).\n` +
    `• <b>Markdown Engine:</b> Send raw typography flags (e.g., <code>*bold text*</code>).\n` +
    `• <b>Rich Structural JSON:</b> Wrap your payload parameters inside standard brackets <code>{ ... }</code> to use the <code>sendRichMessage</code> API endpoint (for tables, headers, lists).\n` +
    `👇 Click the layout button below to inspect the interactive structural specifications map directly inside Telegram!`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('📖 Launch Interactive Mini App Hub', miniAppUrl)]
      ])
    }
  );
});

bot.on('message', async (ctx) => {
  if (!ctx.message || !ctx.message.text) return;
  if (ctx.message.text.startsWith('/')) return;

  const rawInput = ctx.message.text.trim();

  // Route 1: JSON -> sendRichMessage
  if (rawInput.startsWith('{') && rawInput.endsWith('}')) {
    try {
      const parsedPayload = JSON.parse(rawInput);

      // prefer an object with `blocks`
      const richMessage = parsedPayload.blocks ? parsedPayload : (Array.isArray(parsedPayload) ? { blocks: parsedPayload } : { blocks: [parsedPayload] });

      // quick structural check
      if (!richMessage.blocks || !Array.isArray(richMessage.blocks) || richMessage.blocks.length === 0) {
        throw new Error('rich_message.blocks must be a non-empty array.');
      }

      await safeSendRichMessage(ctx, richMessage);
      return;
    } catch (err) {
      console.error('sendRichMessage error to user:', err && err.telegram ? err.telegram : err.message || err);
      await ctx.reply(
        `❌ <b>sendRichMessage Failed</b>\n\n` +
        `🚨 <b>Error:</b> <code>${escapeHTML(err && err.telegram && err.telegram.description ? err.telegram.description : (err.message || String(err)))}</code>\n\n` +
        `💡 <i>Tip:</i> Ensure your JSON matches the InputRichMessage schema (top-level object with a \"blocks\" array). Example: ${escapeHTML(JSON.stringify(SAMPLE_RICH_MESSAGE))}`,
        { parse_mode: 'HTML' }
      );
      return;
    }
  }

  // Route 2: HTML path
  if (rawInput.includes('<') && rawInput.includes('>')) {
    const validation = validateTelegramHTML(rawInput);
    if (!validation.ok) {
      await ctx.reply(
        `❌ <b>HTML Validation Failed</b>\n\n` +
        `🚨 <b>Issue:</b> <code>${escapeHTML(validation.error)}</code>\n\n` +
        `💡 <i>Tip:</i> Allowed tags: <code>${ALLOWED_HTML_TAGS.join(', ')}</code>.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    try {
      await ctx.reply(`✨ <b>HTML Rendering Result:</b>\n\n${rawInput}`, { parse_mode: 'HTML' });
      return;
    } catch (htmlError) {
      console.error('HTML rendering error:', htmlError);
      await ctx.reply(
        `❌ <b>HTML Parse Failure</b>\n\n` +
        `🚨 <b>Error:</b> <code>${escapeHTML(htmlError.message || String(htmlError))}</code>\n\n` +
        `💡 <i>Tip:</i> Check allowed inline tags and ensure all attributes (like href on <a>) are valid URLs.`,
        { parse_mode: 'HTML' }
      );
      return;
    }
  }

  // Route 3: Markdown
  try {
    const mdValidation = validateSimpleMarkdown(rawInput);
    if (!mdValidation.ok) {
      await ctx.reply(
        `❌ <b>Markdown Validation Failed</b>\n\n` +
        `🚨 <b>Issue:</b> <code>${escapeHTML(mdValidation.error)}</code>\n\n` +
        `💡 <i>Tip:</i> Use escaping (backslashes) to show raw symbols or ensure pairs are balanced.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // prefer MarkdownV2 if you expect many special characters (adjust if you want plain Markdown)
    await ctx.reply(`✨ *Markdown Rendering Result*:\n\n${rawInput}`, { parse_mode: 'Markdown' });
  } catch (markdownError) {
    console.error('Markdown render error:', markdownError);
    await ctx.reply(
      `❌ <b>Markdown Parse Failure</b>\n\n` +
      `🚨 <b>Error:</b> <code>${escapeHTML(markdownError.message || String(markdownError))}</code>`,
      { parse_mode: 'HTML' }
    );
  }
});

bot.catch((err) => console.error('Unhandled bot error:', err));

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<html><body><h1>Formatting Blueprint Hub</h1></body></html>`);
});

server.listen(PORT, () => console.log(`Server listening on ${PORT}`));

bot.launch()
  .then(() => console.log('Bot launched'))
  .catch((err) => console.error('Failed to launch bot:', err));

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
