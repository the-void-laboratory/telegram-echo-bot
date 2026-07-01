import { MENU, menuKeyboard } from '../keyboards/menuKeyboard.js';
import { getSession } from '../services/telegram/session.js';
import { modePrompt } from '../menus/texts.js';
import { guideText, exampleText, aboutText, helpText, settingsText } from '../menus/texts.js';
import { config } from '../config/env.js';
export function registerMenuHandlers(bot) {
  bot.action(/^mode:(preview|beautify|validate|fix|ask|replicate)$/, async (ctx) => { getSession(ctx.from.id).mode = ctx.match[1]; await ctx.answerCbQuery(); return ctx.reply(modePrompt(ctx.match[1]), menuKeyboard()); });
  bot.hears(MENU.flat(), async (ctx) => {
    const label = ctx.message.text; const session = getSession(ctx.from.id);
    const modes = { '📖 Preview Text':'preview', '✨ Beautify Text (AI)':'beautify', '🛠 Validate Formatting':'validate', '🔍 Fix Formatting':'fix', '🧠 Ask AI':'ask', '🔁 Replicate Bot Message':'replicate' };
    if (modes[label]) { session.mode = modes[label]; return ctx.reply(modePrompt(session.mode), menuKeyboard()); }
    if (label === '📚 Formatting Guide') return ctx.reply(guideText, { parse_mode:'HTML', ...menuKeyboard() });
    if (label === '🆕 Rich Messages Examples') return ctx.reply(exampleText, { parse_mode:'HTML', ...menuKeyboard() });
    if (label === '⚙️ Settings') return ctx.reply(settingsText(session, config), { parse_mode:'HTML', ...menuKeyboard() });
    if (label === 'ℹ️ About') return ctx.reply(aboutText, { parse_mode:'HTML', ...menuKeyboard() });
    return ctx.reply(helpText({ hasGlobalGeminiKey:Boolean(config.geminiApiKey), hasSessionGeminiKey:Boolean(session.geminiApiKey), ownerConfigured:Boolean(config.botOwnerId) }), { parse_mode:'HTML', ...menuKeyboard() });
  });
}
