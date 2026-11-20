// Day-before reminders, run on a schedule. The 24-hour window is checked again at send time: if the customer has
// written since booking, a normal message is allowed; otherwise it must be an approved template.
import { serviceById } from './salon.mjs';
import { qatarMs, hhmm } from './qatar.mjs';
import { windowOpen, textPayloads, templatePayload } from './whatsapp.mjs';

export const REMINDER_TEMPLATE = 'appointment_reminder'; // must be created and approved in WhatsApp Manager, in en and ar

export function dueReminders(state, nowMs) {
  const out = [];
  for (const b of state.bookings) {
    if (!b.customer || b.remindAtMs == null || b.reminded || b.remindAtMs > nowMs) continue;
    if (qatarMs(b.date, b.start) <= nowMs) { b.reminded = 'skipped'; continue; } // appointment already started
    const c = state.customers[b.customer] ?? {}, svc = serviceById(b.service), lang = b.lang === 'ar' ? 'ar' : 'en';
    const [y, m, d] = b.date.split('-').map(Number), when = `${d}/${m}`, at = hhmm(b.start), name = lang === 'ar' ? svc.ar : svc.en;
    const open = windowOpen(c.lastInboundMs, nowMs);
    const messages = open
      ? textPayloads(b.customer, lang === 'ar' ? `تذكير: موعدك ${name} باجر ${when} الساعة ${at}. لتغيير الموعد ردّي هنا.` : `Reminder: your ${name.toLowerCase()} is tomorrow, ${when} at ${at}. To change it, just reply here.`)
      : [templatePayload(b.customer, REMINDER_TEMPLATE, lang, [name, when, at])];
    b.reminded = open ? 'service' : 'template';
    out.push({ to: b.customer, phoneNumberId: c.phoneNumberId ?? null, kind: b.reminded, messages });
  }
  return out;
}
