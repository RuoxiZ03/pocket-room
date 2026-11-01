import { LocalizedError, errorMessage, msg } from "./i18n.js";
import { emptyWorld, validateWorld, validateLegacy, mediaReferences } from './model.js';
import { focusChange } from './focus-data.js';

export const LEGACY_KEY = 'daydream-planner-v1';
const DB_NAME = 'daydream-lane-world';
let db;
const request = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
function finished(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = () => reject(tx.error || new LocalizedError(msg("storage.theStorageTransactionWasCancelled")));
  });
}
export function storageMessage(error) {
  if (error?.name === 'QuotaExceededError') return msg('i18n.storageFull');
  return error?.localized || msg('i18n.storageFailure');
}
export async function openStorage(name = DB_NAME) {
  if (!globalThis.indexedDB) throw new LocalizedError(msg("storage.indexeddbIsUnavailableOpenThisSiteInARegular"));
  db?.close();
  db = await new Promise((resolve, reject) => {
    const opening = indexedDB.open(name, 1);
    opening.onupgradeneeded = () => {
      for (const name of ['records', 'media', 'meta']) opening.result.createObjectStore(name);
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => reject(new LocalizedError(msg("storage.closeOtherPocketRoomTabsThenReloadToUpdate")));
  });
  db.onversionchange = () => { db.close(); location.reload(); };
  await migrateContent();
  return readWorld();
}
// Record-schema migration is atomic and idempotent; object stores/DB version
// remain unchanged. Failure preserves the original v2/v3 snapshot unchanged.
async function migrateContent() {
  const tx=db.transaction('records','readwrite'),done=finished(tx);
  let error;
  const store=tx.objectStore('records'),getting=store.get('world');
  getting.onsuccess=()=>{
    const old=getting.result;
    if(!old||![2,3].includes(old.version))return;
    try {store.put({...validateWorld(old),revision:old.revision+1},'world');}
    catch(e){error=e;tx.abort();}
  };
  try {await done;} catch(e){throw error||e;}
}
// Read the latest snapshot inside the same write transaction. Two tabs that
// reach a deadline together can only append its session once. No other fields
// are replaced by a possibly stale timer tab.
export async function commitFocus(operation,options={},now=Date.now()) {
  const tx=db.transaction('records','readwrite'),done=finished(tx),store=tx.objectStore('records');
  let result,error;
  const getting=store.get('world');
  getting.onsuccess=()=>{
    try {
      const world=validateWorld(getting.result||emptyWorld()),focus=focusChange(world.focus,operation,options,now);
      const changed=JSON.stringify(focus)!==JSON.stringify(world.focus);
      const next=changed?{...world,focus,revision:world.revision+1}:world;validateWorld(next);
      if(changed)store.put(next,'world');result={world:next,previousRevision:world.revision,changed};
    }catch(e){error=e;tx.abort();}
  };
  try{await done;}catch(e){throw error||e;}return result;
}
export async function readWorld() {
  const tx = db.transaction('records', 'readonly');
  return validateWorld((await request(tx.objectStore('records').get('world'))) || emptyWorld());
}
export async function readMedia(id) {
  const tx = db.transaction('media', 'readonly');
  const blob = await request(tx.objectStore('media').get(id));
  if (!(blob instanceof Blob)) throw new LocalizedError(msg("storage.aSavedMediaFileIsMissingTryRestoringA"));
  return blob;
}

// One transaction writes both content and Blobs. An abort leaves the prior world intact.
// Optimistic revisions stop one open tab silently overwriting another tab's edits.
export async function commitWorld(next, additions = [], replace = false) {
  next = validateWorld(next);
  const refs = mediaReferences(next);
  const tx = db.transaction(['records', 'media'], 'readwrite');
  const done = finished(tx);
  let reason;
  const fail = message => { reason = new LocalizedError(message); tx.abort(); };
  const records = tx.objectStore('records');
  const media = tx.objectStore('media');
  const incoming = new Map(additions.map(file => [file.id, file.blob]));
  const currentRequest = records.get('world');
  currentRequest.onsuccess = () => {
    const current = currentRequest.result || emptyWorld();
    if (current.revision !== next.revision) return fail(msg("storage.thisPageIsOutOfDateBecauseAnotherTab"));
    if (replace) media.clear();
    for (const [id, blob] of incoming) media.put(blob, id);
    for (const id of refs.keys()) {
      const checking = media.getKey(id);
      checking.onsuccess = () => { if (checking.result === undefined) fail(msg("storage.aReferencedMediaFileIsMissingNothingWasSaved")); };
    }
    const keys = media.getAllKeys();
    keys.onsuccess = () => keys.result.forEach(id => { if (!refs.has(id)) media.delete(id); });
    records.put({ ...next, revision: current.revision + 1 }, 'world');
  };
  try { await done; } catch (error) { throw reason || error; }
  return { ...next, revision: next.revision + 1 };
}

// Marker and imported plans commit together. Legacy localStorage is NEVER removed.
// The transaction reads the latest world so two startup tabs cannot migrate twice.
export async function migrateLegacy() {
  const checkTx = db.transaction('meta', 'readonly');
  if (await request(checkTx.objectStore('meta').get('planner-v1-migrated'))) return { migrated: false };
  let legacy;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    legacy = raw === null ? [] : validateLegacy({ ...JSON.parse(raw), version: 1 });
  } catch (error) {
    throw new LocalizedError(msg("storage.oldPlannerMigrationCouldNotFinishYourOldData", {p1: errorMessage(error)}));
  }
  const tx = db.transaction(['records', 'meta'], 'readwrite');
  const done = finished(tx);
  const marker = tx.objectStore('meta').get('planner-v1-migrated');
  let imported = 0;
  let validationError;
  marker.onsuccess = () => {
    if (marker.result) return;
    const records = tx.objectStore('records');
    const getting = records.get('world');
    getting.onsuccess = () => {
      const world = getting.result || emptyWorld();
      const ids = new Set(world.tasks.map(t => t.id));
      const additions = legacy.filter(t => !ids.has(t.id));
      imported = additions.length;
      const next = { ...world, tasks: [...world.tasks, ...additions], revision: world.revision + 1 };
      try { validateWorld(next); }
      catch (error) { validationError = error; tx.abort(); return; }
      records.put(next, 'world');
      tx.objectStore('meta').put(true, 'planner-v1-migrated');
    };
  };
  try { await done; } catch (error) { throw validationError || error; }
  return { migrated: true, imported };
}
