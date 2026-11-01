import { languageSettings } from './js/language-controls.js';
import { LocalizedError, dateMessage, errorMessage, initializeI18n, msg, onLanguageChange, setLocalizedAttribute, setLocalizedText } from "./js/i18n.js";
import { openStorage, readWorld, commitWorld, migrateLegacy, storageMessage } from './js/storage.js';
import { today, validDate } from './js/model.js';
import { el, text, button, routeLink, sections, notify, closeEditor, download } from './js/ui.js';
import { clearMediaURLs } from './js/media.js';
import { roomPage } from './js/room.js';
import { desktopPage } from './js/desktop.js';
import { syncDesktop } from './js/desktop-state.js';
import { pixelIcon } from './js/pixel-icons.js';
import { calendarPage, dayDetails } from './js/calendar.js';
import { journalPage, entryEditor, entryDetails } from './js/journal.js';
import { gardenPage, moodEditor } from './js/garden.js';
import { shelfPage } from './js/shelf.js';
import { aboutPage } from './js/personal.js';
import { musicPage, createMusicPanel } from './js/music.js';
import { focusPage, createFocusClock } from './js/focus.js';
import { backupPage } from './js/backup.js';
import { initializeClickStars } from './js/effects.js';
import { animateWindow } from './js/window-motion.js';
import { initializePreferences, animationSettings } from './js/preferences.js';
import { projectPage } from './js/project.js';
import { enterContent, featureFeedback } from './js/feature-motion.js';

initializeI18n();
const view = document.getElementById('view');
const title = document.getElementById('view-title');
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('daydream-world-updates') : null;
const ctx = {
  world: null, busy: false,
  feedback: featureFeedback,
  refreshDesktop(){syncDesktop(this);},
  openApp(section, from, source) { return goTo(`#/${section}?from=${from}`, source); },
  async save(next, media = [], replace = false) {
    if (this.busy) throw new LocalizedError(msg("app.aSaveIsAlreadyInProgressPleaseWaitA"));
    this.busy = true;
    try {
      this.world = await commitWorld(next, media, replace);
      render(replace);
      channel?.postMessage('saved');
    } catch (error) { throw new LocalizedError(storageMessage(error)); }
    finally { this.busy = false; }
  },
  async upsert(collection, record, media = []) {
    const records = this.world[collection];
    await this.save({ ...this.world, [collection]: records.some(r => r.id === record.id) ? records.map(r => r.id === record.id ? record : r) : [...records, record] }, media);
  },
  async remove(collection, id) {
    await this.save({ ...this.world, [collection]: this.world[collection].filter(r => r.id !== id) });
  },
  async retryMigration() {
    await migrateLegacy();
    this.world = await readWorld();
    document.getElementById('migration-warning').hidden = true;
    render();
    notify(msg("app.oldPlannerMigrationIsCompleteTheOriginalDataIs"));
  },
};
ctx.music=createMusicPanel(ctx);
ctx.clock=createFocusClock(ctx,result=>channel?.postMessage({type:'focus',result:{...result,world:{focus:result.world.focus,revision:result.world.revision}}}));
onLanguageChange(()=>ctx.refreshDesktop());
let currentSection = 'home';
let currentParams = new URLSearchParams();
let previousHash = location.hash || '#/home';
let previousRouteState = history.state;
let returnToRoom = false;
let disposeView = () => {};

