function log(level, message, meta) {
  const suffix = meta ? ` ${JSON.stringify(meta, Object.getOwnPropertyNames(meta))}` : '';
  console[level](`[${new Date().toISOString()}] ${message}${suffix}`);
}
export const logger = {
  info: (message, meta) => log('log', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta)
};
