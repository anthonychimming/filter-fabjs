/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

export function imageFromClipboardData(data){
  if(!data)return null;
  for(const item of Array.from(data.items||[])){
    if(item.kind==='file'&&String(item.type||'').startsWith('image/')){
      const file=item.getAsFile();if(file)return file;
    }
  }
  return Array.from(data.files||[]).find(file=>String(file.type||'').startsWith('image/'))||null;
}
export function alphaStats(pixels){
  let min=255,max=0,transparent=0,translucent=0,opaque=0;
  for(let i=3;i<pixels.length;i+=4){const value=pixels[i];min=Math.min(min,value);max=Math.max(max,value);if(value===0)transparent++;else if(value===255)opaque++;else translucent++;}
  return{min,max,transparent,translucent,opaque,hasAlpha:min<255,total:Math.floor(pixels.length/4)};
}
export function imageDataFromPixels(pixels,width,height){return new ImageData(new Uint8ClampedArray(pixels),width,height);}
export function renderedImageCanvas(pixels,width,height){
  if(!pixels||!width||!height)throw new Error('Load and render an image first');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{alpha:true,willReadFrequently:true});if(!context)throw new Error('Canvas export is unavailable');
  context.clearRect(0,0,width,height);context.putImageData(imageDataFromPixels(pixels,width,height),0,0);return canvas;
}
export function canvasBlob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The browser could not encode the image')),type));}
export function blobDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('The PNG data URL could not be created'));reader.readAsDataURL(blob);});}
export async function verifyPngAlpha(blob,expected){
  if(!expected.hasAlpha)return expected;
  const bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d',{alpha:true,willReadFrequently:true});if(!context){bitmap.close?.();throw new Error('PNG alpha verification is unavailable');}
  context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0);bitmap.close?.();
  const actual=alphaStats(context.getImageData(0,0,canvas.width,canvas.height).data);if(!actual.hasAlpha)throw new Error('The browser encoded an opaque PNG even though the rendered image contains transparency');return actual;
}
export function clipboardSupports(ClipboardItemCtor,type){if(typeof ClipboardItemCtor.supports!=='function')return type==='image/png'||type==='text/html';try{return ClipboardItemCtor.supports(type)}catch{return false}}
export async function writePngClipboard(blob){
  const ClipboardItemCtor=globalThis.ClipboardItem,representations={'image/png':blob};
  if(clipboardSupports(ClipboardItemCtor,'web image/png'))representations['web image/png']=blob;
  if(blob.size<=16*1024*1024&&clipboardSupports(ClipboardItemCtor,'text/html')){const dataURL=await blobDataURL(blob);representations['text/html']=new Blob([`<img src="${dataURL}" alt="">`],{type:'text/html'});}
  try{await navigator.clipboard.write([new ClipboardItemCtor(representations)]);return Object.keys(representations)}catch(error){if(Object.keys(representations).length===1)throw error;await navigator.clipboard.write([new ClipboardItemCtor({'image/png':blob})]);return['image/png'];}
}
