import { h, clear, initials } from './ui.js';
import { initAuth, onAuthChange, currentProfile, signOut, DEMO_MODE } from './supabase.js';
import { renderForecast } from './views/forecast.js';
import { renderTides } from './views/tides.js';
import { renderFeed } from './views/feed.js';
import { renderChampionships } from './views/championships.js';
import { renderAuth } from './views/auth.js';
import { icon } from './icons.js';

const app = document.getElementById('app');
const navRoot = document.getElementById('nav');

const ROUTES = {
  forecast: { label: 'Ondas', icon: 'waves', render: renderForecast },
  tides: { label: 'Marés', icon: 'droplet', render: renderTides },
  feed: { label: 'Feed', icon: 'camera', render: renderFeed },
  championships: { label: 'Campeonatos', icon: 'trophy', render: renderChampionships },
};

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name] = hash.split('?');
  return ROUTES[name] ? name : 'forecast';
}

function renderNav() {
  clear(navRoot);
  const profile = currentProfile();
  const route = currentRoute();

  const links = Object.entries(ROUTES).map(([key, r]) =>
    h('a', {
      class: 'nav-link' + (route === key ? ' active' : ''),
      href: '#/' + key,
    }, [icon(r.icon, { size: 17 }), h('span', {}, r.label)])
  );

  let userArea;
  if (DEMO_MODE) {
    userArea = h('span', { class: 'badge' }, 'modo demo');
  } else if (profile) {
    userArea = h('div', { class: 'nav-user' }, [
      h('div', { class: 'avatar', title: profile.name, style: 'width:36px;height:36px;font-size:.82rem' }, initials(profile.name)),
      h('button', { class: 'btn btn-outline btn-sm', onclick: async () => { await signOut(); location.hash = '#/forecast'; } },
        [icon('logout', { size: 15 }), 'Sair']),
    ]);
  } else {
    userArea = h('a', { class: 'btn btn-primary btn-sm', href: '#/auth' }, [icon('login', { size: 15 }), 'Entrar']);
  }

  navRoot.append(
    h('div', { class: 'nav-inner' }, [
      h('a', { href: '#/forecast' }, h('img', { class: 'nav-logo', src: 'assets/logomarolas-wordmark.png', alt: 'Marolas' })),
      h('nav', { class: 'nav-links' }, links),
      userArea,
    ])
  );
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
  renderNav();
  if (hash === 'auth') {
    renderAuth(app, () => { location.hash = '#/feed'; });
    return;
  }
  const r = ROUTES[currentRoute()];
  r.render(app);
}

async function start() {
  if (DEMO_MODE) {
    document.getElementById('demo-banner').style.display = 'block';
  }
  await initAuth();
  onAuthChange(() => renderNav());
  window.addEventListener('hashchange', route);
  if (!location.hash) location.hash = '#/forecast';
  route();
}

start();
