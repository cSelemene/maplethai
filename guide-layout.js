/* Keep sticky guide controls below the real header at every viewport size. */
const header=document.querySelector('body.maple-guide > header');
if(header){const update=()=>document.documentElement.style.setProperty('--guide-header-height',Math.ceil(header.getBoundingClientRect().height)+'px');update();if(typeof ResizeObserver!=='undefined')new ResizeObserver(update).observe(header);window.addEventListener('resize',update,{passive:true});}
