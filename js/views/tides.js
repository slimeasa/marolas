import { BEACHES, getBeach } from '../api/beaches.js';
import { getForecast } from '../api/forecast.js';
import { h, clear, weekday, fmtTime, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { tideCurve } from '../charts.js';

let activeBeachId = 'maresias';

function tideDayCard(day, tides, i) {
  const rows = tides.map((t) =>
    h('div', { class: 'tide-row ' + (t.type === 'alta' ? 'tide-alta' : 'tide-baixa') }, [
      h('div', { class: 'tide-type' }, [
        h('span', { class: 'tide-badge' }, icon('droplet', { size: 16, fill: t.type === 'alta' })),
        t.type === 'alta' ? 'Maré alta' : 'Maré baixa',
      ]),
      h('div', {}, [
        h('div', { class: 'tide-time' }, fmtTime(t.date)),
        h('div', { class: 'tide-h' }, ((t.height >= 0 ? '+' : '') + t.height.toFixed(2).replace('.', ',')) + ' m'),
      ]),
    ])
  );
  const card = h('div', { class: 'card tide-day reveal' }, [
    h('div', { class: 'row-between', style: 'margin-bottom:6px' }, [
      h('div', { class: 'dow' }, weekday(day.date)),
      h('div', { class: 'ddate' }, fmtDate(day.date)),
    ]),
    tideCurve(day.hours, tides),
    h('div', { class: 'tide-list' }, rows.length ? rows : [h('p', { class: 'tide-h' }, 'sem dados')]),
  ]);
  card.style.animationDelay = i * 0.06 + 's';
  return card;
}

function skeleton() {
  return h('div', { class: 'grid grid-3' }, [0, 1, 2, 3, 4, 5].map(() => h('div', { class: 'skel', style: 'height:240px' })));
}

export async function renderTides(root) {
  clear(root);
  const tabs = h('div', { class: 'beach-tabs' },
    BEACHES.map((b) =>
      h('button', {
        class: 'beach-tab' + (b.id === activeBeachId ? ' active' : ''),
        onclick: () => { activeBeachId = b.id; renderTides(root); },
      }, [icon('mapPin', { size: 15 }), b.name])
    )
  );
  const content = h('div', {}, skeleton());
  root.append(
    h('div', { class: 'page' }, [
      h('div', { class: 'container' }, [
        h('h1', { class: 'page-title head-icon' }, [icon('droplet', { size: 24 }), 'Tábua de marés']),
        h('p', { class: 'page-sub' }, 'Curva e horários de maré alta e baixa para os próximos dias'),
        tabs,
        content,
      ]),
    ])
  );

  try {
    const fc = await getForecast(getBeach(activeBeachId));
    // marés por dia
    const tidesByDay = new Map();
    for (const t of fc.tides) {
      const k = t.date.toISOString().slice(0, 10);
      if (!tidesByDay.has(k)) tidesByDay.set(k, []);
      tidesByDay.get(k).push(t);
    }
    clear(content);
    const cards = fc.days.slice(0, 6).map((day, i) =>
      tideDayCard(day, tidesByDay.get(day.day) || [], i)
    );
    content.append(h('div', { class: 'grid grid-3' }, cards));
  } catch (e) {
    clear(content);
    content.append(h('div', { class: 'empty' }, [h('div', { class: 'emo' }, icon('droplet', { size: 48 })), h('p', {}, 'Erro ao carregar marés.')]));
  }
}
