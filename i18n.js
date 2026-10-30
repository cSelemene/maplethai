// Local, reviewed translations only. No page content is sent to a translation service.
const KEY = 'maplethai:language';
const THAI = /[\u0e01-\u0e3a\u0e40-\u0e4e]/;
const normalize = value => value.replace(/\s+/g, ' ').trim();
const excluded = 'script,style,code,pre,textarea,[contenteditable], [translate="no"], [data-i18n-ignore]';
const attributes = ['title', 'alt', 'placeholder', 'aria-label'];
let language = 'th';
// Always start each page in Thai. The language switch only affects the current page.
let catalog = {};
let phrases = [];
let loaded = false;
let catalogVersion = 0;
let loading;
const originals = new WeakMap();
const missing = new Set();
let observer;
let button;
let scheduled = false;

export function getLanguage() {
  return language;
}
export function addTranslations(entries) {
  catalogVersion++;
  for (const [source, target] of Object.entries(entries || {})) {
    if (typeof target === 'string' && target) catalog[normalize(source)] = target;
  }
  phrases = Object.keys(catalog)
    .filter(key => THAI.test(key))
    .sort((a, b) => b.length - a.length);
  refresh();
}
export function translate(value) {
  if (language !== 'en' || typeof value !== 'string') return value;
  const originalKey = normalize(value);
  const key = originalKey.replace(
    /(\d{1,2}) (ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.) (\d{4})/g,
    (_, day, month, year) => {
      const months = [
        'ม.ค.',
        'ก.พ.',
        'มี.ค.',
        'เม.ย.',
        'พ.ค.',
        'มิ.ย.',
        'ก.ค.',
        'ส.ค.',
        'ก.ย.',
        'ต.ค.',
        'พ.ย.',
        'ธ.ค.'
      ];
      return (
        day +
        ' ' +
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
          months.indexOf(month)
        ] +
        ' ' +
        (Number(year) > 2400 ? Number(year) - 543 : year)
      );
    }
  );
  if (!THAI.test(key)) return key === originalKey ? value : value.replace(originalKey, key);
  let result = catalog[originalKey] ?? catalog[key];
  // Dynamic labels can combine translated fragments with amounts, names, or counts.
  // Only accept a composed result if every Thai fragment has a known translation.
  if (result === undefined) {
    let rest = key;
    const replacements = [];
    for (const phrase of phrases) {
      if (!rest.includes(phrase)) continue;
      const token = `\u0001${replacements.length}\u0002`;
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rest = rest.replace(
        new RegExp(
          '(?<![\\u0e01-\\u0e3a\\u0e40-\\u0e4e])' + escaped + '(?![\\u0e01-\\u0e3a\\u0e40-\\u0e4e])',
          'g'
        ),
        token
      );
      replacements.push(catalog[phrase]);
    }
    if (!THAI.test(rest)) {
      result = rest.replace(/\u0001(\d+)\u0002/g, (_, i) => replacements[Number(i)]);
    }
  }
  if (result === undefined) {
    missing.add(key);
    return value;
  }
  return (
    value.slice(0, value.length - value.trimStart().length) + result + value.slice(value.trimEnd().length)
  );
}
export function untranslated() {
  return [...missing];
}

