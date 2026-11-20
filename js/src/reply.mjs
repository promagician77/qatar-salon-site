// Answers built from the salon's own data, in the customer's language. One message per answer where possible:
// since October 2026 every reply inside the 24-hour window is a billed service message (after a monthly free allowance).
import { SALON, serviceById } from './salon.mjs';
import { qatarParts, qatarMs, dowOf, hhmm, parseLocal, addDaysISO } from './qatar.mjs';
import { findSlots, book } from './booking.mjs';
import { textPayloads, buttonsPayload, listPayload, reminderPlan } from './whatsapp.mjs';

const DAY = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] };
const DAY3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ampm = (m, lang) => { const h = Math.floor(m / 60), mm = m % 60, h12 = ((h + 11) % 12) + 1, t = mm ? `${h12}:${String(mm).padStart(2, '0')}` : `${h12}`;
  return lang === 'ar' ? `${t} ${h < 12 ? 'صباحًا' : h < 16 ? 'ظهرًا' : 'مساءً'}` : `${t}${h < 12 ? 'am' : 'pm'}`; };
const longDate = (date, lang) => { const [y, m, d] = date.split('-').map(Number);
  return lang === 'ar' ? `${DAY.ar[dowOf(date)]} ${d}/${m}` : `${DAY.en[dowOf(date)]} ${d} ${MONTH[m - 1]}`; };
export const slotLabel = (iso, lang) => { const { date, minutes } = parseLocal(iso); const [, m, d] = date.split('-').map(Number);
  return lang === 'ar' ? `${DAY.ar[dowOf(date)]} ${d}/${m} ${hhmm(minutes)}` : `${DAY3[dowOf(date)]} ${d} ${MON[m - 1]} ${hhmm(minutes)}`; };
const price = (svc, lang) => lang === 'ar'
  ? `${svc.ar}${svc.from ? ' تبدأ من' : ':'} ${svc.price} ${SALON.currency.ar}، وتستغرق حوالي ${svc.minutes} دقيقة.`
  : `${svc.en} ${svc.from ? 'starts from' : 'is'} ${svc.price} ${SALON.currency.en} and takes about ${svc.minutes} minutes.`;

export function hoursText(lang, nowMs, date = null) {
  const h = SALON.hours;
  if (date) {
    const [o, c] = h[dowOf(date)];
    return lang === 'ar' ? `يوم ${DAY.ar[dowOf(date)]} نفتح من ${ampm(o, 'ar')} إلى ${ampm(c, 'ar')} بتوقيت الدوحة.` : `On ${DAY.en[dowOf(date)]} we're open ${ampm(o, 'en')} to ${ampm(c, 'en')}, Doha time.`;
  }
  const now = qatarParts(nowMs), [o, c] = h[now.dow];
  let status;
  if (now.minutes >= o && now.minutes < c) status = lang === 'ar' ? `مفتوحين الحين إلى ${ampm(c, 'ar')}.` : `We're open now until ${ampm(c, 'en')}.`;
  else {
    const before = now.minutes < o, nd = before ? now.date : addDaysISO(now.date, 1), [no] = h[dowOf(nd)];
    status = lang === 'ar' ? `مسكّرين الحين، ونفتح ${before ? 'اليوم' : 'باجر'} الساعة ${ampm(no, 'ar')}.` : `We're closed now and open again ${before ? 'today' : 'tomorrow'} at ${ampm(no, 'en')}.`;
  }
  return lang === 'ar'
    ? `دوامنا من السبت إلى الخميس من ${ampm(h[6][0], 'ar')} إلى ${ampm(h[6][1], 'ar')}، والجمعة من ${ampm(h[5][0], 'ar')} إلى ${ampm(h[5][1], 'ar')} بتوقيت الدوحة. ${status}`
    : `We're open Saturday to Thursday, ${ampm(h[6][0], 'en')} to ${ampm(h[6][1], 'en')}, and Friday ${ampm(h[5][0], 'en')} to ${ampm(h[5][1], 'en')}, Doha time. ${status}`;
}

