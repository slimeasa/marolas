// Cliente Supabase carregado via CDN (sem build/Node).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_MODE } from './config.js';

export const supabase = DEMO_MODE
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

export { DEMO_MODE };

// Estado de autenticação reativo simples.
let _user = null;
let _profile = null;
const listeners = new Set();

export function onAuthChange(cb) {
  listeners.add(cb);
  cb({ user: _user, profile: _profile });
  return () => listeners.delete(cb);
}

function emit() {
  for (const cb of listeners) cb({ user: _user, profile: _profile });
}

export function currentUser() {
  return _user;
}
export function currentProfile() {
  return _profile;
}

async function loadProfile() {
  if (!_user) {
    _profile = null;
    return;
  }
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', _user.id)
    .maybeSingle();
  _profile = data || null;
}

export async function initAuth() {
  if (DEMO_MODE) return;
  const { data } = await supabase.auth.getSession();
  _user = data.session?.user ?? null;
  await loadProfile();
  emit();
  supabase.auth.onAuthStateChange(async (_event, session) => {
    _user = session?.user ?? null;
    await loadProfile();
    emit();
  });
}

export async function signUp({ email, password, name, role }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Cria o perfil. Se exigir confirmação de e-mail, o id já existe.
  if (data.user) {
    const { error: pErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      name,
      role, // 'surfista' | 'fotografo'
    });
    if (pErr) throw pErr;
    // Atualiza o estado já com o perfil criado (evita corrida com o
    // evento de login, que poderia carregar o perfil antes de existir).
    if (data.session) {
      _user = data.user;
      await loadProfile();
      emit();
    }
  }
  return data;
}

export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _user = (await supabase.auth.getSession()).data.session?.user ?? null;
  await loadProfile();
  emit();
}

export async function signOut() {
  await supabase.auth.signOut();
  _user = null;
  _profile = null;
  emit();
}
