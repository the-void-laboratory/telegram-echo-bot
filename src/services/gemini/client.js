import { config } from '../../config/env.js';
export async function callGemini(task, userText, apiKey = config.geminiApiKey) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
  const system = 'You are a Telegram Bot API Rich Messages expert. Output valid Telegram Rich HTML unless asked a question. Explain Telegram Bot API limitations honestly.';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ contents:[{ parts:[{ text:`${system}\n\nTask: ${task}\n\nUser input:\n${userText}` }] }] }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Gemini failed with HTTP ${response.status}`);
  return body.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim() || '';
}
