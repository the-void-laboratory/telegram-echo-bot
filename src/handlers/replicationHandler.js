import { getSession } from '../services/telegram/session.js';
import { inspectMessage, isForwardedFromBot, formatInspectionReport, exportInspection } from '../services/replication/inspector.js';
import { replicateMessage } from '../services/replication/replicator.js';
import { inspectorKeyboard, menuKeyboard } from '../keyboards/menuKeyboard.js';
import { escapeHTML, truncate } from '../utils/html.js';
import { replyValidation } from './textHandler.js';
export async function handleForwardedBotMessage(ctx, next) {
  if (!ctx.message || ctx.message.text?.startsWith('/')) return next();
  if (!isForwardedFromBot(ctx.message)) return next();
  const inspection = inspectMessage(ctx.message);
  getSession(ctx.from.id).lastInspection = { message: ctx.message, inspection };
  return ctx.reply(formatInspectionReport(inspection), { parse_mode:'HTML', ...inspectorKeyboard() });
}
export function registerInspectionActions(bot) {
  bot.action('inspect:replicate', async (ctx) => { await ctx.answerCbQuery(); const item = getSession(ctx.from.id).lastInspection; if (!item) return ctx.reply('No inspected message is available. Forward a bot message first.', menuKeyboard()); await replicateMessage(ctx, item.message); return ctx.reply('✅ Replicated using exposed Telegram Bot API fields.', menuKeyboard()); });
  bot.action('inspect:copy', async (ctx) => { await ctx.answerCbQuery(); const item = getSession(ctx.from.id).lastInspection; const text = item?.inspection?.text || ''; return ctx.reply(`<b>Copyable text/caption</b>\n<pre>${escapeHTML(truncate(text))}</pre>`, { parse_mode:'HTML' }); });
  bot.action('inspect:export', async (ctx) => { await ctx.answerCbQuery(); const item = getSession(ctx.from.id).lastInspection; if (!item) return ctx.reply('No inspected message is available.'); return ctx.reply(`<b>Inspection JSON</b>\n<pre>${escapeHTML(truncate(exportInspection(item.inspection)))}</pre>`, { parse_mode:'HTML' }); });
  bot.action('inspect:beautify', async (ctx) => { await ctx.answerCbQuery('Beautify mode enabled'); getSession(ctx.from.id).mode = 'beautify'; return ctx.reply('Send text to beautify, or copy the inspected text above and send it here.', menuKeyboard()); });
  bot.action('inspect:validate', async (ctx) => { await ctx.answerCbQuery(); const item = getSession(ctx.from.id).lastInspection; return replyValidation(ctx, item?.inspection?.text || ''); });
}
