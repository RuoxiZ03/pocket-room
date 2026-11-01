import { LocalizedError, msg, setLocalizedAttribute } from "./i18n.js";
import { uid, imageTypes, audioTypes, limits } from './model.js';
import { readMedia } from './storage.js';
const urls = new Map();
let generation = 0;
export async function validateBlob(blob, kind) {
  const types = kind === 'image' ? imageTypes : audioTypes;
  if (!(blob instanceof Blob) || !types.includes(blob.type) || blob.size === 0 || blob.size > limits[kind]) {
    throw new LocalizedError(kind === 'image' ? msg("media.chooseAJpegPngWebpOrGifPhotoUp") : msg("media.chooseAnMp3WavOggM4aAacFlacOr"));
  }
  if (kind === 'image') {
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
      if (bitmap.width * bitmap.height > 40000000) throw new LocalizedError(msg("media.tooLarge"));
    } catch { throw new LocalizedError(msg("media.thisImageCannotBeReadOrIsLargerThan")); }
    finally { bitmap?.close(); }
  }
}
export async function readFiles(input, kind = 'image') {
  const files = [...input.files];
  if (files.length > 10) throw new LocalizedError(msg("media.chooseUpTo10PhotosPerEntry"));
  const additions = [];
  for (const file of files) {
    await validateBlob(file, kind);
    additions.push({ id: uid(), blob: file });
  }
  return additions;
}
export async function mediaURL(id) {
  if (!urls.has(id)) {
    const currentGeneration = generation;
    const pending = readMedia(id).then(blob => {
      if (currentGeneration !== generation) throw new LocalizedError(msg("media.theMediaViewChanged"));
      return URL.createObjectURL(blob);
    });
    urls.set(id, pending);
    pending.catch(() => { if (urls.get(id) === pending) urls.delete(id); });
  }
  return urls.get(id);
}
export function clearMediaURLs() {
  generation++;
  for (const pending of urls.values()) pending.then(url => URL.revokeObjectURL(url)).catch(() => {});
  urls.clear();
}
export function picture(id, alt, className = '') {
  const img = document.createElement('img');
  setLocalizedAttribute(img, "alt", alt);
  img.className = className;
  img.loading = 'lazy';
  mediaURL(id).then(url => { if (img.isConnected) img.src = url; }).catch(() => {
    setLocalizedAttribute(img, "alt", msg("media.mediaUnavailableTryRestoringABackup", {p1: alt}));
    img.classList.add('media-unavailable');
  });
  return img;
}
