import { LocalizedError, msg } from "./i18n.js";
import { initialGarden, validGarden } from './garden-data.js';
import { initialFocus, validFocus } from './focus-data.js';
import { initialMusic, validMusic } from './music-data.js';
// Dates are local calendar keys, never UTC conversions (toISOString).
export const today = () => dateKey(new Date());
export function dateKey(date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '0100-01-01' && dateKey(new Date(`${value}T12:00:00`)) === value;
}
export const uid = () => crypto.randomUUID();
export const categories = ['study', 'work', 'life', 'other'];
export const moods = {
  peaceful: { label: 'Peaceful', color: '#9ebbdc' },
  happy: { label: 'Happy', color: '#eab5cc' },
  hopeful: { label: 'Hopeful', color: '#c9bfdf' },
  tired: { label: 'Tired', color: '#b4c7b1' },
  sad: { label: 'Sad', color: '#a7cbd0' },
  anxious: { label: 'Anxious', color: '#e1c596' },
  mixed: { label: 'Mixed', color: '#d6b6ca' },
  calm: { label: 'Calm', color: '#9ebbdc' },
  other: { label: 'Other', color: '#d3bbd7' },
};
export const shelfTypes = ['Book', 'Movie', 'Website', 'Other'];
export const shelfStatuses = ['Want to', 'In progress', 'Finished'];
// Optional diary metadata: absent on historical records, with no backfill needed.
export const diaryStickers = ['', 'flower', 'star', 'bow'];
export const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm', 'audio/x-m4a'];
export const limits = { image: 10 * 1024 ** 2, audio: 30 * 1024 ** 2, backup: 200 * 1024 ** 2, manifest: 5 * 1024 ** 2 };
export function emptyWorld() {
  return {
    version: 4, revision: 0, tasks: [], diary: [], moods: [], memories: [], shelf: [], garden: initialGarden(),focus:initialFocus(),music:initialMusic(),
    profile: { nickname: '', bio: '', hobbies: '', learning: '', reading: '', listening: '', avatar: null, links: [] },
    player: null,
  };
}
export function safeURL(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch { /* Invalid or relative links are not accepted. */ }
  throw new LocalizedError(msg("model.pleaseUseAFullHttpsOrHttpLinkWithout"));
}
const text = (v, max, required = false) => typeof v === 'string' && v.length <= max && (!required || v.trim().length > 0);
const id = v => text(v, 100, true);
const ref = v => v === null || id(v);
const photoList = v => Array.isArray(v) && v.length <= 10 && v.every(id) && new Set(v).size === v.length;
export function validTask(t) {
  return !!(t && id(t.id) && validDate(t.date) && text(t.title, 100, true) && text(t.notes, 500) &&
    typeof t.time === 'string' && (t.time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) &&
    categories.includes(t.category) && typeof t.done === 'boolean');
}
function linksValid(links) {
  return Array.isArray(links) && links.length <= 10 && links.every(link => link && text(link.label, 80, true) && text(link.url, 2000, true) && safeURL(link.url));
}
export function validateWorld(w) {
  const fail = () => { throw new LocalizedError(msg("model.theBackupContainsInvalidOrUnsupportedRecordsNothingHas")); };
  if (!w || ![2,3,4].includes(w.version) || !Number.isSafeInteger(w.revision) || w.revision < 0) fail();
  const validators = {
    tasks: validTask,
    diary: r => r && id(r.id) && validDate(r.date) && text(r.title, 150, true) && text(r.body, 20000, true) && photoList(r.photos) && (r.sticker === undefined || diaryStickers.includes(r.sticker)),
    moods: r => r && id(r.id) && validDate(r.date) && Object.hasOwn(moods, r.mood) && text(r.note, 500),
    memories: r => r && id(r.id) && validDate(r.date) && text(r.title, 150, true) && text(r.body, 5000) && photoList(r.photos) && r.photos.length > 0,
    shelf: r => r && id(r.id) && text(r.name, 150, true) && shelfTypes.includes(r.type) && shelfStatuses.includes(r.status) && text(r.notes, 3000) && ref(r.cover) && text(r.link, 2000) && (r.link === '' || safeURL(r.link)),
  };
  for (const [key, check] of Object.entries(validators)) {
    if (!Array.isArray(w[key]) || w[key].length > 10000 || !w[key].every(check) || new Set(w[key].map(r => r.id)).size !== w[key].length) fail();
  }
  if (new Set(w.moods.map(r => r.date)).size !== w.moods.length) fail();
  const p = w.profile;
  if (!p || !text(p.nickname, 80) || !text(p.bio, 2000) || !text(p.hobbies, 1000) || !['learning', 'reading', 'listening'].every(k => text(p[k], 500)) || !ref(p.avatar) || !linksValid(p.links)) fail();
  const s = w.player;
  if (s !== null && (!s || !text(s.title, 150, true) || !text(s.artist, 150) || !ref(s.cover) || !ref(s.audio) || !text(s.link, 2000) || (s.link && !safeURL(s.link)))) fail();
  // v2 content/backups gain a v1 garden exactly once. Old dates are reserved,
  // with no retroactive rewards; all historical moods and shelf order survive.
  if(w.version===2) w={...w,version:3,garden:initialGarden(w.moods)};
  if(!validGarden(w.garden,validDate,Object.keys(moods))) fail();
  if(w.version===3)w={...w,version:4,focus:initialFocus(),music:initialMusic()};
  if(!validFocus(w.focus,validDate)||!validMusic(w.music))fail();
  return w;
}
// A single source of media references enables validation and garbage collection.
export function mediaReferences(w) {
  const refs = new Map();
  const add = (id, kind) => {
    if (!id) return;
    if (refs.has(id) && refs.get(id) !== kind) throw new LocalizedError(msg("model.aMediaFileHasIncompatibleUses"));
    refs.set(id, kind);
  };
  w.diary.concat(w.memories).forEach(r => r.photos.forEach(id => add(id, 'image')));
  w.shelf.forEach(r => add(r.cover, 'image'));
  add(w.profile.avatar, 'image');
  add(w.player?.cover, 'image');
  add(w.player?.audio, 'audio');
  return refs;
}
export function validateLegacy(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.tasks) || data.tasks.length > 10000 || !data.tasks.every(validTask) || new Set(data.tasks.map(t => t.id)).size !== data.tasks.length) {
    throw new LocalizedError(msg("model.pleaseChooseAValidVersion1PocketRoomPlanner"));
  }
  return data.tasks;
}
