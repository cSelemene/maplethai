BEGIN;
CREATE TABLE private.market_contact_unlocks (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 month_key date NOT NULL,
 listing_id bigint NOT NULL,
 opened_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,month_key,listing_id)
);
ALTER TABLE private.market_contact_unlocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.market_contact_unlocks FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.marketplace_contact(p_id bigint) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); l public.listings%rowtype; c jsonb; m date:=date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok')::date; unrestricted boolean;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND NOT is_anonymous) THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 unrestricted:=private.is_admin(uid) OR private.has_product(uid,'market');
 SELECT * INTO l FROM public.listings WHERE id=p_id;
 IF l.id IS NULL OR l.price_unit<>'meso' OR (l.user_id<>uid AND NOT private.is_admin(uid) AND (l.status<>'open' OR l.expires_at<=now())) THEN RAISE EXCEPTION 'ประกาศนี้ปิดหรือหมดอายุแล้ว'; END IF;
 SELECT contacts INTO c FROM private.marketplace_contacts WHERE listing_id=p_id;
 IF c IS NULL THEN SELECT jsonb_build_object('other',contact) INTO c FROM public.profiles WHERE id=l.user_id AND length(btrim(contact))>0; END IF;
 c:=coalesce(c,'{}'::jsonb);
 IF c='{}'::jsonb OR l.user_id=uid OR unrestricted THEN RETURN c; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('market-contact:'||uid::text||':'||m::text,0));
 IF NOT EXISTS(SELECT 1 FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m AND listing_id=p_id) THEN
  IF (SELECT count(*) FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m)>=10 THEN RAISE EXCEPTION 'LOCKED'; END IF;
  INSERT INTO private.market_contact_unlocks(user_id,month_key,listing_id) VALUES(uid,m,p_id);
 END IF;
 RETURN c;
END $$;
CREATE OR REPLACE FUNCTION public.listing_contact(p_id bigint) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $$ SELECT private.marketplace_contact(p_id) $$;
CREATE FUNCTION private.marketplace_contact_quota() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); m date:=date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok')::date; used integer; unlimited boolean;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 unlimited:=private.is_admin(uid) OR private.has_product(uid,'market');
 SELECT count(*) INTO used FROM private.market_contact_unlocks WHERE user_id=uid AND month_key=m;
 RETURN jsonb_build_object('limit',10,'used',used,'remaining',greatest(0,10-used),'unlimited',unlimited,'resets_at',(m+interval '1 month') AT TIME ZONE 'Asia/Bangkok');
END $$;
CREATE FUNCTION public.marketplace_contact_quota() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.marketplace_contact_quota() $$;
REVOKE ALL ON FUNCTION private.marketplace_contact_quota(),public.marketplace_contact_quota() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.marketplace_contact_quota(),public.marketplace_contact_quota() TO authenticated;
COMMIT;
