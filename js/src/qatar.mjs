// Qatar time is UTC+3 all year (no daylight saving). Local times are handled as 'YYYY-MM-DDTHH:MM' strings.
export const QATAR_OFFSET_MIN = 180;
const pad2 = n => String(n).padStart(2, '0');
export function qatarParts(ms) {
  const d = new Date(ms + QATAR_OFFSET_MIN * 60000);
  return { date: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`, dow: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
export function qatarMs(date, minutes) { return Date.parse(`${date}T00:00:00Z`) + (minutes - QATAR_OFFSET_MIN) * 60000; }
export function addDaysISO(date, n) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function dowOf(date) { return new Date(`${date}T00:00:00Z`).getUTCDay(); }
export const hhmm = m => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
export const localISO = (date, minutes) => `${date}T${hhmm(minutes)}`;
export function parseLocal(iso) { const [date, t] = iso.split('T'); const [h, m] = t.split(':').map(Number); return { date, minutes: h * 60 + m }; }
