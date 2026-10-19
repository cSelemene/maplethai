/* ---------- แท็บสายตีมอน (ไม่วิ่งเควส) ---------- */
let grindRendered = false;
const gPace = () => { const v = +state.gpace; return v >= 2 && v <= 60 ? v : 10; };
const gNum = v => Math.round(v).toLocaleString("en-US");
function gExp(from, to){ let s = 0; for (let l = from; l < to; l++) s += GRIND.exp[l] || 0; return s; }
function gAvgExp(st){
  const m = st.maps[0]; let w = 0, e = 0;
  m.mob.forEach(([n, c]) => { const x = GRIND.mobs[n]; if (x) { w += c; e += c * x.exp; } });
  return w ? e / w : 0;
}
function gHours(kills){ const h = kills / gPace() / 60; return h < 1 ? `${Math.max(1, Math.round(h * 60))} นาที` : `${h < 10 ? h.toFixed(1) : Math.round(h)} ชั่วโมง`; }
function gMobRow(n){
  const x = GRIND.mobs[n], m = MOB[n] || {};
  const img = m.a || m.i;
  return `<tr><td><a class="gmob" href="${x.u}" target="_blank" rel="noopener">${img ? `<img src="${img}" alt="">` : ""}<b>${esc(n)}</b></a></td>
    <td class="num">${x.lv}</td><td class="num">${gNum(x.hp)}</td><td class="num">${x.exp}</td><td class="num">${(x.hp / x.exp).toFixed(1)}</td>
    <td class="num">${x.touch}</td><td class="num">${x.pdef} / ${x.mdef}</td><td>${esc(x.el)}</td></tr>`;
}
function gMapTile(mp){
  const img = MINI[mp.id] ? MINI[mp.id].u : "";
  const tot = mp.mob.reduce((a, [, c]) => a + c, 0);
  const url = `https://meowdb.com/msclassic/maps/${mp.id}`;
  return `<div class="gmap">
    <a class="pic" href="${url}" target="_blank" rel="noopener">${img ? `<img src="${img}" alt="ภาพแมพ ${attr(mp.n)}" loading="lazy">` : `<span class="nopic">ไม่มีภาพแมพ</span>`}</a>
    <span class="gm-tx"><a class="gm-n" href="${url}" target="_blank" rel="noopener">${esc(mp.n)}</a>${mp.best ? `<span class="gchip new">แนะนำ</span>` : ""}
      <span class="mt">${mp.mob.map(([n, c]) => `${esc(n)} ${c} จุด`).join(", ")}${mp.total && mp.total > tot ? ` จากทั้งหมด ${mp.total} จุด` : ""}</span>
      ${mp.note ? `<span class="gm-note">${esc(mp.note)}</span>` : ""}</span></div>`;
}
function gDrops(st){
  const seen = new Set(), rows = [];
  st.mobs.forEach(n => (FARM[n] || []).forEach(([it, ty, price, cnt]) => {
    if (seen.has(it) || ty === "etc" || ty === "sig") return; seen.add(it); rows.push([it, n, cnt, price]);
  }));
  rows.sort((a, b) => b[2] - a[2]);
  const top = rows.slice(0, 8);
  if (!top.length) return "";
  return `<details class="gdet"><summary>ของที่ผู้เล่นยืนยันว่าดรอปในแมพนี้ <span class="mt">(${top.length} ชิ้นที่มีรายงานมากที่สุด)</span></summary>
    <ul class="olist">${top.map(([it, n, cnt, price]) => `<li>${ico(it)} จาก ${esc(n)} <span class="cf" title="ผู้เล่นยืนยันดรอปใน Classic ${cnt} คน">ยืนยัน ${cnt} คน</span> <span class="mt">ขาย NPC ${gNum(price)} meso</span></li>`).join("")}</ul>
    <p class="onote">อัตราดรอปต่ำมาก ตีผ่านไปก็ลุ้นได้ ราคาขายผู้เล่นดูได้ใน<button type="button" class="linkbtn" data-tab="money"><b>แท็บหาเงิน</b></button></p></details>`;
}
function gNav(st){
  const L = NAV[st.nav]; if (!L || !L.length) return "";
  return `<details class="navbox"><summary>🧭 เส้นทางไปแมพนี้ <span class="mt">(${L.length} จุด แตะแผนที่เพื่อขยาย)</span></summary>
    <p class="navlegend"><span class="mmdot in st"></span> จุดที่เข้ามา <span class="mmdot out st"></span> ทางออกที่ต้องไป <span class="mmdot np st"></span> ตำแหน่ง NPC</p>
    <ol class="navlist">${L.map(o => `<li class="nv ${o.k}"><div class="nvt"><span class="nvk ${o.k}">${NAVK[o.k]}</span> ${ico(o.t)}</div>${mmHTML(o)}</li>`).join("")}</ol></details>`;
}
const gStep = i => `<button type="button" class="stepchip" data-go="${i}">ขั้น ${i + 1}</button>`;
const gSq = id => { const q = SQ.find(x => x.id === id); return q ? `<button type="button" class="stepchip" data-sq="${id}">เควสเสริม Lv.${esc(q.lv)}</button>` : ""; };
const gRef = r => typeof r === "number" ? gStep(r) : gSq(r);
function gStageHTML(st, k){
  const exp = gExp(st.lv[0], st.lv[1]), avg = gAvgExp(st), kills = avg ? exp / avg : 0;
  return `<section id="gs-${k}" class="osec gstage">
    <div class="card">
      <div class="gs-head">
        <div class="lvrow"><span class="lv">Lv.${st.lv[0]}–${st.lv[1]}</span><span class="stepno">จุดแวะที่ ${k + 1} จาก ${GRIND.stages.length}</span></div>
        <h2>${esc(st.title)}</h2>
        <p class="intro">${ico(st.why)}</p>
      </div>
      <div class="gs-body">
        <div class="gkpi">
          <div><span>EXP ที่ต้องเก็บ</span><b>${gNum(exp)}</b><small>Lv.${st.lv[0]} ถึง Lv.${st.lv[1]}</small></div>
          <div><span>ต้องฆ่าประมาณ</span><b>${gNum(Math.round(kills / 10) * 10)} ตัว</b><small>EXP เฉลี่ยตัวละ ${avg.toFixed(1)}</small></div>
          <div><span>ใช้เวลาประมาณ</span><b class="ghrs" data-k="${Math.round(kills)}">${gHours(kills)}</b><small>ถ้าฆ่าได้นาทีละ <span class="gpv">${gPace()}</span> ตัว</small></div>
        </div>
        <h3 class="sub-h">มอนในจุดนี้</h3>
        <div class="btbl"><table class="gtbl"><thead><tr><th>มอน</th><th>Lv</th><th>HP</th><th>EXP</th><th>HP ต่อ EXP</th><th>ชนแล้วเจ็บ</th><th>PDEF / MDEF</th><th>ธาตุ</th></tr></thead>
          <tbody>${st.mobs.map(gMobRow).join("")}</tbody></table></div>
        <p class="onote">“HP ต่อ EXP” ยิ่งต่ำยิ่งคุ้ม “ชนแล้วเจ็บ” คือดาเมจตอนเดินชนมอนก่อนหัก WDEF ของเรา ใช้ดูว่าต้องมี HP เท่าไรถึงยืนได้</p>
        <h3 class="sub-h">แมพที่แนะนำ</h3>
        <div class="gmaps">${st.maps.map(gMapTile).join("")}</div>
        ${gNav(st)}
        <div class="gcols">
          <div class="card band pad"><h3>วิธีเล่นจุดนี้</h3><ul class="olist">${st.tips.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>
          <div class="card band pad gcls"><h3>${esc(GRIND.cls)}</h3><ul class="olist">${st.cls.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>
        </div>
        <div class="gcols">
          <div class="card band pad"><h3>ยาและร้านใกล้สุด</h3><ul class="olist">${st.pots.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>
          <div class="card band pad"><h3>เควสที่นับมอนตัวเดียวกัน <span class="mt">(ไม่บังคับ)</span></h3><ul class="olist">${st.quests.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>
        </div>
        ${gDrops(st)}
        ${st.route && st.route.length ? `<p class="gsee">ขั้นใน route ที่ใช้แมพหรือมอนเดียวกัน: ${st.route.map(gRef).join(" ")}</p>` : ""}
      </div>
    </div>
  </section>`;
}
function gTimeline(){
  const A = GRIND.from, Z = 50, W = Z - A, pct = v => ((v - A) / W * 100).toFixed(2) + "%";
  return `<div class="gtl" aria-hidden="true">${GRIND.stages.map((st, k) => `<a class="gtl-b s${k}" href="#gs-${k}" data-jump="gs-${k}" style="left:${pct(st.lv[0])};width:${pct(A + st.lv[1] - st.lv[0])}"><b>${esc(st.short)}</b><small>Lv.${st.lv[0]}–${st.lv[1]}</small></a>`).join("")}
    ${[A, 20, 30, 40, 50].map(v => `<span class="gtl-t" style="left:${pct(v)}">${v}</span>`).join("")}</div>`;
}
function grindHTML(){
  const G = GRIND;
  const all = G.stages.reduce((a, st) => { const avg = gAvgExp(st); return a + (avg ? gExp(st.lv[0], st.lv[1]) / avg : 0); }, 0);
  return `<div class="card intro-hero">
    <p class="mt">สายตีมอน: ${esc(G.cls)}</p>
    <h2>เก็บเลเวลด้วยการตีมอน ไม่ต้องวิ่งเควส</h2>
    <p>${G.lead}</p>
    <div class="hero-grid">${G.summary.map(([h, p]) => `<div><h3>${h}</h3><p>${ico(p)}</p></div>`).join("")}</div>
    <div class="gpace"><label for="gpace">ฆ่าได้นาทีละ</label> <input id="gpace" type="number" min="2" max="60" step="1" value="${gPace()}" inputmode="numeric"> <span>ตัว</span>
      <span class="mt">ใช้คำนวณเวลาโดยประมาณ ถ้าไม่แน่ใจให้ลองจับเวลาในเกม 5 นาทีแล้วหารด้วย 5 รวมทั้งเส้นทางต้องฆ่าประมาณ ${gNum(Math.round(all / 100) * 100)} ตัว</span></div>
    <h3 class="sub-h">จุดแวะทั้งหมด</h3>
    ${gTimeline()}
  </div>
  ${G.stages.map(gStageHTML).join("")}
  <section id="gs-must" class="osec"><h2>เควสที่ยังควรทำ แม้จะตีมอนเป็นหลัก</h2>
    <p class="onote">เควสพวกนี้ให้ของหรือเปลี่ยนอาชีพ ซึ่งตีมอนอย่างเดียวไม่ได้ กดชื่อขั้นเพื่อเปิดใน route</p>
    <div class="card band"><div class="prow phead c3"><div class="pc">เลเวล</div><div class="pc">เควสและสิ่งที่ได้</div><div class="pc">ดูใน route</div></div>
      ${G.must.map(([lv, txt, ref]) => `<div class="prow c3"><div class="pc"><b>${esc(lv)}</b></div><div class="pc">${ico(txt)}</div><div class="pc">${(Array.isArray(ref) ? ref : [ref]).map(gRef).join(" ")}</div></div>`).join("")}</div>
  </section>
  <section id="gs-rule" class="osec"><h2>ข้อควรรู้</h2>
    <div class="card band pad"><ul class="olist">${G.rules.map(x => `<li>${ico(x)}</li>`).join("")}</ul></div>
  </section>
  <p class="credit">สเตตัสมอน จุดเกิด ตาราง EXP และทางเดินจาก <a href="https://meowdb.com/msclassic/guides/best-grind-maps-every-level" target="_blank" rel="noopener">NiaMeowDB</a> (ค่าหลังเปิดเกม) ภาพจากเกม © Nexon</p>`;
}
function renderGrind(){ $("grind").innerHTML = grindHTML(); grindRendered = true; }
function gUpdatePace(){
  document.querySelectorAll("#grind .ghrs").forEach(el => el.textContent = gHours(+el.dataset.k));
  document.querySelectorAll("#grind .gpv").forEach(el => el.textContent = gPace());
}
document.addEventListener("input", e => {
  if (e.target.id !== "gpace") return;
  const v = Math.round(+e.target.value); if (!(v >= 2 && v <= 60)) return;
  state.gpace = v; save(); gUpdatePace();
});
document.addEventListener("click", e => {
  const g = e.target.closest("[data-gjump]"); if (!g) return;
  const id = g.dataset.gjump;
  setTimeout(() => { const t = $(id); if (t) t.scrollIntoView({block: "start"}); }, 0);
});
/* กล่องทางเลือกในการ์ดของ route: ชี้ไปจุดแวะที่ตรงกับเลเวลของขั้นนั้น */
function grindHint(i){
  const s = S[i]; if (!s.act.some(a => a.t === "kill" || a.t === "collect")) return "";
  const L = lvNum(s.lv); if (L < GRIND.from) return "";
  const k = GRIND.stages.findIndex(st => L >= st.lv[0] && L < st.lv[1]);
  const kk = k < 0 ? (L >= GRIND.stages[GRIND.stages.length - 1].lv[0] ? GRIND.stages.length - 1 : -1) : k;
  if (kk < 0) return "";
  const st = GRIND.stages[kk];
  return `<div class="ghint"><span class="ok-tag quest">ทางเลือก</span> <span>ไม่อยากวิ่งเควสช่วงนี้ ไปตี <b>${esc(st.short)}</b> ยาวแทนได้ (Lv.${st.lv[0]}–${st.lv[1]})</span>
    <button type="button" class="linkbtn" data-tab="grind" data-gjump="gs-${kk}">ดูสายตีมอน →</button></div>`;
}
