import { Telegraf } from 'telegraf';
import { config, validateEnvironment } from './config/env.js';
import { logger } from './utils/logger.js';
import { createServer } from './routes/server.js';
import { errorBoundary } from './middlewares/errorBoundary.js';
import { registerCommands } from './commands/index.js';
import { registerMenuHandlers } from './handlers/menuHandler.js';
import { handleTextMessage } from './handlers/textHandler.js';
const env = validateEnvironment();
if (!env.ok) { env.errors.forEach((error) => logger.error(error)); process.exit(1); }
const bot = new Telegraf(config.botToken);
bot.use(errorBoundary());
registerCommands(bot); registerMenuHandlers(bot);
bot.on('message', handleTextMessage);
bot.catch((err) => logger.error('Unhandled bot error', err));
createServer().listen(config.port, () => logger.info(`Server listening on ${config.port}`));
bot.launch().then(() => logger.info('Bot launched')).catch((err) => logger.error('Failed to launch bot', err));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
