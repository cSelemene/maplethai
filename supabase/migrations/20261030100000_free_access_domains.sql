-- Free access by e-mail domain. Anyone who signs in with a confirmed address at a
-- listed domain (for example name@sasin.edu) is granted the listed product the
-- first time sync_account() runs for them, with source 'domain'. The grant works
-- like a grandfather grant: it is given once, so an admin suspension stays in
-- place, and it is never given to an unconfirmed address (a typed-in address is
-- only trusted after the confirmation link or a Google sign-in).
create table private.free_domains (
  domain text not null,
  product text not null,
  note text,
  created_at timestamp with time zone default now() not null,
  constraint free_domains_pkey primary key (domain, product),
  constraint free_domains_product_fkey foreign key (product) references public.products(id),
  constraint free_domains_domain_check check (domain = lower(domain) and domain not like '%@%' and domain <> '')
);
revoke all on private.free_domains from public, anon, authenticated, service_role;

-- Sasin students and staff get the all-guides pack (every guide in pack_covers() plus permanent market access).
insert into private.free_domains(domain, product, note) values ('sasin.edu', 'pack_all', 'Sasin School of Management: all guides free');

CREATE OR REPLACE FUNCTION public.sync_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); em text; confirmed timestamptz; r record; pack boolean;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  insert into public.profiles(id) values (uid) on conflict do nothing;
  select lower(u.email), u.email_confirmed_at into em, confirmed from auth.users u where u.id = uid;
  if confirmed is not null then
    perform private.claim_gifts(uid);
    perform private.claim_market_rewards(uid);
    for r in select g.product from private.grandfather g where g.email = em loop
      if not exists(select 1 from public.entitlements e where e.user_id = uid and e.product = r.product) then
        perform private.grant_product(uid, r.product, 'grandfather');
      end if;
    end loop;
    for r in select d.product from private.free_domains d where d.domain = split_part(em, '@', 2) loop
      if not exists(select 1 from public.entitlements e where e.user_id = uid and e.product = r.product) then
        perform private.grant_product(uid, r.product, 'domain');
      end if;
    end loop;
  end if;
  pack := exists(select 1 from public.entitlements e where e.user_id = uid and e.product = 'pack_all' and (e.expires_at is null or e.expires_at > now()));
  return jsonb_build_object(
    'is_admin', private.is_admin(uid),
    'entitlements', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('product', e.product, 'expires_at', e.expires_at, 'source', e.source) x
        from public.entitlements e where e.user_id = uid
          and not (pack and e.product = any(private.pack_covers()) and e.expires_at is not null)
        union all
        select jsonb_build_object('product', c, 'expires_at', null, 'source', 'pack')
        from unnest(private.pack_covers()) c
        where pack and not exists(select 1 from public.entitlements e where e.user_id = uid and e.product = c and e.expires_at is null)
      ) t), '[]'::jsonb));
end $function$;
