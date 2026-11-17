-- Automatic Instagram Reels: one record per reel, and a public bucket for the finished videos.
create table if not exists public.social_reels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_url text not null,
  caption text not null,
  video_url text,
  instagram_media_id text,
  status text not null default 'rendering',
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.social_reels enable row level security;
revoke all on public.social_reels from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reels', 'reels', true, 52428800, array['video/mp4'])
on conflict (id) do nothing;
