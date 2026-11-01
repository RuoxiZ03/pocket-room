import { motionReduced } from './preferences.js';
// Navigation never waits for this animation. A close copy is inert and has no
// IDs, audio or live event listeners; only one copy can exist at a time.
export function animateWindow(frame, opening, source) {
  if (motionReduced() || !frame.getClientRects().length) return;
  const r=frame.getBoundingClientRect();
  const point=source&&Number.isFinite(source.x)&&Number.isFinite(source.y)?source:null;
  let visual=frame;
  if(!opening) {
    document.querySelector('.window-ghost')?.remove();
    visual=frame.cloneNode(true);visual.className='window-ghost'+(frame.classList.contains('pixel-ui')?' pixel-ui':'');visual.inert=true;visual.setAttribute('aria-hidden','true');
    visual.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    visual.querySelectorAll('audio').forEach(node=>node.remove());
    const originals=frame.querySelectorAll('canvas');
    visual.querySelectorAll('canvas').forEach((copy,i)=>copy.getContext('2d').drawImage(originals[i],0,0));
    Object.assign(visual.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    document.body.append(visual);setTimeout(()=>visual.remove(),320);
  } else frame.getAnimations().forEach(animation=>animation.cancel());
  visual.style.transformOrigin=point?`${point.x-r.left}px ${point.y-r.top}px`:'50% 50%';
  const small=point?{opacity:.25,scale:'.975'}:{opacity:0};
  const full=point?{opacity:1,scale:'1'}:{opacity:1};
  const animation=visual.animate(opening?[small,full]:[full,small],{duration:opening?210:160,easing:'cubic-bezier(.2,.7,.3,1)'});
  if(!opening)animation.finished.then(()=>visual.remove(),()=>visual.remove());
}
