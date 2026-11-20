// The demo runs the same modules as the n8n workflow (js/src is a copy of src/). Nothing is sent anywhere:
// WhatsApp payloads and OpenAI requests are shown instead of posted.
import { handleMessage, newState } from './js/src/assistant.mjs';
import { qatarParts, hhmm } from './js/src/qatar.mjs';

const SCRIPTS = JSON.parse(document.getElementById('scripts').textContent).scripts;
const $ = s => document.querySelector(s);
const log = $('#log'), form = $('#compose'), input = $('#say'), sendBtn = form.querySelector('button');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
const ME = '97455500000';
let state, waSent, aiCalls, busy = false, last = null;

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v === null || v === undefined || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
const isArabic = t => /[؀-ۿ]/.test(t) && (t.match(/[؀-ۿ]/g).length * 2 >= (t.match(/[A-Za-z]/g) ?? []).length);
const dirOf = t => (isArabic(t) ? 'rtl' : 'ltr');
const stamp = () => h('time', {}, hhmm(qatarParts(Date.now()).minutes));
function linkify(text) {
  const parts = String(text).split(/(https:\/\/\S+)/);
  return parts.map(p => (p.startsWith('https://') ? h('a', { href: p, target: '_blank', rel: 'noopener' }, p) : p));
}
function scroll() { log.scrollTop = log.scrollHeight; }

function reset() {
  state = newState(); waSent = 0; aiCalls = 0; last = null;
  log.replaceChildren(h('p', { class: 'empty' }, 'Pick a conversation to start, or type a message the way a customer would.'));
  $('#facts').replaceChildren();
  $('#payload-h').textContent = 'Send a message to see the exact request.';
  $('#payload').textContent = '';
  counts();
}
function counts() {
  $('#n-wa').textContent = waSent; $('#n-ai').textContent = aiCalls; $('#n-book').textContent = state.bookings.length;
}

function customerBubble(ev) {
  log.querySelector('.empty')?.remove();
  if (ev.unsupported) {
    log.append(h('div', { class: 'msg out' }, h('span', { class: 'voice' },
      Object.assign(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), { innerHTML: '<path d="M6 1a2 2 0 0 0-2 2v4a2 2 0 0 0 4 0V3a2 2 0 0 0-2-2Zm-4 6a4 4 0 0 0 3.5 4V13h1v-2A4 4 0 0 0 10 7H9a3 3 0 0 1-6 0H2Z" fill="currentColor"/>' }),
      'Voice note, 0:07'), stamp()));
    const svg = log.lastElementChild.querySelector('svg'); svg.setAttribute('width', 14); svg.setAttribute('height', 14); svg.setAttribute('viewBox', '0 0 12 14'); svg.setAttribute('aria-hidden', 'true');
  } else log.append(h('div', { class: 'msg out', dir: dirOf(ev.text) }, ev.text, stamp()));
  scroll();
}

function botBubble(p) {
  if (p.type === 'text') return h('div', { class: 'msg in', dir: dirOf(p.text.body) }, linkify(p.text.body), stamp());
  const i = p.interactive, dir = dirOf(i.body.text);
  if (i.type === 'button') {
    return h('div', { class: 'msg in', dir }, i.body.text, stamp(),
      h('div', { class: 'btns' }, i.action.buttons.map(b => h('button', { type: 'button', 'data-id': b.reply.id, onclick: () => tap(b.reply) }, b.reply.title))));
  }
  const rowsId = `rows-${Math.random().toString(36).slice(2, 8)}`;
  const rows = h('ul', { class: 'rows', id: rowsId, hidden: true }, i.action.sections.flatMap(s => s.rows).map(r =>
    h('li', {}, h('button', { type: 'button', 'data-id': r.id, onclick: () => tap(r) }, h('span', { class: 't' }, r.title), h('span', { class: 'd' }, r.description ?? '')))));
  const open = h('button', { type: 'button', class: 'open-list', 'aria-expanded': 'false', 'aria-controls': rowsId, onclick: e => { const x = e.currentTarget.getAttribute('aria-expanded') === 'true'; e.currentTarget.setAttribute('aria-expanded', String(!x)); rows.hidden = x; } }, i.action.button);
  return h('div', { class: 'msg in', dir }, i.body.text, stamp(), h('div', { class: 'btns' }, open), rows);
}

