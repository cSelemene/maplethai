import assert from 'node:assert/strict';
import { evaluateProvisionalReceipt } from '../supabase/functions/verify-payment/validation.mjs';
const now = Date.now(),
  payment = {
    amount: 99,
    amount_due_cents: 9928,
    created_at: new Date(now - 60000).toISOString(),
    recipient: {}
  };
const response = {
  success: true,
  data: {
    isDuplicate: false,
    amountInSlip: 99.28,
    rawSlip: {
      countryCode: 'TH',
      amount: { amount: 99.28, local: { currency: 'USD' } },
      date: new Date(now).toISOString(),
      transRef: 'PROVISIONAL-123'
    }
  }
};
assert.equal(evaluateProvisionalReceipt(response, payment, now).provisional, true);
for (const mutate of [
  r => (r.data.amountInSlip = 99),
  r => (r.data.rawSlip.amount.amount = 1),
  r => (r.success = false),
  r => (r.data.rawSlip.date = 'invalid'),
  r => (r.data.rawSlip.date = new Date(now - 86400000).toISOString()),
  r => (r.data.rawSlip.transRef = ''),
  r => (r.data.amountInSlip = '99.28')
]) {
  const r = structuredClone(response);
  mutate(r);
  assert.notEqual(evaluateProvisionalReceipt(r, payment, now).provisional, true);
}
const r = structuredClone(response);
delete r.data.rawSlip.amount.local;
assert.equal(evaluateProvisionalReceipt(r, payment, now).provisional, true);
console.log(
  'PASS: exact amount provisional access; mismatches, failed provider, stale date, missing reference and string amounts blocked'
);
