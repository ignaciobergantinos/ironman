-- Tría · esquema de base de datos
-- Ejecútalo en Supabase: Dashboard -> SQL Editor -> New query -> pega esto -> Run

-- Una fila por entrada de entrenamiento (log de sesión o sesión extra).
-- entry_key = id de sesión, p.ej. "2026-07-06:am"  o el id de una extra.
-- kind = 'log' (datos de una sesión de la plantilla) | 'extra' (sesión añadida a mano)
--        | 'gymdef' (fila única "gym:defaults": pesos/reps plantilla de la 1ª serie por rutina).
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

-- ---------------------------------------------------------------------------
-- Caché de actividades de intervals.icu: se guardan en la BD para no llamar a
-- la API de intervals.icu en cada carga (solo se refresca cuando está caducada).
create table if not exists public.intervals_activities (
  user_id     uuid        not null default auth.uid() references auth.users on delete cascade,
  activity_id text        not null,
  date        date        not null,
  data        jsonb       not null default '{}'::jsonb,
  synced_at   timestamptz not null default now(),
  primary key (user_id, activity_id)
);
create index if not exists intervals_activities_date_idx
  on public.intervals_activities (user_id, date);

alter table public.intervals_activities enable row level security;

drop policy if exists "icu: select" on public.intervals_activities;
drop policy if exists "icu: insert" on public.intervals_activities;
drop policy if exists "icu: update" on public.intervals_activities;
drop policy if exists "icu: delete" on public.intervals_activities;

create policy "icu: select" on public.intervals_activities
  for select using (auth.uid() = user_id);
create policy "icu: insert" on public.intervals_activities
  for insert with check (auth.uid() = user_id);
create policy "icu: update" on public.intervals_activities
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "icu: delete" on public.intervals_activities
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Fotos de las sesiones (Supabase Storage).
-- Bucket privado; cada usuario solo accede a su propia carpeta ({user_id}/...).
-- Las fotos se reducen a ~1280px/JPEG antes de subir para ocupar poco espacio.
insert into storage.buckets (id, name, public)
  values ('training-photos', 'training-photos', false)
  on conflict (id) do nothing;

drop policy if exists "photos: select own" on storage.objects;
drop policy if exists "photos: insert own" on storage.objects;
drop policy if exists "photos: delete own" on storage.objects;

create policy "photos: select own" on storage.objects
  for select using (bucket_id = 'training-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: insert own" on storage.objects
  for insert with check (bucket_id = 'training-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: delete own" on storage.objects
  for delete using (bucket_id = 'training-photos' and (storage.foldername(name))[1] = auth.uid()::text);
