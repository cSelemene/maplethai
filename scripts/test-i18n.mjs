import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-gpu']
});
const base = 'http://127.0.0.1:8765';
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.language-toggle');
  const original = await page.$eval('h1', e => e.textContent);
  const hrefs = await page.$$eval('main a', nodes => nodes.map(n => n.getAttribute('href')));
  await page.click('.language-toggle');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.match(await page.$eval('h1', e => e.textContent), /Open your guide/);
  assert.deepEqual(await page.$$eval('main a', nodes => nodes.map(n => n.getAttribute('href'))), hrefs);
  assert.equal(await page.$eval('.language-toggle', e => e.getAttribute('aria-pressed')), 'true');
  await page.evaluate(() => {
    const box = document.createElement('div');
    box.id = 'language-fixture';
    box.innerHTML =
      '<p id="dynamic-status">กำลังบันทึก…</p><input id="untouched" value="ชื่อผู้เล่น" placeholder="อีเมล"><p translate="no">ชื่อผู้เล่น</p><a id="entity" href="https://meowdb.com">Pan Lid<img alt="Pan Lid"></a>';
    document.body.append(box);
  });
  await page.waitForFunction(() => document.querySelector('#dynamic-status').textContent === 'Saving…');
  assert.equal(await page.$eval('#untouched', e => e.value), 'ชื่อผู้เล่น');
  assert.equal(await page.$eval('#untouched', e => e.placeholder), 'Email');
  assert.equal(await page.$eval('[translate=no]', e => e.textContent), 'ชื่อผู้เล่น');
  assert.equal(await page.$eval('#entity', e => e.textContent), 'Pan Lid');
  await page.evaluate(() => {
    document.querySelector('#dynamic-status').textContent = 'บันทึกไม่สำเร็จ';
  });
  await page.waitForFunction(
    () => document.querySelector('#dynamic-status').textContent === 'Unable to save'
  );
  await page.click('.language-toggle');
  await page.waitForFunction(() => document.documentElement.lang === 'th');
  assert.equal(await page.$eval('h1', e => e.textContent), original);
  assert.equal(await page.$eval('#dynamic-status', e => e.textContent), 'บันทึกไม่สำเร็จ');
  assert.equal(await page.$eval('#untouched', e => e.placeholder), 'อีเมล');
  await page.click('.language-toggle');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  // Every page starts in Thai; the switch only affects the current page.
  await page.goto(base + '/auth.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.language-toggle');
  assert.equal(await page.$eval('html', e => e.lang), 'th');
  await page.click('.language-toggle');
  await page.waitForFunction(
    () =>
      document.documentElement.lang === 'en' &&
      document.querySelector('h1')?.textContent === 'Welcome to MapleThai'
  );
  assert.equal(await page.$$eval('.language-toggle', n => n.length), 1);
  await page.setViewport({ width: 390, height: 844 });
  assert(
    await page.$eval('.language-toggle', e => {
      const r = e.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.height >= 40;
    })
  );
  // No server-side access, prices, input values, or navigation identifiers are changed.
  const result = await page.evaluate(async () => {
    const module = await import(document.querySelector('script[src*="i18n.js"]').src);
    module.addTranslations({ ข้อความทดสอบ: '<b>plain text</b>' });
    const p = document.createElement('p');
    p.id = 'text-only';
    p.textContent = 'ข้อความทดสอบ';
    document.body.append(p);
    return {
      amount: module.translate('฿99.31'),
      unknown: module.translate('ข้อความที่ไม่มีคำแปลแน่นอน'),
      date: module.translate('21 ต.ค. 2569')
    };
  });
  assert.equal(result.amount, '฿99.31');
  assert.equal(result.unknown, 'ข้อความที่ไม่มีคำแปลแน่นอน');
  assert.equal(result.date, '21 Oct 2026');
  await page.waitForFunction(() => document.querySelector('#text-only').textContent === '<b>plain text</b>');
  assert.equal(await page.$eval('#text-only', e => e.children.length), 0);
  // Denied storage must not prevent switching for the current page.
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Storage unavailable');
    };
  });
  await page.click('.language-toggle');
  await page.waitForFunction(() => document.documentElement.lang === 'th');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(
    'PASS: language switching, Thai default per page, dynamic text, restoration, input and link preservation, currency, dates, mobile control, and denied storage'
  );
} finally {
  await browser.close();
}
