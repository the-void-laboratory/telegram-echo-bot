import { Markup } from 'telegraf';

export const MENU = [
  ['📖 Preview Text', '🛠 Validate Formatting'],
  ['🔍 Fix Formatting', '🤖 AI Assistant'],
  ['📚 Formatting Guide', '🆕 Rich Messages'],
  ['⚙️ Settings', '❓ Help']
];
export function menuKeyboard() { return Markup.keyboard(MENU).resize(); }
