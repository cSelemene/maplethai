BEGIN;
DO $$ DECLARE u uuid; BEGIN
FOR x IN 1..3 LOOP
u:=gen_random_uuid();INSERT INTO auth.users(id,email,is_anonymous) VALUES(u,'price-reference-'||x||'@example.invalid',false);
INSERT INTO public.listings(user_id,item_id,item_name,kind,category,qty,price,price_unit,item_stats,slots,status,expires_at) VALUES(u,917,'Pan Lid','sell','armor',1,10000+x*10000,'meso','{"def":44}',7,'open',now()+interval '1 day');
END LOOP;
END $$;
SET LOCAL ROLE anon;
DO $$ DECLARE r jsonb; BEGIN
r:=public.marketplace_price_reference(917,'{"def":44}',7);
IF (r->>'seller_count')::int<>3 OR (r->>'low')::int<>25000 OR (r->>'high')::int<>35000 OR (r->>'median')::int<>30000 THEN RAISE EXCEPTION 'Range calculation failed: %',r; END IF;
r:=public.marketplace_price_reference(917,'{"def":45}',7);
IF r->>'low' IS NOT NULL THEN RAISE EXCEPTION 'Different stats included'; END IF;
r:=public.marketplace_price_reference(917,'{"def":44}',6);
IF r->>'low' IS NOT NULL THEN RAISE EXCEPTION 'Different slots included'; END IF;
r:=public.marketplace_price_reference(917,'{}',7);
IF r->>'low' IS NOT NULL THEN RAISE EXCEPTION 'Insufficient historical data yielded range'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: anonymous reference RPC, quartile range, median, stat/slot isolation, insufficient-data fallback' result;
ROLLBACK;
