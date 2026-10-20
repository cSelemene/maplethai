-- Order guide products by class family (Thief, Magician, Warrior); market stays last.
UPDATE public.products SET sort = v.sort
FROM (VALUES ('guide_bandit', 1), ('guide_sindit', 2), ('guide_assassin', 3), ('guide_mage', 4), ('guide_fp', 5),
             ('guide_fighter', 6), ('guide_page', 7), ('guide_spearman', 8)) AS v(id, sort)
WHERE public.products.id = v.id;
