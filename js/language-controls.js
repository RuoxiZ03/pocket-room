import { msg,getLanguage,setLanguage,createLanguageSwitch,bindLanguageSelect } from './i18n.js';
import { el,text,field,notify } from './ui.js';
function choose(code){if(!setLanguage(code))notify(msg('i18n.preferenceNotSaved'),true);}
export function languageEntry(){
  return createLanguageSwitch(()=>notify(msg('i18n.preferenceNotSaved'),true));
}
export function languageSettings(){
  const control=field(msg('i18n.language'),'language',getLanguage(),{choices:[['en','English'],['zh-CN','简体中文']]});
  const select=bindLanguageSelect(control.querySelector('select'));
  select.addEventListener('change',()=>choose(select.value));
  return el('section',{class:'card language-settings'},text('h3',msg('i18n.preferences')),control,text('p',msg('i18n.savedHere'),'help'));
}