const priceList = lang => (lang === 'ar' ? `أسعارنا (${SALON.currency.ar}):\n` : `Our prices (${SALON.currency.en}):\n`)
  + SALON.services.map(s => `• ${lang === 'ar' ? s.ar : s.en}: ${s.from ? (lang === 'ar' ? 'من ' : 'from ') : ''}${s.price}`).join('\n')
  + (lang === 'ar' ? '\nالصبغة والكيراتين حسب طول الشعر.' : '\nColour and keratin depend on hair length.');

function serviceList(to, lang, date, time) {
  return listPayload(to, lang === 'ar' ? 'أي خدمة تبين تحجزين؟' : 'Which service would you like to book?', lang === 'ar' ? 'اختاري الخدمة' : 'Choose a service',
    SALON.services.map(s => ({ id: `svc|${s.id}|${date ?? ''}|${time ?? ''}`, title: (lang === 'ar' ? s.ar : s.en).slice(0, 24), description: `${s.from ? (lang === 'ar' ? 'من ' : 'from ') : ''}${s.price} ${SALON.currency[lang]}` })),
    lang === 'ar' ? 'الخدمات' : 'Services');
}

export function offerSlots(to, lang, serviceId, { nowMs, date, time, bookings }) {
  const svc = serviceById(serviceId);
  const slots = findSlots(serviceId, { nowMs, date, time, bookings });
  if (!slots.length) return { route: 'human', messages: textPayloads(to, lang === 'ar' ? 'ما لقيت موعد فاضي خلال الأسبوع الجاي، حوّلت طلبك للاستقبال وبيتواصلون معك هنا.' : 'I couldn’t find a free time in the next week, so I’ve passed this to our front desk. They’ll reply here.') };
  const wanted = date && time !== null ? `${date}T${hhmm(time)}` : null;
  const exact = wanted && slots[0].slot === wanted;
  const intro = lang === 'ar'
    ? (exact ? `${svc.ar} يوم ${longDate(date, 'ar')} الساعة ${hhmm(time)} متاح.` : wanted ? `الساعة ${hhmm(time)} محجوزة، هذي أقرب المواعيد:` : `أقرب المواعيد لـ${svc.ar}:`)
    : (exact ? `${svc.en} on ${longDate(date, 'en')} at ${hhmm(time)} is free.` : wanted ? `${hhmm(time)} is taken. The nearest free times:` : `The next free times for ${svc.en.toLowerCase()}:`);
  const body = `${intro}\n${price(svc, lang)}\n${lang === 'ar' ? 'اختاري الوقت للتأكيد.' : 'Tap a time to confirm.'}`;
  return { route: 'data', messages: [buttonsPayload(to, body, slots.map(s => ({ id: `slot|${serviceId}|${s.slot}`, title: slotLabel(s.slot, lang) })))] };
}

export function confirmSlot(to, lang, serviceId, slotISO, { nowMs, bookings, lastInboundMs }) {
  const res = book(serviceId, slotISO, bookings);
  if (!res.ok) {
    const again = offerSlots(to, lang, serviceId, { nowMs, date: parseLocal(slotISO).date, time: parseLocal(slotISO).minutes, bookings });
    return { ...again, note: 'slot taken in the meantime' };
  }
  const svc = serviceById(serviceId), { date, minutes } = parseLocal(slotISO);
  const plan = reminderPlan(qatarMs(date, minutes), lastInboundMs, nowMs);
  Object.assign(res.booking, { customer: to, lang, remindAtMs: plan.sendAtMs, reminded: plan.kind === 'none' ? 'not needed' : false });
  const text = lang === 'ar'
    ? `تم الحجز ✅\n${svc.ar}، ${longDate(date, 'ar')} الساعة ${hhmm(minutes)}، ${svc.from ? 'من ' : ''}${svc.price} ${SALON.currency.ar}.\n${plan.kind === 'none' ? '' : 'بنذكّرك قبلها بيوم. '}لتغيير الموعد ردّي هنا.`
    : `Booked ✅\n${svc.en}, ${longDate(date, 'en')} at ${hhmm(minutes)}, ${svc.from ? 'from ' : ''}${svc.price} ${SALON.currency.en}.\n${plan.kind === 'none' ? '' : 'We\'ll remind you the day before. '}To change it, just reply here.`;
  return { route: 'data', messages: textPayloads(to, text), booking: res.booking, reminder: plan };
}

