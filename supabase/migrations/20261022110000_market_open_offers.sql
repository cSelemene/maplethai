-- A listing may leave the price blank: buyers or sellers then make an offer through the
-- poster's contact. Blank prices are stored as NULL and left out of the price reference.
ALTER TABLE public.listings ALTER COLUMN price DROP NOT NULL;
ALTER TABLE public.listings DROP CONSTRAINT listings_price_max_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_price_max_check CHECK (price_max IS NULL OR (price IS NOT NULL AND price_max>price AND price_max<=9999999999));

CREATE OR REPLACE FUNCTION private.marketplace_save_legacy(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); lid bigint; c jsonb; k text; v text; n text; cat text; unit text;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND NOT is_anonymous) THEN RAISE EXCEPTION 'เข้าสู่ระบบเพื่อโพสต์ประกาศ'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'ข้อมูลประกาศไม่ถูกต้อง'; END IF;
 n:=btrim(p_data->>'item_name'); cat:=p_data->>'category'; unit:=p_data->>'price_unit'; c:=p_data->'contacts';
 IF n IS NULL OR length(n)<2 OR length(n)>120 OR cat IS NULL OR cat NOT IN ('weapon','armor','scroll','material','consumable','other') OR unit IS NULL OR unit NOT IN ('meso','thb') OR p_data->>'kind' IS NULL OR p_data->>'kind' NOT IN ('buy','sell') OR coalesce(p_data->>'qty','') !~ '^[0-9]{1,4}$' OR coalesce(p_data->>'price','') !~ '^([0-9]{1,10})?$' OR length(coalesce(p_data->>'description',''))>1500 THEN RAISE EXCEPTION 'กรอกชื่อสินค้า จำนวน และราคาให้ถูกต้อง'; END IF;
 IF c IS NULL OR jsonb_typeof(c)<>'object' OR c='{}'::jsonb THEN RAISE EXCEPTION 'ระบุช่องทางติดต่ออย่างน้อยหนึ่งช่องทาง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each_text(c) LOOP
  IF k NOT IN ('discord','line','facebook','other') OR v IS NULL OR length(btrim(v))<2 OR length(v)>300 THEN RAISE EXCEPTION 'ช่องทางติดต่อไม่ถูกต้อง'; END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('market:'||uid::text,0));
 IF p_id IS NULL THEN
  IF (SELECT count(*) FROM public.listings WHERE user_id=uid AND status='open' AND expires_at>now())>=20 THEN RAISE EXCEPTION 'มีประกาศเปิดอยู่ครบ 20 โพสต์แล้ว ปิดโพสต์เดิมก่อนลงใหม่'; END IF;
  IF (SELECT count(*) FROM public.listings WHERE user_id=uid AND created_at>now()-interval '1 day')>=50 THEN RAISE EXCEPTION 'ลงประกาศบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
  INSERT INTO public.listings(user_id,kind,item_name,category,description,qty,price,price_unit,atk,slots) VALUES(uid,p_data->>'kind',n,cat,btrim(coalesce(p_data->>'description','')),(p_data->>'qty')::int,nullif(p_data->>'price','')::bigint,unit,nullif(p_data->>'atk','')::int,nullif(p_data->>'slots','')::int) RETURNING id INTO lid;
 ELSE
  SELECT id INTO lid FROM public.listings WHERE id=p_id AND user_id=uid AND status='open' AND expires_at>now() FOR UPDATE;
  IF lid IS NULL THEN RAISE EXCEPTION 'แก้ไขได้เฉพาะประกาศของคุณที่ยังเปิดอยู่'; END IF;
  UPDATE public.listings SET kind=p_data->>'kind',item_name=n,category=cat,description=btrim(coalesce(p_data->>'description','')),qty=(p_data->>'qty')::int,price=nullif(p_data->>'price','')::bigint,price_unit=unit,atk=nullif(p_data->>'atk','')::int,slots=nullif(p_data->>'slots','')::int,updated_at=now() WHERE id=lid;
 END IF;
 INSERT INTO private.marketplace_contacts(listing_id,contacts) VALUES(lid,c) ON CONFLICT(listing_id) DO UPDATE SET contacts=excluded.contacts;
 RETURN lid;
END $function$;

