import { msg } from './i18n.js';
import { el,text,button,externalLink } from './ui.js';
import { pixelIcon } from './pixel-icons.js';

// Presentation only: the original hobbies string remains intact in storage and
// the editor. Spaces inside a hobby (e.g. paper crafts) are never separators.
export const hobbyLabels=value=>value.split(/[\n,，;；、]+/u).map(s=>s.trim()).filter(Boolean);

export function profilePage(ctx,portrait,edit) {
  const p=ctx.world.profile,hobbies=hobbyLabels(p.hobbies);
  const hasWords=[p.bio,p.hobbies,p.learning,p.reading,p.listening].some(s=>s.trim())||p.links.length;
  const name=p.nickname||msg('profile_extra.dreamer');
  return el('article',{class:'profile-file'},
    el('div',{class:'profile-file-tab'},pixelIcon('about'),text('span',msg('personal.personalFileLocalOnly'))),
    el('header',{class:'profile-file-header'},el('div',{class:'profile-avatar-frame'},portrait(ctx,'about-avatar')),
      el('div',{class:'profile-identity'},el('div',{class:'profile-name-row'},text('h3',name),button(msg('personal.editProfile'),edit,'primary')),
        p.bio.trim()?text('p',p.bio,'profile-bio'):null)),
    !hasWords?text('p',msg('profileCard.begin'),'profile-start-note'):null,
    el('section',{class:'profile-current'},text('h3',msg('personal.currently')),
      el('div',{class:'profile-current-grid'},[['learning','diary'],['reading','shelf'],['listening','player']].map(([key,art])=>
        el('section',{class:'profile-current-item'+(!p[key].trim()?' is-empty':'')},
          el('header',{},pixelIcon(art),text('h4',msg('currently.'+key))),p[key].trim()?text('p',p[key]):null)))),
    hobbies.length?el('section',{class:'profile-interests'},text('h3',msg('personal.littleInterests')),
      el('ul',{class:'profile-hobby-tags'},hobbies.map(label=>text('li',label)))):null,
    p.links.length?el('section',{class:'profile-elsewhere'},text('h3',msg('personal.elsewhere')),
      el('ul',{class:'profile-links'},p.links.map(link=>el('li',{},externalLink(link.label,link.url))))):null,
    text('p',msg('personal.savedInThisBrowserNoAccountAutomaticSharingOr'),'profile-storage-note'));
}
