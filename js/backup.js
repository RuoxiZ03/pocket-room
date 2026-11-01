import { LocalizedError, errorMessage, msg, numberMessage, setLocalizedText } from "./i18n.js";
import { limits, validateWorld, validateLegacy, mediaReferences, today } from './model.js';
import { readMedia, LEGACY_KEY } from './storage.js';
import { validateBlob } from './media.js';
import { el, text, button, panel, toolbar, download, confirmAction, notify, filePicker } from './ui.js';

// File layout: 12-byte magic, 4-byte little-endian JSON length, UTF-8 manifest,
// then original binary Blobs in manifest order. No base64, ZIP library or CDN.
const MAGIC = new TextEncoder().encode('DAYDREAM002\n');
const digest = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
export async function encodeBackup(world) {
  world = validateWorld(world);
  const descriptors = [];
  const blobs = [];
  let total = 0;
  for (const [id, kind] of mediaReferences(world)) {
    const blob = await readMedia(id);
    await validateBlob(blob, kind);
    total += blob.size;
    if (total > limits.backup) throw new LocalizedError(msg("backup.thisWorldIsLargerThanThe200MbBackup"));
    descriptors.push({ id, kind, type: blob.type, size: blob.size, sha256: await digest(blob) });
    blobs.push(blob);
  }
  const manifest = new TextEncoder().encode(JSON.stringify({ application: 'daydream-lane', version: 2, world, media: descriptors }));
  if (manifest.length > limits.manifest) throw new LocalizedError(msg("backup.textContentExceedsThe5MbBackupMetadataLimit"));
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, manifest.length, true);
  const result = new Blob([MAGIC, length, manifest, ...blobs], { type: 'application/octet-stream' });
  if (result.size > limits.backup) throw new LocalizedError(msg("backup.theCompleteBackupMustBe200MbOrSmaller"));
  return result;
}
export async function decodeBackup(file) {
  if (file.size === 0 || file.size > limits.backup) throw new LocalizedError(msg("backup.chooseABackupSmallerThan200Mb"));
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (header.length !== 16 || !MAGIC.every((v, i) => v === header[i])) {
    if (file.size > limits.manifest) throw new LocalizedError(msg("backup.thisIsNotAPocketRoomWorldBackupOr"));
    let data;
    try { data = JSON.parse(await file.text()); } catch { throw new LocalizedError(msg("backup.thisFileIsNotAReadablePocketRoomBackup")); }
    return { legacy: true, tasks: validateLegacy(data) };
  }
  const length = new DataView(header.buffer).getUint32(12, true);
  if (!length || length > limits.manifest || 16 + length > file.size) throw new LocalizedError(msg("backup.theBackupManifestIsDamaged"));
  const manifest = JSON.parse(await file.slice(16, 16 + length).text());
  if (manifest.application !== 'daydream-lane' || manifest.version !== 2) throw new LocalizedError(msg("backup.thisBackupVersionIsNotSupported"));
  const world = validateWorld(manifest.world);
  const refs = mediaReferences(world);
  if (!Array.isArray(manifest.media) || manifest.media.length !== refs.size) throw new LocalizedError(msg("backup.theBackupIsMissingMediaRecords"));
  const seen = new Set();
  const files = [];
  let offset = 16 + length;
  for (const item of manifest.media) {
    if (!item || seen.has(item.id) || refs.get(item.id) !== item.kind || !Number.isSafeInteger(item.size) || item.size <= 0 || item.size > limits[item.kind] || offset + item.size > file.size || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new LocalizedError(msg("backup.theBackupHasInvalidMediaInformation"));
    seen.add(item.id);
    const blob = file.slice(offset, offset + item.size, item.type);
    await validateBlob(blob, item.kind);
    if (await digest(blob) !== item.sha256) throw new LocalizedError(msg("backup.aBackupMediaFileIsDamagedNothingHasBeen"));
    files.push({ id: item.id, blob });
    offset += item.size;
  }
  if (offset !== file.size) throw new LocalizedError(msg("backup.theBackupContainsUnexpectedExtraData"));
  return { legacy: false, world, files };
}
export function backupPage(ctx) {
  const progress = el('p', { role: 'status', class: 'help' });
  const exportButton = button(msg("backup.exportCompleteWorld"), async () => {
    exportButton.disabled = true;
    setLocalizedText(progress, msg("backup.preparingYourContentAndMedia"));
    try { download(await encodeBackup(ctx.world), `daydream-world-${today()}.daydream`); setLocalizedText(progress, msg("backup.backupDownloadedKeepItSomewhereSafe")); }
    finally { exportButton.disabled = false; }
  }, 'primary');
  const picker = filePicker(msg("backup.chooseABackup"), '.daydream,.json,application/json');
  const input = picker.input;
  const importButton = button(msg("backup.validateAndImport"), async () => {
    if (!input.files[0]) throw new LocalizedError(msg("backup.chooseABackupFileFirst"));
    importButton.disabled = true;
    setLocalizedText(progress, msg("backup.checkingTheFileEveryRecordAndEveryMediaChecksum"));
    try {
      const decoded = await decodeBackup(input.files[0]);
      const message=decoded.legacy ? msg('backup_extra.restorePlans',{plans:decoded.tasks.length}) : msg('backup_extra.restoreWorld',{plans:decoded.world.tasks.length,diary:decoded.world.diary.length,moods:decoded.world.moods.length,memories:decoded.world.memories.length,shelf:decoded.world.shelf.length,media:decoded.files.length,focus:decoded.world.focus.sessions.length,playlists:decoded.world.music.playlists.length});
      if (!await confirmAction(msg("backup.restoreThisBackup"), message, msg("backup.replaceAndRestore"))) { setLocalizedText(progress, msg("backup.importCancelledYourWorldIsUnchanged")); return; }
      const next = decoded.legacy ? { ...ctx.world, tasks: decoded.tasks } : { ...decoded.world, revision: ctx.world.revision };
      await ctx.save(next, decoded.files || [], !decoded.legacy);
      notify(msg("backup.backupRestored"));
    } catch (error) { setLocalizedText(progress, msg("backup.importStopped", {p1: errorMessage(error)})); throw error; }
    finally { input.value = ''; input.dispatchEvent(new Event('change')); importButton.disabled = false; }
  }, 'primary');
  const usage = text('p', msg("backup.checkingBrowserStorage"), 'help');
  navigator.storage?.estimate?.().then(info => {
    setLocalizedText(usage, msg("backup.browserEstimateMbUsedOfMbAvailableForThis", {p1: numberMessage((info.usage||0)/1024**2,{maximumFractionDigits:1}), p2: numberMessage((info.quota||0)/1024**2,{maximumFractionDigits:0})}));
  }).catch(() => setLocalizedText(usage, msg("backup.storageUsageEstimateIsUnavailableInThisBrowser")));
  return el('div', { class: 'backup-grid' },
    panel(msg("backup.takeYourWorldWithYou"), text('p', msg("backup.completeBackupsIncludeYourProfilePlansDiaryGardenMemories")), exportButton, usage),
    panel(msg("backup.restoreABackup"), text('p', msg("backup.chooseADaydreamWorldFileUpTo200Mb")), picker.node, importButton, progress),
    panel(msg("backup.oldPlannerRecovery"), text('p', msg("backup.yourOriginalLocalstoragePlannerDataIsRetainedAfterMigration")), toolbar(
      button(msg("backup.exportPlansJson"), () => download(new Blob([JSON.stringify({ version: 1, tasks: ctx.world.tasks }, null, 2)], { type: 'application/json' }), `daydream-backup-${today()}.json`)),
      button(msg("backup.downloadOriginalPlannerData"), () => {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (raw === null) throw new LocalizedError(msg("backup.thereIsNoOriginalPlannerDataOnThisBrowser"));
        download(new Blob([raw], { type: 'application/json' }), 'daydream-original-planner.json');
      }),
      button(msg("backup.retryOldPlannerMigration"), () => ctx.retryMigration())),
      text('p', msg("backup.useOneFixedAddressHttp127001"), 'help')));
}
