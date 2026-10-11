const header=document.querySelector('body.maple-guide > header');
if(header){
 if(!header.querySelector('.guide-home-logo')){const home=document.createElement('a');home.className='guide-home-logo';home.href=new URL('./index.html',document.baseURI).href;home.target='_top';home.setAttribute('aria-label','MapleThai หน้าแรก');const img=document.createElement('img');img.src=new URL('./assets/maplethai-logo.svg?v=20261011-logo-b',document.baseURI).href;img.alt='MapleThai';img.width=419;img.height=120;home.append(img);(header.querySelector('.bar-inner')||header).prepend(home);}
 const update=()=>document.documentElement.style.setProperty('--guide-header-height',Math.ceil(header.getBoundingClientRect().height)+'px');
 update();if(typeof ResizeObserver!=='undefined')new ResizeObserver(update).observe(header);window.addEventListener('resize',update,{passive:true});
}

// Keep the existing NPC coordinates when a map tile is enlarged.
if(typeof MAP!=='undefined'&&typeof MINI!=='undefined'&&typeof NPCLOC!=='undefined'&&typeof stepInfo==='function'&&typeof S!=='undefined'&&typeof state!=='undefined'&&typeof window.openMap==='function'){
 window.openMap=function(n){
  const m=MAP[n];if(!m)return;
  const id=m.u.split("/").pop(),mini=MINI[id];
  const names=stepInfo(S[state.i]).npcs.filter(name=>NPCLOC[name]?.m===id);
  const markers=names.map(name=>{const p=NPCLOC[name].p;return `<span class="mmdot np big" style="left:${p[0]}%;top:${p[1]}%" title="${attr(name)}" aria-label="${attr(name)}"></span>`;}).join("");
  const picture=mini?`<div class="lbmap" style="--ar:${mini.w/mini.h}"><img src="${mini.u}" alt="ภาพแมพ ${attr(n)}">${markers}</div>`:(m.i?`<img src="${m.i}" alt="ภาพแมพ ${attr(n)}">`:"");
  $("lbBody").innerHTML=picture+`<figcaption>${esc(n)}${names.length?" · ตำแหน่ง "+names.map(esc).join(", "):""}<br><a href="${m.u}" target="_blank" rel="noopener">ดูข้อมูลแมพบน NiaMeowDB</a></figcaption>`;
  $("lightbox").classList.add("open");
};
}
