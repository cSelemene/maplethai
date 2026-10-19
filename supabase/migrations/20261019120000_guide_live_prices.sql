-- Website guides read the daily synced MeowDB prices.
-- svc_put_prices writes public.market_prices (id 1) every day; get_guide now
-- injects that row as window.__MKT__ right after <head>. The guides already
-- prefer window.__MKT__ over their built-in snapshot when it is newer, and keep
-- the snapshot if the row is missing.
CREATE OR REPLACE FUNCTION public.get_guide(p_guide text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid(); h text; m jsonb; tag text; i int;
begin
  if uid is null then raise exception 'ต้องล็อกอินก่อน'; end if;
  if not (private.has_product(uid, private.guide_product(p_guide)) or private.is_admin(uid)) then raise exception 'ยังไม่ได้ซื้อไกด์นี้'; end if;
  select html into h from public.guide_files where guide = p_guide;
  select data into m from public.market_prices where id = 1;
  if h is not null and m ? 'prices' and m ? 'fetchedAt' then
    tag := substring(h from '(?i)<head(?:\s[^>]*)?>');
    if tag is not null then
      i := strpos(h, tag) + length(tag);
      h := left(h, i - 1)
        || '<script>window.__MKT__=' || replace(replace(replace(m::text, '<', chr(92) || 'u003c'), chr(8232), chr(92) || 'u2028'), chr(8233), chr(92) || 'u2029') || ';</script>'
        || substr(h, i);
    end if;
  end if;
  return h;
end $function$;
