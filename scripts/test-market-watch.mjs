import assert from 'node:assert/strict';
import { selectWatchlist } from '../market-watch-selection.js';
const now = Date.now();
const row = (id, overrides = {}) => ({
  id,
  user_id: 'seller-' + id,
  kind: 'sell',
  item_id: id,
  item_name: 'Item ' + id,
  status: 'open',
  price_unit: 'meso',
  price: 100,
  created_at: new Date(now - id * 1000).toISOString(),
  expires_at: new Date(now + 60000).toISOString(),
  ...overrides
});
assert.deepEqual(
  selectWatchlist(
    [
      row(1, { status: 'done' }),
      row(2, { expires_at: new Date(now - 1).toISOString() }),
      row(3, { price_unit: 'thb' }),
      row(4, { price: 0 })
    ],
    { now }
  ),
  []
);
const hot = [row(1, { item_id: 99 }), row(2, { item_id: 99 }), row(3, { item_id: 99 })];
const selected = selectWatchlist([...hot, row(4, { kind: 'buy' }), row(5)], { now });
assert.equal(selected[0].row.item_id, 99);
assert.equal(selected[0].people, 3);
assert.equal(selected.filter(x => x.row.item_id === 99).length, 1);
assert(selected.some(x => x.row.kind === 'buy'));
assert(selected.some(x => x.row.kind === 'sell'));
assert.equal(
  selectWatchlist(
    Array.from({ length: 20 }, (_, i) => row(i + 1)),
    { now }
  ).length,
  6
);
const repeated = [row(10, { item_id: 88, user_id: 'same' }), row(11, { item_id: 88, user_id: 'same' })];
assert.equal(selectWatchlist(repeated, { now })[0].people, 1);
const forDiscord = [
  row(20, { item_id: 77, user_id: 'admin', discord_user: 'a' }),
  row(21, { item_id: 77, user_id: 'admin', discord_user: 'b' })
];
assert.equal(selectWatchlist(forDiscord, { now })[0].people, 2);
const twoKinds = selectWatchlist([row(1, { item_id: 88 }), row(2, { item_id: 88, kind: 'buy' })], { now });
assert.equal(twoKinds.length, 2);
console.log(
  'PASS: live Meso listings only, multiple distinct posters, grouped items, buy/sell coverage, limit and spam-resistant popularity'
);
