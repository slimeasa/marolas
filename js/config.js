// ============================================================
//  CONFIGURAÇÃO DO MAROLAS
// ============================================================
// Dados do projeto Supabase (gratuito) deste app.
//
// IMPORTANTE sobre segurança:
//  - A "anon key" abaixo é PÚBLICA por design — pode ficar no frontend.
//  - A segurança dos dados vem das políticas Row Level Security (RLS)
//    definidas em supabase/schema.sql. NUNCA coloque aqui a "service_role key".
// ============================================================

export const SUPABASE_URL = 'https://dcpongfqatiabyvzemqr.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjcG9uZ2ZxYXRpYWJ5dnplbXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTk2ODgsImV4cCI6MjA5NTc3NTY4OH0.wLT3vYuJyKWR_IIdwJkHAWBw-342P4Zq3_KjnamToSo';

// Quando true, o app funciona em "modo demonstração" (sem login/feed real),
// mostrando só a previsão de ondas. É ativado automaticamente se as chaves
// acima não tiverem sido preenchidas.
export const DEMO_MODE =
  SUPABASE_URL.startsWith('COLE_AQUI') || SUPABASE_ANON_KEY.startsWith('COLE_AQUI');
