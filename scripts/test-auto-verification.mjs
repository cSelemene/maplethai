import assert from 'node:assert/strict';
import {
  evaluateSlip,
  maskedAccountMatches,
  normalizedName
} from '../supabase/functions/verify-payment/validation.mjs';
const now = Date.parse('2026-10-11T04:40:00Z');
const payment = {
  amount: 99,
  created_at: '2026-10-11T04:35:00Z',
  recipient: { account_number: '0248522232', recipient_name: 'ด.ช. กวินทร์นิธิ พลาญทอง' }
};
const response = {
  success: true,
  data: {
    isDuplicate: false,
    amountInSlip: 99,
    isAmountMatched: true,
    matchedAccount: { bank: { code: '004' }, bankNumber: '024-8-52223-2' },
    rawSlip: {
      countryCode: 'TH',
      amount: { amount: 99, local: { currency: 'THB' } },
      date: '2026-10-11T04:38:00Z',
      transRef: 'BANK-REF-001',
      receiver: {
        bank: { id: '004' },
        account: { bank: { account: 'xxx-x-x2223-x' }, name: { th: 'นาย กวินทร์นิธิ พลาญทอง' } }
      }
    }
  }
};
assert.equal(evaluateSlip(response, payment, now).verified, true);
const bad = (name, mutate, code) => {
  const r = structuredClone(response);
  mutate(r.data);
  const got = evaluateSlip(r, payment, now);
  assert.equal(got.verified, false, name);
  assert.equal(got.code, code, name);
};
bad('duplicate', x => (x.isDuplicate = true), 'DUPLICATE_SLIP');
bad('wrong amount', x => (x.amountInSlip = 1), 'AMOUNT_MISMATCH');
bad('wrong raw amount', x => (x.rawSlip.amount.amount = 1), 'AMOUNT_MISMATCH');
bad('wrong bank', x => (x.rawSlip.receiver.bank.id = '014'), 'RECIPIENT_MISMATCH');
bad('other registered account', x => (x.matchedAccount.bankNumber = '9999999999'), 'RECIPIENT_MISMATCH');
bad(
  'wrong actual account',
  x => (x.rawSlip.receiver.account.bank.account = 'xxx-x-x3333-x'),
  'RECIPIENT_ACCOUNT_UNCERTAIN'
);
bad(
  'insufficient digits',
  x => (x.rawSlip.receiver.account.bank.account = 'xxxxxxxxx2'),
  'RECIPIENT_ACCOUNT_UNCERTAIN'
);
bad('wrong name', x => (x.rawSlip.receiver.account.name.th = 'นาย คนอื่น'), 'RECIPIENT_NAME_UNCERTAIN');
bad('old payment', x => (x.rawSlip.date = '2026-10-10T04:00:00Z'), 'TRANSFER_TIME_MISMATCH');
bad('future payment', x => (x.rawSlip.date = '2026-10-12T04:00:00Z'), 'TRANSFER_TIME_MISMATCH');
bad('invalid timestamp', x => (x.rawSlip.date = 'invalid'), 'TRANSFER_TIME_MISMATCH');
bad('wrong currency', x => (x.rawSlip.amount.local.currency = 'USD'), 'INVALID_CURRENCY');
bad('missing bank match', x => (x.matchedAccount = null), 'RECIPIENT_MISMATCH');
bad('missing reference', x => delete x.rawSlip.transRef, 'INVALID_REFERENCE');
assert.equal(evaluateSlip({ success: false }, payment, now).verified, false);
assert.equal(maskedAccountMatches('xxx-x-x2223-x', '0248522232'), true);
assert.equal(maskedAccountMatches('2223', '0248522232'), false);
assert.equal(normalizedName('ด.ช. กวินทร์นิธิ พลาญทอง'), normalizedName('นาย กวินทร์นิธิ พลาญทอง'));
console.log('PASS: valid slip and 15 fail-closed verification cases');
