const sessions = new Map();
const DEFAULT_SESSION = { mode: 'preview', format: 'rich-html', skipEntityDetection: false, isRtl: false, geminiApiKey: null, lastInspection: null };
export function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, { ...DEFAULT_SESSION });
  return sessions.get(userId);
}