CREATE OR REPLACE FUNCTION private.marketplace_save_discord(p_id bigint, p_data jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); item public.items%rowtype; stats jsonb; k text; v jsonb; lid bigint; who text; url text; sent timestamptz; expires timestamptz; top bigint;
BEGIN
 IF uid IS NULL OR NOT private.is_admin(uid) THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลลงประกาศแทนผู้เล่นได้'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'ข้อมูลประกาศไม่ถูกต้อง'; END IF;
 IF coalesce(p_data->>'item_id','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'เลือกไอเทมจากรายการค้นหา'; END IF;
 SELECT * INTO item FROM public.items WHERE id=(p_data->>'item_id')::int;
 IF item.id IS NULL THEN RAISE EXCEPTION 'ไม่พบไอเทมในฐานข้อมูล'; END IF;
 IF p_data->>'kind' IS NULL OR p_data->>'kind' NOT IN ('buy','sell') OR coalesce(p_data->>'qty','') !~ '^[0-9]{1,4}$' OR coalesce(p_data->>'price','') !~ '^([0-9]{1,10})?$' OR nullif(p_data->>'price','')::bigint<1 THEN RAISE EXCEPTION 'กรอกจำนวนและราคาให้ถูกต้อง'; END IF;
 IF coalesce(p_data->>'price_max','')<>'' THEN
  IF p_data->>'price_max' !~ '^[0-9]{1,10}$' OR coalesce(p_data->>'price','')='' OR (p_data->>'price_max')::bigint<=(p_data->>'price')::bigint THEN RAISE EXCEPTION 'ราคาสูงสุดต้องมากกว่าราคาต่ำสุด'; END IF;
  top:=(p_data->>'price_max')::bigint;
 END IF;
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
  INSERT INTO public.listings(user_id,kind,item_name,item_id,category,qty,price,price_unit,item_stats,slots,expires_at,discord_user,discord_url,price_max)
  VALUES(uid,p_data->>'kind',item.name,item.id,private.market_item_category(item.type,item.subtype),(p_data->>'qty')::int,nullif(p_data->>'price','')::bigint,'meso',stats,CASE WHEN item.type='Equip' THEN nullif(p_data->>'slots','')::int END,expires,who,url,top)
  RETURNING id INTO lid;
 ELSE
  UPDATE public.listings SET kind=p_data->>'kind',item_name=item.name,item_id=item.id,category=private.market_item_category(item.type,item.subtype),qty=(p_data->>'qty')::int,price=nullif(p_data->>'price','')::bigint,price_max=top,item_stats=stats,slots=CASE WHEN item.type='Equip' THEN nullif(p_data->>'slots','')::int END,discord_user=who,discord_url=url,expires_at=CASE WHEN url IS DISTINCT FROM discord_url THEN expires ELSE expires_at END,updated_at=now()
  WHERE id=p_id AND discord_user IS NOT NULL AND status='open' AND expires_at>now() RETURNING id INTO lid;
  IF lid IS NULL THEN RAISE EXCEPTION 'แก้ไขได้เฉพาะประกาศจาก Discord ที่ยังเปิดอยู่'; END IF;
 END IF;
 INSERT INTO private.marketplace_contacts(listing_id,contacts) VALUES(lid,jsonb_build_object('discord',who)) ON CONFLICT(listing_id) DO UPDATE SET contacts=excluded.contacts;
 RETURN lid;
END $function$;

CREATE OR REPLACE FUNCTION public.marketplace_price_reference(p_item_id bigint, p_stats jsonb DEFAULT '{}'::jsonb, p_slots integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
WITH candidates AS (
 SELECT l.user_id,l.price FROM public.listings l JOIN public.items i ON i.id=l.item_id
 WHERE l.item_id=p_item_id AND l.kind='sell' AND l.status='open' AND l.price_unit='meso' AND l.price_reference_eligible
 AND l.price IS NOT NULL AND l.expires_at>now() AND l.user_id IS DISTINCT FROM (SELECT auth.uid())
 AND (i.type<>'Equip' OR ((coalesce(p_stats,'{}'::jsonb)='{}'::jsonb OR l.item_stats=p_stats) AND (p_slots IS NULL OR l.slots=p_slots)))
 ORDER BY l.created_at DESC,l.id DESC LIMIT 500
), sellers AS (
 SELECT percentile_cont(0.5) WITHIN GROUP(ORDER BY price) AS price FROM candidates GROUP BY user_id
), summary AS (
 SELECT count(*) AS sellers,percentile_cont(0.25) WITHIN GROUP(ORDER BY price) AS low,percentile_cont(0.75) WITHIN GROUP(ORDER BY price) AS high,percentile_cont(0.5) WITHIN GROUP(ORDER BY price) AS median FROM sellers
)
SELECT jsonb_build_object('seller_count',sellers,'low',CASE WHEN sellers>=3 THEN floor(low)::bigint END,'high',CASE WHEN sellers>=3 THEN ceil(high)::bigint END,'median',CASE WHEN sellers>=3 THEN round(median)::bigint END,'source','maplethai_asking_prices','checked_at',now()) FROM summary
$function$;
