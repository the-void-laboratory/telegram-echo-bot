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

  try {
    const entities = ctx.message.entities || [];
    await ctx.reply(ctx.message.text, { entities: entities });
  } catch (error) {
    console.error('Failed to echo message:', error.message);
    try {
      await ctx.reply(ctx.message.text);
    } catch (fallbackError) {
      console.error('Critical fallback failure:', fallbackError.message);
    }
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
