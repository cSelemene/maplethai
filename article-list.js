import { ARTICLES, articleUrl, thaiDate } from './articles.js?v=4a80183b49';

// Fills every [data-articles] element. data-limit caps how many are shown; the first
// article is drawn as the large featured card, the rest as compact rows.
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
  box.replaceChildren(...list.map((article, i) => card(article, i === 0)));
  box.classList.toggle('single', list.length === 1);
}
