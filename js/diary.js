import { msg, dateMessage, setLocalizedText, setLocalizedAttribute } from './i18n.js';
import { today, validDate, uid } from './model.js';
import { picture, clearMediaURLs } from './media.js';
import { el, text, button, toolbar, routeLink, openEditor, closeEditor, confirmAction, notify } from './ui.js';
import { arrowButton } from './pixel-ui.js';
import { diarySticker } from './diary-art.js';
import { motionReduced } from './preferences.js';

// Reading position and filters are view state, never a second copy of diary data.
export function diaryHref(params,id,day='') {
  const next=new URLSearchParams(params);next.delete('new');next.delete('id');next.delete('date');
  if(id)next.set('id',id);if(day)next.set('date',day);
  return '#/diary'+(next.size?'?'+next.toString():'');
}
export async function revealSavedDiary(ctx,record) {
  if(document.body.dataset.app!=='diary')return;
  await closeEditor(true);
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  // Canonicalize a successful save without leaving a stale ?new=1 route behind.
  // replace() changes the hash only: no reload or music/timer recreation.
  const href=diaryHref(params,record.id,ctx.diaryView?.day||'');
  if(location.hash===href)document.querySelector('.diary-entry-title')?.focus();
  else {ctx.diaryFocus=true;location.replace(href);}
}

