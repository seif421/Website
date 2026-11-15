-- Cache of automatic Arabic translations of the website content (FAQ, About, promos...).
create table if not exists public.content_translations (
  src_hash text primary key,
  src text not null,
  ar text not null,
  created_at timestamptz not null default now()
);
alter table public.content_translations enable row level security;
revoke all on public.content_translations from anon, authenticated;
