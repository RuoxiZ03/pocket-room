import { LocalizedError, msg, setLocalizedAttribute, setLocalizedText } from "./i18n.js";
import { shelfArt } from './shelf-art.js';
import { uid, shelfTypes, shelfStatuses, safeURL } from './model.js';
import { picture } from './media.js';
import { el, text, button, field, value, toolbar, externalLink, openEditor, closeEditor, confirmAction, photoFields, notify } from './ui.js';

export function shelfEditor(ctx,record=null) {
  const cover=photoFields(record?.cover?[record.cover]:[],{single:true,label:msg("common.coverOptional")});
  openEditor(record ? msg("shelf.editShelfItem") : msg("shelf.addToMyShelf"),[
    field(msg("common.name"),'name',record?.name||'',{required:true,maxlength:150}),
    el('div',{class:'form-row'},field(msg("common.type"),'type',record?.type||'Book',{choices:shelfTypes.map(v=>[v,msg('shelfTypes.'+v)])}),field(msg("common.status"),'status',record?.status||'Want to',{choices:shelfStatuses.map(v=>[v,msg('shelfStatuses.'+v)])})),
    field(msg("common.notes"),'notes',record?.notes||'',{type:'textarea',maxlength:3000}),field(msg("shelf.linkOptional"),'link',record?.link||'',{type:'url',maxlength:2000,placeholder:'https://'}),cover.node,
  ],async form=>{
    const media=await cover.collect();
    await ctx.upsert('shelf',{id:record?.id||uid(),name:value(form,'name'),type:value(form,'type'),status:value(form,'status'),notes:value(form,'notes'),link:safeURL(value(form,'link')),cover:media.photos[0]||null},media.files);
    notify(msg("shelf.shelfItemSaved"));
  });
}
export function reorderShelf(records,id,offset) {
  const next=[...records],index=next.findIndex(r=>r.id===id),target=index+offset;
  if(index<0||target<0||target>=next.length||![-1,1].includes(offset))throw new LocalizedError(msg("shelf.thisItemIsAlreadyAtTheEndOfThe"));
  [next[index],next[target]]=[next[target],next[index]];return next;
}
function coverArt(r) {
  return r.cover?el('div',{class:'favorite-photo-frame'},picture(r.cover,msg("shelf.cover", {p1: r.name}),'favorite-cover')):shelfArt(r.type,r.id);
}
export function shelfDetails(ctx,id) {
  const r=ctx.world.shelf.find(r=>r.id===id);if(!r)return;
  const index=ctx.world.shelf.findIndex(r=>r.id===id);
  const move=offset=>async()=>{
    if(ctx.busy)return;
    await ctx.save({...ctx.world,shelf:reorderShelf(ctx.world.shelf,id,offset)});
    const controls=shelfDetails(ctx,id);
    const focus=offset<0?controls.earlier:controls.later;
    (focus.disabled?(offset<0?controls.later:controls.earlier):focus).focus();
    notify(msg("shelf.shelfPositionSaved"));
  };
  const earlier=button(msg("shelf.moveEarlier"),move(-1)),later=button(msg("shelf.moveLater"),move(1));earlier.disabled=index===0;later.disabled=index===ctx.world.shelf.length-1;
  const body=openEditor(r.name,[el('div',{class:'favorite-detail','data-kind':r.type},coverArt(r),el('div',{},text('p',msg("shelf.value", {p1: msg('shelfTypes.'+r.type), p2: msg('shelfStatuses.'+r.status)}),'eyebrow'),text('p',(r.notes || msg("shelf.noNotesYet")),'prose'),r.link ? externalLink(msg("shelf.openLink"),r.link) : null)),
    text('p',msg("shelf.positionOfMoveThroughYourWholeCollectionIncludingFiltered", {p1: index+1, p2: ctx.world.shelf.length}),'help'),toolbar(earlier,later),
    toolbar(button(msg("shelf.editItem"),()=>shelfEditor(ctx,r)),button(msg("shelf.removeItem"),async()=>{
      if(await confirmAction(msg("shelf.removeThisShelfItem"),msg("shelf.willBeRemovedThisCannotBeUndone", {p1: r.name}))){await ctx.remove('shelf',r.id);await closeEditor(true);}
    })),
  ]);
  body.dispose=()=>{
    const item=[...document.querySelectorAll('.favorite-object')].find(b=>b.dataset.shelfId===id);
    if(item)item.focus({preventScroll:true});
    else document.querySelector('.shelf-heading button')?.focus();
  };
  return {earlier,later};
}
export function shelfPage(ctx) {
  // Keep view controls across saves/reordering, without putting settings in data.
  const state=ctx.shelfView||(ctx.shelfView={type:'',status:'',search:''});
  const rack=el('div',{class:'favorite-rack','aria-label':msg("shelf.yourCollectionShelf")});
  const search=el('input',{type:'search',value:state.search,placeholder:msg("shelf.findAFavorite"),'aria-label':msg("shelf.searchYourShelf"),maxlength:150});
  const active=text('p','','shelf-results');active.setAttribute('role','status');
  const filterButtons=[];
  function chips(key,labels,title) {
    return el('div',{class:'shelf-chips',role:'group','aria-label':title},['',...labels].map(label=>{
      const b=button((label ? msg((key==='type'?'shelfTypes.':'shelfStatuses.')+label) : msg("common.all")),()=>{state[key]=label;render();},'filter-chip px-tab');filterButtons.push([key,label,b]);return b;
    }));
  }
  function render() {
    const records=ctx.world.shelf.filter(r=>(!state.type||r.type===state.type)&&(!state.status||r.status===state.status)&&`${r.name} ${r.notes}`.toLowerCase().includes(state.search.toLowerCase()));
    filterButtons.forEach(([key,label,b])=>b.setAttribute('aria-pressed',String(state[key]===label)));
    setLocalizedText(active, ctx.world.shelf.length ? msg("shelf.ofFavorites", {p1: records.length, p2: ctx.world.shelf.length}) : msg("shelf.aShelfWaitingForYourFirstFavorite"));
    const rows=[];
    const items=records.map(r=>{
      const b=button('',()=>shelfDetails(ctx,r.id),'favorite-object');b.dataset.kind=r.type;b.dataset.shelfId=r.id;setLocalizedAttribute(b, 'aria-label', msg("shelf.viewDetails", {p1: r.name, p2: msg('shelfTypes.'+r.type), p3: msg('shelfStatuses.'+r.status)}));
      b.append(el('span',{class:'favorite-display'},coverArt(r)),text('span',r.name,'favorite-title'),text('small',msg('shelfStatuses.'+r.status)));return b;
    });
    const addSlot=()=>{const b=button('',()=>shelfEditor(ctx),'empty-shelf-slot');b.append(el('span',{class:'favorite-display'},shelfArt('Add')),text('span',msg("shelf.addAFavorite")));return b;};
    if(!ctx.world.shelf.length) {items.push(addSlot(),addSlot());}
    else if(records.length) items.push(addSlot());
    rack.dataset.empty=String(!ctx.world.shelf.length);
    // Complete the physical plank without inventing filler collection items.
    // Separate spans follow the real four/two-column layout, including mobile.
    if(items.length) {
      const columns=ctx.world.shelf.length?4:2,last=items.at(-1);
      last.style.setProperty('--shelf-board-span',String(columns-(items.length-1)%columns));
      last.style.setProperty('--shelf-board-span-mobile',String(2-(items.length-1)%2));
    }
    for(let i=0;i<items.length;i+=4)rows.push(el('div',{class:'favorite-plank'},items.slice(i,i+4)));
    if(!records.length&&ctx.world.shelf.length)rows.push(el('div',{class:'shelf-no-results'},text('h3',msg("shelf.noMatchingFavorites")),text('p',msg("shelf.yourCollectionIsStillHereTryAnotherFilter")),button(msg("common.clearFilters"),()=>{
      state.type=state.status=state.search='';search.value='';render();
      // Clearing removes this button: return keyboard focus to usable controls.
      (search.closest('details')?.open?search:filterButtons[0][2]).focus();
    })));
    rack.replaceChildren(...rows);
  }
  search.addEventListener('input',()=>{state.search=search.value;render();});
  const root=el('div',{class:'favorite-shelf'},el('header',{class:'shelf-heading'},active,button(msg("shelf.addAnItem"),()=>shelfEditor(ctx),'primary')),
    el('section',{class:'shelf-filters px-panel'},
      el('div',{class:'shelf-filter-row'},text('span',msg('common.type'),'shelf-filter-label'),chips('type',shelfTypes,msg("shelf.filterShelfByType"))),
      el('div',{class:'shelf-filter-row'},text('span',msg('common.status'),'shelf-filter-label'),chips('status',shelfStatuses,msg("shelf.filterShelfByStatus"))),
      el('details',{class:'shelf-tools',open:state.search?'':null},text('summary',msg("shelf.searchYourShelf")),search)),rack);
  render();return root;
}
