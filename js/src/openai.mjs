// Questions the rules can't answer go to OpenAI with the salon's facts. The model must answer in JSON,
// and any price it quotes is checked against the price list before the reply is sent.
import { SALON } from './salon.mjs';
import { westernDigits } from './normalize.mjs';

export function salonFacts() {
  return { name: SALON.name.en, hours: 'Saturday-Thursday 10:00-22:00, Friday 14:00-22:00, Doha time (UTC+3)', address: SALON.address.en, map: SALON.map,
    policies: SALON.policies.en, services: SALON.services.map(s => ({ en: s.en, ar: s.ar, price_qar: s.price, price_is_starting_from: s.from, minutes: s.minutes })) };
}

export function buildChatRequest({ text, lang, history = [], model }) {
  const system = [
    `You are the WhatsApp assistant for ${SALON.name.en}, a ladies' salon in Doha, Qatar.`,
    lang === 'ar' ? 'Answer in Arabic that a Qatari customer would write: short, warm, Gulf-friendly, addressing the customer in the feminine.' : 'Answer in English: short and warm.',
    'Use only the facts below. Never invent a price, a service, a discount or a free slot. If the facts do not answer the question, say a staff member will reply and set needs_staff to true.',
    'Keep the reply under 600 characters and ask at most one question.',
    `Facts: ${JSON.stringify(salonFacts())}`,
  ].join('\n');
  return {
    model,
    messages: [{ role: 'system', content: system }, ...history.slice(-10), { role: 'user', content: text }],
    response_format: { type: 'json_schema', json_schema: { name: 'salon_reply', strict: true, schema: { type: 'object', additionalProperties: false,
      properties: { reply: { type: 'string' }, needs_staff: { type: 'boolean' } }, required: ['reply', 'needs_staff'] } } },
    temperature: 0.3,
  };
}

// Any number next to QAR / ريال / ر.ق must be a real price from the list.
export function priceGuard(reply) {
  const allowed = new Set(SALON.services.map(s => s.price));
  const t = westernDigits(reply);
  const nums = [...t.matchAll(/(\d{2,5})\s*(?:qar|qr|riyal|riyals|ريال|ر\.?\s?ق)/gi), ...t.matchAll(/(?:qar|qr|ريال|ر\.?\s?ق)\s*(\d{2,5})/gi)].map(m => Number(m[1]));
  const bad = nums.filter(n => !allowed.has(n));
  return { ok: bad.length === 0, quoted: nums, invented: bad };
}

export function readChatResponse(apiJson) {
  try {
    const content = apiJson?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    if (typeof parsed.reply !== 'string' || typeof parsed.needs_staff !== 'boolean') throw new Error('shape');
    const guard = priceGuard(parsed.reply);
    return { reply: parsed.reply, needsStaff: parsed.needs_staff || !guard.ok, guard };
  } catch { return { reply: null, needsStaff: true, guard: null, error: 'unreadable model reply' }; }
}
