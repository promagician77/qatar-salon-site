// One inbound WhatsApp message in, the payloads to send out. Shared by the n8n workflow, the demo page and the tests.
import { detectLanguage } from './lang.mjs';
import { understand } from './understand.mjs';
import { answer, answerReply } from './reply.mjs';
import { qatarParts } from './qatar.mjs';
import { textPayloads } from './whatsapp.mjs';
import { buildChatRequest } from './openai.mjs';

export function newState() { return { customers: {}, bookings: [] }; }

export function handleMessage(ev, state, nowMs, { model = 'OPENAI_MODEL', normalize = true } = {}) {
  const c = state.customers[ev.from] ??= { lang: null, lastInboundMs: null, history: [] };
  const lastBefore = c.lastInboundMs;
  c.lastInboundMs = ev.timestampMs ?? nowMs;
  if (ev.phoneNumberId) c.phoneNumberId = ev.phoneNumberId; // the salon number the customer wrote to; reminders go out from it
  const lang = ev.text && !ev.replyId ? detectLanguage(ev.text) : (c.lang ?? detectLanguage(ev.text));
  c.lang = lang;
  const ctx = { to: ev.from, lang, nowMs, bookings: state.bookings, lastInboundMs: c.lastInboundMs, todayISO: qatarParts(nowMs).date };
  let out = null, u = null;
  if (ev.unsupported) out = { route: 'human', messages: textPayloads(ev.from, lang === 'ar' ? 'وصلتني رسالتك، وحوّلتها للاستقبال يردّون عليك هنا.' : 'Got it. I’ve passed this to our front desk and they’ll reply here.') };
  else if (ev.replyId) out = answerReply(ev.replyId, ctx);
  if (!out) { u = understand(ev.text, { todayISO: ctx.todayISO, normalize }); out = answer(u, ctx); }
  if (!out) out = { route: 'openai', messages: [], openaiRequest: buildChatRequest({ text: ev.text, lang, history: c.history, model }) };
  c.history.push({ role: 'user', content: ev.text });
  if (c.history.length > 20) c.history.splice(0, c.history.length - 20); // keep stored state small
  return { ...out, lang, intent: u?.intent ?? (ev.replyId ? 'button' : ev.unsupported ? 'unsupported' : null), understood: u, windowWasOpen: lastBefore != null && nowMs - lastBefore < 864e5 };
}
