import assert from 'node:assert/strict';
import { CLASSES, QUESTIONS, rankClasses } from '../class-quiz-data.js';
assert.equal(QUESTIONS.length, 9);
assert.deepEqual(
  new Set(CLASSES.map(c => c.id)),
  new Set([
    'fighter',
    'page',
    'spearman',
    'il',
    'fp',
    'cleric',
    'hunter',
    'crossbowman',
    'assassin',
    'bandit'
  ])
);
assert.throws(() => rankClasses([0]));
assert.throws(() => rankClasses([0, 0, 0, 0, 0, 999]));
assert.throws(() => rankClasses(Array(9).fill(null)));
const profiles = {
  fighter: [0, 2, 2, 1, 3, 0, 2, 0, 1],
  page: [0, 2, 3, 1, 3, 0, 2, 0, 2],
  spearman: [0, 2, 0, 1, 3, 1, 0, 0, 1],
  il: [1, 0, 3, 3, 2, 2, 1, 2, 0],
  fp: [1, 0, 0, 2, 2, 2, 3, 2, 3],
  cleric: [2, 0, 1, 3, 2, 2, 0, 2, 3],
  hunter: [1, 1, 3, 0, 1, 1, 3, 1, 2],
  crossbowman: [1, 1, 0, 1, 1, 1, 1, 1, 3],
  assassin: [1, 0, 0, 0, 1, 2, 1, 1, 0],
  bandit: [0, 0, 0, 0, 0, 1, 2, 0, 0]
};
for (const [id, answers] of Object.entries(profiles)) {
  const ranked = rankClasses(answers);
  assert.equal(ranked[0].id, id, `Representative ${id} preferences should match that class`);
  assert(ranked[0].reasons.length >= 2);
}
// Changing the catalogue must not change the recommendations.
const before = rankClasses(profiles.page).map(c => ({ id: c.id, score: c.score }));
const guides = CLASSES.map(c => c.guide);
CLASSES.forEach(c => (c.guide = 'fake'));
assert.deepEqual(
  rankClasses(profiles.page).map(c => ({ id: c.id, score: c.score })),
  before
);
CLASSES.forEach((c, i) => (c.guide = guides[i]));
const winners = new Set();
// Exhaustively check the first six preferences with fixed, valid remaining answers.
function core(answers = []) {
  if (answers.length === 6) {
    const ranked = rankClasses([...answers, 3, 3, 3]);
    ranked.filter(c => c.score === ranked[0].score).forEach(c => winners.add(c.id));
    return;
  }
  QUESTIONS[answers.length].options.forEach((_, i) => core([...answers, i]));
}
core();
assert.equal(winners.size, 10, 'Every Classic second-job class must be reachable');
console.log(
  'PASS: all 10 classes reachable, representative preferences, complete answers, and no guide-sales scoring bias'
);

assert.throws(() => rankClasses(new Array(9)));
assert.throws(() => rankClasses(null));
const neutral = [...profiles.assassin];
const low = [...neutral];
neutral[5] = 3;
low[5] = 0;
const normal = rankClasses(neutral),
  budget = rankClasses(low);
const delta = id => budget.find(c => c.id === id).score - normal.find(c => c.id === id).score;
assert(delta('hunter') > delta('assassin'));
assert(delta('fighter') > delta('il'));
assert(budget.find(c => c.id === 'assassin').cautions.length === 1);
assert(!budget.find(c => c.id === 'assassin').reasons.includes(QUESTIONS[5].options[0].reason));
const healer = [...profiles.cleric];
healer[6] = 0;
assert.equal(rankClasses(healer)[0].id, 'cleric');
const horizontal = [...profiles.crossbowman];
horizontal[7] = 1;
assert.equal(rankClasses(horizontal)[0].id, 'crossbowman');
for (const q of QUESTIONS)
  for (const option of q.options)
    for (const id of Object.keys(option.weights)) assert(CLASSES.some(c => c.id === id));
console.log(
  'PASS: budget penalties are explained, not positive reasons; equipment and pot costs are separate; horizontal and healer profiles; sparse answers rejected'
);
