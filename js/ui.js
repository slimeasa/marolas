// Pequenos utilitários de UI e formatação.

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v != null && v !== false) el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

let toastTimer;
export function toast(msg, isError = false) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast' + (isError ? ' err' : '') }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3200);
}

export function spinner() {
  return h('div', { class: 'spinner' });
}

const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WD_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function weekday(date, short = false) {
  return (short ? WD_SHORT : WD)[date.getDay()];
}
export function fmtHour(date) {
  return String(date.getHours()).padStart(2, '0') + 'h';
}
export function fmtTime(date) {
  return (
    String(date.getHours()).padStart(2, '0') +
    ':' +
    String(date.getMinutes()).padStart(2, '0')
  );
}
export function fmtDate(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return Math.floor(s / 60) + ' min';
  if (s < 86400) return Math.floor(s / 3600) + ' h';
  return Math.floor(s / 86400) + ' d';
}
export function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
