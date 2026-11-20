// WhatsApp Cloud API: reading webhooks and building send payloads, with the platform's limits enforced in code.
export const LIMITS = { textBody: 4096, interactiveBody: 1024, buttons: 3, buttonTitle: 20, listRows: 10, rowTitle: 24, rowDescription: 72, listButton: 20, windowMs: 24 * 3600 * 1000 };

// One webhook POST can carry several messages and status updates. Only customer messages get an answer.
export function parseWebhook(body) {
  const out = [];
  if (!body || body.object !== 'whatsapp_business_account') return out;
  for (const entry of body.entry ?? []) for (const change of entry.changes ?? []) {
    if (change.field !== 'messages') continue;
    const v = change.value ?? {};
    const phoneNumberId = v.metadata?.phone_number_id ?? null;
    const names = Object.fromEntries((v.contacts ?? []).map(c => [c.wa_id, c.profile?.name ?? null]));
    for (const m of v.messages ?? []) {
      const base = { kind: 'message', id: m.id, from: m.from, name: names[m.from] ?? null, timestampMs: Number(m.timestamp) * 1000, phoneNumberId, type: m.type };
      if (m.type === 'text') out.push({ ...base, text: m.text?.body ?? '' });
      else if (m.type === 'interactive') { const r = m.interactive?.button_reply ?? m.interactive?.list_reply ?? {}; out.push({ ...base, replyId: r.id ?? null, text: r.title ?? '' }); }
      else if (m.type === 'button') out.push({ ...base, replyId: m.button?.payload ?? null, text: m.button?.text ?? '' });
      else out.push({ ...base, unsupported: true, text: '' });
    }
    for (const s of v.statuses ?? []) out.push({ kind: 'status', id: s.id, status: s.status, recipient: s.recipient_id, phoneNumberId });
  }
  return out;
}

// Meta retries a notification until it gets a 200, and retries go to every subscribed app, so the same message can arrive twice.
// The store is a plain object so n8n can keep it in workflow static data between executions.
export function seenBefore(store, id, nowMs, ttlMs = 3 * 24 * 3600 * 1000) {
  for (const [k, t] of Object.entries(store)) if (nowMs - t > ttlMs) delete store[k];
  if (Object.prototype.hasOwnProperty.call(store, id)) return true;
  store[id] = nowMs;
  return false;
}

export const windowOpen = (lastInboundMs, atMs) => lastInboundMs != null && atMs - lastInboundMs < LIMITS.windowMs;

// A day-before reminder can go as a normal message only if the customer wrote within the 24 hours before it.
// Bookings less than a day away get no day-before reminder; one to two days away, a normal message; further ahead, a template.
export function reminderPlan(appointmentMs, lastInboundMs, nowMs, leadMs = 24 * 3600 * 1000) {
  const sendAtMs = appointmentMs - leadMs;
  if (sendAtMs <= nowMs) return { sendAtMs: null, kind: 'none' };
  return { sendAtMs, kind: windowOpen(lastInboundMs, sendAtMs) ? 'service' : 'template' };
}

export function splitText(body, max = LIMITS.textBody) {
  const parts = []; let rest = String(body);
  while (rest.length > max) {
    let cut = Math.max(rest.lastIndexOf('\n', max), rest.lastIndexOf('. ', max) + 1, rest.lastIndexOf(' ', max));
    if (cut <= 0) cut = max;
    parts.push(rest.slice(0, cut).trimEnd()); rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

const base = to => ({ messaging_product: 'whatsapp', recipient_type: 'individual', to });
export const textPayloads = (to, body) => splitText(body).map(t => ({ ...base(to), type: 'text', text: { preview_url: false, body: t } }));

export function buttonsPayload(to, body, buttons, footer) {
  if (!buttons.length || buttons.length > LIMITS.buttons) throw new Error(`reply buttons: 1 to ${LIMITS.buttons}, got ${buttons.length}`);
  if (body.length > LIMITS.interactiveBody) throw new Error('interactive body over 1024 characters');
  const titles = new Set();
  for (const b of buttons) {
    if (!b.title || b.title.length > LIMITS.buttonTitle) throw new Error(`button title "${b.title}" must be 1-${LIMITS.buttonTitle} characters`);
    if (titles.has(b.title)) throw new Error('button titles must be unique'); titles.add(b.title);
    if (!b.id || b.id.length > 256 || b.id !== b.id.trim()) throw new Error('button id must be 1-256 characters with no outer spaces');
  }
  return { ...base(to), type: 'interactive', interactive: { type: 'button', body: { text: body }, ...(footer ? { footer: { text: footer } } : {}),
    action: { buttons: buttons.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } })) } } };
}

export function listPayload(to, body, buttonText, rows, sectionTitle) {
  if (!rows.length || rows.length > LIMITS.listRows) throw new Error(`list rows: 1 to ${LIMITS.listRows}`);
  if (buttonText.length > LIMITS.listButton) throw new Error('list button text over 20 characters');
  for (const r of rows) if (r.title.length > LIMITS.rowTitle || (r.description ?? '').length > LIMITS.rowDescription) throw new Error(`list row "${r.title}" too long`);
  return { ...base(to), type: 'interactive', interactive: { type: 'list', body: { text: body }, action: { button: buttonText, sections: [{ title: sectionTitle.slice(0, 24), rows }] } } };
}

export const templatePayload = (to, name, languageCode, params) => ({ ...base(to), type: 'template',
  template: { name, language: { code: languageCode }, components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text: String(text) })) }] } });
