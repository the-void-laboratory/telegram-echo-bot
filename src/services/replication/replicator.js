import { getEntities, getMediaType, getMessageText } from './inspector.js';
export function buildReplicationPayload(message) {
  const reply_markup = message.reply_markup;
  const entities = getEntities(message);
  const text = getMessageText(message);
  const mediaType = getMediaType(message);
  const common = reply_markup ? { reply_markup } : {};
  if (mediaType === 'text') return { method:'sendMessage', payload:{ text, entities, ...common } };
  const file = mediaType === 'photo' ? message.photo?.at(-1)?.file_id : message[mediaType]?.file_id;
  const payload = { [mediaType]: file, caption: message.caption, caption_entities: message.caption_entities, ...common };
  const method = ({ photo:'sendPhoto', video:'sendVideo', animation:'sendAnimation', audio:'sendAudio', document:'sendDocument', sticker:'sendSticker', voice:'sendVoice', video_note:'sendVideoNote' })[mediaType];
  return { method, payload };
}
export async function replicateMessage(ctx, message) {
  const { method, payload } = buildReplicationPayload(message);
  if (!method) throw new Error('This message type cannot be replicated with the current Bot API payload.');
  return ctx.telegram.callApi(method, { chat_id: ctx.chat.id, ...payload });
}
