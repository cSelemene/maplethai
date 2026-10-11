BEGIN;
CREATE TABLE IF NOT EXISTS private.navigation_content(key text PRIMARY KEY,payload jsonb NOT NULL);
REVOKE ALL ON private.navigation_content FROM PUBLIC,anon,authenticated;
ALTER TABLE private.navigation_content ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION private.read_navigation(p_guide text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); result jsonb;
BEGIN
 IF uid IS NULL OR p_guide IS NULL OR p_guide NOT IN ('bandit','assassin','mage') THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบและเลือกไกด์'; END IF;
 IF NOT coalesce(private.has_product(uid,'guide_'||p_guide) OR private.is_admin(uid),false) THEN RAISE EXCEPTION 'ยังไม่มีสิทธิ์ใช้ระบบนำทาง'; END IF;
 SELECT payload INTO result FROM private.navigation_content WHERE key='v1';
 IF result IS NULL THEN RAISE EXCEPTION 'ระบบนำทางยังไม่พร้อม'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.read_navigation(text) FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.read_navigation(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_navigation(p_guide text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.read_navigation(p_guide) $$;
REVOKE ALL ON FUNCTION public.get_navigation(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_navigation(text) TO authenticated;
COMMIT;
