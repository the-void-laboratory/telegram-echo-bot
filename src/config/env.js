export const config = {
  botToken: process.env.BOT_TOKEN,
  geminiApiKey: process.env.GEMINI_API_KEY,
  botOwnerId: Number(process.env.BOT_OWNER_ID || process.env.OWNER_TELEGRAM_ID || process.env.OWNER_ID || 0),
  publicHost: process.env.RENDER_EXTERNAL_HOSTNAME || process.env.PUBLIC_HOST || 'localhost:3000',
  port: Number(process.env.PORT || 3000),
  maxRichTextLength: 32768,
  maxNestingDepth: 16
};

export function validateEnvironment() {
  const errors = [];
  if (!config.botToken) errors.push('Missing BOT_TOKEN environment variable.');
  if (!Number.isFinite(config.port) || config.port <= 0) errors.push('PORT must be a positive number.');
  return { ok: errors.length === 0, errors };
}
