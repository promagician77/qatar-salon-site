// Free slots from the salon's hours, each stylist's skills and existing bookings. No double-booking.
import { SALON, serviceById } from './salon.mjs';
import { qatarParts, addDaysISO, dowOf, localISO, parseLocal } from './qatar.mjs';

const STEP = 15;
const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

export function freeStaff(serviceId, date, start, bookings, staff = SALON.staff) {
  const svc = serviceById(serviceId); if (!svc) return null;
  const end = start + svc.minutes;
  const hours = SALON.hours[dowOf(date)];
  if (!hours || start < hours[0] || end > hours[1]) return null;
  return staff.find(s => s.skills.includes(serviceId) && !bookings.some(b => b.staff === s.id && b.date === date && overlaps(start, end, b.start, b.end))) ?? null;
}

// Up to n slots at or after the wanted time; the wanted day first, then the next days.
export function findSlots(serviceId, { nowMs, date = null, time = null, bookings = [], n = 3, days = 7 }) {
  const now = qatarParts(nowMs);
  const firstDay = date ?? now.date;
  const out = [];
  for (let k = 0; k < days && out.length < n; k++) {
    const d = addDaysISO(firstDay, k);
    if (d < now.date) continue;
    const hours = SALON.hours[dowOf(d)]; if (!hours) continue;
    let from = hours[0];
    if (k === 0 && time !== null) from = Math.max(from, time);
    if (d === now.date) from = Math.max(from, Math.ceil((now.minutes + 30) / STEP) * STEP); // at least 30 minutes' notice
    for (let t = Math.ceil(from / STEP) * STEP; t < hours[1] && out.length < n; t += STEP) {
      const s = freeStaff(serviceId, d, t, bookings);
      if (s) { out.push({ slot: localISO(d, t), staff: s.id }); t += 45; } // spread the offers out
    }
  }
  return out;
}

export function book(serviceId, slotISO, bookings) {
  const { date, minutes } = parseLocal(slotISO);
  const s = freeStaff(serviceId, date, minutes, bookings);
  if (!s) return { ok: false, reason: 'taken' };
  const svc = serviceById(serviceId);
  const booking = { service: serviceId, date, start: minutes, end: minutes + svc.minutes, staff: s.id, slot: slotISO };
  bookings.push(booking);
  return { ok: true, booking };
}
