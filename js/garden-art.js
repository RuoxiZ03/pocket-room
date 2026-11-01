// Original integer-grid artwork. No reference screenshots or third-party sprites.
// SVGs are decorative: native buttons own translated labels and game actions.
const ink='#49665e',cream='#fff5d9',leaf='#78a17a',light='#b4ce95';
const r=(x,y,w,h,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'"/>';
const p=(d,c)=>'<path d="'+d+'" fill="'+c+'"/>';
function svg(view,markup,kind) {
  const n=document.createElementNS('http://www.w3.org/2000/svg','svg');
  n.setAttribute('viewBox',view);n.setAttribute('class',kind);n.setAttribute('aria-hidden','true');n.setAttribute('focusable','false');n.setAttribute('shape-rendering','crispEdges');n.innerHTML=markup;return n;
}
const shades={water:'#a9cddd',nutrients:'#dfb0bf',sunlight:'#e6cb8e',moonlight:'#c5badb',stardust:'#b9ce9e'};
function sprig(x,y,mirror=false) {
  return p(mirror?'M'+x+' '+y+'h8v2h2v4h-6v-2h-4Z':'M'+x+' '+y+'h-8v2h-2v4h6v-2h4Z',ink)+r(mirror?x+2:x-8,y+1,6,2,leaf)+r(mirror?x+3:x-7,y+1,3,1,light);
}
export function resourceArt(key) {
  const c=shades[key]||shades.stardust;let a='';
  if(key==='water') a=p('M9 2h6v4h2v2h2v13h-2v1H7v-1H5V8h2V6h2Z',ink)+r(10,3,4,3,'#b4c0aa')+r(8,7,8,3,cream)+r(6,10,12,10,'#d8eee3')+r(7,13,10,7,c)+r(8,10,2,7,cream)+r(9,19,7,1,'#749dae')+r(11,11,3,2,'#7ba9c0');
  if(key==='nutrients') a=p('M7 2h10v3h-2v2h4v14h-2v1H5V7h4V5H7Z',ink)+r(8,3,8,2,'#c38e93')+r(7,8,10,12,'#dec79c')+r(7,8,10,2,cream)+r(8,12,8,6,cream)+r(11,12,2,7,leaf)+r(8,13,4,2,leaf)+r(13,11,3,3,light)+r(15,18,2,2,'#bc9b78');
  if(key==='sunlight') a=r(11,1,2,3,ink)+r(11,20,2,3,ink)+r(1,11,3,2,ink)+r(20,11,3,2,ink)+r(4,4,2,2,ink)+r(18,4,2,2,ink)+r(4,18,2,2,ink)+r(18,18,2,2,ink)+p('M8 5h8v2h3v3h1v6h-3v3H7v-2H5V8h3Z',ink)+r(8,7,8,10,c)+r(6,10,12,6,c)+r(9,8,5,2,cream)+r(8,10,2,3,cream)+r(14,14,3,2,'#cda568');
  if(key==='moonlight') a=p('M11 2h7v2h-4v3h-2v7h2v3h6v2h-3v2H8v-2H5v-3H3V8h2V5h3V3h3Z',ink)+p('M9 5h3v3h-2v7h2v3h4v1H8v-3H6V8h3Z',c)+r(7,7,2,4,cream)+r(18,6,2,2,'#b6caab')+r(20,10,2,2,c);
  if(key==='stardust') a=r(8,2,8,3,ink)+r(9,3,6,2,'#bc9879')+r(9,5,6,2,ink)+p('M7 7h10v2h2v12h-2v1H7v-1H5V9h2Z',ink)+r(7,9,10,11,'#dce6ce')+r(7,9,2,7,cream)+r(8,17,8,3,c)+p('M12 10h2v3h3v2h-3v3h-2v-3H9v-2h3Z','#bd9d6c')+r(12,12,2,3,cream)+r(19,3,2,2,'#d9b5c7')+r(2,14,2,2,c);
  return svg('0 0 24 24',a,'resource-pixel');
}
export function seedArt() {
  return svg('0 0 24 32',p('M4 1h16v2h2v27H2V3h2Z',ink)+r(4,3,16,25,'#e7cda9')+r(4,3,16,4,'#d39daa')+r(5,8,14,14,cream)+r(11,15,2,7,leaf)+r(7,17,4,2,leaf)+r(13,16,4,2,leaf)+r(9,10,6,7,'#c3819e')+r(7,12,10,3,'#e2b4c5')+r(10,12,4,3,'#edd390')+r(6,25,12,1,'#9b7b62')+r(8,27,8,1,'#9b7b62'),'seed-pixel');
}
export function plantArt(points=0,composition=[]) {
  // Colour alone reflects resource history; every feeling gets equal detail.
  const c=shades[composition[0]]||'#dfb0bf',accent=shades[composition.at(-1)]||cream;
  let a=r(9,62,30,2,'#90ac95')+p('M10 48h28v5h-2v7h-3v2H15v-2h-3v-7h-2Z',ink)+r(13,50,22,9,'#d4a292')+r(14,51,3,7,'#edc8ab')+r(32,51,3,8,'#ad7c75')+r(17,59,15,1,'#be8b7d')+r(19,53,10,5,cream)+r(23,54,2,3,'#83a283')+r(8,45,32,6,ink)+r(10,46,28,2,'#f1cdb0')+r(10,49,28,1,'#bb8b7d')+r(11,43,26,2,'#795b45')+r(13,43,4,1,'#b5926b')+r(29,43,3,1,'#b5926b');
  if(points===0) a+=r(22,40,5,3,ink)+r(23,40,3,2,'#e8cb8d')+r(23,40,1,1,cream);
  if(points>0) {
    const top=points===1?34:points===2?27:20;
    a+=r(23,top,3,43-top,ink)+r(24,top,1,43-top,leaf)+sprig(23,35)+sprig(26,33,true);
  }
  if(points>=2) a+=sprig(23,28)+sprig(26,25,true)+r(17,32,4,2,light);
  if(points>=3) a+=sprig(23,22)+sprig(26,21,true);
  if(points===3||points===4) {
    const y=points===3?14:10;
    a+=p('M22 '+y+'h6v2h3v9h-3v3h-6v-3h-3v-9h3Z',ink)+r(22,y+2,6,10,c)+r(22,y+3,2,5,cream)+r(23,y+12,4,2,leaf);
    if(points===4)a+=r(28,y+4,2,7,accent);
  }
  if(points>=5) a+=p('M20 3h8v2h4v4h4v4h-2v4h2v4h-4v4h-4v2h-8v-2h-4v-4h-4v-4h2v-4h-2V9h4V5h4Z',ink)+r(20,5,8,20,c)+r(16,9,16,12,c)+r(14,13,20,4,c)+r(18,7,12,16,c)+r(18,8,3,3,accent)+r(28,19,3,3,accent)+r(20,12,8,8,ink)+r(21,13,6,6,'#e5c378')+r(22,14,2,2,cream)+r(25,16,2,2,'#ba9564');
  return svg('0 0 48 64',a,'plant-pixel');
}
export function shovelArt() {
  return svg('0 0 12 24',r(4,1,5,4,ink)+r(5,2,3,2,cream)+r(5,5,3,10,'#a97f5e')+r(6,5,1,10,'#ddbc91')+p('M2 15h9v6H9v2H5v-2H2Z',ink)+r(3,16,7,4,'#a9c8c2')+r(5,20,4,2,'#86a8a0')+r(4,16,2,3,cream),'shovel-pixel');
}
export function greenhouseArt() {
  const frame='#638a7d',edge='#3f625a',glass='#cce4dc',glint='#f5f4d8',wood='#b48b68';
  let a=p('M8 138h304v16h-6v4H14v-4H8Z','#6e5947')+r(12,140,296,13,'#9c7958')+r(18,148,284,7,'#826448')+r(12,136,296,5,'#728c60')+r(16,132,288,5,'#b7c79a');
  // Soil cross-section: discrete stones and roots, never a real texture.
  for(const [x,y] of [[26,146],[56,143],[88,150],[134,145],[176,151],[218,144],[270,149],[292,143]])a+=r(x,y,5,2,'#c29c72')+r(x+2,y+2,2,1,'#71563e');
  a+=p('M20 127V48h8V36h16V26h28V18h40V10h96v8h40v8h28v10h16v12h8v79Z',edge)+p('M24 126V50h8V38h16V30h28v-8h40v-8h88v8h40v8h28v8h16v12h8v76Z',glass);
  a+=r(32,60,256,66,'#c0d9c7')+r(36,65,248,58,'#d8e6cd')+r(44,78,232,45,'#c9dcb7');
  // Distant foliage stays at the edges, leaving the three real plots clear.
  for(const [x,y,w,h] of [[34,96,12,28],[44,106,12,18],[262,100,14,24],[274,88,10,36]])a+=r(x,y,w,h,'#9aba8c')+r(x+2,y+4,w-4,3,'#bad09e');
  a+=p('M40 42h6v-4h24v4H54v8h-6v10h-6v20h-6V54h4Z',glint)+p('M106 22h10v8h-6v10h-6v18h-6v18h-6V48h6V32h8Z',glint)+p('M230 30h12v8h10v10h10v8h-10v-6h-12V40h-10Z',glint)+r(270,58,5,23,glint)+r(270,86,5,6,glint);
  a+=r(22,56,5,75,edge)+r(23,57,2,72,'#a8c6b5')+r(293,56,5,75,edge)+r(294,57,2,72,'#b9d0bd')+r(26,60,268,4,edge)+r(28,60,264,1,'#b1cdbd');
  a+=p('M110 26h5v12h5v16h5v74h-5V54h-5V40h-5Z',frame)+p('M208 26h5v14h-5v14h-5v74h-5V54h5V38h5Z',frame)+r(24,124,272,6,edge)+r(28,124,264,2,'#bed2b8');
  for(const x of [22,119,201,293])a+=r(x-1,58,7,7,'#936f55')+r(x,59,5,2,'#d4ac7c');
  a+=r(148,3,26,5,edge)+r(151,1,20,3,frame)+r(152,6,18,6,frame)+r(154,6,3,5,'#c2d7bf')+r(148,12,26,3,'#b88c65');
  for(const [x,y] of [[34,47],[39,60],[34,74],[280,48],[275,64]])a+=r(x,y,2,10,leaf)+sprig(x,y+2)+sprig(x+2,y+7,true);
  a+=r(38,97,30,3,edge)+r(40,97,26,1,'#dbc39b')+r(44,86,12,9,'#c3917c')+r(42,84,16,3,'#e5b79a')+r(46,78,3,6,leaf)+sprig(47,76)+sprig(49,79,true);
  a+=r(34,130,252,5,edge)+r(36,130,248,2,'#e6cc9e')+r(36,135,248,10,wood)+r(38,136,244,2,'#cda881')+r(38,145,5,8,'#8d6c52')+r(277,145,5,8,'#8d6c52');
  a+=r(18,129,5,3,'#dee2be')+r(299,131,6,3,'#e8d9ac')+r(13,134,3,2,'#e7b9bd')+r(304,137,3,2,'#e7b9bd');
  return svg('0 0 320 160',a,'greenhouse-art');
}
