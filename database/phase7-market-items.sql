BEGIN;
ALTER TABLE public.listings ADD COLUMN item_stats jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(item_stats)='object');
CREATE FUNCTION private.market_item_category(t text,sub text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN t='Equip' THEN CASE WHEN sub IN ('Bow','Crossbow','Claw','Dagger','One-Handed Axe','One-Handed Blunt Weapon','One-Handed Sword','Polearm','Spear','Staff','Two-Handed Axe','Two-Handed Blunt Weapon','Two-Handed Sword','Wand') THEN 'weapon' ELSE 'armor' END WHEN sub='Scroll' THEN 'scroll' WHEN t='Etc' THEN 'material' WHEN t='Use' THEN 'consumable' ELSE 'other' END $$;
CREATE FUNCTION private.market_item_fields(t text,sub text) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN t<>'Equip' THEN ARRAY[]::text[] WHEN sub IN ('Staff','Wand') THEN ARRAY['matk','atk','int','luk','mdef','hp','mp'] WHEN private.market_item_category(t,sub)='weapon' THEN ARRAY['atk','str','dex','int','luk','acc','speed'] WHEN sub='Shield' THEN ARRAY['def','mdef','str','dex','int','luk','hp','mp','acc','avoid'] WHEN sub='Gloves' THEN ARRAY['def','atk','matk','str','dex','int','luk','acc','avoid','hp','mp'] ELSE ARRAY['def','mdef','str','dex','int','luk','hp','mp','acc','avoid','speed','jump'] END $$;
REVOKE ALL ON FUNCTION private.market_item_category(text,text),private.market_item_fields(text,text) FROM PUBLIC,anon,authenticated;
ALTER FUNCTION private.marketplace_save(bigint,jsonb) RENAME TO marketplace_save_legacy;
REVOKE ALL ON FUNCTION private.marketplace_save_legacy(bigint,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.marketplace_save(p_id bigint,p_data jsonb) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.items%rowtype; result_id bigint; stats jsonb; k text; v jsonb; d jsonb:=p_data;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน'; END IF;
 IF p_data ? 'item_id' THEN
  IF coalesce(p_data->>'item_id','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'เลือกไอเทมจากรายการค้นหา'; END IF;
  SELECT * INTO item FROM public.items WHERE id=(p_data->>'item_id')::int;
  IF item.id IS NULL THEN RAISE EXCEPTION 'ไม่พบไอเทมในฐานข้อมูล'; END IF;
 ELSE
  SELECT * INTO item FROM public.items WHERE lower(name)=lower(btrim(p_data->>'item_name')) LIMIT 1;
 END IF;
 stats:=coalesce(p_data->'item_stats','{}'::jsonb);
 IF jsonb_typeof(stats) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'สเตตัสไม่ถูกต้อง'; END IF;
 FOR k,v IN SELECT key,value FROM jsonb_each(stats) LOOP
  IF item.id IS NULL OR NOT k=ANY(private.market_item_fields(item.type,item.subtype)) OR jsonb_typeof(v)<>'number' OR v::text !~ '^[0-9]{1,5}$' OR (v::text)::int>(CASE WHEN k IN ('hp','mp') THEN 99999 ELSE 999 END) THEN RAISE EXCEPTION 'สเตตัสไม่ตรงกับชนิดไอเทม'; END IF;
 END LOOP;
 IF item.id IS NOT NULL THEN
  d:=d||jsonb_build_object('item_name',item.name,'category',private.market_item_category(item.type,item.subtype),'atk',coalesce(stats->>'atk',''));
  IF item.type<>'Equip' THEN d:=d||jsonb_build_object('slots',''); END IF;
 END IF;
 result_id:=private.marketplace_save_legacy(p_id,d);
 UPDATE public.listings SET item_id=item.id,item_stats=stats WHERE id=result_id;
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION private.marketplace_save(bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.marketplace_save(bigint,jsonb) TO authenticated;
-- Rebind the public wrapper to the validated writer; callers cannot use the legacy writer.
CREATE OR REPLACE FUNCTION public.marketplace_save(p_id bigint,p_data jsonb) RETURNS bigint LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.marketplace_save(p_id,p_data) $$;
UPDATE public.listings l SET item_id=i.id,item_name=i.name,category=private.market_item_category(i.type,i.subtype),atk=CASE WHEN private.market_item_category(i.type,i.subtype)='weapon' THEN l.atk ELSE null END FROM public.items i WHERE lower(btrim(l.item_name))=lower(i.name);
COMMIT;
