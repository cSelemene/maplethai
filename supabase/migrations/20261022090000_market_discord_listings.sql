-- Admins can post listings on behalf of players who traded on Discord. These listings
-- show the player's Discord username publicly (free to view, no contact quota), can
-- link the original Discord message, and close 36 hours after that message was sent.
ALTER TABLE public.listings ADD COLUMN discord_user text, ADD COLUMN discord_url text;
ALTER TABLE public.listings ADD CONSTRAINT listings_discord_user_check CHECK (discord_user IS NULL OR discord_user ~ '^[A-Za-z0-9_.]{2,32}(#[0-9]{4})?$');
ALTER TABLE public.listings ADD CONSTRAINT listings_discord_url_check CHECK (discord_url IS NULL OR (discord_user IS NOT NULL AND discord_url ~ '^https://(ptb\.|canary\.)?discord(app)?\.com/channels/[0-9]{1,20}/[0-9]{1,20}/[0-9]{1,20}$'));

CREATE OR REPLACE FUNCTION private.marketplace_save_discord(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); item public.items%rowtype; stats jsonb; k text; v jsonb; lid bigint; who text; url text; sent timestamptz; expires timestamptz;
BEGIN
 IF uid IS NULL OR NOT private.is_admin(uid) THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลลงประกาศแทนผู้เล่นได้'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'ข้อมูลประกาศไม่ถูกต้อง'; END IF;
 IF coalesce(p_data->>'item_id','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'เลือกไอเทมจากรายการค้นหา'; END IF;
 SELECT * INTO item FROM public.items WHERE id=(p_data->>'item_id')::int;
 IF item.id IS NULL THEN RAISE EXCEPTION 'ไม่พบไอเทมในฐานข้อมูล'; END IF;
 IF p_data->>'kind' IS NULL OR p_data->>'kind' NOT IN ('buy','sell') OR coalesce(p_data->>'qty','') !~ '^[0-9]{1,4}$' OR coalesce(p_data->>'price','') !~ '^[0-9]{1,10}$' OR (p_data->>'price')::bigint<1 THEN RAISE EXCEPTION 'กรอกจำนวนและราคาให้ถูกต้อง'; END IF;
 stats:=coalesce(p_data->'item_stats','{}'::jsonb);
 IF jsonb_typeof(stats) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'สเตตัสไม่ถูกต้อง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each(stats) LOOP
  IF NOT k=ANY(private.market_item_fields(item.type,item.subtype)) OR jsonb_typeof(v)<>'number' OR v::text !~ '^-?[0-9]{1,3}$' OR abs((v::text)::int)>(CASE WHEN k IN ('hp','mp') THEN 999 ELSE 99 END) THEN RAISE EXCEPTION 'สเตตัสไม่ตรงกับชนิดไอเทม'; END IF;
 END LOOP;
 who:=btrim(regexp_replace(coalesce(p_data->>'discord_user',''),'^@',''));
 IF who !~ '^[A-Za-z0-9_.]{2,32}(#[0-9]{4})?$' THEN RAISE EXCEPTION 'ใส่ username Discord ของผู้เล่น (ตัวอักษรอังกฤษ ตัวเลข _ หรือ .)'; END IF;
 url:=nullif(btrim(coalesce(p_data->>'discord_url','')),'');
 IF url IS NOT NULL THEN
  IF url !~ '^https://(ptb\.|canary\.)?discord(app)?\.com/channels/[0-9]{1,20}/[0-9]{1,20}/[0-9]{1,20}$' THEN RAISE EXCEPTION 'ลิงก์ข้อความ Discord ไม่ถูกต้อง (คลิกขวาที่ข้อความ แล้วเลือก Copy Message Link)'; END IF;
  -- A Discord message id carries its send time: (id >> 22) ms after 2015-01-01 UTC.
  sent:=to_timestamp((((regexp_match(url,'([0-9]+)$'))[1]::numeric::bigint>>22)+1420070400000)/1000.0);
  IF sent>now()+interval '5 minutes' THEN RAISE EXCEPTION 'ลิงก์ข้อความ Discord ไม่ถูกต้อง'; END IF;
 END IF;
 expires:=coalesce(sent,now())+interval '36 hours';
 IF expires<=now() THEN RAISE EXCEPTION 'ข้อความนี้โพสต์เกิน 36 ชั่วโมงแล้ว'; END IF;
 IF p_id IS NULL THEN
  INSERT INTO public.listings(user_id,kind,item_name,item_id,category,qty,price,price_unit,item_stats,slots,expires_at,discord_user,discord_url)
  VALUES(uid,p_data->>'kind',item.name,item.id,private.market_item_category(item.type,item.subtype),(p_data->>'qty')::int,(p_data->>'price')::bigint,'meso',stats,CASE WHEN item.type='Equip' THEN nullif(p_data->>'slots','')::int END,expires,who,url)
  RETURNING id INTO lid;
 ELSE
  UPDATE public.listings SET kind=p_data->>'kind',item_name=item.name,item_id=item.id,category=private.market_item_category(item.type,item.subtype),qty=(p_data->>'qty')::int,price=(p_data->>'price')::bigint,item_stats=stats,slots=CASE WHEN item.type='Equip' THEN nullif(p_data->>'slots','')::int END,discord_user=who,discord_url=url,expires_at=CASE WHEN url IS DISTINCT FROM discord_url THEN expires ELSE expires_at END,updated_at=now()
  WHERE id=p_id AND discord_user IS NOT NULL AND status='open' AND expires_at>now() RETURNING id INTO lid;
  IF lid IS NULL THEN RAISE EXCEPTION 'แก้ไขได้เฉพาะประกาศจาก Discord ที่ยังเปิดอยู่'; END IF;
 END IF;
 INSERT INTO private.marketplace_contacts(listing_id,contacts) VALUES(lid,jsonb_build_object('discord',who)) ON CONFLICT(listing_id) DO UPDATE SET contacts=excluded.contacts;
 RETURN lid;
END $function$;

CREATE OR REPLACE FUNCTION public.marketplace_save_discord(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$ SELECT private.marketplace_save_discord(p_id,p_data) $function$;
REVOKE ALL ON FUNCTION private.marketplace_save_discord(bigint,jsonb) FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.marketplace_save_discord(bigint,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.marketplace_save_discord(bigint,jsonb) FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.marketplace_save_discord(bigint,jsonb) TO authenticated;
