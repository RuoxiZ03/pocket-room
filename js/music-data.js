import { LocalizedError, msg } from "./i18n.js";
export const initialMusic=()=>({version:1,mode:'local',selected:null,playlists:[]});
export function spotifyPlaylist(value) {
  let url;try {url=new URL(value.trim());}catch {throw new LocalizedError(msg("music_data.pasteAFullHttpsOpenSpotifyComPlaylistUrl"));}
  const match=/^\/(?:intl-[a-z]{2}\/)?playlist\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
  if(url.protocol!=='https:'||url.hostname!=='open.spotify.com'||url.port||url.username||url.password||!match)throw new LocalizedError(msg("music_data.useAFullSpotifyPlaylistUrlShortLinksTracks"));
  return match[1];
}
export const spotifyURL=id=>'https://open.spotify.com/playlist/'+id;
export const spotifyEmbedURL=id=>'https://open.spotify.com/embed/playlist/'+id;
export function validMusic(m) {
  if(!m||m.version!==1||!['local','spotify'].includes(m.mode)||!Array.isArray(m.playlists)||m.playlists.length>100)return false;
  if(!m.playlists.every(p=>p&&typeof p.id==='string'&&p.id.length>0&&p.id.length<=100&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=100&&typeof p.spotifyId==='string'&&/^[A-Za-z0-9]{22}$/.test(p.spotifyId)))return false;
  return new Set(m.playlists.map(p=>p.id)).size===m.playlists.length&&new Set(m.playlists.map(p=>p.spotifyId)).size===m.playlists.length&&(m.selected===null||m.playlists.some(p=>p.id===m.selected));
}
