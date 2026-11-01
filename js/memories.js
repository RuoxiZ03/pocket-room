import { msg,dateMessage,setLocalizedText } from './i18n.js';
import { today,validDate } from './model.js';
import { el,text,button,toolbar,routeLink,openEditor,closeEditor,confirmAction,notify } from './ui.js';
import { arrowButton } from './pixel-ui.js';
import { motionReduced } from './preferences.js';
import { memoryPhoto,thumbnailQueue } from './memory-media.js';

export function memoryBoxArt() {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 48 40');svg.setAttribute('class','memory-box-art');svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<g shape-rendering="crispEdges" stroke="#49665e" stroke-width="2"><path fill="#ddb1c0" d="M5 13V7h4V5h30v2h4v6z"/><path fill="#fff9e6" d="M11 7V1h17v18H11z"/><path fill="#c4dbd0" d="M15 5h9v7h-9z" stroke="none"/><path fill="#fff9e6" d="M26 10V4h14v17H26z"/><path fill="#dfb0bf" d="M29 7h8v7h-8z" stroke="none"/><path fill="#bdd5ce" d="M4 14h40v20h-3v3H7v-3H4z"/><path fill="#d9e8d9" d="M2 13h44v7H2z"/><path fill="#fff5df" d="M17 24h14v6H17z"/><path d="M7 34h34M7 21v10" fill="none" stroke="#8ca696"/></g>';
  return svg;
}
function albumRoute() {
  const params=new URLSearchParams(location.hash.split('?')[1]||'');params.delete('id');params.delete('new');
  return '#/memories'+(params.size?'?'+params:'');
}
// Save completion uses the existing protected editor and canonical ID route.
// Returning false keeps the common submit handler from closing the new viewer.
export async function revealSavedMemory(ctx,record,edit) {
  if(document.body.dataset.app!=='memories')return;
  await closeEditor(true);
  const params=new URLSearchParams(location.hash.split('?')[1]||'');params.delete('new');params.set('id',record.id);
  if(params.has('date'))params.set('date',record.date);
  const href='#/memories?'+params;
  if(location.hash!==href)location.replace(href);
  else memoryDetails(ctx,record,edit);
}
export function memoryDetails(ctx,record,edit,source=null) {
  let index=0,back=false,photo=null,disposed=false,editing=false;
  const view=document.getElementById('view'),scroll=view?.scrollTop||0;
  const face=el('div',{class:'memory-face'}),number=text('span','','memory-position');
  number.setAttribute('role','status');
  const prev=arrowButton(msg('memoryBox.previous'),()=>show(index-1),'previous');
  const next=arrowButton(msg('memoryBox.next'),()=>show(index+1));
  const flip=button(msg('journal.showDateNotes'),()=>{back=!back;paint(true);},'px-tab');
  flip.setAttribute('aria-pressed','false');
  const body=openEditor(msg('modules.memories'),[face,el('footer',{class:'memory-viewer-controls'},toolbar(prev,number,next,flip),button(msg('memoryBox.return'),()=>closeEditor(),'memory-return'))]);
  body.classList.add('memory-viewer');
  const stage=el('div',{class:'memory-front-page'}),notes=el('article',{class:'memory-notes',hidden:true,tabindex:0},
    text('time',dateMessage(record.date),'memory-date'),text('h3',record.title),text('p',record.body||msg('journal.noNoteForThisMemory'),'memory-prose'),
    toolbar(button(msg('common.edit'),()=>{editing=true;edit(record.date,record);}),button(msg('common.delete'),async()=>{
      if(!await confirmAction(msg('journal.deleteThisEntry'),msg('journal.andItsUnsharedPhotosWillBeRemovedThisCannot',{p1:record.title})))return;
      await ctx.remove('memories',record.id);await closeEditor(true);notify(msg('memoryBox.deleted'));
      if(new URLSearchParams(location.hash.split('?')[1]||'').has('id'))location.replace(albumRoute());
      else document.querySelector('.memory-add')?.focus({preventScroll:true});
    }),routeLink(msg('common.openThisDay'),'calendar',{date:record.date,...(new URLSearchParams(location.hash.split('?')[1]||'').has('from')?{from:new URLSearchParams(location.hash.split('?')[1]).get('from')}:{})},'pill')));
  face.append(stage,notes);
  function paint(animate=false) {
    stage.hidden=back;notes.hidden=!back;
    setLocalizedText(flip,msg(back?'journal.showPhoto':'journal.showDateNotes'));flip.setAttribute('aria-pressed',String(back));
    if(animate&&!motionReduced()&&!document.hidden)(back?notes:stage).animate([{opacity:.35,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:170,easing:'ease-out'});
  }
  function show(wanted) {
    if(wanted<0||wanted>=record.photos.length)return;
    index=wanted;photo?.dispose();photo=memoryPhoto(record.photos[index],record.title);
    stage.replaceChildren(photo.node,text('p',record.title,'memory-front-title'),text('time',dateMessage(record.date),'memory-date'));
    setLocalizedText(number,msg('memoryBox.position',{number:index+1,count:record.photos.length}));
    prev.disabled=index===0;next.disabled=index===record.photos.length-1;photo.load();
  }
  function returnAnimation(closingPhoto) {
    if(editing||motionReduced()||document.hidden||!location.hash.startsWith('#/memories')||!source?.isConnected||!closingPhoto.img.src||closingPhoto.img.hidden){closingPhoto.dispose();return;}
    const start=face.getBoundingClientRect(),end=source.getBoundingClientRect();
    const ghost=el('div',{class:'memory-return-ghost','aria-hidden':'true'},closingPhoto.img.cloneNode());
    Object.assign(ghost.style,{left:start.left+'px',top:start.top+'px',width:start.width+'px',height:start.height+'px'});document.body.append(ghost);
    const animation=ghost.animate([{opacity:.7,transform:'none'},{opacity:0,transform:`translate(${end.left-start.left}px,${end.top-start.top}px) scale(${Math.min(1,end.width/start.width)})`}],{duration:180,easing:'ease-in',fill:'forwards'});
    animation.finished.catch(()=>{}).finally(()=>{ghost.remove();closingPhoto.dispose();});
  }
  body.dispose=()=>{
    if(disposed)return;disposed=true;
    if(photo)returnAnimation(photo);
    if(view)view.scrollTop=scroll;
    if(!editing&&source?.isConnected)source.focus({preventScroll:true});
  };
  show(0);paint();
  if(!motionReduced()&&!document.hidden){
    const start=source?.getBoundingClientRect(),end=face.getBoundingClientRect();
    face.style.transformOrigin='top left';
    face.animate([{opacity:.25,transform:start?`translate(${start.left-end.left}px,${start.top-end.top}px) scale(${Math.min(1,start.width/end.width)})`:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
  }
  flip.focus();
}
export function memoryPage(ctx,params,edit) {
  const date=validDate(params.get('date'))?params.get('date'):'';
  const state=ctx.memoryView||(ctx.memoryView={query:'',date,scroll:0});
  if(state.routeDate!==date){state.date=date;state.query='';state.routeDate=date;}
  const root=el('div',{class:'memory-album'}),list=el('div',{class:'memory-tray'}),count=text('span','','memory-count');
  const search=el('input',{type:'search',value:state.query,maxlength:150,placeholder:msg('journal.searchTitlesOrDescriptions'),'aria-label':msg('journal.searchTitlesOrDescriptions')});
  const day=el('input',{type:'date',value:state.date,min:'0100-01-01',max:'9999-12-31','aria-label':msg('common.filterByDate')});
  let queue,frame=0;
  const add=button(msg('journal.addAMemory'),()=>edit(state.date||today()),'primary memory-add');
  function clear(){state.query=state.date='';search.value=day.value='';render();(tools.open?search:add).focus();}
  const tools=el('details',{class:'memory-tools',open:state.query?'':null},text('summary',msg('memoryBox.find')),toolbar(search,day,button(msg('common.clearFilters'),clear)));
  function render() {
    queue?.dispose();queue=thumbnailQueue();
    const q=state.query.trim().toLowerCase();
    const records=ctx.world.memories.filter(r=>(!state.date||r.date===state.date)&&`${r.title} ${r.body}`.toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
    setLocalizedText(count,msg('memoryBox.count',{count:records.reduce((n,r)=>n+r.photos.length,0)}));
    list.replaceChildren(...records.map(record=>{
      const photo=memoryPhoto(record.photos[0],record.title,true);
      const card=el('article',{class:'memory-print'}),mount=el('div',{class:'memory-print-frame'},photo.node);
      const open=button('',()=>memoryDetails(ctx,record,edit,open),'memory-pickup');
      // Image errors have separate Retry/Restore controls, never nested buttons.
      setLocalizedText(open,msg('memoryBox.takeOut',{title:record.title}));
      mount.append(open);card.append(mount,el('div',{class:'memory-caption'},text('time',dateMessage(record.date)),text('h3',record.title)));
      queue.add(photo);return card;
    }));
    if(!records.length)list.append(el('div',{class:'memory-empty'},ctx.world.memories.length?null:memoryBoxArt(),text('p',msg(ctx.world.memories.length?'memoryBox.noResults':'memoryBox.empty')),
      button(msg(ctx.world.memories.length?'common.clearFilters':'journal.addAMemory'),ctx.world.memories.length?clear:()=>edit(state.date||today()),'primary')));
  }
  search.addEventListener('input',()=>{state.query=search.value;render();});day.addEventListener('change',()=>{state.date=validDate(day.value)?day.value:'';render();});
  root.append(el('header',{class:'memory-album-header'},text('h3',msg('memoryBox.album')),count,add),tools,list);
  render();const view=document.getElementById('view');frame=requestAnimationFrame(()=>{if(root.isConnected&&view)view.scrollTop=state.scroll;});
  root.dispose=()=>{if(view)state.scroll=view.scrollTop;cancelAnimationFrame(frame);queue.dispose();};
  return root;
}
