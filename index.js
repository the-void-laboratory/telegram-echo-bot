import { Telegraf, Markup } from 'telegraf';
import http from 'http';

// ==========================================
// CONFIGURATION
// ==========================================
const BOT_TOKEN = '8842774625:AAHKbtnsqHjmyuMySVBW6hz9o716JOi4_qw';

if (!BOT_TOKEN || BOT_TOKEN === '8842774625:AAHKbtnsqHjmyuMySVBW6hz9o716JOi4_qw') {
  console.error('❌ CRITICAL CONFIGURATION ERROR: Please insert a valid Telegram Bot Token from BotFather.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Utility string filter to sanitize text against UI presentation breaks
const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 1. Core Bot Initiation Execution Channel
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Developer';
  
  // Dynamically points to your Render instance web interface
  const miniAppUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:3000'}/`;
  
  ctx.reply(
    `🛠️ <b>Telegram Rich Message & Layout Engine Playground</b>\n\n` +
    `Hello <b>${firstName}</b>! Use this environment canvas to dry-run and stress-test your layout rendering outputs against the native Telegram Bot API rules.\n\n` +
    `🔹 <b>Validation Rules:</b>\n` +
    `• <b>HTML Engine:</b> Send native code patterns (e.g., <code>&lt;tg-spoiler&gt;text&lt;/tg-spoiler&gt;</code>).\n` +
    `• <b>Markdown Engine:</b> Send raw typography flags (e.g., <code>*bold text*</code>).\n` +
    `• <b>Rich Structural JSON:</b> Wrap your payload parameters inside standard brackets <code>{ ... }</code> to use the <code>sendRichMessage</code> API endpoint (for tables, headers, lists, math, and layout blocks).\n\n` +
    `👇 Click the layout button below to inspect the interactive structural specifications map directly inside Telegram!`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('📖 Launch Interactive Mini App Hub', miniAppUrl)]
      ])
    }
  );
});

// 2. Formatting Interpretation Pipeline
bot.on('message', async (ctx) => {
  if (!ctx.message || !ctx.message.text) return;
  if (ctx.message.text.startsWith('/')) return;

  const rawInput = ctx.message.text.trim();

  // Route 1: Intercept Structural JSON formatting layers bound for sendRichMessage
  if (rawInput.startsWith('{') && rawInput.endsWith('}')) {
    try {
      const parsedPayload = JSON.parse(rawInput);
      
      // Call Telegram's direct Rich Message method structure natively
      await ctx.telegram.callApi('sendRichMessage', {
        chat_id: ctx.chat.id,
        rich_message: parsedPayload
      });
      return;
    } catch (richError) {
      await ctx.reply(
        `❌ <b>sendRichMessage JSON Compilation Failed</b>\n\n` +
        `🚨 <b>Error Vector:</b> <code>${escapeHTML(richError.message)}</code>\n\n` +
        `💡 <i>Check:</i> Make sure your structure correctly binds properties to the <code>InputRichMessage</code> schema layer inside a valid array stack.`,
        { parse_mode: 'HTML' }
      );
      return;
    }
  }

  // Route 2: Render Standard HTML tags
  if (rawInput.includes('<') && rawInput.includes('>')) {
    try {
      await ctx.reply(`✨ <b>HTML Rendering Result:</b>\n\n${rawInput}`, { parse_mode: 'HTML' });
      return;
    } catch (htmlError) {
      await ctx.reply(
        `❌ <b>Standard HTML Parse Failure</b>\n\n` +
        `🚨 <b>Error Vector:</b> <code>${escapeHTML(htmlError.message)}</code>\n\n` +
        `💡 <i>Notice:</i> Standard HTML parsers block high-order structural blocks like grids, lists, or mathematical subscripts. Use the raw JSON schema path for those layout features!`,
        { parse_mode: 'HTML' }
      );
      return;
    }
  }

  // Route 3: Render Standard Typography Markdown
  try {
    await ctx.reply(`✨ *Markdown Rendering Result*:\n\n${rawInput}`, { parse_mode: 'Markdown' });
  } catch (markdownError) {
    await ctx.reply(
      `❌ <b>Markdown Parse Failure</b>\n\n` +
      `🚨 <b>Error Vector:</b> <code>${escapeHTML(markdownError.message)}</code>\n\n` +
      `💡 <i>Check:</i> Ensure all symbols (<code>*</code>, <code>_</code>, <code>\`</code>) are correctly closed and balanced.`,
      { parse_mode: 'HTML' }
    );
  }
});

bot.catch((err) => console.error('⚠️ Runtime Environment Exception Captured:', err.message));

// ==========================================
// BUILT-IN REFERENCE GUIDE WEB INTERFACE (MINI APP)
// ==========================================
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Formatting Blueprint Hub</title>
      <script src="https://telegram.org/js/telegram-web-app.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #182533; color: #fff; padding: 15px; margin: 0; }
        h2 { color: #64b5f6; margin-top: 0; border-bottom: 2px solid #24313f; padding-bottom: 8px; }
        h3 { color: #81c784; margin-bottom: 6px; }
        .card { background: #202b36; border: 1px solid #2b394a; border-radius: 8px; padding: 14px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        code { background: #111a24; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', Courier, monospace; color: #f48fb1; font-size: 13px; }
        pre { background: #111a24; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; border: 1px solid #1a222c; }
        ul { padding-left: 20px; margin: 8px 0; font-size: 14px; color: #b0bec5; }
        li { margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <h2>📖 Telegram Layout Specs Map</h2>
      <p style="font-size: 13px; color: #b0bec5;">Quick-reference documentation engine configured for Bot API 10.1.</p>
      
      <div class="card">
        <h3>1. Native Inline HTML Tags</h3>
        <p style="font-size: 13px; margin: 4px 0;">Supported structures under <code>parse_mode: 'HTML'</code>:</p>
        <ul>
          <li><code>&lt;b&gt;bold text&lt;/b&gt;</code></li>
          <li><code>&lt;i&gt;italicized text&lt;/i&gt;</code></li>
          <li><code>&lt;u&gt;underlined text&lt;/u&gt;</code></li>
          <li><code>&lt;s&gt;strikethrough text&lt;/s&gt;</code></li>
          <li><code>&lt;tg-spoiler&gt;spoiler masking&lt;/tg-spoiler&gt;</code></li>
          <li><code>&lt;code&gt;inline Monospace&lt;/code&gt;</code></li>
        </ul>
      </div>

      <div class="card">
        <h3>2. Structural Rich Messages JSON Block</h3>
        <p style="font-size: 13px; margin: 4px 0;">Pass structured code blocks to test layout matrices like native tables or inline headers:</p>
        <pre>{
  "blocks": [
    {
      "type": "heading",
      "level": 1,
      "text": { "text": "Leaderboard" }
    },
    {
      "type": "table",
      "rows": [
        {
          "cells": [
            { "text": { "text": "Rank" } },
            { "text": { "text": "User" } }
          ]
        }
      ]
    }
  ]
}</pre>
      </div>

      <script>
        // Initialization configuration checks for the internal Telegram application sandbox
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      </script>
    </body>
    </html>
  `);
});

server.listen(PORT, () => console.log(`🌐 Internal HTTP Server mapping tracking validations on port: ${PORT}`));

bot.launch()
  .then(() => console.log('🚀 Playground Infrastructure Initialization Succeeded.'))
  .catch((err) => console.error('❌ Engine Launch Interrupted:', err.message));

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
