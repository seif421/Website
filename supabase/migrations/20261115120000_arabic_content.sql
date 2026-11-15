-- Arabic text for products and categories. Filled automatically (see src/lib/store/arabic.ts).
alter table public.products
  add column if not exists name_ar text,
  add column if not exists short_description_ar text,
  add column if not exists description_ar text;
alter table public.categories
  add column if not exists name_ar text,
  add column if not exists description_ar text;

-- When the English text changes, clear the old Arabic so it is translated again.
create or replace function private.clear_stale_arabic() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'products' then
    if new.name is distinct from old.name and new.name_ar is not distinct from old.name_ar then new.name_ar := null; end if;
    if new.short_description is distinct from old.short_description and new.short_description_ar is not distinct from old.short_description_ar then new.short_description_ar := null; end if;
    if new.description is distinct from old.description and new.description_ar is not distinct from old.description_ar then new.description_ar := null; end if;
  else
    if new.name is distinct from old.name and new.name_ar is not distinct from old.name_ar then new.name_ar := null; end if;
    if new.description is distinct from old.description and new.description_ar is not distinct from old.description_ar then new.description_ar := null; end if;
  end if;
  return new;
end $$;

drop trigger if exists products_clear_stale_arabic on public.products;
create trigger products_clear_stale_arabic before update on public.products
  for each row execute function private.clear_stale_arabic();
drop trigger if exists categories_clear_stale_arabic on public.categories;
create trigger categories_clear_stale_arabic before update on public.categories
  for each row execute function private.clear_stale_arabic();
