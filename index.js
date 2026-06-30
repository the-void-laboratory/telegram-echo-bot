import { Telegraf } from 'telegraf';
import http from 'http'; // <-- This was missing or got cut off!

// ==========================================
// CONFIGURATION: Replace with your token
// ==========================================
const BOT_TOKEN = '8842774625:AAHKbtnsqHjmyuMySVBW6hz9o716JOi4_qw';

const bot = new Telegraf(BOT_TOKEN);

// 1. Welcome Command (/start)
bot.start((ctx) => {
  const firstName = ctx.from.first_name || 'there';
  const welcomeMessage = `👋 *Hello, ${firstName}!* \n\nWelcome to the Echo Bot. I will instantly mirror back any text message you send me, preserving your formatting! \n\nType /help to see how to use me.`;
  ctx.replyWithMarkdown(welcomeMessage);
});

// 2. How to Use Command (/help)
bot.help((ctx) => {
  const helpMessage = `📖 *How to Use the Bot*:\n\n` +
    `1. Simply send me any text message.\n` +
    `2. You can use *Bold*, _Italics_, \`Code Blocks\`, or [Links](https://telegram.org).\n` +
    `3. I will instantly reply with the exact same message and formatting.\n\n` +
    `Give it a try!`;
  ctx.replyWithMarkdown(helpMessage);
});

// 3. Handle incoming text messages
bot.on('message', async (ctx) => {
  if (!ctx.message || !ctx.message.text) return;
  if (ctx.message.text.startsWith('/')) return; 

  const inputText = ctx.message.text;

  // 1. Try rendering as HTML first
  if (inputText.includes('<') && inputText.includes('>')) {
    try {
      await ctx.reply(`✨ *HTML Preview*:\n\n${inputText}`, { parse_mode: 'HTML' });
      return; // Success! Stop here.
    } catch (htmlError) {
      // If HTML parsing fails (e.g. unclosed tags), move to fallback
      console.log('HTML parsing failed, trying Markdown...');
    }
  }

  // 2. Try rendering as Markdown (supports legacy Markdown and MarkdownV2 symbols)
  try {
    await ctx.reply(`✨ *Markdown Preview*:\n\n${inputText}`, { parse_mode: 'Markdown' });
  } catch (markdownError) {
    
    // 3. Fallback: If both fail, the user made a syntax error. Show them a helpful warning.
    const safeText = inputText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    await ctx.reply(
      `❌ *Parsing Error!*\n\n` +
      `Your code has a syntax error (like an unclosed tag or unescaped symbol).\n\n` +
      `📦 *Raw Text Received*:\n<pre><code>${safeText}</code></pre>`, 
      { parse_mode: 'HTML' }
    );
  }
});

// Global error handling
bot.catch((err, ctx) => {
  console.error(`Telegraf encountered an error for ${ctx.updateType}`, err);
});

// ==========================================
// RENDER PORT BINDING FIX
// ==========================================
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running alive and well!\n');
});

server.listen(PORT, () => {
  console.log(`🌐 Dummy web server listening on port ${PORT} for Render tracking.`);
});

// Start the bot
bot.launch()
  .then(() => console.log('🚀 Telegram Echo Bot is up and running successfully on Render!'))
  .catch((err) => console.error('❌ Failed to launch the bot:', err.message));

// Enable graceful stop
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  server.close();
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  server.close();
});
