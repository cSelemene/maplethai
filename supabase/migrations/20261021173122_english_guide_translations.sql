-- Paid translations remain private and are returned only by the existing,
-- entitlement-checked get_guide function. No paid text belongs in this migration.
CREATE TABLE private.guide_translations (
  guide text PRIMARY KEY REFERENCES public.guide_files(guide) ON DELETE CASCADE,
  source_hash text NOT NULL,
  english jsonb NOT NULL CHECK (jsonb_typeof(english) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.guide_translations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.guide_translations FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.attach_guide_locale(p_guide text, p_html text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''
AS $$
DECLARE dictionary jsonb; payload text; tag text; pos integer;
BEGIN
  IF p_html IS NULL THEN RETURN NULL; END IF;
  SELECT t.english INTO dictionary
  FROM private.guide_translations t JOIN public.guide_files g USING (guide)
  WHERE t.guide = p_guide AND t.source_hash = md5(g.html);
  IF dictionary IS NULL THEN RETURN p_html; END IF;
  payload := replace(replace(replace(dictionary::text, '<', chr(92)||'u003c'), chr(8232), chr(92)||'u2028'), chr(8233), chr(92)||'u2029');
  tag := substring(p_html from '(?i)<head(?:\s[^>]*)?>');
  IF tag IS NULL THEN RETURN p_html; END IF;
  pos := strpos(p_html, tag) + length(tag);
  RETURN left(p_html, pos - 1) || '<script>window.__MAPLE_TRANSLATIONS__=' || payload || ';</script>' || substr(p_html, pos);
END $$;
REVOKE ALL ON FUNCTION private.attach_guide_locale(text,text) FROM PUBLIC, anon, authenticated;

-- Retain the current authorization and price-injection behavior verbatim.
DO $$
DECLARE definition text;
BEGIN
  definition := pg_get_functiondef('public.get_guide(text)'::regprocedure);
  IF strpos(definition, 'return h;') = 0 THEN
    RAISE EXCEPTION 'get_guide changed; review its definition before attaching translations';
  END IF;
  EXECUTE replace(definition, 'return h;', 'return private.attach_guide_locale(p_guide, h);');
END $$;
