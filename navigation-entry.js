const script = document.querySelector('script[data-navigation-guide]');
const guide = script?.dataset.navigationGuide;
const url = new URL('./navigation/index.html', import.meta.url);
if (guide) url.searchParams.set('guide', guide);
if (!document.querySelector('[data-navigation-link]')) {
  const link = document.createElement('a');
  link.href = url.href;
  link.textContent = '🧭 ระบบนำทาง';
  link.dataset.navigationLink = '';
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.cssText =
    'display:inline-block;padding:9px 14px;border:1px solid #b79871;border-radius:8px;background:#fff8e7;color:#513a24;font:600 14px system-ui;text-decoration:none;white-space:nowrap';
  const host = document.querySelector('.tabs,.mt-nav,header nav') || document.querySelector('header');
  host?.append(link);
}
