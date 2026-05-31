import { h, clear, toast, fmtDate, fmtTime } from '../ui.js';
import { supabase, currentUser, DEMO_MODE } from '../supabase.js';
import { BEACHES } from '../api/beaches.js';
import { demoNotice } from './feed.js';
import { icon } from '../icons.js';

async function fetchChampionships() {
  const { data, error } = await supabase
    .from('championships')
    .select('*, organizer:organizer_id (name), registrations (user_id)')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data;
}

function champCard(c, reload, i) {
  const me = currentUser();
  const regs = c.registrations || [];
  const joined = me && regs.some((r) => r.user_id === me.id);
  const full = c.max_participants && regs.length >= c.max_participants;
  const beach = BEACHES.find((b) => b.id === c.beach_id);
  const isOrganizer = me && me.id === c.organizer_id;

  const joinBtn = h('button', {
    class: 'btn ' + (joined ? 'btn-outline' : 'btn-primary') + ' btn-sm',
    disabled: !me || (full && !joined),
  }, joined ? 'Cancelar' : full ? 'Lotado' : 'Inscrever-se');
  joinBtn.addEventListener('click', async () => {
    try {
      if (joined) await supabase.from('registrations').delete().eq('championship_id', c.id).eq('user_id', me.id);
      else { await supabase.from('registrations').insert({ championship_id: c.id, user_id: me.id }); toast('Inscrição confirmada!'); }
      reload();
    } catch (e) { toast(e.message, true); }
  });

  const card = h('div', { class: 'card reveal', style: 'padding:20px' }, [
    h('div', { class: 'row-between' }, [
      h('span', { class: 'pill rate-good' }, [icon('trophy', { size: 13 }), c.category || 'Open']),
      c.starts_at && h('span', { class: 'badge' }, [icon('calendar', { size: 14 }), fmtDate(new Date(c.starts_at)) + ' ' + fmtTime(new Date(c.starts_at))]),
    ]),
    h('h3', { style: 'margin:14px 0 4px;font-size:1.15rem;font-weight:900' }, c.title),
    h('p', { class: 'post-meta', style: 'margin:0 0 12px' },
      [beach && icon('mapPin', { size: 14 }), (beach ? beach.name + ' · ' : '') + 'por ' + (c.organizer?.name || 'organizador')]),
    c.description && h('p', { style: 'margin:0 0 14px;color:var(--muted)' }, c.description),
    h('div', { class: 'row-between' }, [
      h('span', { class: 'badge' }, [icon('users', { size: 15 }), `${regs.length}${c.max_participants ? '/' + c.max_participants : ''} inscritos`]),
      h('div', { style: 'display:flex;gap:8px' }, [
        joinBtn,
        isOrganizer && h('button', {
          class: 'btn btn-outline btn-sm',
          onclick: async () => { if (!confirm('Apagar este campeonato?')) return; await supabase.from('championships').delete().eq('id', c.id); reload(); },
        }, icon('trash', { size: 15 })),
      ]),
    ]),
  ]);
  card.style.animationDelay = i * 0.06 + 's';
  return card;
}

function createModal(onDone) {
  const me = currentUser();
  const form = h('form', { class: 'form', style: 'max-width:none' }, [
    h('div', { class: 'field' }, [h('label', {}, 'Título'), h('input', { name: 'title', required: true, placeholder: 'Ex.: 1ª Etapa Surf Maresias' })]),
    h('div', { class: 'field' }, [h('label', {}, 'Praia'), h('select', { name: 'beach_id', required: true }, BEACHES.map((b) => h('option', { value: b.id }, b.name)))]),
    h('div', { class: 'field' }, [h('label', {}, 'Categoria'), h('select', { name: 'category' }, ['Open', 'Master', 'Kids', 'Feminino', 'Longboard', 'Fotografia'].map((c) => h('option', {}, c)))]),
    h('div', { class: 'field' }, [h('label', {}, 'Data e hora'), h('input', { name: 'starts_at', type: 'datetime-local' })]),
    h('div', { class: 'field' }, [h('label', {}, 'Vagas (opcional)'), h('input', { name: 'max_participants', type: 'number', min: '1', placeholder: 'sem limite' })]),
    h('div', { class: 'field' }, [h('label', {}, 'Descrição'), h('textarea', { name: 'description', rows: '2', placeholder: 'Regras, premiação, etc.' })]),
    h('div', { class: 'row-between' }, [
      h('button', { type: 'button', class: 'btn btn-outline', onclick: () => backdrop.remove() }, 'Cancelar'),
      h('button', { type: 'submit', class: 'btn btn-primary' }, [icon('plus', { size: 16 }), 'Criar']),
    ]),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const { error } = await supabase.from('championships').insert({
        organizer_id: me.id, title: fd.get('title'), beach_id: fd.get('beach_id'), category: fd.get('category'),
        description: fd.get('description') || null,
        starts_at: fd.get('starts_at') ? new Date(fd.get('starts_at')).toISOString() : null,
        max_participants: fd.get('max_participants') ? Number(fd.get('max_participants')) : null,
      });
      if (error) throw error;
      toast('Campeonato criado!');
      backdrop.remove();
      onDone();
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false; btn.textContent = 'Criar';
    }
  });

  const backdrop = h('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === backdrop) backdrop.remove(); } }, [
    h('div', { class: 'modal' }, [h('h3', {}, [icon('trophy', { size: 20 }), 'Novo campeonato']), form]),
  ]);
  document.body.append(backdrop);
}

export async function renderChampionships(root) {
  clear(root);
  if (DEMO_MODE) { root.append(demoNotice('Campeonatos', 'trophy')); return; }
  const me = currentUser();
  const content = h('div', {}, h('div', { class: 'grid grid-2' }, [0, 1].map(() => h('div', { class: 'skel', style: 'height:180px' }))));
  const reload = () => renderChampionships(root);

  root.append(
    h('div', { class: 'page' }, [
      h('div', { class: 'container' }, [
        h('div', { class: 'row-between', style: 'margin-bottom:20px' }, [
          h('div', {}, [
            h('h1', { class: 'page-title head-icon' }, [icon('trophy', { size: 24 }), 'Campeonatos']),
            h('p', { class: 'page-sub', style: 'margin:0' }, 'Organize e participe de etapas na sua praia'),
          ]),
          me && h('button', { class: 'btn btn-primary', onclick: () => createModal(reload) }, [icon('plus', { size: 17 }), 'Criar']),
        ]),
        content,
      ]),
    ])
  );

  try {
    const champs = await fetchChampionships();
    clear(content);
    if (!champs.length) {
      content.append(h('div', { class: 'empty' }, [
        h('div', { class: 'emo' }, icon('trophy', { size: 48 })),
        h('p', {}, me ? 'Nenhum campeonato ainda. Crie o primeiro!' : 'Nenhum campeonato. Entre para criar.'),
      ]));
    } else {
      content.append(h('div', { class: 'grid grid-2' }, champs.map((c, i) => champCard(c, reload, i))));
    }
  } catch (e) {
    clear(content);
    content.append(h('div', { class: 'empty' }, [h('p', {}, 'Erro: ' + e.message)]));
  }
}
