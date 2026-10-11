BEGIN;
CREATE TEMP TABLE quota_fixture(viewer uuid,seller uuid,ids bigint[]);
GRANT SELECT ON quota_fixture TO authenticated;
DO $$ DECLARE v uuid:=gen_random_uuid();s uuid:=gen_random_uuid();ids bigint[]:='{}';l bigint; BEGIN
INSERT INTO auth.users(id,email,is_anonymous) VALUES(v,'quota-viewer@example.invalid',false),(s,'quota-seller@example.invalid',false);
FOR x IN 1..11 LOOP
INSERT INTO public.listings(user_id,item_id,item_name,kind,category,qty,price,price_unit,status,expires_at) VALUES(s,917,'Pan Lid','sell','armor',1,20000,'meso','open',now()+interval '1 day') RETURNING id INTO l;
INSERT INTO private.marketplace_contacts VALUES(l,'{"discord":"private-quota-contact"}');ids:=array_append(ids,l);
END LOOP;
INSERT INTO quota_fixture VALUES(v,s,ids);
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT viewer::text FROM quota_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE ids bigint[]; rejected boolean:=false; BEGIN
SELECT q.ids INTO ids FROM quota_fixture q;
FOR x IN 1..10 LOOP IF public.listing_contact(ids[x])->>'discord'<>'private-quota-contact' THEN RAISE EXCEPTION 'Free contact failed'; END IF; END LOOP;
IF (public.marketplace_contact_quota()->>'remaining')::int<>0 THEN RAISE EXCEPTION 'Quota not exhausted'; END IF;
PERFORM public.listing_contact(ids[1]);
BEGIN PERFORM public.listing_contact(ids[11]); EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'LOCKED' THEN RAISE; END IF;rejected:=true;END;
IF NOT rejected THEN RAISE EXCEPTION '11th free post unlocked'; END IF;
END $$;
RESET ROLE;
UPDATE private.market_contact_unlocks SET month_key=(month_key-interval '1 month')::date WHERE user_id=(SELECT viewer FROM quota_fixture);
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF (public.marketplace_contact_quota()->>'remaining')::int<>10 THEN RAISE EXCEPTION 'Month reset failed'; END IF; END $$;
RESET ROLE;
SELECT private.grant_product((SELECT viewer FROM quota_fixture),'market','quota-test');
SET LOCAL ROLE authenticated;
SELECT public.listing_contact((SELECT ids[11] FROM quota_fixture));
DO $$ BEGIN IF NOT (public.marketplace_contact_quota()->>'unlimited')::boolean OR (public.marketplace_contact_quota()->>'remaining')::int<>10 THEN RAISE EXCEPTION 'Paid access consumed quota'; END IF; END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT seller::text FROM quota_fixture),true);
SET LOCAL ROLE authenticated;
SELECT public.listing_contact((SELECT ids[1] FROM quota_fixture));
DO $$ BEGIN IF (public.marketplace_contact_quota()->>'remaining')::int<>10 THEN RAISE EXCEPTION 'Own listing consumed quota'; END IF; END $$;
RESET ROLE;
SELECT 'PASS: 10 free posts, repeat unlock free, 11th blocked, calendar month reset, market-only unlimited, owner exemption' result;
ROLLBACK;
