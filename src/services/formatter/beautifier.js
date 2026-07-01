const BEAUTIFY_PATTERNS = [
  /\bbeautif(?:y|ied|ication)\b/i,
  /\bmake\s+(?:this|it|my\s+message)?\s*(?:look\s+)?(?:better|professional|polished|cleaner|nice|presentable)\b/i,
  /\bformat\s+(?:this|it|my\s+message|the\s+message)\b/i,
  /\bimprove\s+(?:this|it|my\s+message|the\s+message)\b/i,
  /\bconvert\s+(?:this|it|my\s+message|the\s+message)?\s*(?:to|into)\s+telegram\s+rich\s+messages?\b/i
];

const LEADING_INSTRUCTION = /^(?:please\s+)?(?:beautify\s+this|make\s+(?:this|it|my\s+message)?\s*(?:look\s+)?(?:better|professional|polished|cleaner|nice|presentable)|format\s+(?:this|it|my\s+message|the\s+message)|improve\s+(?:this|it|my\s+message|the\s+message)|convert\s+(?:this|it|my\s+message|the\s+message)?\s*(?:to|into)\s+telegram\s+rich\s+messages?)\s*[:\-]?\s*/i;

export function isBeautificationRequest(input) {
  return BEAUTIFY_PATTERNS.some((pattern) => pattern.test(input));
}

export function extractBeautificationText(input) {
  const withoutLeadingInstruction = input.replace(LEADING_INSTRUCTION, '');
  return withoutLeadingInstruction === input ? input : withoutLeadingInstruction.replace(/^\r?\n/, '');
}

export function buildBeautificationTask(userText, validationErrors = []) {
  const retryGuidance = validationErrors.length
    ? `\n\nPrevious Rich Message validation failed. Fix these issues and return corrected JSON only:\n${validationErrors.map((error, index) => `${index + 1}. offset ${error.index}: ${error.message}`).join('\n')}`
    : '';

  return `Beautify the supplied user text as a Telegram Rich Message.

Return ONLY valid minified JSON shaped exactly like {"html":"..."}.
Do not return Markdown unless explicitly asked, and this user did not explicitly ask for Markdown.
Use Telegram Rich Message HTML, not MarkdownV2.
Preserve the original text's wording, tone, intent, information, paragraph spacing, blank lines, indentation, numbered lists, bullet lists, code blocks, quotations, existing line breaks, emojis, and URLs.
Beautification means presentation only: do not paraphrase, summarize, reorder, collapse paragraphs, or rewrite the message unless the user explicitly asks for rewriting.
You may add light Telegram Rich Message HTML where useful: h1-h6 headings, b/strong, i/em, u/ins, blockquote, details/summary for expandable quotes, code, pre, ul/ol/li, p, br, tg-spoiler only when requested or contextually appropriate.
Keep simple messages simple and avoid over-formatting.
Ensure every entity is allowed by the Telegram Bot API Rich Messages rules and nesting is valid before returning JSON.${retryGuidance}

Text to beautify:
${userText}`;
}

export function parseRichMessageJson(output) {
  const trimmed = String(output || '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Gemini did not return a JSON object.');
  if (typeof parsed.html !== 'string') throw new Error('Gemini did not return a Rich Message html field.');
  if ('markdown' in parsed) throw new Error('Gemini returned markdown; Rich Message HTML is required for beautification.');
  return {
    html: parsed.html,
    is_rtl: Boolean(parsed.is_rtl),
    skip_entity_detection: Boolean(parsed.skip_entity_detection)
  };
}
