import { h, clear, toast, timeAgo, initials } from '../ui.js';
import { supabase, currentUser, DEMO_MODE } from '../supabase.js';
import { BEACHES } from '../api/beaches.js';
import { icon } from '../icons.js';

async function fetchPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:author_id (name, role), likes (user_id)')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data;
}

function roleTag(role) {
  return h('span', { class: 'role-tag role-' + role },
    [icon(role === 'fotografo' ? 'camera' : 'surf', { size: 12 }), role === 'fotografo' ? 'Fotógrafo' : 'Surfista']);
}

function postCard(post, onChange, i) {
  const me = currentUser();
  const liked = me && (post.likes || []).some((l) => l.user_id === me.id);
  const likeCount = (post.likes || []).length;
  const prof = post.profiles || { name: 'Surfista', role: 'surfista' };

  const likeBtn = h('button', { class: 'like-btn' + (liked ? ' liked' : '') },
    [icon('heart', { size: 19, fill: liked }), h('span', {}, String(likeCount))]);
  likeBtn.addEventListener('click', async () => {
    if (!me) return toast('Entre para curtir', true);
    try {
      if (liked) await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', me.id);
      else await supabase.from('likes').insert({ post_id: post.id, user_id: me.id });
      onChange();
    } catch (e) { toast('Erro ao curtir', true); }
  });

  const canDelete = me && me.id === post.author_id;
  const beach = BEACHES.find((b) => b.id === post.beach_id);

  const card = h('div', { class: 'card post reveal' }, [
    h('div', { class: 'post-head' }, [
      h('div', { class: 'avatar' }, initials(prof.name)),
      h('div', { style: 'flex:1' }, [
        h('div', { style: 'display:flex;align-items:center;gap:8px' }, [
          h('span', { class: 'post-author' }, prof.name), roleTag(prof.role),
        ]),
        h('div', { class: 'post-meta' },
          [beach && icon('mapPin', { size: 13 }), beach ? beach.name + ' · ' : '', timeAgo(post.created_at)]),
      ]),
      canDelete && h('button', {
        class: 'btn btn-sm btn-outline',
        onclick: async () => {
          if (!confirm('Apagar este post?')) return;
          await supabase.from('posts').delete().eq('id', post.id);
          onChange();
        },
      }, icon('trash', { size: 15 })),
    ]),
    h('img', { class: 'post-img', src: post.image_url, loading: 'lazy', alt: post.caption || 'foto de surf' }),
    post.caption && h('div', { class: 'post-body' }, post.caption),
    h('div', { class: 'post-actions' }, [likeBtn]),
  ]);
  card.style.animationDelay = i * 0.05 + 's';
  return card;
}

function uploadModal(onDone) {
  const me = currentUser();
  const form = h('form', { class: 'form', style: 'max-width:none' }, [
    h('div', { class: 'field' }, [h('label', {}, 'Foto'), h('input', { name: 'file', type: 'file', accept: 'image/*', required: true })]),
    h('div', { class: 'field' }, [
      h('label', {}, 'Praia'),
      h('select', { name: 'beach_id' }, [h('option', { value: '' }, '— selecionar —'), ...BEACHES.map((b) => h('option', { value: b.id }, b.name))]),
    ]),
    h('div', { class: 'field' }, [h('label', {}, 'Legenda'), h('textarea', { name: 'caption', rows: '2', placeholder: 'Como estava a sessão?' })]),
    h('div', { class: 'row-between' }, [
      h('button', { type: 'button', class: 'btn btn-outline', onclick: () => backdrop.remove() }, 'Cancelar'),
      h('button', { type: 'submit', class: 'btn btn-primary' }, [icon('send', { size: 15 }), 'Publicar']),
    ]),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const file = fd.get('file');
    if (!file || !file.size) return;
    if (file.size > 8 * 1024 * 1024) return toast('Imagem muito grande (máx 8 MB)', true);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${me.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('fotos').upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('fotos').getPublicUrl(path);
      const { error: insErr } = await supabase.from('posts').insert({
        author_id: me.id, beach_id: fd.get('beach_id') || null, caption: fd.get('caption') || null, image_url: pub.publicUrl,
      });
      if (insErr) throw insErr;
      toast('Foto publicada!');
      backdrop.remove();
      onDone();
    } catch (err) {
      toast(err.message || 'Erro no upload', true);
      btn.disabled = false; btn.textContent = 'Publicar';
    }
  });

  const backdrop = h('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === backdrop) backdrop.remove(); } }, [
    h('div', { class: 'modal' }, [h('h3', {}, [icon('camera', { size: 20 }), 'Nova foto']), form]),
  ]);
  document.body.append(backdrop);
}

export async function renderFeed(root) {
  clear(root);
  if (DEMO_MODE) { root.append(demoNotice('Feed de fotos', 'camera')); return; }
  const me = currentUser();
  const content = h('div', {}, h('div', { class: 'skeleton-wrap' }, [0, 1].map(() => h('div', { class: 'skel', style: 'height:380px' }))));
  const reload = () => renderFeed(root);

  root.append(
    h('div', { class: 'page' }, [
      h('div', { class: 'container feed-col' }, [
        h('div', { class: 'row-between', style: 'margin-bottom:20px' }, [
          h('div', {}, [
            h('h1', { class: 'page-title head-icon' }, [icon('camera', { size: 24 }), 'Feed']),
            h('p', { class: 'page-sub', style: 'margin:0' }, 'Fotos da comunidade'),
          ]),
          me && h('button', { class: 'btn btn-primary', onclick: () => uploadModal(reload) }, [icon('plus', { size: 17 }), 'Postar']),
        ]),
        content,
      ]),
    ])
  );

  try {
    const posts = await fetchPosts();
    clear(content);
    if (!posts.length) {
      content.append(h('div', { class: 'empty' }, [
        h('div', { class: 'emo' }, icon('camera', { size: 48 })),
        h('p', {}, me ? 'Seja o primeiro a postar uma foto!' : 'Ainda não há fotos. Entre para postar.'),
      ]));
    } else {
      posts.forEach((p, i) => content.append(postCard(p, reload, i)));
    }
  } catch (e) {
    clear(content);
    content.append(h('div', { class: 'empty' }, [h('p', {}, 'Erro ao carregar o feed: ' + e.message)]));
  }
}

export function demoNotice(feature, iconName = 'trophy') {
  return h('div', { class: 'page' }, [
    h('div', { class: 'container' }, [
      h('div', { class: 'card reveal', style: 'max-width:540px;margin:30px auto;padding:34px;text-align:center' }, [
        h('div', { class: 'emo', style: 'color:var(--teal-400)' }, icon(iconName, { size: 52 })),
        h('h1', { class: 'page-title', style: 'margin-top:10px' }, feature + ' precisa do Supabase'),
        h('p', { class: 'page-sub' },
          'Configure seu projeto Supabase gratuito (passo a passo no README.md) para liberar login, ' + feature.toLowerCase() + ' e mais. A previsão de ondas já funciona sem configurar nada.'),
        h('a', { class: 'btn btn-primary', href: '#/forecast', style: 'justify-content:center' }, [icon('waves', { size: 17 }), 'Ver previsão']),
      ]),
    ]),
  ]);
}
