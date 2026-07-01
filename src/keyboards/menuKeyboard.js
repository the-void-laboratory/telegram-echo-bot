import { Markup } from 'telegraf';
export const MENU = [
  ['📖 Preview Text', '✨ Beautify Text (AI)'],
  ['🛠 Validate Formatting', '🔍 Fix Formatting'],
  ['🔁 Replicate Bot Message', '🧠 Ask AI'],
  ['📚 Formatting Guide', '🆕 Rich Messages Examples'],
  ['⚙️ Settings', 'ℹ️ About'],
  ['❓ Help']
];
export function menuKeyboard() { return Markup.keyboard(MENU).resize(); }
export function inspectorKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔁 Replicate', 'inspect:replicate'), Markup.button.callback('📋 Copy HTML', 'inspect:copy')],
    [Markup.button.callback('📤 Export JSON', 'inspect:export'), Markup.button.callback('✨ Beautify', 'inspect:beautify')],
    [Markup.button.callback('🛠 Validate', 'inspect:validate')]
  ]);
}
