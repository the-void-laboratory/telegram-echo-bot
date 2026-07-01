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
import { buildBeautificationTask, extractBeautificationText, isBeautificationRequest, parseRichMessageJson } from '../services/formatter/beautifier.js';
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
async function answerWithAssistant(ctx, input) {
  await ctx.sendChatAction('typing');
  try {
    if (isBeautificationRequest(input)) return answerWithBeautifiedRichMessage(ctx, input);
    const answer = await callGemini('Reply as a natural developer assistant. Keep it concise unless the user asks for depth.', input, getGeminiApiKey(ctx));
    return ctx.reply(escapeHTML(truncate(answer, 3900)), { parse_mode:'HTML', ...menuKeyboard() });
  } catch (error) {
    const message = error.message?.includes('GEMINI_API_KEY') ? 'Gemini is not configured yet. Ask the bot owner to set <code>GEMINI_API_KEY</code>, or use <code>/setgemini YOUR_API_KEY</code> if you are the configured owner.' : `I could not reach Gemini right now. Please try again shortly.\n\n<code>${escapeHTML(error.message || 'Unknown error')}</code>`;
    return ctx.reply(message, { parse_mode:'HTML', ...menuKeyboard() });
  }
}
async function answerWithBeautifiedRichMessage(ctx, input) {
  const textToBeautify = extractBeautificationText(input);
  if (!textToBeautify.trim()) return ctx.reply('Send the text you want beautified, and I will format it as a Telegram Rich Message.', { parse_mode:'HTML', ...menuKeyboard() });
  let validationErrors = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const output = await callGemini(buildBeautificationTask(textToBeautify, validationErrors), textToBeautify, getGeminiApiKey(ctx));
    let richMessage;
    try {
      richMessage = parseRichMessageJson(output);
    } catch (error) {
      validationErrors = [{ index:0, message:error.message || 'Invalid Rich Message JSON.' }];
      continue;
    }
    const validation = validateRichMessageInput(richMessage);
    if (validation.ok) {
      await sendRichMessage(ctx, richMessage);
      return undefined;
    }
    validationErrors = validation.errors;
  }
  const issues = validationErrors.map((error, index) => `${index + 1}. offset ${error.index}: ${escapeHTML(error.message)}`).join('\n');
  return ctx.reply(`I generated a Rich Message, but it did not pass validation yet.\n\n<pre>${issues}</pre>`, { parse_mode:'HTML', ...menuKeyboard() });
}
export async function handleTextMessage(ctx) {
  if (!ctx.message?.text || ctx.message.text.startsWith('/')) return;
  const session = getSession(ctx.from.id); const input = ctx.message.text;
  if (session.mode === 'validate') return replyValidation(ctx, input);
  if (session.mode === 'fix') return replyValidation(ctx, input, true);
  if (session.mode === 'preview') return preview(ctx, input);
  return answerWithAssistant(ctx, input);
}
