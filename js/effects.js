import { motionReduced } from './preferences.js';
import { pixelDecoration } from './pixel-icons.js';
// One delegated effect for the entire site; shortcuts use grid stars in this same
// layer, so a click never launches both an old and a new particle system.
export function initializeClickStars() {
  if(document.getElementById('sparkle-layer'))return;
  const layer=document.createElement('div');layer.id='sparkle-layer';
  layer.setAttribute('popover','manual');layer.setAttribute('aria-hidden','true');
  document.body.append(layer);
  let lastTarget=null,lastTime=0;
  document.addEventListener('click',event=>{
    if(motionReduced())return;
    const target=event.target.closest?.('a,button')||event.target;
    const now=performance.now();if(target===lastTarget&&now-lastTime<180)return;
    lastTarget=target;lastTime=now;
    const shortcut=target.closest?.('.desktop-shortcut,.desktop-setting');
    const bounds=(shortcut?.querySelector('.desktop-icon-art')||target).getBoundingClientRect();
    const x=shortcut||event.detail===0?bounds.left+bounds.width/2:event.clientX;
    const y=shortcut||event.detail===0?bounds.top+bounds.height/2:event.clientY;
    if(typeof layer.showPopover==='function'){try{layer.hidePopover();layer.showPopover();}catch{}}
    while(layer.childElementCount>18)layer.firstElementChild.remove();
    for(let i=0;i<6;i++){
      const star=pixelDecoration('star');star.classList.add('pixel-burst');
      star.style.left=`${x}px`;star.style.top=`${y}px`;
      star.style.setProperty('--dx',`${Math.cos(i*Math.PI/3)*39}px`);
      star.style.setProperty('--dy',`${Math.sin(i*Math.PI/3)*35-12}px`);
      star.style.setProperty('--burst-delay',`${i*8}ms`);
      layer.append(star);setTimeout(()=>star.remove(),500);
    }
  });
}
