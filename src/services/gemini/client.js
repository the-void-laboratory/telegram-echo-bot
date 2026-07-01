import { config } from '../../config/env.js';

const TELEGRAM_DOC_URLS = [
  'https://core.telegram.org/bots/api-changelog#june-11-2026',
  'https://core.telegram.org/bots/api#rich-messages'
];
const TELEGRAM_TOPIC_PATTERN = /\b(telegram|bot api|rich messages?|markdownv2?|parse[_ -]?mode|message entities?|inline keyboard|telegraf|callback query|web app|custom emoji|spoiler|blockquote|html formatting)\b/i;
const DOC_CACHE_TTL_MS = 30 * 60 * 1000;
let docCache = { fetchedAt: 0, text: '' };

function stripHtml(html) { return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
export function isTelegramTopic(text) { return TELEGRAM_TOPIC_PATTERN.test(text); }
async function fetchTelegramDocs() {
  if (docCache.text && Date.now() - docCache.fetchedAt < DOC_CACHE_TTL_MS) return docCache.text;
  const pages = await Promise.all(TELEGRAM_DOC_URLS.map(async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Telegram documentation fetch failed for ${url} with HTTP ${response.status}`);
    return `Source: ${url}\n${stripHtml(await response.text()).slice(0, 45000)}`;
  }));
  docCache = { fetchedAt: Date.now(), text: pages.join('\n\n---\n\n') };
  return docCache.text;
}

const SYSTEM_PROMPT = `You are the concise, friendly AI assistant powering the Telegram bot "From Dev → DEV".

Handle casual conversation, greetings, programming questions, JavaScript help, debugging, code review, Telegram Bot API questions, Rich Messages, HTML formatting, MarkdownV2, and Telegram development advice naturally.

Keep answers concise by default. Provide deeper explanations only when the user asks for detail.

For any Telegram Bot API, Rich Messages, formatting, MarkdownV2, parse mode, entity, or Telegram development answer, use the official Telegram documentation context provided in the prompt as the source of truth. If the documentation context is unavailable or does not confirm a claim, say that you cannot verify it from the official docs instead of relying on memory. Never invent Telegram API fields or unsupported syntax.`;

export async function callGemini(task, userText, apiKey = config.geminiApiKey) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  const needsTelegramDocs = isTelegramTopic(`${task}\n${userText}`);
  let documentation = '';
  if (needsTelegramDocs) {
    try {
      documentation = await fetchTelegramDocs();
    } catch (error) {
      documentation = `Official Telegram documentation could not be fetched: ${error.message}. Tell the user you cannot verify Telegram-specific claims from the official docs right now.`;
    }
  }
  const prompt = `${SYSTEM_PROMPT}\n\nTask: ${task}\n\n${documentation ? `Official Telegram documentation context:\n${documentation}\n\n` : ''}User input:\n${userText}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Gemini failed with HTTP ${response.status}`);
  return body.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim() || '';
}
