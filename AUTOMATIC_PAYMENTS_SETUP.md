# Automatic slip verification

The deployed `verify-payment` Supabase Edge Function verifies Thai bank slips with EasySlip v2. Automatic verification is disabled until an admin supplies their EasySlip API key and enables it. Manual approval remains available.

## Activate

1. Sign in at https://developer.easyslip.com and obtain a UUID v4 API key for the intended branch.
2. Register and link the receiving Kasikornbank account `0248522232` with that branch. The full account number returned by EasySlip must match the receiving account saved in each order.
3. Open `admin-payments.html` while signed in as a MapleThai admin. Paste the key into **EasySlip API Key**, enable automatic verification, and save. The key is encrypted in Supabase Vault; it is never returned to browsers.
4. Use an actual new transfer and its bank slip to verify production operation. Check that the correct guide unlocks and that a repeated slip does not unlock another product. Provider account authentication and bank verification cannot be tested before the key is supplied.

## Behavior

- The browser uploads to private storage and submits the slip before requesting verification.
- The backend validates the user's Supabase token and ownership; admins can retry checks.
- Verification reads the immutable order amount and receiving-account snapshot. A private lease limits concurrent calls and caps each order at three automated attempts.
- EasySlip is called with `matchAccount`, `matchAmount`, and `checkDuplicate`. Auto approval also requires matching bank code, exact registered account number, compatible masked bank digits, matching Thai recipient name, THB currency, a transfer timestamp near or after order creation, and a unique transaction reference.
- Responses with ambiguous recipient data, provider failures, images over 4 MB, or unconfirmed payments remain pending for manual review. The customer upload limit stays 5 MB to preserve existing manual workflows.
- Approval and guide access are committed atomically. Clients cannot call privileged verification RPCs.
- The function handles its own authentication with `auth.getUser`; gateway `verify_jwt` is disabled for compatibility with current signing keys. API keys and full provider responses are not logged.

## Validation

Run `node scripts/test-auto-verification.mjs` for the decision rules. `scripts/test-auto-verification.sql` verifies RPC authorization, concurrency and atomic unlock behavior inside a rolled-back transaction. The GitHub browser tests cover immediate unlock and pending/manual fallback.

Official reference: https://document.easyslip.com/en/v2/verify/bank/
