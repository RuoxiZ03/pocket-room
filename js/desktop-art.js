import { el } from './ui.js';
import { pixelDecoration } from './pixel-icons.js';
// Sparse, independent edge ornaments drawn on an integer pixel grid.
function branch(shadow=false) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 96 160');svg.setAttribute('shape-rendering','crispEdges');svg.setAttribute('aria-hidden','true');
  const stem=shadow?'#81aebb':'#a0bfcd',leaf=shadow?'#81aebb':'#b7d0d8',pink=shadow?'#81aebb':'#efc5d6';
  let art='';const r=(x,y,w,h,c)=>{art+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;};
  for(let i=0;i<30;i++)r(94-i*2,i*4,3,6,stem);
  for(const [x,y,dir] of [[78,18,-1],[70,38,1],[58,60,-1],[50,78,1],[38,100,-1]]) {
    r(x,y,dir<0?3:12,3,stem);r(x+(dir<0?-12:5),y-5,10,5,leaf);r(x+(dir<0?-16:11),y-3,8,5,leaf);
  }
  for(const [x,y] of [[64,28],[76,64],[40,83],[34,126]]) {
    r(x,y-8,2,9,stem);r(x-4,y,6,5,pink);r(x+2,y+2,5,6,pink);r(x-3,y+6,7,4,pink);r(x,y+3,3,3,'#fff4e9');
  }
  svg.innerHTML=art;return svg;
}
export function desktopAtmosphere() {
  const projection=document.createElementNS('http://www.w3.org/2000/svg','svg');projection.setAttribute('viewBox','0 0 1200 1000');projection.setAttribute('preserveAspectRatio','none');projection.setAttribute('class','desktop-window-shadow');
  projection.innerHTML='<path d="M1010-60v745L-100 1100M1175-60v825L340 1110M910 350l360-130M910 570l360-130M-100 995l1390-360" fill="none" stroke="#8db9c6" stroke-width="15"/>';
  return el('div',{class:'desktop-atmosphere','aria-hidden':'true'},el('div',{class:'desktop-window-light'}),projection,el('div',{class:'desktop-sill'}),
    el('div',{class:'desktop-blossoms blossom-top'},branch()),el('div',{class:'desktop-blossoms blossom-bottom'},branch(true)),
    el('div',{class:'desktop-sparks'},Array.from({length:4},(_,i)=>{const star=pixelDecoration('star');star.style.setProperty('--i',i);return star;})));
}
