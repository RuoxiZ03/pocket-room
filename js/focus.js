import { dateMessage, errorMessage, msg, numberMessage, setLocalizedText } from "./i18n.js";
import { today,validDate } from './model.js';
import { initialFocus,focusRemaining,validFocus } from './focus-data.js';
import { commitFocus } from './storage.js';
import { el,text,button,field,toolbar,notify } from './ui.js';
import { pixelIcon } from './pixel-icons.js';
import { motionReduced } from './preferences.js';
export const clockText=ms=>{const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
const setText=(selector,value)=>document.querySelectorAll(selector).forEach(n=>{if(n.textContent!==value)setLocalizedText(n, value);});
export function createFocusClock(ctx,broadcast) {
  let focus=initialFocus(),revision=-1,pending=false,soundContext=null,staleWarned=false,retryAt=0;
  const seen=new Set();
  async function unlockSound(force=false) {
    if(!force&&!focus.settings.sound)return;
    try {soundContext ||= new (window.AudioContext||window.webkitAudioContext)();await soundContext.resume();} catch { /* Optional browser audio permission may be unavailable. */ }
  }
  function chime(force=false) {
    if((!force&&!focus.settings.sound)||soundContext?.state!=='running')return;
    try {
      const now=soundContext.currentTime,gain=soundContext.createGain();gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.035,now+.03);gain.gain.exponentialRampToValueAtTime(.0001,now+.65);gain.connect(soundContext.destination);
      const tone=soundContext.createOscillator();tone.type='sine';tone.frequency.value=660;tone.connect(gain);tone.start(now);tone.stop(now+.7);tone.onended=()=>{tone.disconnect();gain.disconnect();};
    }catch{/* A visual completion always remains available. */}
  }
  function update() {
    const remaining=focus.current?focusRemaining(focus):focus.settings.minutes*60000;
    setText('[data-focus-remaining]',clockText(remaining));
    setText('[data-focus-status]',focus.current?.status==='running' ? msg("focus.aLittleTimeForOneThing") : focus.current ? msg("focus.pausedTakeYourTime") : msg("focus.readyWhenYouAre"));
    const total=focus.sessions.filter(s=>s.date===today()&&s.outcome==='completed').reduce((n,s)=>n+s.durationMs/60000,0);
    setText('[data-focus-total]',numberMessage(total));
    // View-only projections of the same deadline; no second timer or counter.
    document.querySelectorAll('.alarm-clock').forEach(n=>n.dataset.status=focus.current?.status||'idle');
    const latest=focus.sessions.at(-1),finished=!focus.current&&latest?.outcome==='completed'&&latest.date===today();
    document.querySelectorAll('[data-focus-progress]').forEach(n=>n.value=focus.current?1-remaining/focus.current.durationMs:finished?1:0);
    document.querySelectorAll('[data-focus-result]').forEach(n=>{
      n.hidden=!finished;
      if(finished&&n.dataset.resultId!==latest.id){n.dataset.resultId=latest.id;setLocalizedText(n,msg('focus.yourFocusTimeIsCompleteALittlePauseIs'));}
    });
    document.querySelectorAll('.focus-indicator').forEach(n=>{n.hidden=!focus.current;const label=n.querySelector('[data-focus-summary]')||n;setLocalizedText(label, msg("focus.focus", {p1: clockText(focusRemaining(focus)), p2: focus.current?.status==='paused' ? msg("focus.paused") : ''}));});
    document.querySelectorAll('[data-focus-action]').forEach(b=>{
      const action=b.dataset.focusAction;
      b.hidden=action==='pause'?focus.current?.status!=='running':action==='resume'?focus.current?.status!=='paused':false;
      b.disabled=pending||(action==='start'||action==='duration'?!!focus.current:action==='end'?!focus.current:false);
    });
    document.querySelectorAll('[data-focus-preset]').forEach(b=>{b.disabled=pending||!!focus.current;b.setAttribute('aria-pressed',String(Number(b.dataset.focusPreset)===focus.settings.minutes));});
    const sound=document.querySelector('[data-focus-sound]');if(sound){sound.checked=focus.settings.sound;sound.disabled=pending;}
    const history=document.querySelector('.focus-history');
    if(history){const key=focus.sessions.slice(-8).map(s=>s.id).join('|');if(history.dataset.entries!==key){history.dataset.entries=key;history.replaceChildren(...focus.sessions.slice(-8).reverse().map(s=>text('li',msg("focus.min", {p1: dateMessage(s.date), p2: (s.durationMs/60000).toFixed(s.outcome==='completed'?0:1), p3: s.outcome==='completed' ? msg("focus.completed") : msg("focus.endedEarlyWithoutPenalty")}))));}}
    ctx.refreshDesktop?.();
  }
  function sync(world,force=false) {
    if(!world||!force&&world.revision<revision)return;
    focus=world.focus;revision=world.revision;focus.sessions.forEach(s=>seen.add(s.id));update();
  }
  function accept(result,remote=false) {
    if(!result?.world||!Number.isSafeInteger(result.world.revision)||!validFocus(result.world.focus,validDate))return;
    if(result.world.revision<revision)return;
    focus=result.world.focus;revision=result.world.revision;
    if(!ctx.world)return;
    if(ctx.world.revision===result.previousRevision||ctx.world.revision===revision)ctx.world={...ctx.world,focus,revision};
    else if(!staleWarned){staleWarned=true;notify(msg("focus.anotherTabChangedYourContentTheClockIsUp"),true);}
    const completed=focus.sessions.filter(s=>s.outcome==='completed'&&!seen.has(s.id));focus.sessions.forEach(s=>seen.add(s.id));
    if(completed.length&&!remote){
      notify(msg("focus.yourFocusTimeIsCompleteALittlePauseIs"));chime();
      if(!motionReduced()&&!document.hidden)document.querySelector('.clock-complete-stars')?.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)',offset:.3},{opacity:0,transform:'translateY(-5px)'}],{duration:550,easing:'ease-out'});
    }
    update();
  }
  async function perform(operation,options={}) {
    if(pending)return;
    const source=document.activeElement;
    if(['start','resume'].includes(operation))unlockSound();
    pending=true;update();
    try {const result=await commitFocus(operation,options);accept(result,!result.changed);if(result.changed)broadcast(result);}
    finally {
      pending=false;update();
      const next={start:'pause',pause:'resume',resume:'pause',end:'start'}[operation];
      if(next&&source?.isConnected&&source.dataset.focusAction===operation&&!document.getElementById('editor')?.open)
        document.querySelector('[data-focus-action="'+next+'"]:not([hidden]):not(:disabled)')?.focus({preventScroll:true});
    }
  }
  const tick=()=>{
    update();
    if(ctx.world&&!ctx.busy&&!pending&&Date.now()>=retryAt&&focus.current?.status==='running'&&focus.current.endsAt<=Date.now())perform('settle').catch(e=>{retryAt=Date.now()+15000;notify(msg("focus.yourFocusResultCouldNotSaveReloadOrRetry", {p1: errorMessage(e)}),true);});
  };
  const interval=setInterval(tick,1000);document.addEventListener('visibilitychange',tick);window.addEventListener('pageshow',tick);
  return {sync,update,perform,receive:result=>accept(result,true),snapshot:()=>focus,
    async testSound(){await unlockSound(true);chime(true);},
    async setSound(enabled){if(enabled)unlockSound(true);await perform('settings',{sound:enabled});},
    dispose(){clearInterval(interval);document.removeEventListener('visibilitychange',tick);window.removeEventListener('pageshow',tick);soundContext?.close();}};
}
export function focusPage(ctx) {
  const clock=ctx.clock,f=clock.snapshot();
  const action=(label,key)=>{const b=button(label,()=>clock.perform(key),key==='start'?'primary':'');b.dataset.focusAction=key;return b;};
  const custom=field(msg("focus.customMinutes1180"),'focus-minutes',f.settings.minutes,{type:'number',min:1,max:180,step:1});
  const apply=button(msg("focus.setDuration"),()=>clock.perform('settings',{minutes:Number(custom.querySelector('input').value)}));apply.dataset.focusAction='duration';
  const sound=el('input',{type:'checkbox','data-focus-sound':'',checked:f.settings.sound,onchange:()=>clock.setSound(sound.checked).catch(e=>notify(errorMessage(e),true))});
  const selected=ctx.world.music.mode==='spotify'?ctx.world.music.playlists.find(p=>p.id===ctx.world.music.selected):null;
  const stars=el('div',{class:'clock-complete-stars','aria-hidden':'true'});
  stars.innerHTML='<svg viewBox="0 0 96 20" shape-rendering="crispEdges"><path fill="#b68b9e" d="M7 2h4v5h5v4h-5v5H7v-5H2V7h5zM45 0h4v6h6v4h-6v6h-4v-6h-6V6h6zM83 2h4v5h5v4h-5v5h-4v-5h-5V7h5z"/><path fill="#fff8df" d="M7 7h4v4H7zM45 6h4v4h-4zM83 7h4v4h-4z"/></svg>';
  return el('div',{class:'focus-app'},
    el('div',{class:'alarm-clock'},el('span',{class:'alarm-bell bell-left','aria-hidden':'true'}),el('span',{class:'alarm-bell bell-right','aria-hidden':'true'}),
      el('header',{},el('span',{class:'clock-led','aria-hidden':'true'}),text('span',msg("focus.pocketFocus"))),stars,
      el('div',{class:'clock-display',role:'timer','aria-label':msg("focus.timeRemaining"),'aria-live':'off','data-focus-remaining':''},clockText(f.settings.minutes*60000)),
      el('p',{'data-focus-status':'',class:'focus-status',role:'status'},''),
      el('progress',{class:'px-progress clock-progress',max:1,value:0,'data-focus-progress':'','aria-label':msg('soundUI.focusProgress')}),
      toolbar(action(msg("focus.start"),'start'),action(msg("common.pause"),'pause'),action(msg("focus.continue"),'resume'),action(msg("focus.endSession"),'end')),
      el('p',{'data-focus-result':'',class:'focus-result',role:'status',hidden:true},'')),
    el('p',{class:'focus-today'},msg("focus.completedToday"),el('strong',{'data-focus-total':''},'0'),msg("focus.min3")),
    el('details',{class:'focus-options'},text('summary',msg("focus.clockSettings")),el('div',{class:'focus-presets','aria-label':msg("focus.focusDuration")},[15,25,45].map(m=>{const b=button(msg("focus.min2", {p1: m}),()=>clock.perform('settings',{minutes:m}));b.dataset.focusPreset=m;return b;})),custom,apply,el('label',{class:'sound-choice'},sound,msg("focus.gentleCompletionSoundOptional")),button(msg("focus.testSound"),()=>clock.testSound()),text('p',msg("focus.soundIsOffByDefaultEnableItThenStart"),'help')),
    el('div',{class:'focus-music'},pixelIcon('player'),el('div',{},text('strong',(selected?.name || ctx.world.player?.title || msg("focus.yourMusicCorner"))),text('p',selected ? msg("focus.selectedSpotifyPlaylist") : msg("focus.localMusicSpotify"),'help')),button(msg("focus.openMusic"),()=>ctx.music.show())),
    text('p',msg("focus.closingThePageCannotGuaranteeATimelyReminderReopening"),'help'),
    el('details',{},text('summary',msg("focus.recentFocusSessions")),el('ul',{class:'focus-history'})));
}
