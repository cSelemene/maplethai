// Free articles shown on the homepage and on articles.html. Everyone can read them,
// with or without a guide. Newest first. To publish a new article: add its page in
// articles/<slug>.html, put its cover in assets/articles/, then add one entry here.
export const ARTICLES = [
  {
    slug: 'rich-drops',
    title: '10 มอนสเตอร์ดรอปของแพง พร้อมแมพฟาร์ม Lv.10–50',
    excerpt:
      'เก็บเลเวลไปพร้อมลุ้นของราคาสูง ตั้งแต่เห็ดเขียวถึงลิงลูพิน พร้อมวิธีไป ของที่ควรเก็บ และราคาล่าสุดจากตลาดที่อัปเดตให้อัตโนมัติ',
    category: 'ฟาร์มของ',
    date: '2026-10-21',
    minutes: 8,
    cover: './assets/articles/rich-drops-cover.webp?v=e23f2ef79f',
    coverAlt: 'มอนสเตอร์ 10 ตัวยืนเรียงกันบนกองเหรียญ meso'
  },
  {
    slug: 'class-pros-cons',
    title: '10 อาชีพใน Classic World เก่งตรงไหน ติดตรงไหน ใครควรเล่น',
    excerpt:
      'ก่อนกดสร้างตัวละคร อ่านจุดเด่น ข้อเสียที่ต้องยอมรับ และแนวคนที่เหมาะกับแต่ละอาชีพ พร้อมเหตุผลว่าทำไมตาราง DPS ไม่ใช่คำตอบทั้งหมด',
    category: 'เลือกอาชีพ',
    date: '2026-10-21',
    minutes: 10,
    cover: './assets/articles/class-pros-cons-cover.webp?v=e06251ef4e',
    coverAlt: 'ตัวละครทั้ง 10 อาชีพของ MapleStory ยืนเรียงกัน'
  }
];

export function articleUrl(article, base = './') {
  return `${base}articles/${article.slug}.html`;
}

export function thaiDate(iso) {
  const d = new Date(iso + 'T00:00:00+07:00');
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Bangkok'
  });
}
