import { msg, setLocalizedAttribute } from "./i18n.js";
import { el, text, button, routeLink } from './ui.js';
import { mountRoom } from './room-scene.js';

export function roomPage(ctx) {
  const canvas=el('canvas',{class:'toy-room-canvas','aria-hidden':'true'});
  const targets={};
  const object=(id,label)=>{
    const hit=button('',()=>{},`room-object room-object-${id}`);
    setLocalizedAttribute(hit, 'aria-label', label);
    const caption=text('span',label,'room-object-label');caption.hidden=true;
    targets[id]={hit,label:caption};
    return [hit,caption];
  };
  const stage=el('div',{class:'toy-room-stage','aria-label':msg("room.interactiveBedroom")},canvas,
    ...object('computer',msg('room_extra.computer')),...object('diary',msg('room_extra.diary')));
  const root=el('section',{class:'interactive-room'},stage,
    el('div',{class:'toy-status'},text('span',msg("room.chooseTheComputerOrTheDiary")),text('span',msg("room.clickTapTabEnter"))),
    el('nav',{class:'room-fallback','aria-label':msg("room.roomTextNavigation")},
      routeLink(msg("room.myCalendar"),'calendar',{from:'room'},'pill'),routeLink(msg("room.littleDiary"),'diary',{from:'room'},'pill')));
  let dispose=()=>{};
  const frame=requestAnimationFrame(()=>{
    if(!root.isConnected)return;
    dispose=mountRoom(canvas,targets,id=>{const r=targets[id].hit.getBoundingClientRect();ctx.openApp(id==='computer'?'calendar':'diary','room',{x:r.left+r.width/2,y:r.top+r.height/2});});
  });
  root.dispose=()=>{cancelAnimationFrame(frame);dispose();};
  return root;
}
