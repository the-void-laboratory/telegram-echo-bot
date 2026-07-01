import { escapeHTML } from '../utils/html.js';
import { logger } from '../utils/logger.js';
export function errorBoundary() {
  return async (ctx, next) => { try { await next(); } catch (error) { logger.error('Handler error', error); await ctx.reply(`❌ <b>Error</b>\n<code>${escapeHTML(error.message || String(error))}</code>`, { parse_mode:'HTML' }).catch(() => undefined); } };
}
