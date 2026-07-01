import { config } from '../config/env.js';
import { getSession } from '../services/telegram/session.js';
import { callGemini } from '../services/gemini/client.js';
import { sendRichMessage } from '../services/telegram/api.js';
import { buildRichMessage } from '../services/formatter/richMessageBuilder.js';
import { repairHTML } from '../services/formatter/repair.js';
import { validateRichMessageInput } from '../validators/richMessageValidator.js';
import { detectFormat } from '../parsers/formatParser.js';
import { escapeHTML, truncate } from '../utils/html.js';
import { menuKeyboard } from '../keyboards/menuKeyboard.js';
function isOwner(ctx) { return Boolean(config.botOwnerId && Number(ctx.from?.id) === config.botOwnerId); }
function getGeminiApiKey(ctx) { const session = getSession(ctx.from.id); return isOwner(ctx) && session.geminiApiKey ? session.geminiApiKey : config.geminiApiKey; }
export async function replyValidation(ctx, input, autoFix = false) {
  const validation = validateRichMessageInput(input);
  const detected = detectFormat(input);
  const repaired = detected.kind === 'rich-html' ? repairHTML(detected.content) : detected.content;
  const repairedValidation = validateRichMessageInput(repaired);
  const issues = validation.ok ? 'No validation errors found.' : validation.errors.map((e, i) => `${i + 1}. offset ${e.index}: ${escapeHTML(e.message)}\n   Fix: ${escapeHTML(e.fix)}`).join('\n');
  let message = `${validation.ok ? '✅' : '❌'} <b>Formatting Validation</b>\n\n<pre>${issues}</pre>`;
  if (autoFix && !validation.ok && repairedValidation.ok) message += `\n\n<b>Auto-repaired ${detected.kind === 'rich-html' ? 'HTML' : 'Markdown'}:</b>\n<pre>${escapeHTML(truncate(repaired))}</pre>`;
  return ctx.reply(message, { parse_mode:'HTML' });
}
export async function preview(ctx, input) {
  const validation = validateRichMessageInput(input);
  if (!validation.ok) return replyValidation(ctx, input);
  const richMessage = buildRichMessage(input, getSession(ctx.from.id));
  await sendRichMessage(ctx, richMessage);
  return ctx.reply(`<b>Underlying InputRichMessage</b>\n<pre>${escapeHTML(JSON.stringify(richMessage, null, 2))}</pre>`, { parse_mode:'HTML' });
}
export async function handleTextMessage(ctx) {
  if (!ctx.message?.text || ctx.message.text.startsWith('/')) return;
  const session = getSession(ctx.from.id); const input = ctx.message.text.trim();
  if (session.mode === 'validate') return replyValidation(ctx, input);
  if (session.mode === 'fix') return replyValidation(ctx, input, true);
  if (session.mode === 'beautify') { const html = await callGemini('Beautify this plain text into valid Telegram Rich HTML. Return only the Rich HTML.', input, getGeminiApiKey(ctx)); const repaired = repairHTML(html.replace(/^```(?:html)?\s*|```$/g, '').trim()); const validation = validateRichMessageInput(repaired); if (!validation.ok) return replyValidation(ctx, repaired, true); await sendRichMessage(ctx, { html: repaired }); return ctx.reply(`<b>Generated Rich HTML</b>\n<pre>${escapeHTML(truncate(repaired))}</pre>`, { parse_mode:'HTML' }); }
  if (session.mode === 'ask') { const answer = await callGemini('Answer this Telegram formatting question concisely and accurately. If giving examples, use valid Rich HTML.', input, getGeminiApiKey(ctx)); return ctx.reply(escapeHTML(truncate(answer)), { parse_mode:'HTML', ...menuKeyboard() }); }
  return preview(ctx, input);
}
