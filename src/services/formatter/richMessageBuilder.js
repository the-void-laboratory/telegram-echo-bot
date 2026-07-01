import { detectFormat } from '../../parsers/formatParser.js';
export function buildRichMessage(input, session = {}) {
  const detected = detectFormat(input);
  const base = detected.options && (detected.options.html || detected.options.markdown) ? detected.options : detected.kind === 'rich-html' ? { html: detected.content } : { markdown: detected.content };
  return { ...('html' in base ? { html: base.html } : { markdown: base.markdown }), is_rtl:Boolean(base.is_rtl ?? session.isRtl), skip_entity_detection:Boolean(base.skip_entity_detection ?? session.skipEntityDetection) };
}
