import { BEACHES, getBeach } from '../api/beaches.js';
import { getForecast, degToCompass, ratingLabel, surfSlang } from '../api/forecast.js';
import { h, clear, weekday, fmtHour, fmtDate, fmtTime } from '../ui.js';
import { icon, iconSvg } from '../icons.js';
import { waveSparkline } from '../charts.js';

let activeBeachId = 'maresias';

// Faixa de ondas animadas (3 camadas com velocidades diferentes).
function animatedWaves() {
  const wave =
    'M0 45 q75 -28 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 L1200 90 L0 90 Z';
  const layer = (cls, fill) =>
    `<path class="wlayer ${cls}" d="${wave}" fill="${fill}"/>`;
  return h('div', {
    class: 'hero-waves',
    html: `<svg viewBox="0 0 1200 90" preserveAspectRatio="none">
      ${layer('w1', 'rgba(255,255,255,0.18)')}
      ${layer('w2', 'rgba(255,255,255,0.28)')}
      ${layer('w3', 'rgba(255,255,255,0.42)')}
    </svg>`,
  });
}

function metric(iconName, label, value) {
  return h('div', { class: 'metric' }, [
    h('div', { class: 'label' }, [icon(iconName, { size: 14 }), label]),
    h('div', { class: 'value' }, value),
  ]);
}

function pickNow(hours) {
  const now = Date.now();
  return hours.find((x) => x.date.getTime() >= now) || hours[0];
}

function ratingIcon(score) {
  if (score == null) return 'waves';
  if (score >= 8) return 'flame';
  if (score >= 6.5) return 'star';
  return 'waves';
}

function hero(fc) {
  const cur = pickNow(fc.hours);
  const r = ratingLabel(cur.score);
  return h('div', { class: 'hero reveal' }, [
    h('div', { class: 'hero-grid' }, [
      h('div', { class: 'hero-left' }, [
        h('div', { style: 'display:flex;align-items:center;gap:10px' }, [
          h('span', { class: 'pill ' + r.className },
            [icon(ratingIcon(cur.score), { size: 15 }), r.label + (cur.score != null ? ` · ${cur.score}` : '')]),
          h('span', {
            class: 'icn float-surf',
            style: 'color:rgba(255,255,255,0.9);margin-left:auto',
            html: iconSvg('surf', { size: 30 }),
          }),
        ]),
        h('div', { style: 'display:flex;align-items:flex-end;gap:14px;margin-top:12px;flex-wrap:wrap' }, [
          h('div', { class: 'hero-wave-h' }, [
            (cur.waveHeight?.toFixed(1) ?? '—').replace('.', ','), h('small', {}, ' m'),
          ]),
          h('div', { class: 'hero-slang' }, surfSlang(cur.waveHeight)),
        ]),
        h('div', { class: 'hero-sub' }, [
          icon('navigation', { size: 15 }),
          `${degToCompass(cur.waveDir)} (${cur.waveDir?.toFixed(0) ?? '—'}°)`,
          h('span', { style: 'opacity:.5' }, '·'),
          icon('clock', { size: 15 }),
          `Período ${cur.wavePeriod?.toFixed(0) ?? '—'}s`,
        ]),
        animatedWaves(),
      ]),
      h('div', { class: 'hero-right' }, [
        h('div', { class: 'metric-now-title' }, [
          h('span', { class: 'live-dot' }), 'Agora em ' + fc.beach.name,
        ]),
        h('div', { class: 'hero-metrics' }, [
          metric('wind', 'Vento', `${cur.windSpeed?.toFixed(0) ?? '—'} ${degToCompass(cur.windDir)}`),
          metric('activity', 'Rajadas', `${cur.windGust?.toFixed(0) ?? '—'} km/h`),
          metric('waves', 'Mar aberto', `${cur.offshoreHeight?.toFixed(1).replace('.', ',') ?? '—'} m`),
          metric('thermometer', 'Temp.', `${cur.temp?.toFixed(0) ?? '—'}°C`),
        ]),
      ]),
    ]),
  ]);
}

function ratingColor(score) {
  return ratingLabel(score).className;
}