function update(node, property, read, write) {
  const current = read();
  let records = originals.get(node);
  if (!records) {
    records = new Map();
    originals.set(node, records);
  }
  let record = records.get(property);
  if (!record || current !== record.rendered) record = { original: current, rendered: current };
  if (record.language === language && record.catalogVersion === catalogVersion && current === record.rendered)
    return;
  const next = translate(record.original);
  if (next !== current) write(next);
  record.rendered = next;
  record.language = language;
  record.catalogVersion = catalogVersion;
  records.set(property, record);
}
function visit(root) {
  if (!root || root.nodeType !== 1 || root.closest(excluded)) return;
  for (const attribute of attributes) {
    if (root.hasAttribute(attribute))
      update(
        root,
        attribute,
        () => root.getAttribute(attribute),
        value => root.setAttribute(attribute, value)
      );
  }
  for (const node of root.childNodes) {
    if (node.nodeType === 3)
      update(
        node,
        'text',
        () => node.data,
        value => {
          node.data = value;
        }
      );
    else if (node.nodeType === 1) visit(node);
  }
}
function refresh() {
  if (!document.body) return;
  observer?.disconnect();
  document.documentElement.lang = language;
  visit(document.body);
  const title = document.querySelector('title');
  if (title)
    update(
      title,
      'text',
      () => title.textContent,
      value => {
        title.textContent = value;
      }
    );
  if (button) {
    button.textContent = language === 'th' ? 'TH / EN' : 'EN / TH';
    button.setAttribute('aria-label', language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย');
    button.setAttribute('aria-pressed', String(language === 'en'));
  }
  observer?.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: attributes
  });
}
async function load() {
  if (loaded) return;
  if (!loading) {
    const paths = [
      new URL('./locales/en.json?v=b84d9ba67b', import.meta.url),
      new URL('./locales/en-extra.json?v=09f6698244', import.meta.url),
      new URL('./locales/en-articles.json?v=56d4c65880', import.meta.url),
      new URL('./locales/en-guides.json?v=027a8ad055', import.meta.url),
      new URL('./locales/en-guides-tail.json?v=a956c0fdde', import.meta.url),
      new URL('./locales/en-updates.json?v=d12e353086', import.meta.url)
    ];
    if (/\/articles\/[^/]+\.html$/.test(location.pathname))
      paths.push(new URL('./locales/en-article-overrides.json?v=f816ab1a16', import.meta.url));
    loading = Promise.all(
      paths.map(async path => {
        const response = await fetch(path);
        if (!response.ok) throw new Error('Translation catalog unavailable');
        return response.json();
      })
    )
      .then(dictionaries => {
        // Merge before rendering so a large guide is translated only once.
        // The final payload exists only in the authenticated guide response.
        addTranslations(Object.assign({}, ...dictionaries, globalThis.__MAPLE_TRANSLATIONS__ || {}));
        loaded = true;
      })
      .catch(error => {
        loading = null;
        throw error;
      });
  }
  await loading;
}
export async function setLanguage(next, persist = false) {
  if (!['th', 'en'].includes(next)) return;
  if (next === 'en') await load();
  language = next;
  if (persist) {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }
  missing.clear();
  refresh();
  document.dispatchEvent(new CustomEvent('maplethai-language', { detail: { language } }));
  for (const frame of document.querySelectorAll('iframe')) {
    try {
      frame.contentWindow?.postMessage({ type: 'maplethai-language', language }, location.origin);
    } catch {}
  }
}
function start() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./i18n.css?v=8120c5033c', import.meta.url).href;
  document.head.append(link);
  // Embedded guides use the outer page's control to avoid duplicate buttons.
  if (window === window.top) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-toggle';
    button.dataset.i18nIgnore = '';
    const header = document.querySelector('body > header');
    const bar = header?.querySelector('.bar-inner,.nav-inner,.header-inner');
    // In a regular header the control joins the menu, so it wraps with the other links
    // instead of floating over them when the menu is long (English, signed-in links).
    const nav = !bar && header?.querySelector('nav');
    const host = bar || header;
    if (nav) {
      button.classList.add('language-toggle-inline');
      nav.append(button);
    } else if (host) {
      host.classList.add('language-host');
      host.append(button);
    } else {
      button.classList.add('language-toggle-floating');
      document.body.append(button);
    }
    button.addEventListener('click', async () => {
      document.querySelector('.language-error')?.remove();
      button.disabled = true;
      try {
        await setLanguage(language === 'th' ? 'en' : 'th');
      } catch {
        const message = document.createElement('p');
        message.className = 'language-error';
        message.role = 'alert';
        message.textContent =
          'โหลดภาษาอังกฤษไม่สำเร็จ กรุณาลองอีกครั้ง / English could not be loaded. Please try again.';
        document.querySelector('.language-error')?.remove();
        button.insertAdjacentElement('afterend', message);
      } finally {
        button.disabled = false;
      }
    });
  }
  observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      refresh();
    });
  });
  refresh();
  if (language === 'en')
    setLanguage('en', false).catch(() => {
      language = 'th';
      refresh();
    });
}
window.addEventListener('message', event => {
  if (
    event.origin === location.origin &&
    event.source === window.parent &&
    event.data?.type === 'maplethai-language'
  ) {
    setLanguage(event.data.language, false).catch(() => {});
  }
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
