import { motionReduced } from './preferences.js';
import { text } from './ui.js';
import { msg } from './i18n.js';
export function enterContent(section, previous, previousMonth) {
  if(motionReduced())return;
  // Diary owns its short page-edge feedback; writing surfaces never animate.
  if(section==='calendar') {
    const sheet=document.querySelector('.calendar-sheet');
    if(previous==='calendar'&&previousMonth&&sheet?.dataset.month!==previousMonth)
      sheet.querySelector('.calendar')?.animate([{opacity:.45,transform:'translateX(5px)'},{opacity:1,transform:'translateX(0)'}],{duration:180,easing:'ease-out'});
  }
}
export function featureFeedback(kind, target) {
  if(kind==='task') {
    if(!motionReduced())target?.animate([{opacity:.55,transform:'scale(.85)'},{opacity:1,transform:'scale(1.12)',offset:.65},{opacity:1,transform:'scale(1)'}],{duration:210});
    return;
  }
  if(kind==='mood') {
    const flower=[...document.querySelectorAll('.garden-pot')].find(node=>node.dataset.date===target)?.querySelector('.flower');
    if(flower&&!motionReduced())flower.animate([{opacity:.2,transform:'translateY(5px) scale(.65)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:300,easing:'ease-out'});
    return;
  }
  if(kind==='profile') {
    const card=document.querySelector('.profile-file');if(!card)return;
    card.querySelector('.save-flash')?.remove();
    const status=text('span',msg('personal.profileSaved'),'save-flash');status.setAttribute('role','status');card.append(status);
    if(!motionReduced())status.animate([{opacity:.4,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:200});
    setTimeout(()=>status.remove(),1600);
  }
}
