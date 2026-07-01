import { config } from '../../config/env.js';
export async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) throw new Error(body.description || `Telegram ${method} failed with HTTP ${response.status}`);
  return body.result;
}
export function sendRichMessage(ctx, richMessage) { return callTelegram('sendRichMessage', { chat_id: ctx.chat.id, rich_message: richMessage }); }
