import { LocalizedError, errorMessage, msg, setLocalizedAttribute, setLocalizedText } from "./i18n.js";
import { uid } from './model.js';
import { picture, validateBlob } from './media.js';
import { el, text, button, toolbar, filePicker } from './ui.js';
const FORMATS = ['image/png','image/jpeg','image/webp'];
const DEFAULT = 'assets/default-avatar.svg';

// A draft belongs to the existing profile form. No media is written until the
// parent's Save commits the cropped Blob and profile reference together.
export function avatarEditor(existingId) {
  let bitmap = null, mode = 'keep', loading = false, disposed = false, request = 0;
  const picker = filePicker(msg("avatar.avatarImagePngJpegOrWebp"),FORMATS.join(','));
  const current = el('div',{class:'avatar-current'});
  const message = text('p',msg("avatar.changesAreAPreviewUntilYouSaveTheProfile"),'help');message.setAttribute('role','status');
  const error = text('p','','form-error');error.setAttribute('role','alert');
  const canvas = el('canvas',{width:256,height:256,class:'avatar-crop-canvas','aria-label':msg("avatar.squareAvatarCropPreview")});
  const mini = el('canvas',{width:72,height:72,'aria-label':msg("avatar.newAvatarPreview")});
  const controls = el('details',{class:'avatar-crop-controls',hidden:true},text('summary',msg("avatar.cropControls")));
  function slider(label,name,min,max,step,value) {
    const input = el('input',{type:'range',name,min,max,step,value,'aria-label':label});
    const output = text('output','');
    return {input,output,node:el('label',{class:'crop-range'},text('span',label),input,output)};
  }
  const zoom = slider(msg('avatar_extra.zoom'),'avatarZoom',1,3,.01,1);
  const horizontal = slider(msg('avatar_extra.horizontal'),'avatarX',0,100,1,50);
  const vertical = slider(msg('avatar_extra.vertical'),'avatarY',0,100,1,50);
  const dirty = () => node.dispatchEvent(new Event('input',{bubbles:true}));
  function draw(target) {
    if(!bitmap)return;
    const side = Math.min(bitmap.width,bitmap.height)/Number(zoom.input.value);
    const x = (bitmap.width-side)*Number(horizontal.input.value)/100;
    const y = (bitmap.height-side)*Number(vertical.input.value)/100;
    const context=target.getContext('2d');context.clearRect(0,0,target.width,target.height);
    context.drawImage(bitmap,x,y,side,side,0,0,target.width,target.height);
  }
  function render() {
    draw(canvas);draw(mini);
    zoom.output.value=Number(zoom.input.value).toFixed(2)+'×';
    horizontal.output.value=horizontal.input.value+'%';vertical.output.value=vertical.input.value+'%';
    [zoom,horizontal,vertical].forEach(control=>setLocalizedAttribute(control.input, 'aria-valuetext', control.output.value));
  }
  function releaseBitmap() { bitmap?.close();bitmap=null; }
  function restorePreview() {
    current.replaceChildren(mode==='keep'&&existingId ? picture(existingId,msg("avatar.currentAvatar")) : el('img',{src:DEFAULT,alt:msg("avatar.defaultPixelAvatar"),class:'default-avatar'}));
    controls.hidden=true;remove.disabled=mode==='remove'||!existingId;
  }
  function cancelChange() {
    request++;releaseBitmap();loading=false;mode='keep';picker.input.value='';picker.input.dispatchEvent(new Event('change'));
    restorePreview();setLocalizedText(error, '');setLocalizedText(message, msg("avatar.theOriginalAvatarIsStillSelectedSaveOrCancel"));dirty();
  }
  const remove=button(msg("avatar.removeAvatar"),()=>{
    request++;releaseBitmap();loading=false;mode='remove';picker.input.value='';restorePreview();
    setLocalizedText(error, '');setLocalizedText(message, msg("avatar.defaultPixelAvatarSelectedSaveTheProfileToApply"));dirty();
  });
  controls.append(el('div',{class:'avatar-crop-layout'},canvas,el('div',{class:'avatar-crop-tools'},text('p',msg("avatar.dragTheImageOrUseTheSlidersTheSquare"),'help'),zoom.node,horizontal.node,vertical.node,
    toolbar(button(msg("avatar.centerCrop"),()=>{zoom.input.value=1;horizontal.input.value=vertical.input.value=50;render();dirty();}),button(msg("avatar.cancelImageChange"),cancelChange)))));
  const node=el('section',{class:'avatar-editor'},text('h3',msg("avatar.yourAvatar")),
    el('div',{class:'avatar-upload-row'},current,el('div',{},picker.node,text('p',msg("avatar.pngJpegOrWebpUpTo10MbSaved"),'help'))),
    toolbar(remove),message,error,controls);
  restorePreview();render();
  [zoom,horizontal,vertical].forEach(control=>control.input.addEventListener('input',render));
  picker.input.addEventListener('change',async()=>{
    const file=picker.input.files[0];if(!file)return;
    const token=++request;loading=true;setLocalizedText(error, '');
    setLocalizedText(message, msg("avatar.readingImage"));
    let next;
    try {
      if(!FORMATS.includes(file.type)||file.size>10*1024*1024||!file.size)throw new LocalizedError(msg("avatar.chooseAPngJpegOrWebpImageUpTo"));
      await validateBlob(file,'image');next=await createImageBitmap(file);
      if(disposed||token!==request){next.close();return;}
      releaseBitmap();bitmap=next;mode='crop';
      zoom.input.value=1;horizontal.input.value=vertical.input.value=50;
      current.replaceChildren(mini);controls.hidden=false;controls.open=true;remove.disabled=false;
      render();setLocalizedText(message, msg("avatar.adjustYourSquareCropNothingIsSavedUntilYou"));
    } catch(e) { next?.close();if(!disposed&&token===request){setLocalizedText(error, errorMessage(e));setLocalizedText(message, msg("avatar.yourPreviousAvatarChoiceHasNotChanged"));} }
    finally {if(token===request)loading=false;}
  });
  // Pointer dragging is optional: every operation also has keyboard/touch sliders.
  let drag=null;
  canvas.addEventListener('pointerdown',event=>{
    if(!bitmap)return;canvas.setPointerCapture(event.pointerId);
    drag={px:event.clientX,py:event.clientY,x:Number(horizontal.input.value),y:Number(vertical.input.value)};
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||!bitmap)return;
    const side=Math.min(bitmap.width,bitmap.height)/Number(zoom.input.value),width=canvas.getBoundingClientRect().width;
    const limit=value=>Math.min(100,Math.max(0,value));
    if(bitmap.width>side)horizontal.input.value=limit(drag.x-(event.clientX-drag.px)/width*side/(bitmap.width-side)*100);
    if(bitmap.height>side)vertical.input.value=limit(drag.y-(event.clientY-drag.py)/width*side/(bitmap.height-side)*100);
    render();dirty();
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>canvas.addEventListener(event,()=>drag=null));
  return {node,
    async collect() {
      if(loading)throw new LocalizedError(msg("avatar.pleaseWaitForTheImageToFinishLoading"));
      if(mode!=='crop')return {photos:mode==='keep'&&existingId?[existingId]:[],files:[]};
      if(!bitmap||disposed)throw new LocalizedError(msg("avatar.chooseAnImageAgainBeforeSaving"));
      const output=document.createElement('canvas');output.width=output.height=512;draw(output);
      const blob=await new Promise(resolve=>output.toBlob(resolve,'image/webp',.9));
      if(!blob)throw new LocalizedError(msg("avatar.theCroppedImageCouldNotBeSavedTryAnother"));
      await validateBlob(blob,'image');const id=uid();return {photos:[id],files:[{id,blob}]};
    },
    dispose() {disposed=true;request++;releaseBitmap();drag=null;}
  };
}
