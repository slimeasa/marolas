// Gráficos em SVG, leves e animados. Sem dependências.
import { h } from './ui.js';

function smoothPath(pts) {
  // curva suave (Catmull-Rom -> Bézier)
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// Mini gráfico de área da altura das ondas ao longo do dia.
export function waveSparkline(hours, { w = 300, hgt = 56 } = {}) {
  const vals = hours.map((x) => x.waveHeight ?? 0);
  if (!vals.length) return h('div');
  const max = Math.max(1, ...vals);
  const min = Math.min(...vals, 0);
  const pad = 4;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = hgt - pad - ((v - min) / (max - min || 1)) * (hgt - pad * 2);
    return [x, y];
  });
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1][0]},${hgt} L${pts[0][0]},${hgt} Z`;
  const gid = 'spark' + Math.round(pts[0][1] * 100 + vals.length);
  return h('div', {
    class: 'chart-spark',
    html: `<svg viewBox="0 0 ${w} ${hgt}" width="100%" height="${hgt}" preserveAspectRatio="none">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(31,185,189,.35)"/>
        <stop offset="100%" stop-color="rgba(31,185,189,0)"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#${gid})"/>
      <path class="spark-line" d="${line}" fill="none" stroke="#15a3aa" stroke-width="2.5"/>
    </svg>`,
  });
}

// Curva de maré (nível do mar) ao longo do dia, com marcadores e linha "agora".
export function tideCurve(dayHours, tides, { w = 340, hgt = 150 } = {}) {
  const vals = dayHours.map((x) => x.seaLevel ?? 0);
  if (!vals.length) return h('div');
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const padX = 10, padTop = 22, padBot = 26;
  const X = (i) => padX + (i / (vals.length - 1)) * (w - padX * 2);
  const Y = (v) => padTop + (1 - (v - min) / (max - min || 1)) * (hgt - padTop - padBot);
  const pts = vals.map((v, i) => [X(i), Y(v)]);
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1][0]},${hgt - padBot} L${pts[0][0]},${hgt - padBot} Z`;

  // marcadores de maré alta/baixa
  const marks = tides
    .map((t) => {
      const hr = t.date.getHours();
      const idx = dayHours.findIndex((x) => x.date.getHours() === hr);
      if (idx < 0) return '';
      const x = X(idx), y = Y(vals[idx]);
      const label = (t.type === 'alta' ? '▲ ' : '▼ ') + String(hr).padStart(2, '0') + 'h';
      const ly = t.type === 'alta' ? y - 9 : y + 16;
      return `<circle cx="${x}" cy="${y}" r="4" fill="#0e7c8a"/>
        <text x="${x}" y="${ly}" text-anchor="middle" class="tide-mark">${label}</text>`;
    })
    .join('');

  // linha "agora"
  const now = new Date();
  const nowIdx = dayHours.findIndex((x) => x.date.getHours() === now.getHours());
  const sameDay = dayHours[0] && dayHours[0].date.toDateString() === now.toDateString();
  const nowLine =
    sameDay && nowIdx >= 0
      ? `<line x1="${X(nowIdx)}" y1="${padTop - 6}" x2="${X(nowIdx)}" y2="${hgt - padBot}" stroke="#e25555" stroke-width="1.5" stroke-dasharray="3 3"/>`
      : '';

  const gid = 'tide' + Math.round(min * 100 + vals.length);
  return h('div', {
    class: 'chart-tide',
    html: `<svg viewBox="0 0 ${w} ${hgt}" width="100%" height="${hgt}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(21,163,170,.30)"/>
        <stop offset="100%" stop-color="rgba(21,163,170,0)"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#${gid})"/>
      <path class="tide-line" d="${line}" fill="none" stroke="#0e7c8a" stroke-width="2.5"/>
      ${nowLine}${marks}
    </svg>`,
  });
}
