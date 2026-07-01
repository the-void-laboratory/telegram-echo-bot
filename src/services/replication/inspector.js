import { escapeHTML } from '../../utils/html.js';
const MEDIA_FIELDS = ['photo','video','animation','audio','document','sticker','voice','video_note'];
export function isForwardedFromBot(message) {
  if (message.forward_from?.is_bot) return true;
  if (message.forward_origin?.type === 'user' && message.forward_origin.sender_user?.is_bot) return true;
  return false;
}
export function getMessageText(message) { return message.text || message.caption || ''; }
export function getEntities(message) { return message.entities || message.caption_entities || []; }
export function getMediaType(message) { return MEDIA_FIELDS.find((field) => message[field]) || 'text'; }
export function inspectMessage(message) {
  const text = getMessageText(message);
  const entities = getEntities(message);
  const keyboard = message.reply_markup?.inline_keyboard || [];
  return { messageType: getMediaType(message), text, caption: message.caption || null, entities, parseMode: entities.length ? 'entities (original parse_mode is not exposed)' : 'none/unknown', mediaType: getMediaType(message) === 'text' ? null : getMediaType(message), inlineKeyboard: keyboard.map((row) => row.map((button) => ({ text: button.text, url: button.url, callback_data: button.callback_data, web_app: button.web_app?.url }))), canReplicate: true, limitations: ['Telegram does not expose the original parse_mode after delivery.', 'Hidden/protected forward origins and some callback behavior cannot be recovered.', 'Files can be resent only when a file_id is present and still valid.'], issues: entities.length ? [] : ['No formatting entities were exposed for this message.'] };
}
export function formatInspectionReport(inspection) {
  const entities = inspection.entities.map((e, i) => `${i + 1}. ${e.type} offset=${e.offset} length=${e.length}${e.url ? ` url=${e.url}` : ''}${e.custom_emoji_id ? ` custom_emoji_id=${e.custom_emoji_id}` : ''}`).join('\n') || 'None';
  const keyboard = inspection.inlineKeyboard.map((row, i) => `Row ${i + 1}: ${row.map((b) => `${b.text}${b.url ? ` → ${b.url}` : b.callback_data ? ' [callback]' : ''}`).join(' | ')}`).join('\n') || 'None';
  return `🔎 <b>Forwarded Bot Message Inspector</b>\n\n<b>Message type:</b> <code>${inspection.messageType}</code>\n<b>Media type:</b> <code>${inspection.mediaType || 'none'}</code>\n<b>Parse mode:</b> <code>${inspection.parseMode}</code>\n<b>Caption:</b> <code>${inspection.caption ? 'yes' : 'no'}</code>\n\n<b>Entities</b>\n<pre>${escapeHTML(entities)}</pre>\n\n<b>Inline keyboard</b>\n<pre>${escapeHTML(keyboard)}</pre>\n\n<b>Compatibility</b>\n${inspection.canReplicate ? '✅ Replication is possible with exposed Bot API fields.' : '❌ Replication is limited.'}\n\n<b>Potential issues</b>\n<pre>${escapeHTML(inspection.issues.join('\n') || 'No obvious formatting issues.')}</pre>\n\n<b>Limitations</b>\n<pre>${escapeHTML(inspection.limitations.join('\n'))}</pre>`;
}
export function exportInspection(inspection) { return JSON.stringify(inspection, null, 2); }
