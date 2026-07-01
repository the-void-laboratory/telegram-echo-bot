const sessions = new Map();
const DEFAULT_SESSION = { mode: 'assistant', format: 'rich-html', skipEntityDetection: false, isRtl: false, geminiApiKey: null };
export function getSession(userId) { if (!sessions.has(userId)) sessions.set(userId, { ...DEFAULT_SESSION }); return sessions.get(userId); }
