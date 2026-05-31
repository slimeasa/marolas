// ============================================================
//  CONFIGURAÇÃO DO MAROLAS
// ============================================================
// Preencha com os dados do seu projeto Supabase (gratuito).
// Veja o README.md, seção "Configurar o Supabase", passo a passo.
//
// IMPORTANTE sobre segurança:
//  - A "anon key" abaixo é PÚBLICA por design — pode ficar no frontend.
//  - A segurança dos dados vem das políticas Row Level Security (RLS)
//    definidas em supabase/schema.sql. NUNCA coloque aqui a "service_role key".
// ============================================================

export const SUPABASE_URL = 'COLE_AQUI_SUA_PROJECT_URL';
export const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_ANON_KEY';

// Quando true, o app funciona em "modo demonstração" (sem login/feed real),
// mostrando só a previsão de ondas. É ativado automaticamente se as chaves
// acima não tiverem sido preenchidas.
export const DEMO_MODE =
  SUPABASE_URL.startsWith('COLE_AQUI') || SUPABASE_ANON_KEY.startsWith('COLE_AQUI');
