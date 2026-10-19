BEGIN;
INSERT INTO auth.users(id,email) VALUES('10000000-0000-4000-8000-000000000061','prices-test@example.invalid');
INSERT INTO public.entitlements(user_id,product,source) VALUES('10000000-0000-4000-8000-000000000061','guide_bandit','prices_test');
INSERT INTO public.guide_files(guide,html) VALUES('bandit','<!doctype html><html lang="th"><head>
<meta charset="utf-8"></head><body><header>x</header></body></html>')
 ON CONFLICT(guide) DO UPDATE SET html=excluded.html;
DELETE FROM public.market_prices;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000061',true);
DO $$ DECLARE h text; BEGIN
 SET LOCAL ROLE authenticated;
 h:=public.get_guide('bandit');
 IF h LIKE '%__MKT__%' THEN RAISE EXCEPTION 'injected without prices'; END IF;
 RESET ROLE;
 INSERT INTO public.market_prices(id,data,fetched_at) VALUES(1,'{"fetchedAt":"2026-10-18T22:59:18+00:00","prices":{"Odd </script> Ore":{"usual":5}}}','2026-10-18T22:59:18Z');
 SET LOCAL ROLE authenticated;
 h:=public.get_guide('bandit');
 IF h NOT LIKE '%<head><script>window.\_\_MKT\_\_={%};</script>%<meta charset%' THEN RAISE EXCEPTION 'prices not injected after <head>: %',left(h,200); END IF;
 IF h LIKE '%Odd </script>%' THEN RAISE EXCEPTION 'script close not escaped'; END IF;
 IF h NOT LIKE '%<header>x</header>%' THEN RAISE EXCEPTION 'body changed'; END IF;
 RESET ROLE;
END $$;
SELECT 'PASS: get_guide injects synced market prices as window.__MKT__ and escapes </script>' AS result;
ROLLBACK;
