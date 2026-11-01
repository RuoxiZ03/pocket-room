// Developer-drawn 32×32 pixel artwork. Every shape uses the same integer grid,
// palette and one-pixel silhouette. Normal UI text is never pixelated.
const palette={ink:'#536b7b',cream:'#fff1d9',light:'#fffaf0',blue:'#9cc5d3',shade:'#79a5b8',pink:'#dba3bb',rose:'#bd839f',green:'#9abca7',leaf:'#759d90',paper:'#edf5ee',silver:'#bdcdd0'};
const cache=new Map();
function artwork(name,options={}) {
  const pixels=Array.from({length:32},()=>Array(32).fill(null));
  const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(pixels[j]?.[i]!==undefined)pixels[j][i]=c;};
  const disk=(x,y,r,c)=>{for(let j=Math.floor(y-r);j<=y+r;j++)for(let i=Math.floor(x-r);i<=x+r;i++)if((i-x)**2+(j-y)**2<=r*r&&pixels[j]?.[i]!==undefined)pixels[j][i]=c;};
  switch(name) {
    case 'focus':
      disk(16,17,10,'rose');disk(16,16,9,'pink');disk(16,16,7,'cream');
      rect(7,4,6,4,'blue');rect(20,4,6,4,'blue');rect(5,6,3,4,'shade');rect(25,6,3,4,'shade');
      rect(15,10,2,7,'ink');rect(16,15,5,2,'ink');rect(15,8,2,2,'rose');rect(8,15,2,2,'rose');rect(22,15,2,2,'rose');rect(15,22,2,2,'rose');
      rect(8,26,3,3,'shade');rect(22,26,3,3,'shade');rect(14,2,4,2,'silver');break;
    case 'room':
      rect(6,14,20,14,'cream');rect(23,15,3,13,'silver');
      for(let i=0;i<8;i++)rect(3+i,14-i,26-i*2,2,'pink');
      rect(23,5,3,7,'rose');rect(8,17,6,6,'blue');rect(10,17,1,6,'light');rect(8,19,6,1,'light');
      rect(18,18,5,10,'shade');rect(19,19,3,9,'blue');rect(21,23,1,1,'cream');rect(5,28,23,1,'silver');break;
    case 'calendar':
      rect(5,6,22,22,'silver');rect(5,5,21,22,'cream');rect(5,6,21,6,'pink');rect(6,13,19,13,'light');
      for(const x of [10,20]){rect(x,3,2,6,'ink');rect(x,3,1,4,'paper');}
      if(Number.isInteger(options.day)&&options.day>=1&&options.day<=31) {
        const glyphs=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001010010010','111101111101111','111101111001111'];
        const digits=String(options.day),start=digits.length===1?13:8;
        [...digits].forEach((d,i)=>[...glyphs[Number(d)]].forEach((v,k)=>{if(v==='1')rect(start+i*8+(k%3)*2,15+Math.floor(k/3)*2,2,2,'shade');}));
      }else {for(let y=16;y<24;y+=4)for(let x=9;x<24;x+=5)rect(x,y,2,2,'shade');rect(14,19,4,4,'rose');rect(15,20,2,2,'pink');}break;
    case 'diary':
      rect(6,5,20,23,'silver');rect(5,4,20,23,'rose');rect(8,4,16,21,'pink');rect(8,25,16,2,'cream');rect(9,26,14,1,'silver');
      rect(6,5,2,20,'rose');rect(10,5,12,1,'light');rect(12,9,8,5,'cream');rect(14,11,4,1,'rose');rect(22,15,4,6,'rose');rect(23,17,2,2,'cream');
      if(options.bookmark){rect(19,2,4,10,'shade');rect(20,3,2,6,'blue');rect(20,10,2,2,'cream');}break;
    case 'moods':
      if(options.stage) {
        rect(7,22,18,7,'shade');rect(6,21,20,3,'blue');rect(9,25,14,3,'blue');rect(8,20,16,1,'ink');rect(14,25,4,2,'cream');
        if(options.stage==='empty'){rect(13,8,7,11,'cream');rect(14,9,5,2,'pink');rect(16,13,1,5,'leaf');rect(15,12,3,2,'pink');}
        else if(options.stage==='Seed'){rect(15,19,3,2,'cream');}
        else {
          const sprout=options.stage==='Sprout';rect(15,sprout?17:12,2,sprout?5:10,'leaf');rect(12,sprout?17:16,4,2,'green');rect(17,sprout?16:14,4,2,'green');
          if(!sprout){rect(11,12,4,2,'leaf');rect(17,11,4,2,'green');}
          if(options.stage==='Bud'){rect(14,6,5,6,'rose');rect(15,6,3,4,'pink');}
          if(options.stage==='Bloom'){disk(16,8,5,'rose');disk(13,5,3,'pink');disk(19,5,3,'pink');disk(13,10,3,'pink');disk(19,10,3,'pink');rect(15,6,3,3,'cream');}
        }break;
      }
      rect(14,11,2,11,'leaf');rect(9,17,5,2,'green');rect(10,18,4,2,'leaf');rect(16,14,5,2,'green');
      rect(10,22,12,7,'shade');rect(9,21,14,3,'blue');rect(12,25,8,3,'blue');
      disk(15,9,4,'rose');disk(12,6,3,'pink');disk(18,6,3,'pink');disk(12,11,3,'pink');disk(18,11,3,'pink');rect(14,7,3,3,'cream');break;
    case 'memories':
      rect(5,17,22,12,'shade');rect(7,9,12,14,'cream');rect(9,11,8,7,'blue');rect(11,15,6,3,'leaf');rect(10,12,2,2,'light');
      rect(17,6,10,16,'paper');rect(19,8,6,8,'pink');rect(20,12,5,4,'rose');
      rect(4,20,24,8,'blue');rect(5,20,22,2,'silver');rect(13,24,6,2,'cream');break;
    case 'shelf':
      rect(4,4,24,25,'silver');rect(6,5,20,22,'shade');
      for(const y of [6,16]){rect(8,y,3,8,'pink');rect(12,y+1,3,7,'cream');rect(16,y,3,8,'green');rect(20,y+2,3,6,'blue');rect(9,y+2,1,2,'light');}
      for(const y of [4,14,25])rect(4,y,24,2,'cream');rect(4,5,2,23,'paper');rect(26,5,2,23,'silver');break;
    case 'player':
      rect(3,9,26,19,'silver');rect(3,8,25,18,'paper');rect(4,9,23,2,'light');
      if(!options.separateDisc){disk(12,17,7,'shade');disk(12,17,6,'blue');disk(12,17,4,'paper');disk(12,17,2,'pink');rect(11,16,2,2,'ink');}
      rect(22,12,3,7,'blue');rect(23,14,1,3,'light');rect(20,22,5,2,'rose');rect(5,25,20,1,'silver');break;
    case 'player-disc':
      disk(12,17,7,'shade');disk(12,17,6,'blue');disk(12,17,4,'paper');disk(12,17,2,'pink');rect(11,16,2,2,'ink');rect(9,12,2,2,'light');break;
    case 'info':
      disk(16,16,11,'shade');disk(16,16,9,'blue');rect(15,9,3,3,'cream');rect(15,15,3,8,'cream');rect(13,22,7,2,'cream');break;
    case 'about':
      disk(16,12,10,'silver');disk(15,11,9,'cream');disk(15,11,7,'blue');
      rect(12,8,7,5,'rose');rect(13,9,5,5,'cream');rect(11,15,9,3,'pink');rect(14,21,3,6,'silver');rect(10,27,12,2,'cream');break;
    case 'backup':
      rect(10,5,12,7,'ink');rect(12,7,8,4,'blue');rect(4,12,24,16,'shade');rect(4,11,24,8,'blue');
      rect(5,12,22,2,'paper');rect(5,20,22,6,'silver');rect(13,16,6,6,'rose');rect(15,17,2,3,'cream');break;
  }
  // A consistent one-pixel outline around the union; internal details stay colored.
  const outline=Array.from({length:32},()=>Array(32).fill(null));
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(pixels[y][x]){
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(outline[y+dy]?.[x+dx]!==undefined)outline[y+dy][x+dx]='ink';
  }
  const rows=pixels.map((row,y)=>row.map((c,x)=>c||outline[y][x]));
  let svg='';
  rows.forEach((row,y)=>{for(let x=0;x<32;){const c=row[x];let end=x+1;while(end<32&&row[end]===c)end++;if(c)svg+=`<rect x="${x}" y="${y}" width="${end-x}" height="1" fill="${palette[c]}"/>`;x=end;}});
  return svg;
}
export function pixelIcon(name,options={}) {
  if(name==='project')name='room';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('class','pixel-icon');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('shape-rendering','crispEdges');
  const key=name+JSON.stringify(options);
  if(!cache.has(key))cache.set(key,artwork(name,options));
  svg.innerHTML=cache.get(key); // Only developer-owned pixels, never user content.
  if(name==='player'&&options.separateDisc){const disc=document.createElementNS('http://www.w3.org/2000/svg','g');disc.setAttribute('class','desktop-record');disc.innerHTML=artwork('player-disc');svg.append(disc);}
  return svg;
}

// Small grid ornaments share the same ink/pink/pearl palette as application art.
export function pixelDecoration(kind='star') {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 12 12');svg.setAttribute('class','pixel-ornament');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('shape-rendering','crispEdges');
  svg.innerHTML=kind==='bow'
    ? '<path fill="#b88ba8" d="M1 2h3v1h1v2h2V3h1V2h3v6H8V7H7v2h1v2H6V8H5v3H3V9h1V7H3v1H1z"/><path fill="#efc8d9" d="M2 3h2v3H2zm6 0h2v3H8z"/><rect x="5" y="5" width="2" height="2" fill="#fff1d9"/>'
    : '<path fill="#94b7c8" d="M5 0h2v3h2v2h3v2H9v2H7v3H5V9H3V7H0V5h3V3h2z"/><path fill="#fff3df" d="M5 2h2v3h3v2H7v3H5V7H2V5h3z"/>';
  return svg;
}
