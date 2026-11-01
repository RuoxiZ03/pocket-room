// Original shelf objects, on the same integer grid/palette as the greenhouse.
// No personal titles or cover images are rasterized into these decorative SVGs.
const ink='#49665e',paper='#fff5df',wood='#b99571';
const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const p=(d,c)=>`<path d="${d}" fill="${c}"/>`;
export function shelfArt(type,id='') {
  const colors=[['#d6a7b9','#ab718d'],['#a9cbd0','#71999d'],['#bacb9c','#879d78'],['#e4cb9c','#b5966d']];
  let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;
  const [main,shade]=colors[hash%colors.length];
  let art='';
  if(type==='Book') {
    art=p('M7 3h32v3h3v54H9v-2H6V6h1Z',ink)+r(8,5,30,52,main)+r(8,5,5,52,shade)+r(14,6,2,50,paper)+r(16,7,20,2,'#f5e3d3')+r(16,13,20,25,shade)+r(18,15,16,21,paper)+r(23,19,6,2,shade)+r(22,21,8,9,main)+r(24,23,4,5,paper)+r(18,44,16,2,shade)+r(21,48,10,1,shade)+r(10,57,29,3,paper)+r(12,59,25,1,'#cabd9e')+r(32,55,4,8,shade)+r(32,55,1,5,main);
  } else if(type==='Movie') {
    art=p('M7 8h32v2h2v49H7V8Z',ink)+r(9,10,29,47,main)+r(9,10,4,47,shade)+r(15,12,21,3,paper)+r(15,18,21,25,ink)+r(17,20,17,21,'#d6e5d7')+p('M23 22h6v2h3v4h2v6h-2v4h-3v2h-6v-2h-3v-4h-2v-6h2v-4h3Z',shade)+r(23,26,6,10,main)+r(21,28,10,6,main)+r(24,29,4,4,paper)+r(17,47,17,2,paper)+r(19,51,13,2,shade)+r(12,58,26,2,'#b6c9b7');
  } else if(type==='Website') {
    art=p('M3 19h40v2h2v30H3Z',ink)+r(5,21,38,27,main)+r(5,21,38,5,shade)+r(7,22,2,2,paper)+r(11,22,2,2,paper)+r(15,22,2,2,paper)+r(7,28,34,18,paper)+r(10,31,12,12,'#b7cfac')+r(12,33,8,8,'#dce6c5')+r(25,31,12,2,shade)+r(25,36,10,2,main)+r(25,41,12,2,main)+r(21,51,6,6,ink)+r(22,51,3,5,main)+r(15,57,18,3,ink)+r(17,57,14,1,paper);
  } else if(type==='Add') {
    art=p('M5 12h36v2h2v44H5Z','#8da58a')+r(7,14,34,42,'#e0e6cc')+r(9,16,30,38,paper)+r(21,26,6,20,'#8da58a')+r(14,33,20,6,'#8da58a')+r(23,28,2,16,'#b2c497')+r(16,35,16,2,'#b2c497');
  } else {
    art=p('M8 24h32v3h4v29h-3v4H7v-4H4V27h4Z',ink)+r(6,29,36,25,main)+r(8,54,32,4,shade)+r(6,29,36,5,paper)+r(9,36,3,15,'#f0dfce')+r(23,29,4,27,shade)+r(19,40,12,7,paper)+r(23,42,4,3,wood)+p('M14 16h8v4h4v-4h8v9H14Z',ink)+r(16,18,4,5,shade)+r(28,18,4,5,shade)+r(22,22,4,6,paper);
  }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 48 64');svg.setAttribute('class','shelf-object-art');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('shape-rendering','crispEdges');svg.innerHTML=art;return svg;
}
