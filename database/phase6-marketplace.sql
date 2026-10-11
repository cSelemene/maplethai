BEGIN;
ALTER TABLE public.listings ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE public.listings ADD COLUMN item_name text NOT NULL DEFAULT '' CHECK (length(item_name)<=120), ADD COLUMN category text NOT NULL DEFAULT 'other' CHECK(category IN ('weapon','armor','scroll','material','consumable','other')), ADD COLUMN description text NOT NULL DEFAULT '' CHECK(length(description)<=1500), ADD COLUMN price_unit text NOT NULL DEFAULT 'meso' CHECK(price_unit IN ('meso','thb')), ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.listings l SET item_name=i.name FROM public.items i WHERE i.id=l.item_id;
CREATE INDEX listings_market_open ON public.listings(created_at DESC) WHERE status='open';
CREATE INDEX listings_owner ON public.listings(user_id,created_at DESC);
CREATE TABLE private.marketplace_contacts(listing_id bigint PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE, contacts jsonb NOT NULL CHECK(jsonb_typeof(contacts)='object'));
ALTER TABLE private.marketplace_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketplace_contacts FROM PUBLIC,anon,authenticated;
DROP POLICY listings_read ON public.listings;
DROP POLICY listings_insert ON public.listings;
DROP POLICY listings_update_own ON public.listings;
DROP POLICY listings_delete_own ON public.listings;
CREATE POLICY listings_read ON public.listings FOR SELECT TO anon,authenticated USING (status='open' AND expires_at>now());
CREATE POLICY listings_owner_read ON public.listings FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())));
REVOKE ALL ON public.listings FROM anon,authenticated;
GRANT SELECT ON public.listings TO anon,authenticated;
CREATE FUNCTION private.marketplace_save(p_id bigint,p_data jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); lid bigint; c jsonb; k text; v text; n text; cat text; unit text;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND NOT is_anonymous) THEN RAISE EXCEPTION 'เข้าสู่ระบบเพื่อโพสต์ประกาศ'; END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'ข้อมูลประกาศไม่ถูกต้อง'; END IF;
 n:=btrim(p_data->>'item_name'); cat:=p_data->>'category'; unit:=p_data->>'price_unit'; c:=p_data->'contacts';
 IF n IS NULL OR length(n)<2 OR length(n)>120 OR cat IS NULL OR cat NOT IN ('weapon','armor','scroll','material','consumable','other') OR unit IS NULL OR unit NOT IN ('meso','thb') OR p_data->>'kind' IS NULL OR p_data->>'kind' NOT IN ('buy','sell') OR coalesce(p_data->>'qty','') !~ '^[0-9]{1,4}$' OR coalesce(p_data->>'price','') !~ '^[0-9]{1,10}$' OR length(coalesce(p_data->>'description',''))>1500 THEN RAISE EXCEPTION 'กรอกชื่อสินค้า จำนวน และราคาให้ถูกต้อง'; END IF;
 IF c IS NULL OR jsonb_typeof(c)<>'object' OR c='{}'::jsonb THEN RAISE EXCEPTION 'ระบุช่องทางติดต่ออย่างน้อยหนึ่งช่องทาง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each_text(c) LOOP
  IF k NOT IN ('discord','line','facebook','other') OR v IS NULL OR length(btrim(v))<2 OR length(v)>300 THEN RAISE EXCEPTION 'ช่องทางติดต่อไม่ถูกต้อง'; END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('market:'||uid::text,0));
 IF p_id IS NULL THEN
  IF (SELECT count(*) FROM public.listings WHERE user_id=uid AND status='open' AND expires_at>now())>=20 THEN RAISE EXCEPTION 'มีประกาศเปิดอยู่ครบ 20 โพสต์แล้ว ปิดโพสต์เดิมก่อนลงใหม่'; END IF;
  IF (SELECT count(*) FROM public.listings WHERE user_id=uid AND created_at>now()-interval '1 day')>=50 THEN RAISE EXCEPTION 'ลงประกาศบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
  INSERT INTO public.listings(user_id,kind,item_name,category,description,qty,price,price_unit,atk,slots) VALUES(uid,p_data->>'kind',n,cat,btrim(coalesce(p_data->>'description','')),(p_data->>'qty')::int,(p_data->>'price')::bigint,unit,nullif(p_data->>'atk','')::int,nullif(p_data->>'slots','')::int) RETURNING id INTO lid;
 ELSE
  SELECT id INTO lid FROM public.listings WHERE id=p_id AND user_id=uid AND status='open' AND expires_at>now() FOR UPDATE;
  IF lid IS NULL THEN RAISE EXCEPTION 'แก้ไขได้เฉพาะประกาศของคุณที่ยังเปิดอยู่'; END IF;
  UPDATE public.listings SET kind=p_data->>'kind',item_name=n,category=cat,description=btrim(coalesce(p_data->>'description','')),qty=(p_data->>'qty')::int,price=(p_data->>'price')::bigint,price_unit=unit,atk=nullif(p_data->>'atk','')::int,slots=nullif(p_data->>'slots','')::int,updated_at=now() WHERE id=lid;
 END IF;
 INSERT INTO private.marketplace_contacts(listing_id,contacts) VALUES(lid,c) ON CONFLICT(listing_id) DO UPDATE SET contacts=excluded.contacts;
 RETURN lid;
