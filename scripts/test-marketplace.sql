-- Real database integration tests, including API roles. All fixtures roll back.
BEGIN;
CREATE TEMP TABLE market_test(uid uuid, viewer uuid, lid bigint, data jsonb);
GRANT SELECT ON market_test TO authenticated,anon;
DO $$
DECLARE u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); post_id bigint; d jsonb; c jsonb; failed boolean; ord jsonb;
BEGIN
 INSERT INTO auth.users(id,email,is_anonymous) VALUES(u,'market-seller-test@example.invalid',false),(v,'market-viewer-test@example.invalid',false);
 d:='{"kind":"sell","item_name":"MARKETTEST Pan Lid","category":"armor","qty":"1","price":"15000","price_unit":"meso","atk":"","slots":"7","description":"Test shield","contacts":{"discord":"private-test-seller","line":"private-line"}}';
 INSERT INTO market_test VALUES(u,v,null,d);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 post_id:=public.marketplace_save(null,d);UPDATE market_test SET lid=post_id;
 IF EXISTS(SELECT 1 FROM public.entitlements WHERE user_id=u) THEN RAISE EXCEPTION 'Fixture unexpectedly owns products'; END IF;
 c:=public.listing_contact(post_id);
 IF c->>'discord'<>'private-test-seller' THEN RAISE EXCEPTION 'Owner contact access failed'; END IF;
 PERFORM public.marketplace_save(post_id,jsonb_set(d,'{price}','"16000"'));
 IF (SELECT price FROM public.listings WHERE id=post_id)<>16000 THEN RAISE EXCEPTION 'Edit failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',v::text,true);
 -- Two statements: the quota function is STABLE, so in one expression it could read a snapshot from before the unlock.
 IF public.listing_contact(post_id)->>'discord'<>'private-test-seller' THEN RAISE EXCEPTION 'Free contact failed'; END IF;
 IF (public.marketplace_contact_quota()->>'remaining')::int<>9 THEN RAISE EXCEPTION 'Free quota failed'; END IF;
 failed:=false; BEGIN PERFORM public.marketplace_save(post_id,d); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Other user edited seller post'; END IF;
 failed:=false; BEGIN PERFORM public.marketplace_close(post_id); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Other user closed seller post'; END IF;
 PERFORM private.grant_product(v,'market','test');
 IF public.listing_contact(post_id)->>'line'<>'private-line' THEN RAISE EXCEPTION 'Paid contact failed'; END IF;
 UPDATE public.entitlements SET expires_at=now()-interval '1 second' WHERE user_id=v AND product='market';
 IF public.listing_contact(post_id)->>'discord'<>'private-test-seller' THEN RAISE EXCEPTION 'Previously opened free listing unavailable after membership expiry'; END IF;
 UPDATE private.payment_settings SET enabled=true;
 ord:=public.create_payment_order('market');
 IF ord->>'product'<>'market' OR (ord->>'amount')::integer<>50 THEN RAISE EXCEPTION 'Market checkout price failed'; END IF;
 IF private.has_product(v,'market') THEN RAISE EXCEPTION 'Unpaid order granted market access'; END IF;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 failed:=false; BEGIN PERFORM public.marketplace_save(null,jsonb_set(d,'{contacts}','{}')); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Missing contact accepted'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=(SELECT lid FROM market_test)) THEN RAISE EXCEPTION 'Public search failed'; END IF;
 IF has_function_privilege('anon','public.listing_contact(bigint)','execute') THEN RAISE EXCEPTION 'Anonymous contact endpoint enabled'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT uid::text FROM market_test),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE failed boolean; d jsonb; post_id bigint; BEGIN
 SELECT data,lid INTO d,post_id FROM market_test;
 -- Execute through exactly the role used by signed-in Data API clients.
 PERFORM public.marketplace_save(post_id,d);
 IF public.listing_contact(post_id)->>'discord'<>'private-test-seller' THEN RAISE EXCEPTION 'Authenticated owner RPC failed'; END IF;
 failed:=false;BEGIN PERFORM 1 FROM private.marketplace_contacts;EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Private contacts table readable'; END IF;
 failed:=false;BEGIN UPDATE public.listings SET user_id=(SELECT viewer FROM market_test) WHERE public.listings.id=post_id;EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Direct writes allowed'; END IF;
END $$;
RESET ROLE;
UPDATE public.entitlements SET expires_at=now()+interval '1 day' WHERE user_id=(SELECT viewer FROM market_test) AND product='market';
SELECT set_config('request.jwt.claim.sub',(SELECT viewer::text FROM market_test),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.listing_contact((SELECT lid FROM market_test))->>'discord'<>'private-test-seller' THEN RAISE EXCEPTION 'Paid viewer API role denied'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=(SELECT uid FROM market_test)) THEN RAISE EXCEPTION 'Profile contacts leaked'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT uid::text FROM market_test),true);
SELECT public.marketplace_close((SELECT lid FROM market_test));
SET LOCAL ROLE anon;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.listings WHERE id=(SELECT lid FROM market_test)) THEN RAISE EXCEPTION 'Closed listing still publicly visible'; END IF; END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT viewer::text FROM market_test),true);
DO $$ DECLARE failed boolean;BEGIN
 failed:=false;BEGIN PERFORM public.listing_contact((SELECT lid FROM market_test));EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Paid viewer accessed closed listing'; END IF;
END $$;
SELECT 'PASS: free posting, owner edits, public search, paid contacts, expired access blocked, contact isolation, ownership, authenticated and anon API roles, closure, market checkout pricing and no premature entitlement' result;
ROLLBACK;
