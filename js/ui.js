import { LocalizedError, appendLocalized, createLanguageSwitch, errorMessage, msg, setLocalizedAttribute, setLocalizedText } from "./i18n.js";
import { safeURL, uid } from './model.js';
import { picture, readFiles } from './media.js';
export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') node.className = value;
    else if (['value', 'checked', 'hidden', 'disabled', 'required', 'multiple'].includes(key)) node[key] = value;
    else if (value !== undefined && value !== null) setLocalizedAttribute(node,key,value);
  }
  appendLocalized(node,...children);
  return node;
}
export const text = (tag, value, className = '') => el(tag, { class: className }, value);
export const button = (label, action, className = '') => el('button', { type: 'button', class: className, onclick: () => run(action) }, label);
export function link(label, url, className = '') { return el('a', { href: url, class: className }, label); }
export function externalLink(label, url) { return el('a', { href: safeURL(url), target: '_blank', rel: 'noopener noreferrer' }, label, ' ↗'); }
export function routeLink(label, section, options = {}, className = '') {
  const params = new URLSearchParams(options).toString();
  return link(label, `#/${section}${params ? '?' + params : ''}`, className);
}
const paths = {
  home: '<path d="m3 11 9-8 9 8M5 9v12h14V9M9 21v-7h6v7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 4h2"/>',
  diary: '<path d="M5 3h13a2 2 0 0 1 2 2v16H6a3 3 0 0 1 0-6h14M6 3v12m4-7h6m-6 3h4"/>',
  moods: '<path d="M12 15v7m0-4 5-2m-5 3-5-2"/><path d="M12 4c-5-5-9 2-5 5-6 3-1 9 3 5 3 6 9 1 6-3 6-1 4-8-1-6-1-5-6-4-3-1Z"/><circle cx="12" cy="10" r="2"/>',
  memories: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16h18M6 13l4-5 4 4 3-2 4 4"/><circle cx="17" cy="7" r="1"/>',
  shelf: '<path d="M3 21h18M4 4h4v14H4zm6-2h4v16h-4zm6 4 4-1 3 12-4 1z"/>',
  player: '<rect x="2" y="5" width="20" height="15" rx="3"/><circle cx="8" cy="12" r="3"/><path d="m15 10 4 2-4 2zm-9 7h12M8 2h8"/>',
  about: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  backup: '<path d="M4 8h16v13H4zM3 3h18v5H3zm6 9h6m-3 0v5m-2-2 2 2 2-2"/>',
};
export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  // Only developer-owned constant SVG paths enter innerHTML.
  svg.innerHTML = paths[name] || paths.home;
  return svg;
}
export const sections = [
  ['calendar', 'My Calendar', 'Make a little room for your plans.'],
  ['focus', 'Focus Clock', 'A little time for one thing.'],
  ['diary', 'Little Diary', 'A few words to keep the day.'],
  ['moods', 'Mood Garden', 'Every feeling has a place to bloom.'],
  ['memories', 'Memory Box', 'Photos and moments worth keeping.'],
  ['shelf', 'My Shelf', 'Books, films and little discoveries.'],
  ['player', 'Now Playing', 'A soundtrack for your corner.'],
  ['about', 'About Me', 'A space that feels like you.'],
].map(([id,label,description])=>[id,msg('modules.'+id),description]);
export function panel(title, ...children) { return el('section', { class: 'card' }, text('h3', title), ...children); }
export function empty(message, action) { return el('div', { class: 'empty' }, text('p', message), action); }
export function toolbar(...children) { return el('div', { class: 'toolbar' }, children); }
export function field(label, name, value = '', options = {}) {
  const { type = 'text', choices, ...attrs } = options;
  let input;
  if (choices) input = el('select', { name, id: `field-${name}`, ...attrs }, choices.map(c => {
    const [v, label] = Array.isArray(c) ? c : [c, c];
    return el('option', { value: v }, label);
  }));
  else input = el(type === 'textarea' ? 'textarea' : 'input', { name, id: `field-${name}`, ...(type === 'textarea' ? { rows: 4 } : { type }), ...attrs });
  if (type !== 'file') input.value = value ?? '';
  return el('label', { class: 'field', for: `field-${name}` }, text('span', label), input);
}
export const value = (form, key) => form.elements.namedItem(key).value.trim();
let toastTimer;
export function notify(message, error = false) {
  const toast = document.getElementById('toast');
  setLocalizedText(toast, message);
  toast.className = error ? 'visible error' : 'visible';
  clearTimeout(toastTimer);
  if (!error) toastTimer = setTimeout(() => toast.className = '', 4500);
}
export async function run(action) {
  try { await action(); } catch (error) { notify((errorMessage(error) || msg("common.somethingCouldNotBeSavedPleaseTryAgain")), true); }
}
export function confirmAction(title, message, confirmLabel = msg('common.delete')) {
  const dialog = document.getElementById('confirm-dialog');
  dialog.classList.toggle('pixel-ui', ['moods','shelf','diary','memories','focus','player','about'].includes(document.body.dataset.app));
  return new Promise(resolve => {
    const finish = result => { dialog.close(); resolve(result); };
    dialog.replaceChildren(el('div', { class: 'dialog-chrome' },
      el('div',{class:'dialog-language-header'},text('h2',title),createLanguageSwitch(()=>notify(msg('i18n.preferenceNotSaved'),true))), text('p', message), toolbar(button(msg("common.cancel"), () => finish(false)), button(confirmLabel, () => finish(true), 'primary'))));
    dialog.oncancel = event => { event.preventDefault(); finish(false); };
    dialog.showModal();
    dialog.querySelector('.toolbar button')?.focus();
  });
}
let dirty = false;
export async function closeEditor(force = false) {
  const dialog = document.getElementById('editor');
  if (!dialog.open) return true;
  if (!force && dirty && !await confirmAction(msg("common.leaveThisEntry"), msg("common.yourUnsavedEditsWillBeDiscarded"), msg("common.discardEdits"))) return false;
  dialog.close();
  dialog.querySelector('#entry-form,.detail-body')?.dispose?.();
  dirty = false;
  return true;
}
export function openEditor(title, content, onSave) {
  const dialog = document.getElementById('editor');
  dialog.classList.toggle('pixel-ui', ['moods','shelf','diary','memories','focus','player','about'].includes(document.body.dataset.app));
  dialog.querySelector('#entry-form,.detail-body')?.dispose?.();
  const heading = text('h2', title);
  heading.id = 'editor-title';
  const body = onSave ? el('form', { id: 'entry-form' }, content) : el('div', { class: 'detail-body' }, content);
  const error = el('p', { class: 'form-error', role: 'alert' });
  if (onSave) {
    const submit = el('button', { type: 'submit', class: 'primary' }, msg("common.save"));
    body.append(error, toolbar(button(msg("common.cancel"), () => closeEditor()), submit));
    body.addEventListener('input', () => dirty = true);
    body.addEventListener('change', () => dirty = true);
    body.addEventListener('submit', async event => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      setLocalizedText(error, '');
      try {
        if (await onSave(body) !== false) await closeEditor(true);
      }
      catch (e) { setLocalizedText(error, errorMessage(e)); }
      finally { submit.disabled = false; }
    });
  }
  dialog.replaceChildren(el('div', { class: 'dialog-chrome' }, el('div', { class: 'titlebar' }, heading, createLanguageSwitch(()=>notify(msg('i18n.preferenceNotSaved'),true)), button('×', () => closeEditor(), 'close-button')), body));
  setLocalizedAttribute(dialog.querySelector('.close-button'),'aria-label',msg('i18n.close'));
  dirty = false;
  dialog.oncancel = event => { event.preventDefault(); run(() => closeEditor()); };
  if (!dialog.open) dialog.showModal();
  return body;
}
export function photoFields(existing = [], { single = false, kind = 'image', label = msg('common.photosOptional') } = {}) {
  const keep = new Set(existing.filter(Boolean));
  const picker = filePicker(label, kind === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'audio/*', !single);
  const input = picker.input;
  const node = el('div', { class: 'media-fields' }, picker.node,
    text('p', kind === 'image' ? msg("common.jpegPngWebpOrGifUpTo10Mb", {p1: single ? msg("common.oneImage") : msg("common.10PhotosPerEntry")}) : msg("common.localAudioUpTo30MbBrowserCodecSupport"), 'help'),
    el('div', { class: 'media-previews' }, existing.filter(Boolean).map(id => {
      const remove = el('input', { type: 'checkbox', onchange: () => remove.checked ? keep.delete(id) : keep.add(id) });
      return el('div', {}, kind === 'image' ? picture(id, msg("common.savedPhoto")) : text('span', msg("common.savedAudioFile")), el('label', {}, remove, msg("common.removeSavedFile")));
    })));
  return { node, async collect() {
    const files = await readFiles(input, kind);
    const photos = single && files.length ? files.map(f => f.id) : [...keep, ...files.map(f => f.id)];
    if (photos.length > (single ? 1 : 10)) throw new LocalizedError(single ? msg("common.chooseOneFile") : msg("common.keepUpTo10PhotosPerEntryRemoveA"));
    return { photos, files };
  } };
}
// Translate our controls; the browser/OS file picker keeps its own language.
// The real input remains focusable and is activated by its accessible label.
export function filePicker(label, accept, multiple = false) {
  const id = `upload-${uid()}`;
  const input = el('input', { id, type: 'file', accept, multiple, class: 'file-input', 'aria-label': label });
  const selection = text('span', msg("common.noFileSelected"), 'file-selection');
  input.addEventListener('change', () => { setLocalizedText(selection, ([...input.files].map(file => file.name).join(', ') || msg("common.noFileSelected"))); });
  const node = el('div', { class: 'field upload-field' }, text('span', label),
    el('label', { class: 'upload-control', for: id }, input, text('span', multiple ? msg("common.chooseFiles") : msg("common.chooseFile"), 'pill'), selection));
  return { input, node };
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function searchTools(onChange, { date = false, placeholder = msg('i18n.searchText') } = {}) {
  const search = el('input', { type: 'search', placeholder, 'aria-label': placeholder, maxlength: 150 });
  const day = el('input', { type: 'date', 'aria-label': msg("common.filterByDate") });
  const update = () => onChange(search.value.trim().toLowerCase(), day.value);
  search.addEventListener('input', update);
  day.addEventListener('change', update);
  return toolbar(search, date ? day : null, button(msg("common.clearFilters"), () => { search.value = ''; day.value = ''; update(); }));
}
