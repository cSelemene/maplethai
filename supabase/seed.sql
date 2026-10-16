-- Reference data the app needs to work. Customer data is never seeded.
insert into public.products (id, name, price, kind, days, sort, active) values
  ('guide_bandit',   'ไกด์ Pure Bandit',    99, 'once',    null, 1,  true),
  ('guide_assassin', 'ไกด์ Assassin',       99, 'once',    null, 2,  true),
  ('guide_mage',     'ไกด์ I/L Mage',       99, 'once',    null, 3,  true),
  ('guide_spearman', 'ไกด์ Spearman',       99, 'once',    null, 4,  false),
  ('guide_page',     'ไกด์ Page',           99, 'once',    null, 5,  false),
  ('guide_fighter',  'ไกด์ Fighter',        99, 'once',    null, 6,  false),
  ('market',         'ตลาดซื้อขาย 30 วัน', 50, 'monthly', 30,   10, true)
on conflict (id) do nothing;

-- Receiving account is configured by an admin in admin-payments.html.
insert into private.payment_settings (id) values (true) on conflict (id) do nothing;