function hourStrip(day) {
  const cells = day.hours
    .filter((x) => x.date.getHours() % 3 === 0)
    .map((x) =>
      h('div', { class: 'hour-cell' }, [
        h('div', { class: 'hr' }, fmtHour(x.date)),
        h('div', { class: 'wv' }, (x.waveHeight?.toFixed(1) ?? '—').replace('.', ',')),
        h('div', { class: 'hr', style: 'font-weight:600' }, `${x.wavePeriod?.toFixed(0) ?? '-'}s`),
        h('div', { class: 'dot ' + ratingColor(x.score) }),
      ])
    );
  return h('div', { class: 'hours-row' }, cells);
}

function dayCard(day, i) {
  const best = day.best;
  const r = ratingLabel(best?.score);
  const card = h('div', { class: 'card day-card reveal' }, [
    h('div', { class: 'row-between' }, [
      h('div', {}, [
        h('div', { class: 'dow' }, weekday(day.date)),
        h('div', { class: 'ddate' }, fmtDate(day.date)),
      ]),
      h('div', { style: 'text-align:right' }, [
        h('span', { class: 'pill ' + r.className }, (day.avgWave.toFixed(1).replace('.', ',')) + ' m'),
        h('div', { class: 'ddate', style: 'margin-top:4px;font-weight:700' }, surfSlang(day.avgWave)),
      ]),
    ]),
    waveSparkline(day.hours),
    best &&
      h('div', { class: 'day-best' }, [
        icon('surf', { size: 17 }),
        h('div', {}, [
          h('strong', {}, 'Melhor janela: '),
          `${fmtTime(best.date)} · ${best.waveHeight?.toFixed(1).replace('.', ',')} m, ` +
            `${best.wavePeriod?.toFixed(0)}s, vento ${best.windSpeed?.toFixed(0)} km/h ${degToCompass(best.windDir)}`,
        ]),
      ]),
    hourStrip(day),
  ]);
  card.style.animationDelay = i * 0.07 + 's';
  return card;
}

function skeleton() {
  return h('div', { class: 'skeleton-wrap' }, [
    h('div', { class: 'skel skel-hero' }),
    h('div', { class: 'grid grid-2' }, [0, 1, 2, 3].map(() => h('div', { class: 'skel skel-card' }))),
  ]);
}

export async function renderForecast(root) {
  clear(root);
  const tabs = h('div', { class: 'beach-tabs' },
    BEACHES.map((b) =>
      h('button', {
        class: 'beach-tab' + (b.id === activeBeachId ? ' active' : ''),
        onclick: () => { activeBeachId = b.id; renderForecast(root); },
      }, [icon('mapPin', { size: 15 }), b.name])
    )
  );

  const content = h('div', {}, skeleton());
  root.append(
    h('div', { class: 'page' }, [
      h('div', { class: 'container' }, [
        h('h1', { class: 'page-title head-icon' }, [icon('waves', { size: 26 }), 'Previsão de ondas']),
        h('p', { class: 'page-sub' }, 'Litoral Norte de SP · dados reais via Open-Meteo'),
        tabs,
        content,
      ]),
    ])
  );

  const beach = getBeach(activeBeachId);
  try {
    const fc = await getForecast(beach);
    clear(content);
    content.append(
      hero(fc),
      h('p', { style: 'margin:22px 0 6px;font-weight:600;color:var(--muted)' }, beach.description),
      h('h2', { style: 'margin:24px 0 14px;font-size:1.2rem;font-weight:900' }, 'Próximos 7 dias'),
      h('div', { class: 'grid grid-2' }, fc.days.slice(0, 7).map((d, i) => dayCard(d, i))),
      h('p', { class: 'badge', style: 'margin-top:18px' },
        [icon('refresh', { size: 14 }),
        'Atualizado ' + fc.updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })]),
    );
  } catch (e) {
    clear(content);
    content.append(
      h('div', { class: 'empty' }, [
        h('div', { class: 'emo' }, icon('waves', { size: 48 })),
        h('p', {}, 'Não consegui carregar a previsão agora. Verifique a conexão e tente de novo.'),
        h('p', { style: 'font-size:.8rem' }, String(e.message || e)),
      ])
    );
  }
}
