-- Applied to the existing MapleThai project on 2026-10-11.
-- QR format validation is not proof of a completed transfer.
-- Keep payment claims inaccessible until server-side payment verification exists.
REVOKE EXECUTE ON FUNCTION public.claim_payment(text, text, text)
  FROM PUBLIC, anon, authenticated;
-- Existing get_guide, sync_account, redeem_code and admin_grant RPCs are reused.
-- Entitlements and paid guide source remain protected by existing RLS/RPC checks.
