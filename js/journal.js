import { LocalizedError, msg } from "./i18n.js";
import { today, uid, diaryStickers } from './model.js';
import { diaryPage, revealSavedDiary } from './diary.js';
import { diarySticker } from './diary-art.js';
import { memoryPage, memoryDetails, revealSavedMemory } from './memories.js';
import { el, text, button, field, value, openEditor, photoFields, notify } from './ui.js';

export function entryEditor(ctx, type, date = today(), existing = null) {
  const isMemory = type === 'memories';
  const photos = photoFields(existing?.photos || [], { label: isMemory ? msg("journal.photosAtLeastOne") : msg("common.photosOptional") });
  const sticker=el('input',{type:'hidden',name:'sticker',value:existing?.sticker||''});
  const stickerButtons=[];
  const stickers=isMemory?null:el('fieldset',{class:'diary-sticker-picker'},text('legend',msg('diaryBook.sticker')),sticker,
    el('div',{class:'diary-sticker-choices'},diaryStickers.map(kind=>{
      const b=button('',()=>{
        if(sticker.value===kind)return;
        sticker.value=kind;stickerButtons.forEach(([key,node])=>node.setAttribute('aria-pressed',String(key===kind)));
        // The existing dirty-form guard also covers sticker-only edits.
        sticker.dispatchEvent(new Event('change',{bubbles:true}));
      },'px-slot');
      b.setAttribute('aria-pressed',String(kind===(existing?.sticker||'')));
      b.append(kind?diarySticker(kind):el('span',{class:'diary-no-sticker','aria-hidden':'true'}),text('span',msg('diaryBook.'+(kind||'none'))));stickerButtons.push([kind,b]);return b;
    })));
  const editorBody = openEditor(msg("journal.value", {p1: existing ? msg("common.edit") : msg("journal.new"), p2: isMemory ? msg("journal.memory") : msg("journal.diaryEntry")}), [
    field(msg("common.date"), 'date', existing?.date || date, { type: 'date', required: true, min: '0100-01-01', max: '9999-12-31' }),
    field(msg("common.title"), 'title', existing?.title || '', { required: true, maxlength: 150 }),
    field(isMemory ? msg("journal.description") : msg("journal.yourWords"), 'body', existing?.body || '', { type: 'textarea', required: !isMemory, maxlength: isMemory ? 5000 : 20000, rows: isMemory ? 4 : 8 }),
    stickers,photos.node,!isMemory?text('p',msg('diaryBook.writingHint'),'help'):null,
  ], async form => {
    const media = await photos.collect();
    if (isMemory && !media.photos.length) throw new LocalizedError(msg("journal.addAtLeastOnePhotoToYourMemory"));
    const record={id:existing?.id||uid(),date:value(form,'date'),title:value(form,'title'),body:value(form,'body'),photos:media.photos,...(!isMemory?{sticker:value(form,'sticker')}:{})};
    const oldView=ctx.diaryView?{...ctx.diaryView}:undefined;
    if(!isMemory)ctx.diaryView={...ctx.diaryView,selected:record.id,query:'',day:ctx.diaryView?.day?record.date:''};
    try {await ctx.upsert(type,record,media.files);}
    catch(error){if(!isMemory)ctx.diaryView=oldView;throw error;}
    if(isMemory)await revealSavedMemory(ctx,record,(date,r)=>entryEditor(ctx,type,date,r));
    else await revealSavedDiary(ctx,record);
    notify(isMemory ? msg("journal.memoryTuckedAway") : msg("journal.diaryEntrySaved"));
    if(isMemory)return false;
  });
  editorBody.classList.add(isMemory ? 'memory-editor' : 'diary-editor');
  editorBody.querySelector('[name="title"]')?.focus();
}
export function entryDetails(ctx,type,record) {
  if(type==='memories')return memoryDetails(ctx,record,(date,r)=>entryEditor(ctx,type,date,r));
}
export function journalPage(ctx,type,params) {
  const edit=(date,record)=>entryEditor(ctx,type,date,record);
  return type==='diary'?diaryPage(ctx,params,edit):memoryPage(ctx,params,edit);
}