const ROUTE = { data: 'Salon data', openai: 'OpenAI', human: 'Front desk' };
const INTENT = { greeting: 'Greeting', price: 'Price', hours: 'Opening hours', location: 'Location', book: 'Book', services: 'Services', thanks: 'Thanks', human: 'Wants a person', cancel: 'Change or cancel', unknown: 'Not covered by the rules' };
function inspect(r, ev) {
  const rows = [['Route', h('span', { class: 'route', 'data-route': r.route }, ROUTE[r.route])], ['Answer in', r.lang === 'ar' ? 'Arabic' : 'English']];
  if (ev.replyId) rows.push(['Button id', h('code', {}, ev.replyId)]);
  else if (ev.unsupported) rows.push(['Message type', 'Audio (not transcribed)']);
  else if (r.understood) {
    const u = r.understood;
    rows.push(['Intent', INTENT[u.intent] ?? u.intent]);
    if (u.service) rows.push(['Service', u.service]);
    if (u.date) rows.push(['Day', u.date]);
    if (u.time !== null) rows.push(['Time', hhmm(u.time)]);
  }
  if (r.reminder) rows.push(['Reminder', r.reminder.kind === 'none' ? 'None (less than a day away)' : r.reminder.kind === 'service' ? 'Normal message, day before' : 'Approved template, day before']);
  $('#facts').replaceChildren(...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
  if (r.route === 'openai') {
    $('#payload-h').textContent = 'Request body n8n posts to OpenAI (chat completions)';
    $('#payload').textContent = JSON.stringify(r.openaiRequest, null, 2);
  } else {
    $('#payload-h').textContent = `Request body n8n posts to the Cloud API, /{phone-number-id}/messages`;
    $('#payload').textContent = JSON.stringify(r.messages.length === 1 ? r.messages[0] : r.messages, null, 2);
  }
  $('#payload').scrollTop = 0;
}

async function handle(ev) {
  busy = true; sendBtn.disabled = true;
  customerBubble(ev);
  const r = handleMessage({ ...ev, from: ME, timestampMs: Date.now() }, state, Date.now(), { model: 'OPENAI_MODEL' });
  last = r;
  await wait(450);
  if (r.route === 'openai') {
    aiCalls++;
    log.append(h('p', { class: 'note' }, 'Sent to OpenAI with the salon’s facts. This page has no API key, so no reply is generated here. In n8n the answer is price-checked, then sent.'));
  } else {
    for (const p of r.messages) log.append(botBubble(p));
    waSent += r.messages.length;
  }
  inspect(r, ev); counts(); scroll();
  busy = false; sendBtn.disabled = false;
  return r;
}
function tap(choice) { if (!busy) return handle({ replyId: choice.id, text: choice.title }); }

async function play(script, button) {
  if (busy) return;
  reset();
  document.querySelectorAll('.start').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  for (const step of script.steps) {
    if (step.say) await handle({ text: step.say });
    else if (step.voice) await handle({ unsupported: true, text: '' });
    else {
      const msg = [...log.querySelectorAll('.msg.in')].at(-1);
      const opener = msg.querySelector('.open-list');
      if (opener && opener.getAttribute('aria-expanded') === 'false') { opener.click(); await wait(500); }
      const target = msg.querySelectorAll(opener ? '.rows button' : '.btns button')[step.tap];
      target.classList.add('tapping'); target.scrollIntoView({ block: 'nearest' });
      await wait(650);
      await handle({ replyId: target.dataset.id, text: target.querySelector('.t')?.textContent ?? target.textContent });
    }
    await wait(250);
  }
}

form.addEventListener('submit', e => { e.preventDefault(); const t = input.value.trim(); if (!t || busy) return; input.value = ''; handle({ text: t }); });
input.addEventListener('input', () => { input.dir = input.value ? dirOf(input.value) : 'auto'; });
document.querySelectorAll('.start').forEach(b => b.addEventListener('click', () => play(SCRIPTS.find(s => s.id === b.dataset.script), b)));
$('#reset').addEventListener('click', () => { if (!busy) { reset(); document.querySelectorAll('.start').forEach(b => b.setAttribute('aria-pressed', 'false')); } });
function tick() { const p = qatarParts(Date.now()); $('#doha').textContent = hhmm(p.minutes); }
tick(); setInterval(tick, 20000);
reset();
