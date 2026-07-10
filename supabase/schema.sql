-- Tría · esquema de base de datos
-- Ejecútalo en Supabase: Dashboard -> SQL Editor -> New query -> pega esto -> Run

-- Una fila por entrada de entrenamiento (log de sesión o sesión extra).
-- entry_key = id de sesión, p.ej. "2026-07-06:am"  o el id de una extra.
-- kind = 'log' (datos de una sesión de la plantilla) | 'extra' (sesión añadida a mano).
create table if not exists public.training_entries (
  user_id    uuid        not null default auth.uid() references auth.users on delete cascade,
  entry_key  text        not null,
  kind       text        not null default 'log',
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_key)
);

-- Cada usuario solo ve y edita sus propias filas.
alter table public.training_entries enable row level security;

drop policy if exists "own rows: select" on public.training_entries;
drop policy if exists "own rows: insert" on public.training_entries;
drop policy if exists "own rows: update" on public.training_entries;
drop policy if exists "own rows: delete" on public.training_entries;

create policy "own rows: select" on public.training_entries
  for select using (auth.uid() = user_id);
create policy "own rows: insert" on public.training_entries
  for insert with check (auth.uid() = user_id);
create policy "own rows: update" on public.training_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows: delete" on public.training_entries
  for delete using (auth.uid() = user_id);

-- Realtime: para que un dispositivo vea al instante lo que guardas en otro.
alter publication supabase_realtime add table public.training_entries;
