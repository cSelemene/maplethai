import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = createServer(async (req, res) => {
  try {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const mime = {
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'text/html');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox']
});
try {
  const page = await browser.newPage(),
    errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().startsWith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@'))
      return req.respond({
        status: 200,
        contentType: 'application/javascript',
        headers: { 'access-control-allow-origin': '*' },
        body: 'export const createClient=()=>({auth:{getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{}}})}});'
      });
    req.continue();
  });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:' + server.address().port + '/index.html', { waitUntil: 'networkidle2' });
  assert.equal(await page.$eval('#guides h2', e => e.textContent), 'เลือกไกด์ตามอาชีพที่เล่น');
  assert(
    await page.$eval(
      '#class-quiz',
      e => !!(e.compareDocumentPosition(document.querySelector('#guides')) & Node.DOCUMENT_POSITION_FOLLOWING)
    )
  );
  await page.click('[data-quiz-start]');
  assert(await page.$eval('.quiz-form button[type="submit"]', e => e.disabled));
  // Keyboard selection and back navigation preserve a previously chosen answer.
  await page.focus('.quiz-option input');
  await page.keyboard.press('Space');
  await page.click('.quiz-form button[type="submit"]');
  await page.click('.quiz-form .quiz-secondary');
  assert(await page.$eval('.quiz-option input[value="0"]', e => e.checked));
  const pageAnswers = [0, 3, 3, 2, 4, 1, 3, 4, 4];
  for (const answer of pageAnswers) {
    await page.click('.quiz-option:has(input[value="' + answer + '"])');
    await page.click('.quiz-form button[type="submit"]');
  }
  await page.waitForSelector('.quiz-result-card');
  assert.equal(await page.$eval('.quiz-result-card', e => e.dataset.class), 'page');
  assert.equal(await page.$$eval('.quiz-result-card', els => els.length), 3);
  assert.equal(
    await page.$('.quiz-result-card[data-class="page"] .quiz-guide-link'),
    null,
    'Withdrawn Page guide must not be promoted'
  );
  for (const guide of ['fighter', 'page', 'spearman']) {
    assert.equal(await page.$('#guides a[href="./guide-preview.html?guide=' + guide + '"]'), null);
    assert.equal(await page.$('#guides a[href="./checkout.html?product=guide_' + guide + '"]'), null);
  }
  assert(
    await page.$eval(
      '.quiz-result-card[data-class="page"] .quiz-source-link',
      e => e.href === 'https://meowdb.com/msclassic/classes/page'
    )
  );
  await page.setViewport({ width: 375, height: 800 });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
    'Results overflow on mobile'
  );
  await page.click('[data-quiz-results] .quiz-secondary');
  assert.equal(await page.$('.quiz-option input:checked'), null);
  const assassinAnswers = [1, 1, 1, 1, 2, 5, 3, 4, 4];
  for (const answer of assassinAnswers) {
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
      'Question overflows mobile'
    );
    await page.click('.quiz-option:has(input[value="' + answer + '"])');
    await page.click('.quiz-form button[type="submit"]');
  }
  assert.equal(await page.$eval('.quiz-result-card', e => e.dataset.class), 'assassin');
  assert(
    await page.$eval('.quiz-result-card .quiz-guide-link', e =>
      e.href.endsWith('guide-preview.html?guide=assassin')
    )
  );
  await page.goto('http://127.0.0.1:' + server.address().port + '/index.html', { waitUntil: 'networkidle2' });
  assert(await page.$('[data-quiz-start]'));
  assert(!errors.length, errors.join(', '));
  console.log(
    'PASS: 9-question flow, keyboard, back/restart, Warrior class result, guide links and mobile layouts'
  );
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
