// What the customer wants, from rules that run before any AI call: intent, service, day and time.
// Prices, hours and slots then come from the salon's data, never from the model.
import { normalizeText, plainText } from './normalize.mjs';
import { SALON } from './salon.mjs';
import { addDaysISO, dowOf } from './qatar.mjs';

const N = s => normalizeText(s);
const PREFIXES = ['وال', 'بال', 'لل', 'ال', 'و', 'ب', 'ل', 'ف'];
const SUFFIXES = ['كم', 'كن', 'ها', 'نا', 'ي', 'ك'];
function variants(tok) {
  const out = new Set([tok]);
  for (const p of PREFIXES) if (tok.startsWith(p) && tok.length - p.length >= 2) out.add(tok.slice(p.length));
  for (const v of [...out]) for (const x of SUFFIXES) if (/[؀-ۿ]/.test(v) && v.endsWith(x) && v.length - x.length >= 3) out.add(v.slice(0, -x.length));
  return out;
}
// Phrase match on whole tokens, allowing Arabic prefixes (al-, wal-, bil-, li-, wa-, bi-) on the first token.
function findPhrase(tokens, phrase) {
  const p = phrase.split(' ');
  for (let i = 0; i + p.length <= tokens.length; i++) {
    if (!variants(tokens[i]).has(p[0])) continue;
    let ok = true;
    for (let j = 1; j < p.length; j++) if (!variants(tokens[i + j]).has(p[j])) { ok = false; break; }
    if (ok) return i;
  }
  return -1;
}
const has = (tokens, list) => list.some(w => findPhrase(tokens, w) >= 0);

const AR = s => N(s);
const KW = {
  human: ['human', 'real person', 'staff', 'agent', 'speak to someone', 'talk to someone', 'call me', 'manager', AR('موظفه'), AR('موظف'), AR('اكلم'), AR('اتصلوا'), AR('احد يرد'), AR('شخص'), AR('الاداره'), AR('الريسبشن')],
  cancel: ['cancel', 'reschedule', 'change my appointment', 'change my booking', 'move my appointment', AR('الغي'), AR('الغاء'), AR('اغير الموعد'), AR('تاجيل'), AR('غيري الموعد')],
  book: ['book', 'booking', 'appointment', 'reserve', 'reservation', 'slot', 'available', 'availability', 'can i come', 'free tomorrow', 'schedule', AR('احجز'), AR('حجز'), AR('موعد'), AR('ابي موعد'), AR('فاضي'), AR('فاضين'), AR('متاح'), AR('ابي اجي'), AR('اقدر اجي'), AR('ممكن اجي'), 'a7jz', '7ajz', 'maw3ed', 'maw3id'],
  price: ['price', 'prices', 'cost', 'how much', 'charge', 'rate', 'fees', 'menu', AR('سعر'), AR('اسعار'), AR('كم'), AR('بكم'), AR('تكلفه'), AR('يكلف'), AR('قايمه الاسعار'), 'kam', 'bkam', 'se3r', 'si3r', 'as3ar'],
  hours: ['open', 'opening', 'close', 'closing', 'hours', 'timing', 'timings', 'working time', AR('تفتحون'), AR('تسكرون'), AR('تقفلون'), AR('دوام'), AR('الدوام'), AR('دوامكم'), AR('اوقات'), AR('ساعات العمل'), AR('مفتوحين'), AR('مفتوح'), AR('فاتحين'), 'dawam', 'tftho', 'tftahon'],
  location: ['where', 'location', 'address', 'map', 'located', 'directions', AR('وين'), AR('موقع'), AR('عنوان'), AR('مكانكم'), AR('لوكيشن'), AR('الخريطه'), 'wain', 'wen', 'wainkom'],
  services: ['services', 'what do you offer', 'what do you do', 'treatments', AR('خدمات'), AR('الخدمات'), AR('شنو عندكم'), AR('وش عندكم')],
  thanks: ['thanks', 'thank you', 'thx', 'shukran', 'shokran', AR('شكرا'), AR('مشكوره'), AR('يعطيك العافيه'), AR('تسلمين'), AR('تسلمون')],
  greeting: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'salam', 'hala', 'marhaba', AR('السلام عليكم'), AR('سلام'), AR('مرحبا'), AR('هلا'), AR('صباح الخير'), AR('مساء الخير')],
};
const SERVICE_WORDS = SALON.services.flatMap(s => s.words.map(w => [N(w), s.id])).sort((a, b) => b[0].length - a[0].length);

