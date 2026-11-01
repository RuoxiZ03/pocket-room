import { LocalizedError, errorMessage, msg, setLocalizedAttribute, setLocalizedText } from "./i18n.js";
import { avatarEditor } from './avatar.js';
import { profilePage } from './profile-view.js';
import { discArt } from './sound-art.js';
import { safeURL } from './model.js';
import { picture } from './media.js';
import { el, text, button, field, value, toolbar, panel, empty, externalLink, openEditor, confirmAction, photoFields, notify, icon } from './ui.js';

export function profilePicture(ctx, className = 'avatar') {
  return ctx.world.profile.avatar ? picture(ctx.world.profile.avatar, msg("personal.yourProfilePhoto"), className) : el('img', { src: 'assets/default-avatar.svg', alt: msg("personal.defaultPixelAvatar"), class: className+' default-avatar', width: 108, height: 108 });
}
export const nickname = ctx => ctx.world.profile.nickname || msg('profile_extra.dreamer');
export function profileEditor(ctx) {
  const p = ctx.world.profile;
  const avatar = avatarEditor(p.avatar);
  let saved=false;
  const editorBody = openEditor(msg("personal.editProfile"), [
    avatar.node,
    field(msg("personal.nickname"), 'nickname', p.nickname, { maxlength: 80, placeholder: msg("personal.dreamer") }),
    field(msg("personal.aboutYou"), 'bio', p.bio, { type: 'textarea', maxlength: 2000 }),
    field(msg("personal.hobbies"), 'hobbies', p.hobbies, { type: 'textarea', maxlength: 1000, rows: 2 }),
    text('p',msg('profileCard.hobbyHint'),'help'),
    field(msg("personal.currentlyLearning"), 'learning', p.learning, { maxlength: 500 }),
    field(msg("personal.currentlyReading"), 'reading', p.reading, { maxlength: 500 }),
    field(msg("personal.currentlyListening"), 'listening', p.listening, { maxlength: 500 }),
    field(msg("personal.personalLinksOnePerLineLabelHttpsExampleCom"), 'links', p.links.map(l => `${l.label} | ${l.url}`).join('\n'), { type: 'textarea', maxlength: 22000 }),
    text('p', msg("personal.savedOnlyInThisBrowserTheseDetailsAreNot"), 'help'),
  ], async form => {
    const links = value(form, 'links').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const separator = line.indexOf('|');
      if (separator < 1) throw new LocalizedError(msg("personal.writeEachLinkAsLabelHttpsExampleCom"));
      return { label: line.slice(0, separator).trim(), url: safeURL(line.slice(separator + 1).trim()) };
    });
    if (links.length > 10 || links.some(l => !l.url || l.label.length > 80)) throw new LocalizedError(msg("personal.useUpTo10LinksWithLabelsOf80"));
    const media = await avatar.collect();
    const profile = { ...p, links, avatar: media.photos[0] || null };
    for (const key of ['nickname', 'bio', 'hobbies', 'learning', 'reading', 'listening']) profile[key] = value(form, key);
    await ctx.save({ ...ctx.world, profile }, media.files);
    saved=true;
    ctx.feedback('profile');
    notify(msg("personal.profileSaved"));
  });
  editorBody.classList.add('profile-editor');
  editorBody.dispose = ()=>{
    avatar.dispose();
    // Save replaces the reading DOM; focus its new Edit button after the dialog closes.
    if(saved&&document.body.dataset.app==='about')document.querySelector('.profile-identity button')?.focus({preventScroll:true});
  };
}
export function aboutPage(ctx) {
  return profilePage(ctx,profilePicture,()=>profileEditor(ctx));
}
export function playerEditor(ctx) {
  const song = ctx.world.player;
  const cover = photoFields(song?.cover ? [song.cover] : [], { single: true, label: msg("common.coverOptional") });
  const audio = photoFields(song?.audio ? [song.audio] : [], { single: true, kind: 'audio', label: msg("personal.localAudioFileOptional") });
  openEditor(song ? msg("personal.editNowPlaying") : msg("personal.addASong"), [
    field(msg("personal.songTitle"), 'title', song?.title || '', { required: true, maxlength: 150 }),
    field(msg("personal.artist"), 'artist', song?.artist || '', { maxlength: 150 }),
    field(msg("personal.songLinkOptional"), 'link', song?.link || '', { type: 'url', maxlength: 2000, placeholder: 'https://' }), cover.node, audio.node,
    text('p', msg("personal.musicStaysLocalLinksOpenOnlyWhenYouChoose"), 'help'),
  ], async form => {
    const c = await cover.collect();
    const a = await audio.collect();
    const player = { title: value(form, 'title'), artist: value(form, 'artist'), link: safeURL(value(form, 'link')), cover: c.photos[0] || null, audio: a.photos[0] || null };
    await ctx.save({ ...ctx.world, player }, [...c.files, ...a.files]);
    notify(msg("personal.yourSoundtrackIsReady"));
  });
}
export function localPlayer(ctx, media) {
  const song=ctx.world.player;
  const root=el('div',{class:'player-window stereo-player'});
  const disc=el('div',{class:'stereo-disc','aria-hidden':'true'},discArt(),el('div',{class:'disc-label'},song?.cover ? media.picture(song.cover,msg('i18n.songCover')) : text('span','PR')),el('span',{class:'disc-center'}));
  const status=text('p',song?.audio ? msg("personal.loadingLocalAudio") : song ? msg("personal.linkOnlySongPlaybackIsNotSimulated") : msg("personal.noLocalAudioLoaded"),'stereo-status');
  const elapsed=text('span','— / —','audio-time');
  const seek=el('input',{type:'range',min:0,max:1,step:.1,value:0,disabled:true,'aria-label':msg("personal.audioProgress")});
  const play=button(msg("common.play"),async()=>{
    try {if(audio.paused)await audio.play();else {audio.pause();root.classList.remove('is-playing');setLocalizedText(play, msg("common.play"));}}
    catch {setLocalizedText(status, msg("personal.playbackCouldNotStartTryAnotherLocalAudioFile"));root.classList.remove('is-playing');}
  },'stereo-play');play.disabled=true;
  const stop=button(msg("common.stop"),()=>{audio.pause();audio.currentTime=0;root.classList.remove('is-playing');});stop.disabled=true;
  const audio=song?.audio?el('audio',{preload:'metadata',hidden:true}):null;
  if(audio) {
    const time=s=>Number.isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'—';
    const update=()=>{
      const ready=Number.isFinite(audio.duration)&&audio.duration>0&&!audio.error;
      play.disabled=stop.disabled=seek.disabled=!ready;
      seek.max=ready?audio.duration:1;seek.value=audio.currentTime||0;
      setLocalizedAttribute(seek, 'aria-valuetext', msg("personal.of", {p1: time(audio.currentTime), p2: time(audio.duration)}));
      setLocalizedText(elapsed, msg("personal.value", {p1: time(audio.currentTime), p2: time(audio.duration)}));
      setLocalizedText(play, audio.paused ? msg("common.play") : msg("common.pause"));
      if(ready)setLocalizedText(status, audio.ended ? msg("personal.finished") : audio.paused ? msg("personal.localAudioReadyWhenYouAre") : msg("personal.playingLocalAudio"));
      if(audio.paused||audio.ended)root.classList.remove('is-playing');
    };
    ['loadedmetadata','durationchange','timeupdate','play','pause','ended'].forEach(event=>audio.addEventListener(event,update));
    audio.addEventListener('playing',()=>root.classList.add('is-playing'));
    audio.addEventListener('waiting',()=>{root.classList.remove('is-playing');setLocalizedText(status, msg("personal.bufferingLocalAudio"));});
    seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(seek.value);});
    audio.addEventListener('error',()=>{play.disabled=stop.disabled=seek.disabled=true;root.classList.remove('is-playing');setLocalizedText(status, msg("personal.thisAudioCannotBePlayedEditTheSongTo"));});
    media.urlFor(song.audio).then(url=>{if(url&&audio.isConnected)audio.src=url;}).catch(e=>setLocalizedText(status, errorMessage(e)));
  }
  root.append(...[el('div',{class:'stereo-top'},text('span',msg("personal.pocketStereo")),text('span',msg("personal.localSound"))),
    el('div',{class:'stereo-body'},el('div',{class:'record-well'},disc,el('span',{class:'tone-arm','aria-hidden':'true'})),
      el('div',{class:'stereo-display'},text('small',msg("personal.nowPlaying")),text('h3',(song?.title || msg("personal.yourSoundtrack"))),text('p',(song?.artist || msg("personal.chooseASongToMakeThisSpaceYours"))),status,song?.link ? externalLink(msg("personal.openSong"),song.link) : null)),
    audio,el('div',{class:'stereo-controls'},play,stop,seek,elapsed),
    song?el('details',{class:'local-record-drawer'},text('summary',msg('soundUI.recordDrawer')),
      el('div',{class:'local-record-row'},text('strong',song.title),text('span',msg('music.selected'),'record-selected')),
      toolbar(button(msg('personal.editSong'),()=>playerEditor(ctx),'primary'),button(msg("personal.removeSong"),async()=>{
      if(await confirmAction(msg("personal.removeThisSong"),msg("personal.theSongSettingsAndUnsharedLocalAudioCoverWill")))await ctx.save({...ctx.world,player:null});
    })),text('p',msg('soundUI.singleLocalRecord'),'help')):toolbar(button(msg('personal.addMusic'),()=>playerEditor(ctx),'primary'))].filter(Boolean));
  return root;
}