function render(force=false) {
  if (!ctx.world) return;
  ctx.clock.sync(ctx.world,force);
  disposeView();
  disposeView = () => {};
  // The body-owned music panel owns its own Blob URLs and playback lifetime.
  // Release the previous view's Blob URLs rather than retaining every visited photo.
  clearMediaURLs();
  // All routes use one app shell; no feature can fall into the old homepage.
  document.body.classList.add('desktop-mode');
  document.body.classList.toggle('desktop-home', currentSection === 'home');
  document.body.dataset.app = currentSection;
  ctx.music.sync(force);
  // Only the approved apps opt in; other application shells retain their style.
  document.querySelector('.site-frame').classList.toggle('pixel-ui', ['moods','shelf','diary','memories','focus','player','about'].includes(currentSection));
  const desktop = document.getElementById('personal-desktop');
  desktop.hidden = false;
  if (!desktop.childElementCount) desktop.append(desktopPage(ctx));
  desktop.querySelectorAll('a').forEach(a => {
    const selected = a.getAttribute('href').split('?')[0] === '#/' + currentSection;
    a.classList.toggle('is-open', selected);
    if (selected) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
  const name = currentSection === 'home' ? 'Pocket Room' : msg(['room','project','backup',...sections.map(s=>s[0])].includes(currentSection)?'modules.'+currentSection:'i18n.pageNotFound');
  title.replaceChildren(pixelIcon(['home','project'].includes(currentSection) ? 'room' : currentSection), text('span', name));
  const bar = document.querySelector('.main-titlebar');
  bar.querySelectorAll('.home-button, .room-window-actions, .app-close').forEach(node => node.remove());
  {
    const close = routeLink('×', returnToRoom ? 'room' : 'home', {}, 'app-close');
    setLocalizedAttribute(close, 'aria-label', returnToRoom ? msg("app.closeAndReturnToRoom") : msg("app.closeAndReturnToDesktop"));
    bar.append(close);
  }
  setLocalizedAttribute(document, "__documentTitle", msg("app.pocketRoom", {p1: currentSection === 'home' ? msg("app.desktop") : name}));
  let content;
  switch (currentSection) {
    case 'room': content = roomPage(ctx); disposeView = () => content.dispose(); break;
    case 'home': content = el('div'); break;
    case 'calendar': content = calendarPage(ctx, currentParams); break;
    case 'diary': case 'memories': content = journalPage(ctx, currentSection, currentParams); break;
    case 'moods': content = gardenPage(ctx, currentParams); break;
    case 'shelf': content = shelfPage(ctx); break;
    case 'player': content = musicPage(ctx); break;
    case 'focus': content = focusPage(ctx); break;
    case 'about': content = aboutPage(ctx); break;
    case 'backup': content = backupPage(ctx); content.append(animationSettings(),languageSettings()); break;
    case 'project': content = projectPage(); break;
    default: content = el('div', { class: 'empty' }, text('p', msg("app.thatCornerCouldNotBeFound")), routeLink(msg("app.returnHome"), 'home', {}, 'pill'));
  }
  if(currentSection==='memories')disposeView=()=>content.dispose();
  // The body-owned CD window is the player route. Mount only management UI;
  // audio and Spotify stay in their original persistent DOM slots.
  if(currentSection==='player'){ctx.music.mountLibrary(content);view.replaceChildren();}
  else view.replaceChildren(content);
  ctx.clock.update();
}
async function navigate() {
  if (!ctx.world) return;
  const previousSection = currentSection;
  const previousMonth = document.querySelector('.calendar-sheet')?.dataset.month;
  if (!await closeEditor()) { history.replaceState(previousRouteState, '', previousHash); return; }
  const route = location.hash.slice(1) || '/home';
  const [path, query = ''] = route.split('?');
  currentSection = path.replace(/^\//, '') || 'home';
  if (currentSection === 'classic') { currentSection = 'home'; history.replaceState(null,'','#/home'); }
  currentParams = new URLSearchParams(query);
  // The origin belongs to the browser history entry, not persistent user data.
  // Child date/entry routes inherit it; Back/Forward and reload restore it.
  if (['room', 'home', 'classic'].includes(currentSection)) returnToRoom = false;
  else if (currentParams.has('from')) returnToRoom = currentParams.get('from') === 'room';
  else returnToRoom = history.state?.roomOrigin ?? returnToRoom;
  const origin = pendingSource || history.state?.windowSource || (currentSection === previousSection || returnToRoom ? previousRouteState?.windowSource : null);
  history.replaceState({ ...history.state, roomOrigin: returnToRoom, windowSource: origin }, '', location.href);
  previousHash = location.hash || '#/home';
  previousRouteState = history.state;
  render();
  if(currentSection!==previousSection)view.scrollTop=0;
  if (currentSection !== 'home' && (previousSection !== currentSection || pendingSource)) animateWindow(document.querySelector('.site-frame'),true,origin);
  pendingSource = null;
  enterContent(currentSection, previousSection, previousMonth);
  if(currentSection==='player')ctx.music.show();
  if (currentSection === 'home') {
    const heading = document.querySelector('.desktop-identity h1');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  } else if(currentSection==='player'){
    const heading=document.querySelector('.music-panel-title strong');heading.tabIndex=-1;heading.focus({preventScroll:true});
  } else title.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
  const date = validDate(currentParams.get('date')) ? currentParams.get('date') : today();
  if (currentSection === 'calendar' && validDate(currentParams.get('date'))) dayDetails(ctx, date);
  if (['diary', 'memories'].includes(currentSection)) {
    const entry = ctx.world[currentSection].find(r => r.id === currentParams.get('id'));
    if (entry && currentSection === 'memories') entryDetails(ctx, currentSection, entry);
    else if (!entry && currentParams.get('new') === '1') entryEditor(ctx, currentSection, date);
    else if (currentParams.has('id') && !entry) notify(msg("app.thisEntryNoLongerExistsYouCanBrowseThe"));
  }
  if (currentSection === 'moods' && currentParams.get('new') === '1') moodEditor(ctx, date);
}
window.addEventListener('hashchange', () => navigate().catch(e => notify(errorMessage(e), true)));
// The music route's real main landmark is the persistent panel, not #view.
document.querySelector('.skip-link').addEventListener('click',event=>{
  if(currentSection!=='player')return;
  event.preventDefault();document.querySelector('.music-panel-title strong')?.focus();
});
// One delegated handler; listeners never accumulate as views change.
let routeBusy = false, pendingSource = null;
async function goTo(href, source = null, closing = false) {
  if(routeBusy)return;
  routeBusy=true;
  try {
    if(!await closeEditor())return;
    if(closing)animateWindow(document.querySelector('.site-frame'),false,history.state?.windowSource);
    pendingSource=source;
    if(href!==location.hash)history.pushState(null,'',href);
    await navigate();
  } finally { routeBusy=false; }
}
document.addEventListener('click', event => {
  const a=event.target.closest('a[href^="#/"]');
  if(!a||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  const shortcut=a.closest('.desktop-shortcut,.desktop-setting');
  // Footer links have a small pixel icon rather than the desktop art wrapper.
  const origin=shortcut?.querySelector('.desktop-icon-art')||shortcut?.querySelector('.pixel-icon');
  const r=origin?.getBoundingClientRect();
  goTo(a.getAttribute('href'),r?{x:r.left+r.width/2,y:r.top+r.height/2}:null,a.classList.contains('app-close')).catch(e=>notify(errorMessage(e),true));
});
channel?.addEventListener('message', event => {
  if(event.data?.type==='focus')ctx.clock.receive(event.data.result);
  else notify(msg("app.anotherTabSavedChangesReloadThisPageBeforeEditing"), true);
});

async function start() {
  try {
    ctx.world = await openStorage();
    try { await migrateLegacy(); ctx.world = await readWorld(); }
    catch (error) {
      const warning = document.getElementById('migration-warning');
      warning.hidden = false;
      warning.replaceChildren(text('strong', msg("app.yourOldPlannerNeedsAttention")), text('p', errorMessage(error)), routeLink(msg("app.recoveryBackups"), 'backup', {}, 'pill'));
    }
    await navigate();
    setLocalizedText(document.getElementById('storage-status'), msg("app.savedInThisBrowserMakeBackupsToKeepIt"));
  } catch (error) {
    view.replaceChildren(text('h3', msg("app.yourLocalWorldCouldNotOpen")), text('p', storageMessage(error)), button(msg("app.tryAgain"), () => location.reload()),
      button(msg("app.downloadOriginalPlannerData"), () => {
        const raw = localStorage.getItem('daydream-planner-v1');
        if (raw === null) throw new LocalizedError(msg("app.noOldPlannerDataWasFoundOnThisOrigin"));
        download(new Blob([raw], { type: 'application/json' }), 'daydream-original-planner.json');
      }));
  }
}
function updateClock() {
  const desktopDate = document.querySelector('.desktop-date');
  if (desktopDate) desktopDate.dateTime = today();
  ctx.refreshDesktop();
}
updateClock();
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  if (currentSection === 'home') document.querySelector('.desktop-shortcut')?.focus();
  else document.getElementById('main-window').focus();
});
setInterval(updateClock, 30000);
initializePreferences();
initializeClickStars();
start();
