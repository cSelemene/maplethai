BEGIN;
INSERT INTO auth.users(id,email) VALUES('10000000-0000-4000-8000-000000000091','locale-test@example.invalid');
INSERT INTO public.entitlements(user_id,product,source) VALUES('10000000-0000-4000-8000-000000000091','guide_bandit','locale_test');
INSERT INTO public.guide_files(guide,html) VALUES('bandit','<!doctype html><html><head></head><body>ทดสอบ</body></html>') ON CONFLICT(guide) DO UPDATE SET html=excluded.html;
INSERT INTO private.guide_translations(guide,source_hash,english)
 SELECT guide,md5(html),'{"ทดสอบ":"Test </script><script>unsafe()</script>"}'::jsonb FROM public.guide_files WHERE guide='bandit'
 ON CONFLICT(guide) DO UPDATE SET source_hash=excluded.source_hash,english=excluded.english;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000091',true);
DO $$ DECLARE h text; denied boolean; BEGIN
 SET LOCAL ROLE authenticated;
 h:=public.get_guide('bandit');
 IF h NOT LIKE '%__MAPLE_TRANSLATIONS__%' THEN RAISE EXCEPTION 'owner did not receive translations'; END IF;
 IF h LIKE '%Test </script>%' THEN RAISE EXCEPTION 'translation can terminate script'; END IF;
 IF h NOT LIKE '%<body>ทดสอบ</body>%' THEN RAISE EXCEPTION 'original guide changed'; END IF;
 denied:=false;
 BEGIN PERFORM * FROM private.guide_translations; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'paid table exposed'; END IF;
 denied:=false;
 BEGIN PERFORM private.attach_guide_locale('bandit','<head></head>'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'private helper exposed'; END IF;
 RESET ROLE;
 DELETE FROM public.entitlements WHERE user_id='10000000-0000-4000-8000-000000000091';
 SET LOCAL ROLE authenticated;
 denied:=false;
 BEGIN PERFORM public.get_guide('bandit'); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'non-owner received guide'; END IF;
 RESET ROLE;
 UPDATE public.guide_files SET html=html||'<!-- new source -->' WHERE guide='bandit';
 IF private.attach_guide_locale('bandit','<head></head>') LIKE '%__MAPLE_TRANSLATIONS__%' THEN RAISE EXCEPTION 'stale translation used'; END IF;
END $$;
SELECT 'PASS: translations require guide entitlement, direct reads denied, script text escaped, stale source rejected' AS result;
ROLLBACK;
