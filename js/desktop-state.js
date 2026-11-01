import { formatDate, msg, setLocalizedAttribute, setLocalizedText, t } from "./i18n.js";
import { dateKey } from './model.js';
import { growth,stage } from './garden-data.js';
import { focusRemaining } from './focus-data.js';
import { clockText } from './focus.js';
import { pixelIcon } from './pixel-icons.js';

// A read-only projection, never another store, timer or media player. No diary
// titles/body or mood notes enter the desktop's DOM or accessible descriptions.
export function desktopState(world,focus=world.focus,music={},date=new Date()) {
  const key=dateKey(date),plant=world.garden.plants.find(p=>!p.collected);
  const current=focus.current,remaining=focusRemaining(focus,date.getTime());
  const playlist=world.music.playlists.find(p=>p.id===world.music.selected);
  let musicLabel=t('live.chooseMusic');
  if(world.music.mode==='spotify'&&playlist)musicLabel=t('live.spotify',{title:playlist.name});
  else if(world.music.mode==='local'&&world.player)musicLabel=t(music.playing?'live.song':music.ended?'live.finished':music.paused?'live.pausedSong':'live.localSong',{title:world.player.title});
  return {date:key,day:date.getDate(),dateLabel:formatDate(date,{weekday:'short',month:'short',day:'numeric'}),
    fullDate:formatDate(date,{weekday:'long',month:'long',day:'numeric',year:'numeric'}),
    diaryToday:world.diary.some(r=>r.date===key),plantStage:plant?stage(growth(world.garden,plant)):'',
    focusLabel:current?(current.status==='paused'?t('live.paused'):clockText(remaining)):'',
    focusSummary:current?t(current.status==='paused'?'live.pausedFocus':'live.focus',{time:clockText(remaining)}):'',
    musicLabel,playing:world.music.mode==='local'&&!!music.playing};
}
const write=(node,value)=>{if(node&&node.textContent!==value)setLocalizedText(node, value);};
export function syncDesktop(ctx) {
  const root=document.querySelector('.personal-desktop');if(!root||!ctx.world)return;
  const s=desktopState(ctx.world,ctx.clock?.snapshot()||ctx.world.focus,ctx.music?.snapshot()||{});
  const entry=key=>root.querySelector('[data-entry="'+key+'"]');
  function art(key,signature,options) {
    const anchor=entry(key);if(!anchor||anchor.dataset.artState===signature)return;
    anchor.dataset.artState=signature;anchor.querySelector('.desktop-icon-art').replaceChildren(pixelIcon(key,options));
  }
  art('calendar',String(s.day),{day:s.day});
  art('diary',String(s.diaryToday),{bookmark:s.diaryToday});
  art('moods',s.plantStage||'empty',{stage:s.plantStage||'empty'});
  const diary=entry('diary');diary.dataset.bookmark=String(s.diaryToday);
  write(diary.querySelector('.desktop-state-sr'),s.diaryToday?msg('live.diaryToday'):'');
  write(entry('calendar').querySelector('.desktop-state-sr'),s.fullDate);
  write(entry('moods').querySelector('.desktop-entry-state'),s.plantStage?msg('stages.'+s.plantStage):'');
  write(entry('focus').querySelector('.desktop-entry-state'),s.focusLabel);
  const player=entry('player');player.dataset.playing=String(s.playing);
  write(player.querySelector('.desktop-state-sr'),s.musicLabel);
  const date=root.querySelector('.desktop-date');date.dateTime=s.date;setLocalizedAttribute(date, 'aria-label', s.fullDate);write(date,s.dateLabel);
  const music=root.querySelector('.desktop-music');write(music.querySelector('[data-music-summary]'),s.musicLabel);setLocalizedAttribute(music, "title", s.musicLabel);
  const focus=root.querySelector('.focus-indicator');focus.hidden=!s.focusSummary;write(focus.querySelector('[data-focus-summary]'),s.focusSummary);
}