// Rule-based answer, or null when the question needs the model.
export function answer(u, ctx) {
  const { to, lang, nowMs } = ctx;
  const T = (en, ar) => (lang === 'ar' ? ar : en);
  switch (u.intent) {
    case 'greeting': return { route: 'data', messages: [buttonsPayload(to, T(`Welcome to ${SALON.name.en}! Ask about prices, opening hours or booking, in Arabic or English.`, `أهلًا وسهلًا في ${SALON.name.ar}! اسألي عن الأسعار أو الدوام، أو احجزي موعدك بالعربي أو بالإنجليزي.`),
      [{ id: 'menu|prices', title: T('Prices', 'الأسعار') }, { id: 'menu|book', title: T('Book', 'حجز موعد') }, { id: 'menu|location', title: T('Location', 'الموقع') }])] };
    case 'price':
      if (u.service) { const svc = serviceById(u.service);
        return { route: 'data', messages: [buttonsPayload(to, price(svc, lang), [{ id: `svc|${svc.id}||`, title: T('Book it', 'احجزي الموعد') }, { id: 'menu|prices', title: T('All prices', 'كل الأسعار') }])] }; }
      return { route: 'data', messages: textPayloads(to, priceList(lang)) };
    case 'services': return { route: 'data', messages: textPayloads(to, priceList(lang)) };
    case 'hours': return { route: 'data', messages: textPayloads(to, hoursText(lang, nowMs, u.date)) };
    case 'location': return { route: 'data', messages: textPayloads(to, T(`We're in ${SALON.address.en}.\nMap: ${SALON.map}\n${SALON.policies.en}`, `موقعنا: ${SALON.address.ar}.\nالخريطة: ${SALON.map}\n${SALON.policies.ar}`)) };
    case 'book':
      if (!u.service) return { route: 'data', messages: [serviceList(to, lang, u.date, u.time)] };
      return offerSlots(to, lang, u.service, { nowMs, date: u.date, time: u.time, bookings: ctx.bookings });
    case 'thanks': return { route: 'data', messages: textPayloads(to, T('You’re welcome! Message here any time.', 'العفو! حاضرين لأي شي ثاني.')) };
    case 'human': case 'cancel': return { route: 'human', messages: textPayloads(to, T('I’ve passed your message to our front desk. They’ll reply here during opening hours.', 'حوّلت رسالتك لموظفة الاستقبال، وبترد عليك هنا خلال أوقات الدوام.')) };
    default: return null;
  }
}

// Taps on buttons and list rows come back as ids.
export function answerReply(replyId, ctx) {
  const [kind, a, b, c] = String(replyId).split('|');
  if (kind === 'menu' && a === 'prices') return answer({ intent: 'price' }, ctx);
  if (kind === 'menu' && a === 'book') return answer({ intent: 'book' }, ctx);
  if (kind === 'menu' && a === 'location') return answer({ intent: 'location' }, ctx);
  if (kind === 'svc' && serviceById(a)) return offerSlots(ctx.to, ctx.lang, a, { nowMs: ctx.nowMs, date: b || null, time: c === '' || c == null ? null : Number(c), bookings: ctx.bookings });
  if (kind === 'slot' && serviceById(a) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b)) return confirmSlot(ctx.to, ctx.lang, a, b, ctx);
  return null;
}
