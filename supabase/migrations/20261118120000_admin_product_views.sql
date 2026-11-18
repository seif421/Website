-- Views per product page (admin Products list), from the existing page_views log.
create or replace function public.admin_product_views(p_days integer default 30)
returns table(slug text, views bigint, visitors bigint)
language plpgsql stable security definer
set search_path = 'public', 'private' as $$
begin
  if auth.uid() is null or not public.has_any_staff_role(auth.uid()) then
    raise exception 'Not allowed.';
  end if;
  return query
    select substring(pv.path from '^/product/([^/?#]+)') as slug,
           count(*) as views,
           count(distinct pv.session_id) as visitors
      from public.page_views pv
     where pv.path like '/product/%'
       and pv.created_at >= now() - (least(greatest(coalesce(p_days, 30), 1), 3650) || ' days')::interval
     group by 1;
end $$;

revoke all on function public.admin_product_views(integer) from public, anon;
grant execute on function public.admin_product_views(integer) to authenticated;
