BEGIN;
CREATE TEMP TABLE discord_test(adm uuid, member uuid, lid bigint);
GRANT SELECT,UPDATE ON discord_test TO authenticated,anon;
DO $$ DECLARE a uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id,email,is_anonymous) VALUES(a,'discord-admin-test@example.invalid',false),(m,'discord-member-test@example.invalid',false);
INSERT INTO private.admins(user_id) VALUES(a);
INSERT INTO discord_test VALUES(a,m,null);
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT member::text FROM discord_test),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d jsonb:='{"item_id":670,"kind":"sell","qty":"1","price":"400000","item_stats":{"atk":7},"slots":"0","discord_user":"sky_seller"}'; failed boolean:=false; BEGIN
BEGIN PERFORM public.marketplace_save_discord(null,d); EXCEPTION WHEN OTHERS THEN failed:=true; END;
IF NOT failed THEN RAISE EXCEPTION 'Non-admin posted a Discord listing'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT adm::text FROM discord_test),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d jsonb:='{"item_id":670,"kind":"sell","qty":"1","price":"400000","item_stats":{"atk":7},"slots":"0","discord_user":"@sky_seller"}'; l bigint; failed boolean; snow numeric; url text; bad text; BEGIN
-- Message sent 10 hours ago: listing closes 26 hours from now.
snow:=((extract(epoch FROM now()-interval '10 hours')*1000)::bigint-1420070400000)::numeric*4194304;
url:='https://discord.com/channels/1/2/'||snow::bigint::text;
l:=public.marketplace_save_discord(null,d||jsonb_build_object('discord_url',url));
UPDATE discord_test SET lid=l;
IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=l AND discord_user='sky_seller' AND discord_url=url AND item_name='Vaulter 2000' AND item_stats='{"atk":7}' AND slots=0 AND expires_at BETWEEN now()+interval '25 hours 59 minutes' AND now()+interval '26 hours 1 minute') THEN RAISE EXCEPTION 'Discord listing not saved with 36h expiry from message time'; END IF;
IF public.listing_contact(l)->>'discord'<>'sky_seller' THEN RAISE EXCEPTION 'Discord contact not stored'; END IF;
l:=public.marketplace_save_discord(null,d);
IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=l AND discord_url IS NULL AND expires_at BETWEEN now()+interval '35 hours 59 minutes' AND now()+interval '36 hours 1 minute') THEN RAISE EXCEPTION 'Linkless Discord listing not given 36h'; END IF;
PERFORM public.marketplace_save_discord(l,d||'{"price":"350000"}');
IF (SELECT price FROM public.listings WHERE id=l)<>350000 THEN RAISE EXCEPTION 'Discord listing edit failed'; END IF;
PERFORM public.marketplace_save_discord(l,d||'{"kind":"buy","price":"174000","price_max":"200000"}');
IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=l AND kind='buy' AND price=174000 AND price_max=200000) THEN RAISE EXCEPTION 'Price range not saved'; END IF;
failed:=false; BEGIN PERFORM public.marketplace_save_discord(null,d||'{"price":"200000","price_max":"200000"}'); EXCEPTION WHEN OTHERS THEN failed:=true; END;
IF NOT failed THEN RAISE EXCEPTION 'Accepted price range with max not above min'; END IF;
snow:=((extract(epoch FROM now()-interval '37 hours')*1000)::bigint-1420070400000)::numeric*4194304;
FOREACH bad IN ARRAY ARRAY['{"discord_user":"สกาย"}','{"discord_url":"https://example.com/channels/1/2/3"}',jsonb_build_object('discord_url','https://discord.com/channels/1/2/'||snow::bigint::text)::text,'{"item_stats":{"def":1}}']::text[] LOOP
 failed:=false;
 BEGIN PERFORM public.marketplace_save_discord(null,d||bad::jsonb); EXCEPTION WHEN OTHERS THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Accepted invalid Discord listing %',bad; END IF;
END LOOP;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.listings WHERE id=(SELECT lid FROM discord_test) AND discord_user='sky_seller') THEN RAISE EXCEPTION 'Discord username not public'; END IF; END $$;
RESET ROLE;
SELECT 'PASS: admin-only Discord listings, public username, 36h expiry from message link or now, edit, price range, invalid username/link/old message/stat rejected' result;
ROLLBACK;
