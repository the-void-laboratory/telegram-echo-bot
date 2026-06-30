import { Telegraf } from 'telegraf';

// ==========================================
// CONFIGURATION: Replace the text inside the quotes with your BotFather token
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

// 3. Handle incoming text messages (ignoring commands)
bot.on('message', async (ctx) => {
  if (!ctx.message || !ctx.message.text) return;
  if (ctx.message.text.startsWith('/')) return; 

  try {
    const entities = ctx.message.entities || [];

    // Reply using the exact same text and original entity formatting array.
    await ctx.reply(ctx.message.text, {
      entities: entities
    });
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

// Start the bot
bot.launch()
  .then(() => console.log('🚀 Telegram Echo Bot is up and running successfully!'))
  .catch((err) => {
    console.error('❌ Failed to launch the bot.');
    console.error('Please verify that your BotFather token is correct and that your server has internet access.');
    console.error('Error details:', err.message);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
