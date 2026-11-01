// Memory-only view media. Thumbnails are transient: original IndexedDB Blobs
// and backup bytes are never converted or replaced. One decode per album queue.
import { readMedia } from './storage.js';
import { msg, setLocalizedText } from './i18n.js';
import { el, text, button, routeLink } from './ui.js';

export function memoryPhoto(id, title, thumbnail = false) {
  let disposed=false, token=0, url='';
  const img=el('img',{alt:title,decoding:'async',hidden:true});
  const status=text('p',msg('memoryBox.loading'),'memory-image-status');
  const retry=button(msg('memoryBox.retry'),()=>load());
  const error=el('div',{class:'memory-image-error',hidden:true},text('p',msg('memoryBox.unavailable')),retry,routeLink(msg('memoryBox.restore'),'backup'));
  const node=el('div',{class:'memory-image'},img,status,error);
  async function load() {
    if(disposed)return;
    const current=++token;
    error.hidden=true;status.hidden=false;img.hidden=true;
    setLocalizedText(status,msg('memoryBox.loading'));
    let bitmap;
    try {
      let blob=await readMedia(id);
      if(disposed||current!==token)return;
      if(thumbnail) {
        bitmap=await createImageBitmap(blob);
        if(disposed||current!==token)return;
        const scale=Math.min(1,360/Math.max(bitmap.width,bitmap.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
        bitmap.close();bitmap=null;
        blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('thumbnail')), 'image/webp',.85));
      }
      if(disposed||current!==token)return;
      if(url)URL.revokeObjectURL(url);
      url=URL.createObjectURL(blob);
      img.onload=()=>{if(!disposed&&current===token){status.hidden=true;img.hidden=false;}};
      img.onerror=()=>{if(!disposed&&current===token){status.hidden=true;error.hidden=false;img.hidden=true;}};
      img.src=url;
    } catch {
      if(!disposed&&current===token){status.hidden=true;error.hidden=false;img.hidden=true;}
    } finally {bitmap?.close();}
  }
  return {node,img,load,dispose(){disposed=true;token++;img.onload=img.onerror=null;if(url)URL.revokeObjectURL(url);}};
}

export function thumbnailQueue() {
  let dead=false,running=false;const pending=[],photos=[];
  const observer=new IntersectionObserver(entries=>{
    if(dead)return;
    for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);pending.push(e.target.memoryPhoto);}
    drain();
  },{root:document.getElementById('view'),rootMargin:'100px'});
  async function drain(){if(running)return;running=true;try{while(!dead&&pending.length)await pending.shift().load();}finally{running=false;}}
  return {add(photo){photos.push(photo);photo.node.memoryPhoto=photo;observer.observe(photo.node);},dispose(){dead=true;observer.disconnect();pending.length=0;photos.forEach(p=>p.dispose());}};
}
