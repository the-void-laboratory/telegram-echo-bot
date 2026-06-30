import { Telegraf, Markup } from 'telegraf';
import http from 'http';

// ==========================================
// CONFIGURATION: Paste your BotFather token here
// ==========================================
const BOT_TOKEN = '8842774625:AAHKbtnsqHjmyuMySVBW6hz9o716JOi4_qw';

const bot = new Telegraf(BOT_TOKEN);

// Quick helper to escape text for safe error display
const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 1. Welcome Command
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'Developer';
  ctx.reply(
    `🛠️ <b>Telegram formatting Engine Playground</b>\n\n` +
    `Hello ${firstName}! Use this bot to preview how your code layouts will render in production.\n\n` +
    `🔹 <b>Options:</b>\n` +
    `• Send plain HTML tags (e.g., <code>&lt;b&gt;text&lt;/b&gt;</code>)\n` +
    `• Send Markdown syntax (e.g., <code>*text*</code>)\n` +
    `• Send a JSON structure bound to <code>sendRichMessage</code> to test tables, lists, sub, and superscripts!\n\n` +
    `👇 Click below to open the Formatting Docs & Reference directly inside Telegram!`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('📖 Open Formatting Guide App', `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:3000'}/`)]
      ])
    }
  );
});

// 2. Main Processing Logic
bot.on('message', async (ctx) => {
  if (!ctx.message || !ctx.message.text) return;
  if (ctx.message.text.startsWith('/')) return;

  const inputText = ctx.message.text.trim();

  // Test Case A: Check if it's a structural Rich Message JSON payload
  if (inputText.startsWith('{') && inputText.endsWith('}')) {
    try {
      const layoutPayload = JSON.parse(inputText);
      
      // Send directly via the modern API endpoint
      await ctx.telegram.callApi('sendRichMessage', {
        chat_id: ctx.chat.id,
        rich_message: layoutPayload
      });
      return;
    } catch (err) {
      await ctx.reply(
        `❌ <b>sendRichMessage JSON Error!</b>\n\n` +
        `🚨 <i>Reason:</i> <code>${escapeHTML(err.message)}</code>\n\n` +
        `💡 <i>Tip:</i> Verify your structure conforms to the <code>InputRichMessage</code> schema containing block elements.`,
        { parse_mode: 'HTML' }
      );
      return;
    }
  }

  // Test Case B: Treat as regular HTML syntax if tags are found
  if (inputText.includes('<') && inputText.includes('>')) {
    try {
      await ctx.reply(`✨ <b>HTML Preview:</b>\n\n${inputText}`, { parse_mode: 'HTML' });
      return;
    } catch (htmlError) {
      await ctx.reply(
        `❌ <b>HTML Parse Rejection</b>\n\n` +
        `🚨 <i>Error:</i> <code>${escapeHTML(htmlError.message)}</code>\n\n` +
        `💡 <i>Notice:</i> Standard HTML parse_mode rejects structural markers like tables, lists, sub, or sup. Wrap those inputs in JSON block strings instead!`,
        { parse_mode: 'HTML' }
      );
      return;
    }
  }

  // Test Case C: Standard Markdown syntax parser
  try {
    await ctx.reply(`✨ *Markdown Preview*:\n\n${inputText}`, { parse_mode: 'Markdown' });
  } catch (markdownError) {
    await ctx.reply(
      `❌ <b>Markdown Parse Rejection</b>\n\n` +
      `🚨 <i>Error:</i> <code>${escapeHTML(markdownError.message)}</code>`,
      { parse_mode: 'HTML' }
    );
  }
});

// Global Bot Catch Rules
bot.catch((err) => console.error('Telegraf encountered an issue:', err.message));

// ==========================================
// BUILT-IN MINI APP & PORT BINDING SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Formatting Guide App</title>
      <script src="https://telegram.org/js/telegram-web-app.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #182533; color: #fff; padding: 15px; margin: 0; }
        h2 { color: #64b5f6; margin-top: 0; }
        .card { background: #202b36; border: 1px solid #2b394a; border-radius: 8px; padding: 12px; margin-bottom: 15px; }
        code { background: #111a24; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #f48fb1; font-size: 14px; }
        pre { background: #111a24; padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px; }
        th, td { padding: 8px; border: 1px solid #2b394a; text-align: left; }
        th { background: #24313f; color: #64b5f6; }
      </style>
    </head>
    <body>
      <h2>📖 Telegram Formatting Guide</h2>
      <p>A quick-reference dashboard for bot engineers.</p>
      
      <div class="card">
        <h3>1. Standard HTML Elements</h3>
        <p>Supported inline strings under <code>parse_mode: 'HTML'</code>:</p>
        <ul>
          <li><code>&lt;b&gt;bold&lt;/b&gt;</code></li>
          <li><code>&lt;i&gt;italic&lt;/i&gt;</code></li>
          <li><code>&lt;u&gt;underline&lt;/u&gt;</code></li>
          <li><code>&lt;tg-spoiler&gt;spoiler&lt;/tg-spoiler&gt;</code></li>
        </ul>
      </div>

      <div class="card">
        <h3>2. Rich Layout Engine (sendRichMessage)</h3>
        <p>Paste structures like this into the bot to deploy advanced components:</p>
        <pre>{
  "blocks": [
    {
      "type": "paragraph",
      "text": { "text": "Leaderboard Grid", "entities": [] }
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
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      </script>
    </body>
    </html>
  `);
});

server.listen(PORT, () => console.log(`🌐 Server active on interface port ${PORT}`));

bot.launch()
  .then(() => console.log('🚀 Playground Engine online!'))
  .catch((err) => console.error('Launch failure:', err.message));

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
