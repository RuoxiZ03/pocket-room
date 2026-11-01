import { msg, setLocalizedText } from "./i18n.js";
import { el, text, field } from './ui.js';
const KEY = 'pocket-room-preferences-v1';
const system = matchMedia('(prefers-reduced-motion: reduce)');
let choice = 'system', initialized = false;
try { if (localStorage.getItem(KEY) === 'reduce') choice = 'reduce'; } catch { /* Follow system when settings storage is unavailable. */ }
export const motionReduced = () => choice === 'reduce' || system.matches;
function apply() {
  document.documentElement.classList.toggle('reduce-motion', motionReduced());
  document.documentElement.dataset.pageHidden = String(document.hidden);
  if (motionReduced()) {
    document.querySelectorAll('.pixel-burst,.window-ghost').forEach(node => node.remove());
    document.querySelector('.site-frame')?.getAnimations().forEach(animation => animation.cancel());
  }
}
export function initializePreferences() {
  if (initialized) return;
  initialized = true;
  system.addEventListener('change', apply);
  document.addEventListener('visibilitychange', apply);
  window.addEventListener('storage', event => { if (event.key === KEY) { choice = event.newValue === 'reduce' ? 'reduce' : 'system'; apply(); } });
  apply();
}
export function animationSettings() {
  const control = field(msg("preferences.reduceAnimations"), 'animations', choice, { choices: [['system', msg('i18n.followSystem')], ['reduce', msg('preferences.reduceAnimations')]] });
  const status = text('p', '', 'help');status.setAttribute('role','status');
  const update = () => setLocalizedText(status, motionReduced() ? msg("preferences.reducedMotionIsActiveInstantHighlightsAndStatusFeedback") : msg("preferences.standardAnimationsAreActiveYourSystemPreferenceIsRespected"));
  control.querySelector('select').addEventListener('change', event => {
    try { localStorage.setItem(KEY,event.target.value);choice = event.target.value;apply();update(); }
    catch { event.target.value = choice;setLocalizedText(status, msg("preferences.thisBrowserCouldNotSaveThePreferenceYourPrevious")); }
  });
  update();
  return el('section',{class:'card animation-settings'},text('h3',msg("preferences.animationPreferences")),control,status,text('p',msg("preferences.thisSmallPreferenceStaysInThisBrowserContentBackups"),'help'));
}
