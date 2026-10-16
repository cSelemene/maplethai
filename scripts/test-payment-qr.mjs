import assert from 'node:assert/strict';
import { amountPayload, parsePayload, crc16, qrMatrix } from '../payment-qr.js';
import { evaluateReceipt } from '../supabase/functions/verify-payment/validation.mjs';
const source = '00020101021129390016A000000677010111031500499900465145053037645802TH6304BF03';
for (const cents of [5000, 9900, 4900, 125, ...Array.from({ length: 39 }, (_, i) => 9911 + i), 4911, 4949]) {
  const payload = amountPayload(source, cents);
  const fields = parsePayload(payload);
  assert.equal(fields.find(f => f.id === '54').value, (cents / 100).toFixed(2));
  assert.equal(fields.find(f => f.id === '29').value, parsePayload(source).find(f => f.id === '29').value);
  assert.equal(fields.at(-1).value, crc16(payload.slice(0, -4)));
  assert.equal(fields.find(f => f.id === '01').value, '12');
  assert(qrMatrix(payload).length > 20);
}
assert.throws(() => amountPayload(source, 0));
assert.throws(() => amountPayload(source.replace('BF03', 'FFFF'), 9900));
const now = Date.parse('2026-10-11T04:40:00Z');
const payment = {
  amount: 99,
  created_at: '2026-10-11T04:35:00Z',
  recipient: { account_number: '0248522232', recipient_name: 'ด.ช. กวินทร์นิธิ พลาญทอง' }
};
const fixture = {
  success: true,
  data: {
    isDuplicate: true,
    amountInSlip: 50,
    isAmountMatched: false,
    matchedAccount: { bank: { code: '004' }, bankNumber: '0248522232' },
    rawSlip: {
      countryCode: 'TH',
      amount: { amount: 50, local: { amount: 0, currency: '' } },
      date: '2026-10-11T04:38:00Z',
      transRef: 'CREDIT-REF-001',
      receiver: {
        bank: { id: '004' },
        account: { bank: { account: 'xxx-x-x2223-x' }, name: { th: 'นาย กวินทร์นิธิ พลาญทอง' } }
      }
    }
  }
};
assert.equal(evaluateReceipt(fixture, payment, now).amount_cents, 5000);
const bad = (mutate, code) => {
  const x = structuredClone(fixture);
  mutate(x.data);
  const r = evaluateReceipt(x, payment, now);
  assert.equal(r.verified, false);
  assert.equal(r.code, code);
};
bad(x => (x.rawSlip.amount.local.currency = 'USD'), 'INVALID_CURRENCY');
bad(x => (x.rawSlip.amount.local.amount = 300), 'INVALID_CURRENCY');
bad(x => (x.rawSlip.countryCode = 'US'), 'INVALID_CURRENCY');
bad(x => (x.rawSlip.amount.amount = 49), 'INVALID_RECEIVED_AMOUNT');
bad(x => (x.amountInSlip = -1), 'INVALID_RECEIVED_AMOUNT');
bad(x => (x.amountInSlip = 50.123), 'INVALID_RECEIVED_AMOUNT');
bad(x => (x.matchedAccount.bankNumber = '9999999999'), 'RECIPIENT_MISMATCH');
bad(x => (x.rawSlip.receiver.account.name.th = 'นาย คนอื่น'), 'RECIPIENT_NAME_UNCERTAIN');
bad(x => (x.rawSlip.date = '2026-10-10T00:00:00Z'), 'TRANSFER_TIME_MISMATCH');
bad(x => delete x.isDuplicate, 'PROVIDER_UNAVAILABLE');
console.log(
  'PASS: amount QR preserves receiver and checksum; real receipt amount with underpayment/provider-cache handling and fraud checks'
);
