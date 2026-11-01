import { languageEntry } from './language-controls.js';
import { msg, setLocalizedAttribute } from "./i18n.js";
import { motionReduced } from './preferences.js';
import { el,text,routeLink,sections } from './ui.js';
import { pixelIcon,pixelDecoration } from './pixel-icons.js';
import { desktopAtmosphere } from './desktop-art.js';
export function desktopPage(ctx) {
  const primary=[['room',msg('modules.room')],...sections.map(([key,label])=>[key,label])];
  const entry=(key,label)=>{
    const a=routeLink('',key,{from:'desktop'},'desktop-shortcut');
    a.dataset.entry=key;setLocalizedAttribute(a, 'aria-label', label);a.style.setProperty('--entry-index',primary.findIndex(([id])=>id===key));
    const status=text('span','','desktop-entry-state');status.id='desktop-state-'+key;
    const description=text('span','','desktop-state-sr');description.id='desktop-description-'+key;
    a.setAttribute('aria-describedby',status.id+' '+description.id);
    a.append(el('span',{class:'desktop-icon-art'},pixelIcon(key,key==='player'?{separateDisc:true}:{})),text('span',label,'desktop-entry-label'),status,description);
    return a;
  };
  const utility=(key,label,art=key)=>{const a=routeLink('',key,{from:'desktop'},'desktop-setting');setLocalizedAttribute(a,'aria-label',label);a.append(pixelIcon(art),text('span',label,key==='project'?'desktop-utility-full':'desktop-utility-label'));if(key==='project')a.append(text('span',msg('i18n.projectShort'),'desktop-utility-short'));return a;};
  const music=routeLink('','player',{from:'desktop'},'desktop-music');music.append(pixelIcon('player'),el('span',{'data-music-summary':''},msg("desktop.chooseMusic")));
  const focus=routeLink('','focus',{from:'desktop'},'focus-indicator');focus.hidden=true;focus.append(pixelIcon('focus'),el('span',{'data-focus-summary':''}));
  const bar=el('footer',{class:'desktop-bottom','aria-label':msg("desktop.desktopStatusBar")},
    el('div',{class:'desktop-date-group'},pixelIcon('calendar'),el('time',{class:'desktop-date'})),
    el('nav',{class:'desktop-live','aria-label':msg("desktop.musicAndFocusStatus")},music,focus),
    el('nav',{class:'desktop-utilities','aria-label':msg("desktop.projectAndSettings")},utility('backup',msg('i18n.settings')),utility('project',msg('modules.project'),'info'),languageEntry()));
  const root=el('div',{class:'personal-desktop'},desktopAtmosphere(),
    el('header',{class:'desktop-identity'},el('div',{class:'desktop-brand'},
      el('div',{class:'brand-line'},el('h1',{},'Pocket Room'),el('span',{class:'title-jewels','aria-hidden':'true'},pixelDecoration('star'),pixelDecoration('bow'))),
      el('div',{class:'brand-rule','aria-hidden':'true'},pixelDecoration('star')),
      text('p',msg("desktop.aLittleRoomForYourEveryday")))),
    el('nav',{class:'desktop-icons','aria-label':msg("desktop.personalDesktop")},primary.map(([key,label])=>entry(key,label))),bar);
  if(motionReduced())root.classList.add('desktop-arrived');
  else {
    const finished=event=>{if(event.animationName==='shortcut-arrive'&&event.target.style.getPropertyValue('--entry-index')===String(primary.length-1)){root.classList.add('desktop-arrived');root.removeEventListener('animationend',finished);}};
    root.addEventListener('animationend',finished);
  }
  // Reserve the measured status-bar footprint for the desktop, app windows and
  // existing music panel. One observer for this persistent desktop, no timer.
  const size=new ResizeObserver(()=>{
    if(!bar.isConnected||!bar.offsetHeight)return;
    const bottom=parseFloat(getComputedStyle(bar).bottom)||0;
    document.documentElement.style.setProperty('--desktop-status-space',Math.ceil(bar.offsetHeight+bottom+12)+'px');
  });size.observe(bar);root.dispose=()=>size.disconnect();
  return root;
}
