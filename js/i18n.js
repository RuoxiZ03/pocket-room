import en from './locales/en.js';
import zh from './locales/zh-CN.js';

// Language is a small device preference, separate from world records/backups.
// Only explicitly tagged developer messages are translated. User strings never
// go through a reverse dictionary or an automatic DOM text replacement pass.
const KEY='pocket-room-language-v1',TOKEN=Symbol('pocket-room-message');
export const supportedLanguages=['en','zh-CN'];
const valid=value=>supportedLanguages.includes(value);
export function initialLanguage(saved,preferred='en') {return valid(saved)?saved:/^zh(?:-|$)/i.test(preferred)?'zh-CN':'en';}
let saved=null;try{saved=globalThis.localStorage?.getItem(KEY);}catch{/* Browser language is the read-only fallback. */}
let language=initialLanguage(saved,globalThis.navigator?.languages?.[0]||globalThis.navigator?.language||'en');
const bindings=new Set(),nodes=new WeakMap(),listeners=new Set(),warned=new Set();
let cleanupQueued=false;
export const getLanguage=()=>language;
export const getLocale=()=>language==='zh-CN'?'zh-CN':'en-US';
export const isMessage=value=>!!value?.[TOKEN];
const lookup=(dict,key)=>key.split('.').reduce((v,k)=>v?.[k],dict);
function missing(key) {
  if(typeof location!=='undefined'&&['127.0.0.1','localhost'].includes(location.hostname)&&!warned.has(language+key)){
    warned.add(language+key);console.warn('[i18n] Missing '+language+' message: '+key);
  }
}
export function formatNumber(value,options={}) {return new Intl.NumberFormat(getLocale(),options).format(value);}
export function formatDate(value,options={year:'numeric',month:'short',day:'numeric'}) {
  // A date-only string is a local noon, never a UTC timestamp.
  const date=typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)?new Date(value+'T12:00:00'):new Date(value);
  return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(getLocale(),options).format(date):String(value??'');
}
export function resolve(value) {return isMessage(value)?value.format?value.format():t(value.key,value.params):typeof value==='number'?formatNumber(value):String(value??'');}
export function t(key,params={}) {
  let value=lookup(language==='zh-CN'?zh:en,key);
  if(value===undefined){missing(key);value=lookup(en,key);}
  if(value===undefined)return 'Unavailable';
  if(typeof value==='object')value=value[new Intl.PluralRules(getLocale()).select(Number(params.count))]||value.other;
  return value.replace(/\{(\w+)\}/g,(_,name)=>resolve(params[name]));
}
export function msg(key,params={}) {return Object.freeze({[TOKEN]:true,key,params,toString(){return t(key,params);}});}
export function dateMessage(value,options) {return Object.freeze({[TOKEN]:true,format:()=>formatDate(value,options),toString(){return this.format();}});}
export function numberMessage(value,options) {return Object.freeze({[TOKEN]:true,format:()=>formatNumber(value,options),toString(){return this.format();}});}
function prune(){for(const b of bindings){const node=b.ref.deref();if(!node?.isConnected){bindings.delete(b);if(node)nodes.get(node)?.delete(b.kind);}}}
function register(node,kind,value,apply) {
  let map=nodes.get(node);if(!map){map=new Map();nodes.set(node,map);}
  let b=map.get(kind);if(!b){b={ref:new WeakRef(node),kind,value,apply};map.set(kind,b);bindings.add(b);}else{b.value=value;b.apply=apply;}
  apply(node,value);
  // Wait until synchronous construction has mounted its fragment; pruning a
  // just-created, not-yet-inserted node would silently remove its translation.
  if(bindings.size>2000&&!cleanupQueued){cleanupQueued=true;queueMicrotask(()=>{cleanupQueued=false;prune();});}
  return node;
}
function unbind(node,kind){const b=nodes.get(node)?.get(kind);if(b){bindings.delete(b);nodes.get(node).delete(kind);}}
export function setLocalizedText(node,value) {
  if(!node)return;
  const write=(target,v)=>{const next=resolve(v);if(target.nodeType===3){if(target.nodeValue!==next)target.nodeValue=next;}else if(target.textContent!==next)target.textContent=next;};
  if(isMessage(value)||typeof value==='number')register(node,'text',value,write);else{unbind(node,'text');write(node,value);}
  return node;
}
export function setLocalizedAttribute(node,name,value) {
  if(!node)return;
  if(name==='__documentTitle'){const title=document.querySelector('title');title.removeAttribute('data-i18n');return setLocalizedText(title,value);}
  const write=(target,v)=>target.setAttribute(name,resolve(v));
  if(isMessage(value))register(node,'attr:'+name,value,write);else{unbind(node,'attr:'+name);write(node,value);}return node;
}
export function appendLocalized(node,...children) {
  for(const value of children.flat(Infinity)){
    if(value===null||value===undefined)continue;
    if(value instanceof Node)node.append(value);
    else{const child=document.createTextNode('');setLocalizedText(child,value);node.append(child);}
  }return node;
}
export function bindLanguageSelect(node) {return register(node,'languageSelect',null,target=>{target.value=language;});}
export function bindLanguageToggle(node) {return register(node,'languageToggle',null,target=>target.setAttribute('aria-label',t(language==='en'?'i18n.switchToChinese':'i18n.switchToEnglish')));}
export function createLanguageSwitch(onFailure=()=>{}) {
  const button=document.createElement('button');button.type='button';button.className='language-entry';
  for(const [text,className,lang]of [['EN','language-en','en'],['/','',''],['中文','language-zh','zh-CN']]){
    const span=document.createElement('span');span.textContent=text;span.className=className;if(lang)span.lang=lang;else span.setAttribute('aria-hidden','true');button.append(span);
  }
  button.addEventListener('click',()=>{if(!setLanguage(language==='en'?'zh-CN':'en'))onFailure();});
  return bindLanguageToggle(button);
}
export function onLanguageChange(listener){listeners.add(listener);return()=>listeners.delete(listener);}
function applyLanguage(next) {
  language=next;
  if(typeof document!=='undefined')document.documentElement.lang=next;
  prune();for(const b of bindings){const node=b.ref.deref();if(node)b.apply(node,b.value);}
  for(const listener of listeners)listener(next);
}
export function setLanguage(next) {
  if(!valid(next))return false;
  let persisted=true;try{localStorage.setItem(KEY,next);}catch{persisted=false;}
  if(next!==language)applyLanguage(next);
  else if(typeof document!=='undefined')document.documentElement.lang=next;
  return persisted;
}
export function initializeI18n(root=document) {
  document.documentElement.lang=language;
  root.querySelectorAll('[data-i18n]').forEach(node=>setLocalizedText(node,msg(node.dataset.i18n)));
  root.querySelectorAll('[data-i18n-aria]').forEach(node=>setLocalizedAttribute(node,'aria-label',msg(node.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-content]').forEach(node=>setLocalizedAttribute(node,'content',msg(node.dataset.i18nContent)));
}
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===KEY&&valid(event.newValue)&&event.newValue!==language)applyLanguage(event.newValue);});
export class LocalizedError extends Error {
  constructor(value){super(resolve(value));this.localized=isMessage(value)?value:null;}
}
export function errorMessage(error) {return error?.localized||msg(error?.name==='QuotaExceededError'?'i18n.storageFull':'i18n.unexpectedError');}
// Useful in isolated tests; counts bindings, never user content or media.
export const translationBindingCount=()=>{prune();return bindings.size;};
