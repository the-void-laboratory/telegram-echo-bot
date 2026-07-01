import { config } from '../config/env.js';
import { getSession } from '../services/telegram/session.js';
import { menuKeyboard } from '../keyboards/menuKeyboard.js';
import { mainMenuText, modePrompt, helpText, settingsText, guideText, exampleText, aboutText } from '../menus/texts.js';
function isOwner(ctx) { return Boolean(config.botOwnerId && Number(ctx.from?.id) === config.botOwnerId); }
function ownerOnlyMessage() { return '🔐 <b>Owner-only command.</b> Configure <code>BOT_OWNER_ID</code> with your numeric Telegram user ID.'; }
function setMode(ctx, mode) { getSession(ctx.from.id).mode = mode; return ctx.reply(modePrompt(mode), menuKeyboard()); }
export function registerCommands(bot) {
  bot.start((ctx) => ctx.reply(`${mainMenuText(ctx.from.first_name || 'Developer')}\n\n${modePrompt('assistant')}`, { parse_mode:'HTML', ...menuKeyboard() }));
  bot.command('menu', (ctx) => ctx.reply(mainMenuText(ctx.from.first_name || 'Developer'), { parse_mode:'HTML', ...menuKeyboard() }));
  bot.command('help', (ctx) => { const s = getSession(ctx.from.id); return ctx.reply(helpText({ hasGlobalGeminiKey:Boolean(config.geminiApiKey), hasSessionGeminiKey:Boolean(isOwner(ctx) && s.geminiApiKey), ownerConfigured:Boolean(config.botOwnerId) }), { parse_mode:'HTML', ...menuKeyboard() }); });
  for (const [command, mode] of Object.entries({ preview:'preview', validate:'validate', fix:'fix', assistant:'assistant' })) bot.command(command, (ctx) => setMode(ctx, mode));
  bot.command('convert', (ctx) => setMode(ctx, 'fix'));
  bot.command('docs', (ctx) => ctx.reply(guideText, { parse_mode:'HTML', ...menuKeyboard() }));
  bot.command('examples', (ctx) => ctx.reply(exampleText, { parse_mode:'HTML', ...menuKeyboard() }));
  bot.command('about', (ctx) => ctx.reply(aboutText, { parse_mode:'HTML', ...menuKeyboard() }));
  bot.command('settings', (ctx) => ctx.reply(settingsText(getSession(ctx.from.id), config), { parse_mode:'HTML', ...menuKeyboard() }));
  bot.command('myid', (ctx) => ctx.reply(`Your Telegram user ID is <code>${ctx.from.id}</code>.`, { parse_mode:'HTML' }));
  bot.command('setgemini', (ctx) => { if (!isOwner(ctx)) return ctx.reply(ownerOnlyMessage(), { parse_mode:'HTML' }); const key = ctx.message.text.replace(/^\/setgemini(@\w+)?\s*/i, '').trim(); if (!key) return ctx.reply('Send: <code>/setgemini YOUR_API_KEY</code>', { parse_mode:'HTML' }); getSession(ctx.from.id).geminiApiKey = key; return ctx.reply('✅ Gemini API key saved for this in-memory chat session.', menuKeyboard()); });
  bot.command('cleargemini', (ctx) => { if (!isOwner(ctx)) return ctx.reply(ownerOnlyMessage(), { parse_mode:'HTML' }); getSession(ctx.from.id).geminiApiKey = null; return ctx.reply('✅ Temporary Gemini API key cleared.', menuKeyboard()); });
}
