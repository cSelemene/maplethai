function text(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}
export function guideCard(id, name, owned, progress) {
  const box = document.createElement('article');
  box.className = 'library-card';
  box.append(text('span', owned ? 'ปลดล็อกแล้ว' : 'ทดลองอ่านฟรี', 'library-status'), text('h3', name));
  if (owned) {
    box.append(text('p', progress?.step_label || 'พร้อมเริ่มผจญภัย', 'library-meta'));
    if (progress) {
      const bar = document.createElement('progress');
      bar.max = progress.total;
      bar.value = progress.completed;
      bar.setAttribute('aria-label', 'ขั้นที่ทำเสร็จ');
      box.append(bar, text('p', `ทำเสร็จ ${progress.completed} / ${progress.total} ขั้น`, 'library-meta'));
      const time = new Date(progress.updated_at);
      if (Number.isFinite(time.getTime()))
        box.append(text('p', 'อ่านล่าสุด ' + time.toLocaleString('th-TH'), 'library-meta'));
    }
    const a = text('a', progress ? 'อ่านต่อ' : 'เปิดไกด์');
    a.href = './premium-guide.html?guide=' + id;
    box.append(a);
  } else {
    const a = text('a', 'ทดลองอ่าน');
    a.href = id === 'bandit' ? './bandit-artifact-preview-v3.html' : './guide-preview.html?guide=' + id;
    const buy = text('a', 'ซื้อไกด์');
    buy.href = './checkout.html?product=guide_' + id;
    box.append(a, buy);
    if (id === 'sindit') box.append(text('p', 'ได้ฟรีเมื่อซื้อไกด์ Pure Bandit', 'library-meta'));
  }
  return box;
}
