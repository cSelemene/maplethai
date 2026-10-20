import { ARTICLES, articleUrl, thaiDate } from './articles.js?v=4a80183b49';

// Homepage uses a compact horizontal rail; the article index keeps its grid.
function card(article, featured) {
  const a = document.createElement('a');
  a.className = 'article-card' + (featured ? ' featured' : '');
  a.href = articleUrl(article);
  const figure = document.createElement('div');
  figure.className = 'article-cover';
  const img = document.createElement('img');
  img.src = article.cover;
  img.alt = article.coverAlt || '';
  img.loading = 'lazy';
  img.decoding = 'async';
  figure.append(img);
  const body = document.createElement('div');
  body.className = 'article-card-body';
  const tag = document.createElement('span');
  tag.className = 'article-tag';
  tag.textContent = article.category;
  const h = document.createElement('h3');
  h.textContent = article.title;
  const p = document.createElement('p');
  p.textContent = article.excerpt;
  const meta = document.createElement('span');
  meta.className = 'article-meta';
  meta.textContent = `${thaiDate(article.date)} · อ่าน ${article.minutes} นาที`;
  const more = document.createElement('span');
  more.className = 'article-more';
  more.textContent = 'อ่านบทความ →';
  body.append(tag, h, p, meta, more);
  a.append(figure, body);
  return a;
}

for (const box of document.querySelectorAll('[data-articles]')) {
  const limit = Number(box.dataset.limit) || ARTICLES.length;
  const list = ARTICLES.slice(0, limit);
  const carousel = box.hasAttribute('data-carousel');
  box.replaceChildren(...list.map((article, i) => card(article, !carousel && i === 0)));
  box.classList.toggle('single', list.length === 1);
  if (carousel && list.length) {
    const controls = document.createElement('div');
    controls.className = 'article-controls';
    const previous = document.createElement('button');
    const next = document.createElement('button');
    previous.type = next.type = 'button';
    previous.textContent = '←';
    next.textContent = '→';
    previous.setAttribute('aria-label', 'เลื่อนดูบทความก่อนหน้า');
    next.setAttribute('aria-label', 'เลื่อนดูบทความถัดไป');
    previous.setAttribute('aria-controls', box.id);
    next.setAttribute('aria-controls', box.id);
    const hint = document.createElement('span');
    hint.textContent = 'เลื่อนดูบทความ';
    controls.append(hint, previous, next);
    box.before(controls);
    const update = () => {
      const max = box.scrollWidth - box.clientWidth;
      controls.hidden = max <= 2;
      previous.disabled = box.scrollLeft <= 2;
      next.disabled = box.scrollLeft >= max - 2;
    };
    const move = direction => {
      const cards = [...box.children];
      const current = cards.reduce(
        (best, item, index) =>
          Math.abs(item.offsetLeft - cards[0].offsetLeft - box.scrollLeft) <
          Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - box.scrollLeft)
            ? index
            : best,
        0
      );
      const target = cards[Math.max(0, Math.min(cards.length - 1, current + direction))];
      box.scrollTo({
        left: target.offsetLeft - cards[0].offsetLeft,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    box.addEventListener('scroll', update, { passive: true });
    box.addEventListener('keydown', event => {
      if (event.target !== box || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    new ResizeObserver(update).observe(box);
    update();
  }
}
