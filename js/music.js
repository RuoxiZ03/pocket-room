import { LocalizedError, msg, setLocalizedAttribute, setLocalizedText } from "./i18n.js";
import { uid } from './model.js';
import { readMedia } from './storage.js';
import { localPlayer } from './personal.js';
import { spotifyPlaylist,spotifyURL,spotifyEmbedURL } from './music-data.js';
import { el,text,button,toolbar,field,value,openEditor,confirmAction,externalLink,routeLink,notify } from './ui.js';
import { pixelIcon } from './pixel-icons.js';

// One body-owned panel, never mounted inside the disposable #view. An iframe
// must not be moved/reparented during routing, because that can reload it.
export function createMusicPanel(ctx) {
  let key=null,generation=0,loadedId=null,frame=null;
  const urls=new Set();
  const label=text('strong',msg("music.musicCorner"));label.setAttribute('role','heading');label.setAttribute('aria-level','2');label.tabIndex=-1;
  const body=el('div',{class:'music-panel-body'}),local=el('div',{class:'music-local-slot'}),library=el('div',{class:'music-management-slot'});
  const message=text('p',msg("music.selectAPlaylistInNowPlayingThenLoadIt"),'help');
  const fallback=el('a',{target:'_blank',rel:'noopener noreferrer',hidden:true},msg("music.openInSpotify"));
  const load=button(msg("music.loadSpotify"),()=>loadSpotify(),'primary');
  const unload=button(msg("music.unloadSpotify"),()=>unloadSpotify());unload.hidden=true;
  const embedSlot=el('div',{class:'spotify-embed-slot'});
  const spotify=el('section',{class:'spotify-panel'},toolbar(load,unload,fallback),embedSlot,message,
    text('p',msg("music.spotifyControlsPlaybackAvailabilityAndSignInRequirementsNo"),'help'));
  const closeApp=routeLink('×','home',{},'app-close music-app-close');
  setLocalizedAttribute(closeApp,'aria-label',msg('soundUI.closeMusic'));
  closeApp.addEventListener('click',()=>{body.hidden=true;setLocalizedText(collapse,msg('music.expand'));layout();});
  const panel=el('aside',{id:'music-panel',class:'music-panel pixel-ui',hidden:true,'aria-label':msg("music.musicCorner")},
    el('header',{class:'music-panel-title'},pixelIcon('player'),label,
      button(msg("music.collapse"),()=>{body.hidden=!body.hidden;setLocalizedText(collapse, body.hidden ? msg("music.expand") : msg("music.collapse"));layout();}),
      button(msg("music.stopClose"),()=>{pauseLocal();unloadSpotify();panel.hidden=true;layout();if(document.body.dataset.app==='player')location.hash=history.state?.roomOrigin?'#/room':'#/home';},'music-close'),closeApp),
    body);
  const collapse=panel.querySelector('header button');
  const tabs=toolbar(modeButton(msg('music.localMusic'),'local'),modeButton('Spotify','spotify'));tabs.classList.add('music-mode-tabs');
  body.append(tabs,local,spotify,library,text('p',msg("music.collapseThePanelToKeepWorkingYourLoadedPlayer"),'music-panel-hint'),routeLink(msg("music.manageMusic"),'player',{},'text-link'));
  document.body.append(panel);
  function modeButton(name,mode) {const b=button(name,()=>ctx.save({...ctx.world,music:{...ctx.world.music,mode}}));b.dataset.musicMode=mode;return b;}
  function pauseLocal(){local.querySelector('audio')?.pause();local.querySelector('.stereo-player')?.classList.remove('is-playing');}
  function unloadSpotify(){frame?.remove();frame=null;loadedId=null;embedSlot.replaceChildren();unload.hidden=true;load.hidden=false;}
  function layout(){document.body.classList.toggle('music-open',!panel.hidden);document.body.classList.toggle('music-expanded',!panel.hidden&&!body.hidden);}
  function show(){panel.hidden=false;body.hidden=false;setLocalizedText(collapse, msg("music.collapse"));layout();}
  function selected(){return ctx.world.music.playlists.find(p=>p.id===ctx.world.music.selected);}
  function loadSpotify() {
    const p=selected();if(!p){notify(msg("music.addAndSelectASpotifyPlaylistFirst"),true);return;}
    if(ctx.world.music.mode!=='spotify'){notify(msg("music.chooseSpotifyModeBeforeLoadingAPlaylist"),true);return;}
    pauseLocal();show();
    if(loadedId===p.id&&frame)return;
    unloadSpotify();
    frame=el('iframe',{src:spotifyEmbedURL(p.spotifyId),title:msg("music.spotifyPlaylist", {p1: p.name}),width:'100%',height:352,frameborder:0,allowfullscreen:'',allow:'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',loading:'lazy'});
    frame.addEventListener('error',()=>setLocalizedText(message, msg("music.theSpotifyPlayerCouldNotLoadUseOpenIn")));
    embedSlot.append(frame);loadedId=p.id;load.hidden=true;unload.hidden=false;
    setLocalizedText(message, msg("music.officialSpotifyPlayerIfItIsUnavailableUseOpen"));
  }
  function sync(force=false) {
    const w=ctx.world;if(!w)return;
    panel.setAttribute('role',document.body.dataset.app==='player'?'main':'complementary');
    const current=JSON.stringify(w.player);
    if(force||key!==current) {
      generation++;const ownGeneration=generation;
      pauseLocal();local.replaceChildren();for(const u of urls)URL.revokeObjectURL(u);urls.clear();key=current;
      const media={async urlFor(id){const blob=await readMedia(id);if(ownGeneration!==generation)return null;const url=URL.createObjectURL(blob);urls.add(url);return url;},
        picture(id,alt){const img=el('img',{alt});media.urlFor(id).then(url=>{if(url&&img.isConnected)img.src=url;}).catch(()=>setLocalizedAttribute(img, "alt", msg("music.unavailable", {p1: alt})));return img;}};
      local.append(localPlayer(ctx,media));
      const audio=local.querySelector('audio');
      if(audio)for(const event of ['playing','pause','ended','waiting','error','emptied'])audio.addEventListener(event,()=>ctx.refreshDesktop?.());
    }
    const p=selected();
    if(force||w.music.mode==='local'||loadedId&&loadedId!==p?.id)unloadSpotify();
    if(w.music.mode==='spotify')pauseLocal();
    local.hidden=w.music.mode!=='local';spotify.hidden=w.music.mode!=='spotify';
    setLocalizedText(label, w.music.mode==='spotify' ? (p?.name || msg("music.spotifyPlaylists")) : (w.player?.title || msg("music.localMusic")));
    if(document.body.dataset.app==='player')setLocalizedText(label,msg('modules.player'));
    closeApp.href=history.state?.roomOrigin?'#/room':'#/home';
    fallback.hidden=!p;if(p)fallback.href=spotifyURL(p.spotifyId);else fallback.removeAttribute('href');
    load.disabled=!p;
    if(frame)setLocalizedAttribute(frame, "title", msg("music.spotifyPlaylist", {p1: p.name}));
    if(!frame)setLocalizedText(message, p ? msg("music.readyLoadingConnectsToSpotifyOnlyWhenYouChoose", {p1: p.name}) : msg("music.addAPlaylistInNowPlayingNothingConnectsTo"));
    panel.querySelectorAll('[data-music-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.musicMode===w.music.mode)));
    ctx.refreshDesktop?.();
  }
  function snapshot(){const audio=local.querySelector('audio');return {playing:!!(ctx.world?.music.mode==='local'&&audio&&!audio.paused&&!audio.ended&&!audio.error&&local.querySelector('.is-playing')),paused:!!(audio?.paused&&audio.currentTime>0&&!audio.ended),ended:!!audio?.ended};}
  return {show,sync,snapshot,loadSpotify,unloadSpotify,
    mountLibrary(node){library.replaceChildren(node);},
    dispose(){generation++;pauseLocal();unloadSpotify();for(const u of urls)URL.revokeObjectURL(u);urls.clear();panel.hidden=true;layout();panel.remove();}};
}
function playlistEditor(ctx,existing=null) {
  openEditor(existing ? msg("music.renameSpotifyPlaylist") : msg("music.addSpotifyPlaylist"),[
    field(msg("music.playlistName"),'playlist-name',existing?.name||'',{required:true,maxlength:100}),
    existing?null:field(msg("music.spotifyPlaylistUrl"),'playlist-url','',{type:'url',required:true,maxlength:2000,placeholder:msg("music.httpsOpenSpotifyComPlaylist")}),
    text('p',msg("music.fullPlaylistLinksOnlyNoShortLinkExpansionAccount"),'help'),
  ],async form=>{
    const m=ctx.world.music,name=value(form,'playlist-name');
    if(existing){await ctx.save({...ctx.world,music:{...m,playlists:m.playlists.map(p=>p.id===existing.id?{...p,name}:p)}});notify(msg("music.playlistRenamed"));return;}
    const spotifyId=spotifyPlaylist(value(form,'playlist-url'));
    if(m.playlists.some(p=>p.spotifyId===spotifyId))throw new LocalizedError(msg("music.thisPlaylistIsAlreadySavedSelectItFromYour"));
    if(m.playlists.length>=100)throw new LocalizedError(msg("music.keepUpTo100PlaylistsRemoveOneBeforeAdding"));
    const next={id:uid(),name,spotifyId};
    await ctx.save({...ctx.world,music:{...m,mode:'spotify',selected:next.id,playlists:[...m.playlists,next]}});ctx.music.show();notify(msg("music.playlistSavedChooseLoadSpotifyToConnect"));
  });
}
export function musicPage(ctx) {
  const m=ctx.world.music;
  // Management can re-render; the adjacent audio/iframe slots never move.
  return el('div',{class:'music-library'},
    el('details',{class:'playlist-library',open:m.mode==='spotify'?'':null},text('summary',msg('music.spotifyPlaylists')),el('header',{},button(msg("music.addSpotifyPlaylist"),()=>playlistEditor(ctx),'primary')),
      m.playlists.length ? el('ul',{class:'playlist-list'},m.playlists.map(p=>el('li',{'data-playlist-id':p.id},
        text('strong',p.name),text('span',m.selected===p.id?msg("music.selected"):'','playlist-selection'),toolbar(
          button(m.selected===p.id?msg("music.selected"):msg("music.select"),()=>ctx.save({...ctx.world,music:{...ctx.world.music,mode:'spotify',selected:p.id}})),
          button(msg("music.load", {p1: p.name}),async()=>{if(ctx.world.music.mode!=='spotify'||ctx.world.music.selected!==p.id)await ctx.save({...ctx.world,music:{...ctx.world.music,mode:'spotify',selected:p.id}});ctx.music.loadSpotify();}),
          button(msg("music.rename"),()=>playlistEditor(ctx,p)),button(msg("common.delete"),async()=>{
            if(await confirmAction(msg("music.removeThisPlaylist"),msg("music.onlyThisSavedLinkAndNameWillBeRemoved"),msg("music.removePlaylist"))){
              const current=ctx.world.music,list=current.playlists.filter(r=>r.id!==p.id);
              await ctx.save({...ctx.world,music:{...current,playlists:list,selected:current.selected===p.id?list[0]?.id||null:current.selected}});
            }
          }),externalLink(msg("music.openInSpotify2"),spotifyURL(p.spotifyId)))))) : text('p',msg("music.saveAPlaylistLinkThenChooseWhenToLoad"),'help')),
    text('p',msg("music.noAutomaticPlaybackDownloadsWebApiOrAccountAuthorization"),'help'));
}