export function diaryPage(ctx,params,edit) {
  const routeDay=validDate(params.get('date'))?params.get('date'):'',routeId=params.get('id')||'';
  const state=ctx.diaryView||(ctx.diaryView={selected:'',query:'',day:routeDay,indexOpen:false});
  if(state.routeDay!==routeDay){state.day=routeDay;state.query='';state.routeDay=routeDay;}
  if(state.routeId!==routeId){state.selected=routeId;state.routeId=routeId;}
  const root=el('div',{class:'diary-book-app'+(state.indexOpen?' index-open':'')});
  const indexId='diary-index-'+uid(),indexList=el('div',{class:'diary-index-list'});
  const count=text('span','','diary-entry-count'),pageNumber=text('span','','diary-page-number');
  const reader=el('section',{class:'diary-paper','aria-label':msg('diaryBook.reader')});
  const query=el('input',{type:'search',maxlength:150,value:state.query||'',placeholder:msg('journal.searchDiaryText'),'aria-label':msg('journal.searchDiaryText')});
  const day=el('input',{type:'date',value:state.day||'',min:'0100-01-01',max:'9999-12-31','aria-label':msg('common.filterByDate')});
  let frame=0,shownId='';
  const contents=button(msg('diaryBook.contents'),()=>{
    state.indexOpen=!state.indexOpen;root.classList.toggle('index-open',state.indexOpen);
    contents.setAttribute('aria-expanded',String(state.indexOpen));
    if(state.indexOpen)indexList.querySelector('a')?.focus();
  },'diary-contents-toggle px-tab');
  contents.setAttribute('aria-controls',indexId);contents.setAttribute('aria-expanded',String(!!state.indexOpen));
  function openEntry(record,direction='') {
    ctx.diaryTurn=direction;ctx.diaryFocus=true;state.indexOpen=false;
    location.hash=diaryHref(params,record.id,state.day);
  }
  function clear() {
    state.query=state.day='';query.value=day.value='';render();
    (tools.open?query:reader.querySelector('.diary-entry-title')||root.querySelector('.diary-book-toolbar button:last-child'))?.focus();
  }
  const clearButton=button(msg('diaryBook.clear'),clear);
  const tools=el('details',{class:'diary-search',open:state.query?'':null},text('summary',msg('diaryBook.searchTools')),toolbar(query,day,clearButton));
  query.addEventListener('input',()=>{state.query=query.value;render();});
  day.addEventListener('change',()=>{state.day=validDate(day.value)?day.value:'';render();});

  function photo(record,id,index) {
    const b=button('',()=>openEditor(msg('journal.photo',{p1:record.title,p2:index+1}),[
      picture(id,record.title,'large-photo'),text('p',dateMessage(record.date),'diary-photo-date'),
      button(msg('journal.backToEntry'),()=>closeEditor()),
    ]),'diary-photo');
    b.setAttribute('data-photo-index',String(index));
    // This bound label updates language without touching the media element.
    const label=msg('journal.viewPhotoLarger',{p1:index+1});
    const wrapper=el('figure',{class:'diary-pasted-photo'},b,text('figcaption',msg('diaryBook.photo',{number:index+1})));
    // Use the standard localized attribute path rather than inserting text into art.
    b.append(picture(id,record.title));
    return {wrapper,button:b,label};
  }
  function render() {
    const q=(state.query||'').trim().toLowerCase();
    const records=ctx.world.diary.filter(r=>(!state.day||r.date===state.day)&&`${r.title} ${r.body}`.toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
    let record=records.find(r=>r.id===state.selected)||records[0];
    // Search can change the page without a route render. Release the preceding
    // page's view-owned photo URLs; the body-owned music player has its own URLs.
    if(shownId&&shownId!==record?.id)clearMediaURLs();
    shownId=record?.id||'';
    if(record)state.selected=record.id;
    const index=record?records.indexOf(record):-1;
    setLocalizedText(count,msg('diaryBook.entryCount',{count:records.length}));
    setLocalizedText(pageNumber,record?msg('diaryBook.pageOf',{page:index+1,count:records.length}):'');
    indexList.replaceChildren(...records.map(r=>{
      const a=routeLink('', 'diary',Object.fromEntries(new URLSearchParams(diaryHref(params,r.id,state.day).split('?')[1]||'')),'diary-index-entry');
      a.append(text('time',dateMessage(r.date)),text('span',r.title));
      a.setAttribute('aria-current',r.id===record?.id?'page':'false');
      a.addEventListener('click',()=>{state.indexOpen=false;ctx.diaryFocus=true;});
      return a;
    }));
    if(!record) {
      const filtered=ctx.world.diary.length>0;
      reader.replaceChildren(el('div',{class:'diary-blank'},text('p',msg(filtered?'diaryBook.noResults':'diaryBook.empty')),
        button(msg(filtered?'diaryBook.clear':'diaryBook.first'),filtered?clear:()=>edit(state.day||today()),'primary')));
      return;
    }
    const previous=arrowButton(msg('diaryBook.previous'),()=>openEntry(records[index-1],'previous'),'previous');previous.disabled=index===0;
    const next=arrowButton(msg('diaryBook.next'),()=>openEntry(records[index+1],'next'));next.disabled=index===records.length-1;
    const actions=toolbar(button(msg('common.delete'),async()=>{
      if(!await confirmAction(msg('journal.deleteThisEntry'),msg('journal.andItsUnsharedPhotosWillBeRemovedThisCannot',{p1:record.title})))return;
      await ctx.remove('diary',record.id);notify(msg('diaryBook.deleted'));
      if(document.body.dataset.app==='diary'){
        const href=diaryHref(params,ctx.world.diary.some(r=>r.id===state.selected)?state.selected:'',state.day);
        if(location.hash===href)(document.querySelector('.diary-blank button')||document.querySelector('.diary-entry-title'))?.focus();
        else {ctx.diaryFocus=true;location.replace(href);}
      }
    }),routeLink(msg('common.openThisDay'),'calendar',{date:record.date,...(params.has('from')?{from:params.get('from')}:{})},'pill'));
    const heading=text('h3',record.title,'diary-entry-title');heading.tabIndex=-1;
    const sticker=record.sticker?el('span',{class:'diary-page-sticker',role:'img','aria-label':msg('diaryBook.stickerLabel',{sticker:msg('diaryBook.'+record.sticker)})},diarySticker(record.sticker)):null;
    const readingControls=toolbar(previous,pageNumber,next,button(msg('common.edit'),()=>edit(record.date,record)));
    readingControls.classList.add('diary-reading-controls');
    reader.replaceChildren(el('header',{class:'diary-page-heading'},text('time',dateMessage(record.date),'diary-date-label'),sticker),heading,readingControls,
      text('p',record.body,'diary-body'),el('div',{class:'diary-photo-album'},record.photos.map((id,i)=>{
        const item=photo(record,id,i);setLocalizedAttribute(item.button,'aria-label',item.label);return item.wrapper;
      })),el('footer',{class:'diary-page-footer'},actions));
    if(ctx.diaryTurn&&!motionReduced()&&!document.hidden)reader.classList.add('diary-page-turn');
    ctx.diaryTurn='';
    if(ctx.diaryFocus){ctx.diaryFocus=false;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(heading.isConnected)heading.focus();});}
  }
  root.append(el('div',{class:'diary-book-toolbar'},contents,count,button(msg('diaryBook.write'),()=>edit(state.day||today()),'primary')),tools,
    el('div',{class:'diary-open-book'},el('nav',{class:'diary-index',id:indexId,'aria-label':msg('diaryBook.index')},text('h3',msg('diaryBook.contents')),indexList),reader));
  render();root.dispose=()=>cancelAnimationFrame(frame);return root;
}
