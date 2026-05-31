-- ============================================================
--  MAROLAS — Schema do banco (Supabase / Postgres)
--  Cole tudo no Supabase Studio > SQL Editor e clique em "Run".
--  As políticas RLS abaixo são o que garante a segurança dos dados.
-- ============================================================

-- ---------- PERFIS ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('surfista', 'fotografo')),
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfis visíveis para todos" on public.profiles;
create policy "perfis visíveis para todos"
  on public.profiles for select using (true);

drop policy if exists "usuário edita o próprio perfil" on public.profiles;
create policy "usuário edita o próprio perfil"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "usuário atualiza o próprio perfil" on public.profiles;
create policy "usuário atualiza o próprio perfil"
  on public.profiles for update using (auth.uid() = id);

-- ---------- POSTS / FOTOS (feed) ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  beach_id text,
  caption text,
  image_url text not null,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

drop policy if exists "posts visíveis para todos" on public.posts;
create policy "posts visíveis para todos"
  on public.posts for select using (true);

drop policy if exists "autor cria post" on public.posts;
create policy "autor cria post"
  on public.posts for insert with check (auth.uid() = author_id);

drop policy if exists "autor apaga o próprio post" on public.posts;
create policy "autor apaga o próprio post"
  on public.posts for delete using (auth.uid() = author_id);

-- ---------- CURTIDAS ----------
create table if not exists public.likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

drop policy if exists "curtidas visíveis" on public.likes;
create policy "curtidas visíveis" on public.likes for select using (true);

drop policy if exists "usuário curte" on public.likes;
create policy "usuário curte"
  on public.likes for insert with check (auth.uid() = user_id);

drop policy if exists "usuário descurte" on public.likes;
create policy "usuário descurte"
  on public.likes for delete using (auth.uid() = user_id);

-- ---------- CAMPEONATOS ----------
create table if not exists public.championships (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  beach_id text,
  category text,            -- ex.: Open, Master, Kids, Fotografia
  starts_at timestamptz,
  max_participants int,
  created_at timestamptz default now()
);

alter table public.championships enable row level security;

drop policy if exists "campeonatos visíveis" on public.championships;
create policy "campeonatos visíveis"
  on public.championships for select using (true);

drop policy if exists "organizador cria campeonato" on public.championships;
create policy "organizador cria campeonato"
  on public.championships for insert with check (auth.uid() = organizer_id);

drop policy if exists "organizador edita campeonato" on public.championships;
create policy "organizador edita campeonato"
  on public.championships for update using (auth.uid() = organizer_id);

drop policy if exists "organizador apaga campeonato" on public.championships;
create policy "organizador apaga campeonato"
  on public.championships for delete using (auth.uid() = organizer_id);

-- ---------- INSCRIÇÕES EM CAMPEONATOS ----------
create table if not exists public.registrations (
  championship_id uuid references public.championships(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (championship_id, user_id)
);

alter table public.registrations enable row level security;

drop policy if exists "inscrições visíveis" on public.registrations;
create policy "inscrições visíveis"
  on public.registrations for select using (true);

drop policy if exists "usuário se inscreve" on public.registrations;
create policy "usuário se inscreve"
  on public.registrations for insert with check (auth.uid() = user_id);

drop policy if exists "usuário cancela inscrição" on public.registrations;
create policy "usuário cancela inscrição"
  on public.registrations for delete using (auth.uid() = user_id);

-- ============================================================
--  STORAGE — bucket público de fotos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "fotos visíveis para todos" on storage.objects;
create policy "fotos visíveis para todos"
  on storage.objects for select
  using (bucket_id = 'fotos');

-- Cada usuário só envia para uma pasta com o próprio id (1ª parte do path).
drop policy if exists "usuário envia fotos na própria pasta" on storage.objects;
create policy "usuário envia fotos na própria pasta"
  on storage.objects for insert
  with check (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "usuário apaga as próprias fotos" on storage.objects;
create policy "usuário apaga as próprias fotos"
  on storage.objects for delete
  using (
    bucket_id = 'fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
