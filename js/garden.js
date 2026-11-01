import { dateMessage, errorMessage, msg, t, setLocalizedAttribute, setLocalizedText } from "./i18n.js";
import { today, validDate, uid, moods } from './model.js';
import { el, text, button, field, value, toolbar, routeLink, openEditor, closeEditor, confirmAction, notify } from './ui.js';
import { resources, feelingResources, inventory, growth, stage, recordFeeling, plantSeed, careForPlant, collectPlant } from './garden-data.js';
import { plantArt, resourceArt, seedArt, shovelArt, greenhouseArt } from './garden-art.js';
import { motionReduced } from './preferences.js';
import { pixelTooltip } from './pixel-ui.js';
const choices=['happy','sad','calm','tired','mixed','other'];
// Calendar and text-list editing use the same atomic mood/reward path.
export function moodEditor(ctx,date=today(),existing=null) {
  const record=existing||ctx.world.moods.find(m=>m.date===date);
  openEditor(record ? msg("garden.editAFeeling") : msg("garden.recordAFeeling"),[
    field(msg("common.date"),'date',record?.date||date,{type:'date',required:true,min:'0100-01-01',max:'9999-12-31'}),
    field(msg("garden.yourMood"),'mood',record?.mood||'calm',{choices:Object.keys(moods).map(k=>[k,msg('moods.'+k)])}),
    field(msg("garden.aLittleReasonOptional"),'note',record?.note||'',{type:'textarea',maxlength:500}),
    text('p',msg("garden.oneResourcePerDateEditingOrDeletingAFeeling"),'help'),
  ],async form=>{
    const day=value(form,'date'),conflict=ctx.world.moods.find(r=>r.date===day&&r.id!==record?.id);
    if(conflict&&!await confirmAction(msg("garden.updateThisDaySMood"),msg("garden.alreadyHasAFeelingReplaceIt", {p1: dateMessage(day)}),msg("garden.replaceMood")))return false;
    const next={id:record?.id||conflict?.id||uid(),date:day,mood:value(form,'mood'),note:value(form,'note')},count=ctx.world.garden.grants.length;
    await ctx.save(recordFeeling(ctx.world,next,record?.id));
    notify(ctx.world.garden.grants.length>count ? msg("garden.received", {p1: msg('resources.'+feelingResources[next.mood])}) : msg("garden.feelingSavedThisDateDoesNotEarnAnotherResource"));
  });
}
export function moodDetails(ctx,record) {
  openEditor(msg("garden.value", {p1: dateMessage(record.date), p2: msg('moods.'+record.mood)}),[
    el('div',{class:'feeling-token'},resourceArt(feelingResources[record.mood]),text('span',msg('moods.'+record.mood))),
    text('p',(record.note || msg("garden.noNoteForThisDay")),'prose'),text('p',msg("garden.removingThisRecordKeepsItsRewardHistoryAndAll"),'help'),
    toolbar(button(msg("garden.editMood"),()=>moodEditor(ctx,record.date,record)),button(msg("garden.deleteMood"),async()=>{
      if(await confirmAction(msg("garden.removeThisMoodRecord"),msg("garden.onlyTheTextRecordWillBeRemovedResourcesCare"))) {await ctx.remove('moods',record.id);await closeEditor(true);}
    }),routeLink(msg("common.openThisDay"),'calendar',{date:record.date},'pill')),
  ]);
}
function composition(g,plant) {return g.care.filter(c=>c.plantId===plant.id).map(c=>g.grants.find(r=>r.id===c.grantId).resource);}
function flowerDetails(ctx,plant) {
  const g=ctx.world.garden;
  openEditor(plant.name,[el('div',{class:'collected-art'},plantArt(5,composition(g,plant))),text('p',msg("garden.planted", {p1: dateMessage(plant.plantedOn)})),
    el('ul',{class:'care-history'},g.care.filter(c=>c.plantId===plant.id).map(c=>{
      const grant=g.grants.find(r=>r.id===c.grantId);
      return el('li',{},text('strong',msg("garden.value", {p1: dateMessage(c.date), p2: msg('resources.'+grant.resource)})),text('span',msg("garden.from", {p1: dateMessage(grant.date), p2: msg('moods.'+grant.mood)})));
    })),button(msg("garden.renameFlower"),()=>openEditor(msg("garden.nameYourFlower"),[field(msg("garden.flowerName"),'name',plant.name,{required:true,maxlength:80})],async form=>{
      await ctx.save({...ctx.world,garden:{...ctx.world.garden,plants:ctx.world.garden.plants.map(p=>p.id===plant.id?{...p,name:value(form,'name')}:p)}});notify(msg("garden.flowerRenamed"));
    })),
  ]);
}
export function gardenPage(ctx,params) {
  const day=validDate(params.get('date'))?params.get('date'):today(),g=ctx.world.garden,plant=g.plants.find(p=>!p.collected),points=plant?growth(g,plant):0;
  let selected=Object.keys(resources).find(k=>inventory(g,k).length)||'water',pending=false,armed=false;
  const status=text('p',plant ? msg(points===5 ? 'garden.collectFlower' : 'garden.chooseAResourceThenYourPlantOrUseIts') : msg("garden.openTheSeedPacketThenChooseAPlantingPlace"),'garden-status');status.setAttribute('role','status');
  const root=el('div',{class:'garden-game'});
  // A native double click is one care gesture, even if the first save already
  // replaced its button. Held Enter/Space must not consume the next resource.
  root.addEventListener('click',event=>{if(event.detail>1&&event.target.closest('.growing-plant,.resource-use')){event.preventDefault();event.stopImmediatePropagation();}},true);
  root.addEventListener('keydown',event=>{if(event.repeat&&['Enter',' '].includes(event.key)&&event.target.closest('.growing-plant,.resource-use'))event.preventDefault();},true);
  const save=async(action,message)=>{
    if(pending||ctx.busy)return false;
    pending=true;
    const controls=[...root.querySelectorAll('button')].map(b=>[b,b.disabled]);
    controls.forEach(([b])=>b.disabled=true);root.setAttribute('aria-busy','true');setLocalizedText(status, msg("garden.savingYourGarden"));
    try {await ctx.save(action());notify(message);return true;}
    catch(e){pending=false;controls.forEach(([b,disabled])=>b.disabled=disabled);root.removeAttribute('aria-busy');setLocalizedText(status, msg("garden.nothingChanged", {p1: errorMessage(e)}));throw e;}
  };
  ctx.gardenNotes ||= new Map();
  const note=field(msg("garden.aLittleReasonOptional"),'quick-note',ctx.gardenNotes.get(day)||'',{type:'textarea',maxlength:500});
  note.querySelector('textarea').addEventListener('input',event=>ctx.gardenNotes.set(day,event.target.value));
  const quick=el('section',{class:'feeling-station px-panel','aria-label':msg("garden.recordAFeeling")},
    el('div',{class:'garden-section-heading'},text('h3',day===today() ? msg("garden.howDoesTodayFeel") : msg("garden.aFeelingForThisDay")),button(msg("garden.changeDate", {p1: dateMessage(day)}),()=>moodEditor(ctx,day),'text-link')),
    el('div',{class:'feeling-choices'},choices.map(key=>{
      const b=button('',async()=>{
        const existing=ctx.world.moods.find(r=>r.date===day),count=ctx.world.garden.grants.length;
        if(!await save(()=>recordFeeling(ctx.world,{id:existing?.id||uid(),date:day,mood:key,note:note.querySelector('textarea').value.trim()||existing?.note||''}),msg("garden.feelingSaved")))return;
        ctx.gardenNotes.delete(day);const input=document.querySelector('[name="quick-note"]');if(input)input.value='';
        const earned=ctx.world.garden.grants.length>count;
        notify(earned ? msg("garden.1EveryFeelingCanHelpSomethingGrow", {p1: msg('resources.'+feelingResources[key])}) : msg("garden.feelingUpdatedThisDateAlreadyHasItsResourceHistory"));
        const token=document.querySelector('[data-resource="'+feelingResources[key]+'"]');
        (token?.disabled?document.querySelector('[data-feeling="'+key+'"]'):token)?.focus();
        if(earned&&!motionReduced())token?.animate([{opacity:.3,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:250});
      },'feeling-choice px-slot');
      setLocalizedAttribute(b, 'aria-label', msg("garden.value2", {p1: msg('moods.'+key), p2: msg('resources.'+feelingResources[key])}));b.dataset.feeling=key;b.setAttribute('aria-pressed',String(ctx.world.moods.some(r=>r.date===day&&r.mood===key)));
      b.append(resourceArt(feelingResources[key]),text('strong',msg('moods.'+key)),text('small',msg('resources.'+feelingResources[key])));return b;
    })),el('details',{class:'optional-note',open:ctx.gardenNotes.get(day)?'':null},text('summary',msg("garden.addAnOptionalNote")),note));
  const resourceToolbar=el('div',{class:'resource-tools','aria-label':msg("garden.yourCareResources")}),toolButtons=[];
  const use=async key=>{
    if(!await save(()=>careForPlant(ctx.world,key,today()),msg("garden.used5CareVisits", {p1: msg('resources.'+key), p2: points+1})))return;
    const next=document.querySelector('.growing-plant');next?.focus();
    if(!motionReduced()&&!document.hidden&&next){
      // Animate only the newly drawn sprite; labels and writing areas stay still.
      next.querySelector('.plant-pixel')?.animate([{opacity:.65,transform:'translateY(3px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:250,easing:'ease-out'});
      const effect=el('span',{class:'care-effect care-'+key,'aria-hidden':'true'},resourceArt(key));next.append(effect);setTimeout(()=>effect.remove(),420);
    }
  };
  for(const key of Object.keys(resources)) {
    const label=msg('resources.'+key);
    const count=inventory(g,key).length;
    const choose=button('',()=>{
      selected=key;toolButtons.forEach(([k,b])=>b.setAttribute('aria-pressed',String(k===key)));setLocalizedText(status, msg("garden.selectedClickYourPlantOrUse", {p1: label, p2: label}));
      setLocalizedAttribute(document.querySelector('.growing-plant'), 'aria-label', msg("garden.of5CareVisitsUseSelected", {p1: msg('stages.'+stage(points)), p2: points, p3: label}));
    },'resource-choice px-slot');
    choose.dataset.resource=key;setLocalizedAttribute(choose, 'aria-label', msg("garden.available", {p1: label, p2: count}));choose.setAttribute('aria-pressed',String(selected===key&&count>0));choose.disabled=!count;
    // A real label and native disabled state remain usable without a tooltip.
    const tip=pixelTooltip(msg('garden.available',{p1:label,p2:count}));
    choose.append(resourceArt(key),text('span',label),text('strong',count,'px-count'),tip);
    const direct=button(msg("garden.use", {p1: label}),()=>use(key),'resource-use');direct.disabled=!count||!plant||points>=5;
    toolButtons.push([key,choose]);resourceToolbar.append(el('div',{class:'resource-tool'},choose,direct));
  }
  const places=['Left','Middle','Right'],bench=el('div',{class:'pixel-window-bench'});
  if(!plant) {
    const packet=button('',()=>{armed=true;bench.classList.add('choosing-place');setLocalizedText(status, msg("garden.seedPacketOpenedChooseLeftMiddleOrRight"));bench.querySelector('.planting-place')?.focus();},'seed-packet');
    setLocalizedAttribute(packet, 'aria-label', msg("garden.openSeedPacket"));packet.append(seedArt(),text('strong',msg("garden.oneLittleSeed")),text('small',msg("garden.chooseItsHome")));bench.append(packet);
  }
  const slots=el('div',{class:'planting-places'});
  places.forEach((position,i)=>{
    const label=msg('garden_extra.'+position.toLowerCase());
    if(plant&&plant.position===i) {
      const pot=button('',()=>points<5?use(selected):collect(),'growing-plant');setLocalizedAttribute(pot, 'aria-label', msg("garden.of5CareVisits", {p1: msg('stages.'+stage(points)), p2: points, p3: points<5 ? msg("garden.useSelected", {p1: msg('resources.'+selected)}) : msg("garden.collectFlower")}));
      pot.append(plantArt(points,composition(g,plant)),text('strong',msg('stages.'+stage(points))),text('small',msg("garden.5CareVisits", {p1: points})));slots.append(pot);
    }else if(!plant) {
      const place=button('',async()=>{
        if(!armed){setLocalizedText(status, msg("garden.openTheSeedPacketFirst"));return;}
        if(await save(()=>plantSeed(ctx.world,i,today()),msg("garden.aSeedPlantedAnyFeelingCanHelpItGrow")))document.querySelector('.growing-plant')?.focus();
      },'planting-place');setLocalizedAttribute(place, 'aria-label', msg("garden.plantSeed", {p1: label}));place.append(el('span',{class:'soil-patch','aria-hidden':'true'}),text('span',label));slots.append(place);
    }else slots.append(el('div',{class:'bench-detail','aria-hidden':'true'},i===0 ? shovelArt() : text('span','','pixel-pebbles')));
  });bench.append(slots);
  function collect() {openEditor(msg("garden.aFlowerToKeep"),[el('div',{class:'collected-art'},plantArt(5,composition(g,plant))),text('p',msg("garden.fiveLittleCareVisitsAtYourOwnPace")),field(msg("garden.flowerName"),'name',t('garden_extra.defaultFlowerName'),{required:true,maxlength:80})],async form=>{
    await ctx.save(collectPlant(ctx.world,value(form,'name')));notify(msg("garden.collectedInMyGardenYourNextSeedIsReady"));
  });}
  // Background and real seed/plant buttons are separate layers on one fixed grid.
  // Integer scene scales (1×/2×) keep plots aligned; the main flower uses 1×/3×.
  const scene=el('section',{class:'pixel-garden-scene','aria-label':msg("garden.growingCorner")},
    el('div',{class:'greenhouse-stage'},greenhouseArt(),bench),
    plant&&points===5 ? button(msg("garden.nameCollectFlower"),collect,'primary collect-flower') : null);
  const meter=el('progress',{class:'px-progress',max:5,value:points,'aria-label':msg('garden.growthStages')});
  const guide=el('section',{class:'growth-guide px-panel'},
    el('div',{class:'garden-section-heading'},text('h3',msg('garden.growthStages')),text('span',msg('garden.5CareVisits',{p1:points}))),meter,
    el('ol',{class:'growth-stages','aria-label':msg('garden.growthStages')},
      ['Seed','Sprout','Leaves','Bud','Bloom'].map((label,index)=>el('li',{'aria-current':plant&&stage(points)===label?'step':null},
        plantArt([0,1,2,3,5][index]),text('span',msg('stages.'+label))))));
  const collection=el('section',{class:'flower-collection'},el('div',{class:'garden-section-heading'},text('h3',msg("garden.myGarden")),text('span',msg('garden_extra.flowerCount',{count:g.plants.filter(p=>p.collected).length}))),
    el('div',{class:'collected-flowers'},g.plants.filter(p=>p.collected).map(p=>{const b=button('',()=>flowerDetails(ctx,p),'collected-flower');b.append(plantArt(5,composition(g,p)),text('strong',p.name));return b;})),!g.plants.some(p=>p.collected) ? text('p',msg("garden.yourFirstBloomWillLiveHereThereIsNo"),'help') : null);
  const records=ctx.world.moods.filter(r=>!params.get('date')||r.date===day).sort((a,b)=>b.date.localeCompare(a.date));
  const list=el('div',{class:'garden-records',hidden:true},records.length ? el('ul',{class:'mood-list'},records.map(r=>el('li',{},text('strong',msg("garden.value", {p1: dateMessage(r.date), p2: msg('moods.'+r.mood)})),text('p',r.note||msg("garden.noNote")),button(msg("garden.viewEdit"),()=>moodDetails(ctx,r))))) : text('p',msg("garden.noFeelingsRecordedForThisViewChooseAFeeling")));
  const toggle=button(msg("garden.showTextRecords"),()=>{list.hidden=!list.hidden;setLocalizedText(toggle, list.hidden ? msg("garden.showTextRecords") : msg("garden.hideTextRecords"));toggle.setAttribute('aria-expanded',String(!list.hidden));},'px-tab');toggle.setAttribute('aria-expanded','false');
  root.append(text('p',msg("garden.everyFeelingCanHelpSomethingGrow"),'garden-motto'),el('div',{class:'garden-workbench'},scene,quick),status,resourceToolbar,guide,collection,toolbar(toggle,params.get('date')?routeLink(msg("garden.allDates"),'moods',{},'pill'):null),list,
    el('details',{class:'garden-rules'},text('summary',msg("garden.howThisLittleGardenWorks")),text('p',msg("garden.eachDateSFirstNewFeelingEarnsOneResource")),text('p',msg("garden.editingMovingOrDeletingAFeelingKeepsItsOriginal"))));
  return root;
}
