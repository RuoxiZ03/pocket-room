import { LocalizedError, msg } from "./i18n.js";
// Wall-clock deadlines, never a decremented counter. Pure operations accept a
// timestamp for deterministic checks; IndexedDB serializes their application.
export const initialFocus=()=>({version:1,settings:{minutes:25,sound:false},current:null,sessions:[]});
const stamp=n=>Number.isSafeInteger(n)&&n>=0&&n<253402300799999;
const identifier=s=>typeof s==='string'&&s.length>0&&s.length<=100;
const localDay=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const focusRemaining=(f,now=Date.now())=>!f.current?0:f.current.status==='running'?Math.min(f.current.durationMs,Math.max(0,f.current.endsAt-now)):f.current.remainingMs;
export function validFocus(f,validDate) {
  if(!f||f.version!==1||!f.settings||!Number.isInteger(f.settings.minutes)||f.settings.minutes<1||f.settings.minutes>180||typeof f.settings.sound!=='boolean'||!Array.isArray(f.sessions)||f.sessions.length>10000)return false;
  if(!f.sessions.every(s=>s&&identifier(s.id)&&stamp(s.startedAt)&&stamp(s.endedAt)&&s.endedAt>=s.startedAt&&validDate(s.date)&&['completed','ended'].includes(s.outcome)&&Number.isSafeInteger(s.durationMs)&&s.durationMs>=0&&s.durationMs<=10800000&&(s.outcome!=='completed'||s.durationMs>=60000)))return false;
  if(new Set(f.sessions.map(s=>s.id)).size!==f.sessions.length)return false;
  const c=f.current;
  return c===null||!!(c&&identifier(c.id)&&!f.sessions.some(s=>s.id===c.id)&&stamp(c.startedAt)&&Number.isSafeInteger(c.durationMs)&&c.durationMs>=60000&&c.durationMs<=10800000&&Number.isSafeInteger(c.remainingMs)&&c.remainingMs>0&&c.remainingMs<=c.durationMs&&
    (c.status==='running'&&stamp(c.endsAt)&&c.endsAt>=c.startedAt||c.status==='paused'&&c.endsAt===null));
}
function finish(f,now,completed) {
  const c=f.current,end=completed?c.endsAt:Math.max(now,c.startedAt);
  return {...f,current:null,sessions:[...f.sessions,{id:c.id,startedAt:c.startedAt,endedAt:end,date:localDay(end),outcome:completed?'completed':'ended',durationMs:completed?c.durationMs:c.durationMs-focusRemaining(f,now)}]};
}
export function focusChange(f,operation,options={},now=Date.now()) {
  if(!stamp(now))throw new LocalizedError(msg("focus_data.yourDeviceTimeIsOutsideTheSupportedRange"));
  const due=f.current?.status==='running'&&f.current.endsAt<=now;
  if(due) {f=finish(f,now,true);if(!['settings','start'].includes(operation))return f;}
  switch(operation) {
    case 'settle': return f;
    case 'settings': {
      const settings={...f.settings,...options};
      if(!Number.isInteger(settings.minutes)||settings.minutes<1||settings.minutes>180||typeof settings.sound!=='boolean')throw new LocalizedError(msg("focus_data.chooseAWholeNumberFrom1To180Minutes"));
      return {...f,settings};
    }
    case 'start': return f.current?f:{...f,current:{id:crypto.randomUUID(),durationMs:f.settings.minutes*60000,remainingMs:f.settings.minutes*60000,status:'running',startedAt:now,endsAt:now+f.settings.minutes*60000}};
    case 'pause': return f.current?.status==='running'?{...f,current:{...f.current,status:'paused',remainingMs:focusRemaining(f,now),endsAt:null}}:f;
    case 'resume': return f.current?.status==='paused'?{...f,current:{...f.current,status:'running',endsAt:now+f.current.remainingMs}}:f;
    case 'end': return f.current?finish(f,now,false):f;
    default: throw new LocalizedError(msg("focus_data.unknownFocusAction"));
  }
}
