BEGIN;
CREATE TEMP TABLE meso_test(uid uuid,lid bigint,legacy bigint);
GRANT SELECT ON meso_test TO anon,authenticated;
DO $$ DECLARE u uuid:=gen_random_uuid(); l bigint; BEGIN
INSERT INTO auth.users(id,email,is_anonymous) VALUES(u,'meso-policy-test@example.invalid',false);
INSERT INTO public.listings(user_id,kind,item_name,category,qty,price,price_unit,status) VALUES(u,'sell','Archived baht listing','armor',1,50,'thb','done') RETURNING id INTO l;
INSERT INTO meso_test VALUES(u,null,l);
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT uid::text FROM meso_test),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d jsonb:='{"item_id":917,"item_stats":{"def":44},"kind":"sell","category":"armor","item_name":"Pan Lid","qty":"1","price":"15000","price_unit":"meso","contacts":{"discord":"meso-test"}}'; l bigint; rejected boolean:=false; BEGIN
BEGIN PERFORM public.marketplace_save(null,d||'{"price_unit":"thb"}'::jsonb); EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'ตลาดนี้ลงราคาได้เฉพาะ Meso' THEN RAISE; END IF;rejected:=true; END;
IF NOT rejected THEN RAISE EXCEPTION 'Baht API post accepted'; END IF;
l:=public.marketplace_save(null,d);
IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=l AND price_unit='meso') THEN RAISE EXCEPTION 'Meso posting failed'; END IF;
l:=public.marketplace_save(null,d||'{"price":""}');
IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=l AND price IS NULL) THEN RAISE EXCEPTION 'Make-an-offer listing not saved without price'; END IF;
PERFORM public.marketplace_save(l,d||'{"price":"12000"}');
IF (SELECT price FROM public.listings WHERE id=l)<>12000 THEN RAISE EXCEPTION 'Offer listing could not get a price later'; END IF;
IF EXISTS(SELECT 1 FROM public.listings WHERE id=(SELECT legacy FROM meso_test)) THEN RAISE EXCEPTION 'Owner can see legacy baht listing'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.listings WHERE price_unit<>'meso') THEN RAISE EXCEPTION 'Public API exposes non-Meso listing'; END IF; END $$;
RESET ROLE;
DO $$ DECLARE rejected boolean:=false; BEGIN
BEGIN INSERT INTO public.listings(user_id,kind,item_name,category,qty,price,price_unit,status) VALUES((SELECT uid FROM meso_test),'sell','Rejected baht','armor',1,50,'thb','open'); EXCEPTION WHEN check_violation THEN rejected:=true; END;
IF NOT rejected THEN RAISE EXCEPTION 'Table accepts open baht listing'; END IF;
END $$;
SELECT 'PASS: Meso accepted, blank price saved as make-an-offer, baht API rejected, table constraint enforced, historical baht hidden for owner and public' result;
ROLLBACK;
