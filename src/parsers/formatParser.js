export function detectFormat(input) {
  const trimmed = String(input || '').trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed.html === 'string') return { kind: 'rich-html', content: parsed.html, options: parsed };
      if (typeof parsed.markdown === 'string') return { kind: 'rich-markdown', content: parsed.markdown, options: parsed };
      return { kind: 'json', content: trimmed, options: parsed };
    } catch { return { kind: 'json-invalid', content: trimmed }; }
  }
  if (/<[a-zA-Z][^>]*>/.test(trimmed) || /<\/[a-zA-Z][^>]*>/.test(trimmed)) return { kind: 'rich-html', content: trimmed };
  return { kind: 'rich-markdown', content: trimmed };
}
