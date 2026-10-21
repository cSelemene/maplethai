BEGIN;
CREATE TEMP TABLE variance_test(uid uuid);
GRANT SELECT ON variance_test TO authenticated;
DO $$ DECLARE u uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id,email,is_anonymous) VALUES(u,'stat-variance-test@example.invalid',false);
INSERT INTO variance_test VALUES(u);
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT uid::text FROM variance_test),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d jsonb:='{"item_id":917,"kind":"sell","category":"armor","item_name":"Pan Lid","qty":"1","price":"15000","price_unit":"meso","contacts":{"discord":"variance-test"}}'; l bigint; rejected boolean; bad jsonb; BEGIN
l:=public.marketplace_save(null,d||'{"item_stats":{"def":-4,"str":2,"hp":-120}}'::jsonb);
IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=l AND item_stats='{"def":-4,"str":2,"hp":-120}'::jsonb AND atk IS NULL) THEN RAISE EXCEPTION 'Signed stat differences not saved'; END IF;
FOREACH bad IN ARRAY ARRAY['{"def":100}','{"def":-100}','{"hp":1000}','{"def":1.5}','{"atk":1}']::jsonb[] LOOP
 rejected:=false;
 BEGIN PERFORM public.marketplace_save(null,d||jsonb_build_object('item_stats',bad)); EXCEPTION WHEN OTHERS THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Accepted invalid stat difference %',bad; END IF;
END LOOP;
END $$;
RESET ROLE;
SELECT 'PASS: signed stat differences saved, out-of-range, fractional and wrong-field stats rejected' result;
ROLLBACK;
