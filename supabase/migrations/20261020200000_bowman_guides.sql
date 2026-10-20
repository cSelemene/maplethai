-- Bowman guides: guide ids 'hunter' and 'crossbowman', products 'guide_hunter' and 'guide_crossbowman'. The products start inactive
-- and are switched on after the guide HTML is uploaded. Bowman products sort after the Warrior products.

INSERT INTO public.products (id, name, price, kind, days, sort, active) VALUES
  ('guide_hunter', 'ไกด์ Hunter', 99, 'once', NULL, 10, false),
  ('guide_crossbowman', 'ไกด์ Crossbowman', 99, 'once', NULL, 11, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.guide_files (guide, html) VALUES ('hunter', '<p>กำลังเตรียมไกด์</p>'), ('crossbowman', '<p>กำลังเตรียมไกด์</p>')
ON CONFLICT (guide) DO NOTHING;

ALTER TABLE public.guide_progress DROP CONSTRAINT IF EXISTS guide_progress_guide_check;
ALTER TABLE public.guide_progress ADD CONSTRAINT guide_progress_guide_check
  CHECK (guide = ANY (ARRAY['bandit'::text, 'sindit'::text, 'assassin'::text, 'mage'::text, 'fp'::text, 'cleric'::text, 'hunter'::text, 'crossbowman'::text, 'spearman'::text, 'page'::text, 'fighter'::text]));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_gift_email_valid;
ALTER TABLE public.payments ADD CONSTRAINT payments_gift_email_valid CHECK (((gift_email IS NULL) OR ((gift_email = lower(btrim(gift_email))) AND (length(gift_email) <= 254) AND (gift_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_sindit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_fp'::text, 'guide_cleric'::text, 'guide_hunter'::text, 'guide_crossbowman'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text])))));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_referral_valid;
ALTER TABLE public.payments ADD CONSTRAINT payments_referral_valid CHECK (((referral_email IS NULL) OR ((gift_email IS NULL) AND (product = ANY (ARRAY['guide_bandit'::text, 'guide_sindit'::text, 'guide_assassin'::text, 'guide_mage'::text, 'guide_fp'::text, 'guide_cleric'::text, 'guide_hunter'::text, 'guide_crossbowman'::text, 'guide_spearman'::text, 'guide_page'::text, 'guide_fighter'::text])) AND (referral_email = lower(btrim(referral_email))) AND (length(referral_email) <= 254) AND (referral_email ~ '^[^[:space:]@]+@[^[:space:]@.]+\.[^[:space:]@]+$'::text))));

-- Add the new ids to the hard-coded product / guide lists inside existing functions, keeping each body otherwise unchanged.
DO $$
DECLARE r record; d text; n text;
BEGIN
  FOR r IN SELECT p.oid, n.nspname || '.' || p.proname AS fn,
                  CASE WHEN p.proname IN ('save_guide_progress', 'read_navigation') THEN 'guide' ELSE 'product' END AS kind
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE (n.nspname, p.proname) IN (('public', 'create_payment_order'), ('public', 'create_gift_payment_order'),
                                            ('public', 'create_referred_payment_order'), ('private', 'payment_market_promotion'),
                                            ('public', 'save_guide_progress'), ('private', 'read_navigation'))
  LOOP
    d := pg_get_functiondef(r.oid);
    IF r.kind = 'product' THEN
      n := replace(d, '''guide_cleric'',''guide_spearman''', '''guide_cleric'',''guide_hunter'',''guide_crossbowman'',''guide_spearman''');
    ELSE
      n := replace(d, '''cleric'',''spearman''', '''cleric'',''hunter'',''crossbowman'',''spearman''');
    END IF;
    IF n = d AND position('''hunter''' IN d) = 0 AND position('''guide_hunter''' IN d) = 0 THEN RAISE EXCEPTION 'list not found in %', r.fn; END IF;
    IF n <> d THEN EXECUTE n; END IF;
  END LOOP;
END $$;