END $$;
CREATE FUNCTION public.marketplace_save(p_id bigint,p_data jsonb) RETURNS bigint LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.marketplace_save(p_id,p_data) $$;
CREATE FUNCTION private.marketplace_contact(p_id bigint) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); l public.listings%rowtype; c jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 SELECT * INTO l FROM public.listings WHERE id=p_id;
 IF l.id IS NULL OR (l.user_id<>uid AND NOT private.is_admin(uid) AND (l.status<>'open' OR l.expires_at<=now())) THEN RAISE EXCEPTION 'ประกาศนี้ปิดหรือหมดอายุแล้ว'; END IF;
 IF NOT (l.user_id=uid OR private.has_product(uid,'market') OR private.is_admin(uid)) THEN RAISE EXCEPTION 'LOCKED'; END IF;
 SELECT contacts INTO c FROM private.marketplace_contacts WHERE listing_id=p_id;
 IF c IS NULL THEN SELECT jsonb_build_object('other',contact) INTO c FROM public.profiles WHERE id=l.user_id AND length(btrim(contact))>0; END IF;
 RETURN coalesce(c,'{}'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.listing_contact(p_id bigint) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.marketplace_contact(p_id) $$;
CREATE FUNCTION private.marketplace_close(p_id bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 UPDATE public.listings SET status='done',updated_at=now() WHERE id=p_id AND (user_id=auth.uid() OR private.is_admin(auth.uid()));
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบประกาศที่คุณจัดการได้'; END IF;
END $$;
CREATE FUNCTION public.marketplace_close(p_id bigint) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.marketplace_close(p_id) $$;
REVOKE ALL ON FUNCTION private.marketplace_save(bigint,jsonb),private.marketplace_contact(bigint),private.marketplace_close(bigint),public.marketplace_save(bigint,jsonb),public.listing_contact(bigint),public.marketplace_close(bigint) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.marketplace_save(bigint,jsonb),private.marketplace_contact(bigint),private.marketplace_close(bigint),public.marketplace_save(bigint,jsonb),public.listing_contact(bigint),public.marketplace_close(bigint) TO authenticated;
-- Reuse the established order, slip review and entitlement system for the existing market product.
CREATE OR REPLACE FUNCTION public.create_payment_order(p_product text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); pr public.products%rowtype; pay public.payments%rowtype; cfg jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
 SELECT * INTO pr FROM public.products WHERE id=p_product AND active AND id IN ('guide_bandit','guide_assassin','guide_mage','market');
 IF pr.id IS NULL THEN RAISE EXCEPTION 'สินค้านี้ยังไม่เปิดขาย'; END IF;
 IF private.has_product(uid,p_product) THEN RAISE EXCEPTION 'คุณมีสิทธิ์นี้แล้ว'; END IF;
 SELECT * INTO pay FROM public.payments WHERE user_id=uid AND product=p_product AND status IN ('awaiting_slip','pending');
 IF pay.id IS NOT NULL THEN RETURN to_jsonb(pay); END IF;
 cfg:=public.payment_settings();
 IF NOT coalesce((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'ยังไม่เปิดรับชำระเงิน'; END IF;
 IF (SELECT count(*) FROM public.payments WHERE user_id=uid AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'สร้างรายการบ่อยเกินไป กรุณาลองใหม่พรุ่งนี้'; END IF;
 INSERT INTO public.payments(user_id,email,product,amount,trans_ref,slip_path,status,recipient) VALUES(uid,(SELECT email FROM auth.users WHERE id=uid),p_product,pr.price,'ORDER-'||gen_random_uuid()::text,'','awaiting_slip',cfg) RETURNING * INTO pay;
 RETURN to_jsonb(pay);
END $$;
COMMIT;
