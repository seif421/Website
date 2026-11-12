-- Rivvo social automation: isolated tables only; no existing commerce tables are changed.
create table if not exists public.social_automation_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  publish_instagram boolean not null default true,
  max_posts_per_day integer not null default 1 check (max_posts_per_day between 1 and 3),
  last_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.social_automation_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_url text not null,
  image_url text not null,
  caption text not null,
  status text not null default 'queued'
    check (status in ('queued', 'publishing', 'published', 'partial', 'failed', 'skipped')),
  scheduled_at timestamptz not null default now(),
  published_at timestamptz,
  facebook_post_id text,
  instagram_media_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_status_schedule_idx
  on public.social_posts (status, scheduled_at);
create index if not exists social_posts_product_published_idx
  on public.social_posts (product_id, published_at desc);

alter table public.social_automation_settings enable row level security;
alter table public.social_posts enable row level security;

drop policy if exists "staff view social automation settings" on public.social_automation_settings;
create policy "staff view social automation settings"
  on public.social_automation_settings for select to authenticated
  using (has_any_staff_role(auth.uid()));

drop policy if exists "admins manage social automation settings" on public.social_automation_settings;
create policy "admins manage social automation settings"
  on public.social_automation_settings for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "staff view social posts" on public.social_posts;
create policy "staff view social posts"
  on public.social_posts for select to authenticated
  using (has_any_staff_role(auth.uid()));

drop policy if exists "staff manage social posts" on public.social_posts;
create policy "staff manage social posts"
  on public.social_posts for all to authenticated
  using (has_any_staff_role(auth.uid()))
  with check (has_any_staff_role(auth.uid()));