const DAYS_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAYS_AR = ['الاحد', 'الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس', 'الجمعه', 'السبت'].map(N);
const TODAY = ['today', 'tonight', AR('اليوم'), AR('الحين'), 'alyom', 'el youm'];
const TOMORROW = ['tomorrow', 'tmrw', 'tmr', AR('بكره'), AR('باجر'), AR('بكرا'), 'bukra', 'bokra', 'bacher', 'bachir', 'baachir'];
const AFTER_TOMORROW = ['day after tomorrow', AR('بعد بكره'), AR('بعد باجر')];
const PM = ['pm', 'p.m', 'evening', 'afternoon', 'night', AR('م'), AR('مساء'), AR('المسا'), AR('العصر'), AR('بالليل'), AR('الليل'), AR('الظهر'), AR('المغرب'), AR('عصر'), AR('مسا')];
const AM = ['am', 'a.m', 'morning', AR('ص'), AR('صباحا'), AR('الصبح'), AR('الصباح'), AR('صبح')];
const HOUR_WORDS = { [N('وحده')]: 1, [N('واحده')]: 1, [N('ثنتين')]: 2, [N('اثنين')]: 2, [N('ثلاث')]: 3, [N('ثلاثه')]: 3,
  [N('اربع')]: 4, [N('اربعه')]: 4, [N('خمس')]: 5, [N('خمسه')]: 5, [N('ست')]: 6, [N('سته')]: 6, [N('سبع')]: 7, [N('سبعه')]: 7,
  [N('ثمان')]: 8, [N('ثمانيه')]: 8, [N('تسع')]: 9, [N('تسعه')]: 9, [N('عشر')]: 10, [N('عشره')]: 10, [N('حدعش')]: 11, [N('احدعش')]: 11, [N('ثنعش')]: 12, [N('اثنعش')]: 12 };
const AT = ['at', 'around', 'by', AR('الساعه'), AR('ساعه'), AR('الساعه'), 'alsa3a', 'el sa3a', 'sa3a'];

export function extractDate(tokens, todayISO) {
  if (has(tokens, AFTER_TOMORROW)) return addDaysISO(todayISO, 2);
  if (has(tokens, TOMORROW)) return addDaysISO(todayISO, 1);
  if (has(tokens, TODAY)) return todayISO;
  for (let d = 0; d < 7; d++) {
    if (has(tokens, [DAYS_EN[d], DAYS_EN[d].slice(0, 3), DAYS_AR[d], DAYS_AR[d].replace(/^ال/, '')])) {
      const delta = (d - dowOf(todayISO) + 7) % 7;
      return addDaysISO(todayISO, delta);
    }
  }
  return null;
}

export function extractTime(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    let t = tokens[i], h = null, m = 0, mer = null;
    const glued = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
    const plain = t.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (glued) { h = +glued[1]; m = +(glued[2] ?? 0); mer = glued[3]; }
    else if (plain) { h = +plain[1]; m = +(plain[2] ?? 0); }
    else if (HOUR_WORDS[t] && i > 0 && AT.some(a => variants(tokens[i - 1]).has(a.split(' ').at(-1)))) h = HOUR_WORDS[t];
    if (h === null || h > 23 || m > 59) continue;
    const next = tokens.slice(i + 1, i + 3).join(' '), prev = tokens[i - 1] ?? '';
    const nt = tokens[i + 1] ?? '';
    const said = list => list.some(w => (w.includes(' ') ? next.startsWith(w) : variants(nt).has(w)));
    if (!mer) { if (said(PM)) mer = 'pm'; else if (said(AM)) mer = 'am'; }
    const anchored = mer || AT.some(a => variants(prev).has(a.split(' ').at(-1))) || tokens[i - 1] === '@';
    if (!anchored) continue; // a bare number is probably a price, a count or a date
    if (mer === 'pm' && h < 12) h += 12;
    else if (mer === 'am' && h === 12) h = 0;
    else if (!mer && h >= 1 && h <= 9) h += 12; // "at 5" in a salon means 5 in the evening
    return h * 60 + m;
  }
  return null;
}

export function understand(text, { todayISO, normalize = true } = {}) {
  const norm = normalize ? normalizeText(text) : plainText(text);
  const tokens = norm.split(' ').filter(Boolean);
  const service = (SERVICE_WORDS.find(([w]) => findPhrase(tokens, normalize ? w : plainText(w)) >= 0) ?? [])[1] ?? null;
  const date = todayISO ? extractDate(tokens, todayISO) : null;
  const time = extractTime(tokens);
  const kw = k => has(tokens, normalize ? KW[k] : KW[k].map(plainText));
  let intent = 'unknown';
  if (kw('human')) intent = 'human';
  else if (kw('cancel')) intent = 'cancel';
  else if (kw('book') || (service && (date || time !== null))) intent = 'book';
  else if (kw('price') && (service || !kw('hours'))) intent = 'price';
  else if (kw('hours') || ((date || time !== null) && /\b(open|مفتوح)/.test(norm))) intent = 'hours';
  else if (kw('location')) intent = 'location';
  else if (kw('services')) intent = 'services';
  else if (service) intent = 'price';
  else if (kw('thanks')) intent = 'thanks';
  else if (kw('greeting')) intent = 'greeting';
  return { intent, service, date, time, normalized: norm };
}
