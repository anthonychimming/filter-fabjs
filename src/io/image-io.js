/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

export const IMAGE_FILE_MAX_BYTES=64*1024*1024,IMAGE_SOURCE_MAX_PIXELS=100_000_000,IMAGE_SOURCE_MAX_EDGE=32768,IMAGE_RENDER_MAX_EDGE=1800;
const IMAGE_PROBE_BYTES=4*1024*1024;

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
export function imageDataFromPixels(pixels,width,height){return new ImageData(pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels),width,height);}
const u16be=(bytes,offset)=>(bytes[offset]<<8)|bytes[offset+1],u16le=(bytes,offset)=>bytes[offset]|(bytes[offset+1]<<8),u24le=(bytes,offset)=>bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16),u32le=(bytes,offset)=>(bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16)|(bytes[offset+3]<<24))>>>0;
function jpegDimensions(bytes){
  if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)return null;let offset=2,orientation=1;
  while(offset+4<=bytes.length){if(bytes[offset]!==0xff){offset++;continue}while(bytes[offset]===0xff)offset++;const marker=bytes[offset++];if(marker===0xd8||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;if(marker===0xd9||marker===0xda||offset+2>bytes.length)break;const length=u16be(bytes,offset);if(length<2||offset+length>bytes.length)break;
    if(marker===0xe1&&length>=16&&String.fromCharCode(...bytes.subarray(offset+2,offset+8))==='Exif\0\0'){const tiff=offset+8,little=bytes[tiff]===0x49&&bytes[tiff+1]===0x49,big=bytes[tiff]===0x4d&&bytes[tiff+1]===0x4d,read16=position=>little?u16le(bytes,position):u16be(bytes,position),read32=position=>little?u32le(bytes,position):((bytes[position]<<24)|(bytes[position+1]<<16)|(bytes[position+2]<<8)|bytes[position+3])>>>0;if((little||big)&&read16(tiff+2)===42){const ifd=tiff+read32(tiff+4);if(ifd+2<=offset+length){const count=read16(ifd);for(let index=0;index<count;index++){const entry=ifd+2+index*12;if(entry+12>offset+length)break;if(read16(entry)===0x0112){orientation=read16(entry+8);break}}}}}
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=7){let width=u16be(bytes,offset+5),height=u16be(bytes,offset+3);if(orientation>=5&&orientation<=8)[width,height]=[height,width];return{width,height}}
    offset+=length;
  }
  return null;
}
function svgDimensions(bytes){const text=new TextDecoder().decode(bytes),tag=text.match(/<svg\b[^>]*>/i)?.[0];if(!tag)return null;const attribute=name=>tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`,'i'))?.[1],number=value=>{if(!value||/%\s*$/.test(value))return null;const match=String(value).trim().match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))/);const result=Number(match?.[1]);return Number.isFinite(result)&&result>0?result:null};let width=number(attribute('width')),height=number(attribute('height'));const viewBox=attribute('viewBox')?.trim().split(/[\s,]+/).map(Number);if((!width||!height)&&viewBox?.length===4&&viewBox.every(Number.isFinite)){width=width||Math.abs(viewBox[2]);height=height||Math.abs(viewBox[3])}return width&&height?{width:Math.round(width),height:Math.round(height)}:null}
export function imageDimensionsFromBytes(input,type=''){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input||0);if(bytes.length<6)return null;
  if(bytes.length>=24&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return{width:((bytes[16]<<24)|(bytes[17]<<16)|(bytes[18]<<8)|bytes[19])>>>0,height:((bytes[20]<<24)|(bytes[21]<<16)|(bytes[22]<<8)|bytes[23])>>>0};
  if(String.fromCharCode(...bytes.subarray(0,6))==='GIF87a'||String.fromCharCode(...bytes.subarray(0,6))==='GIF89a')return{width:u16le(bytes,6),height:u16le(bytes,8)};
  const jpeg=jpegDimensions(bytes);if(jpeg)return jpeg;
  if(bytes.length>=30&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP'){const chunk=String.fromCharCode(...bytes.subarray(12,16));if(chunk==='VP8X')return{width:u24le(bytes,24)+1,height:u24le(bytes,27)+1};if(chunk==='VP8 '&&bytes[23]===0x9d&&bytes[24]===0x01&&bytes[25]===0x2a)return{width:u16le(bytes,26)&0x3fff,height:u16le(bytes,28)&0x3fff};if(chunk==='VP8L'&&bytes[20]===0x2f)return{width:1+(bytes[21]|((bytes[22]&0x3f)<<8)),height:1+(((bytes[22]&0xc0)>>6)|(bytes[23]<<2)|((bytes[24]&0x0f)<<10))}}
  if(bytes.length>=26&&bytes[0]===0x42&&bytes[1]===0x4d)return{width:Math.abs(u32le(bytes,18)|0),height:Math.abs(u32le(bytes,22)|0)};
  if(bytes.length>=22&&u16le(bytes,0)===0&&u16le(bytes,2)===1){const count=u16le(bytes,4);let width=0,height=0;for(let index=0;index<count&&6+index*16+16<=bytes.length;index++){const entry=6+index*16,w=bytes[entry]||256,h=bytes[entry+1]||256;if(w*h>width*height){width=w;height=h}}if(width&&height)return{width,height}}
  if(String(type).toLowerCase()==='image/svg+xml'||new TextDecoder().decode(bytes.subarray(0,128)).includes('<svg'))return svgDimensions(bytes);
  return null;
}
async function decoderDimensions(file){const Decoder=globalThis.ImageDecoder;if(typeof Decoder!=='function'||typeof file.stream!=='function')return null;let decoder=null;try{if(typeof Decoder.isTypeSupported==='function'&&!(await Decoder.isTypeSupported(file.type)))return null;decoder=new Decoder({data:file.stream(),type:file.type,preferAnimation:false});await decoder.tracks.ready;const track=decoder.tracks.selectedTrack;if(!track)return null;return{width:Number(track.displayWidth||track.codedWidth),height:Number(track.displayHeight||track.codedHeight)}}catch{return null}finally{try{decoder?.close()}catch{}}}
function validateImageDimensions({width,height}){width=Number(width);height=Number(height);const pixels=width*height;if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>IMAGE_SOURCE_MAX_EDGE||height>IMAGE_SOURCE_MAX_EDGE||!Number.isSafeInteger(pixels)||pixels>IMAGE_SOURCE_MAX_PIXELS)throw new Error(`Image dimensions exceed the safe ${IMAGE_SOURCE_MAX_PIXELS/1_000_000} megapixel decode limit`);return{width,height}}
export async function inspectImageFile(file){if(!file||!String(file.type||'').startsWith('image/'))throw new Error('Choose a valid image file');const size=Number(file.size);if(!Number.isFinite(size)||size<1)throw new Error('The image file is empty or unreadable');if(size>IMAGE_FILE_MAX_BYTES)throw new Error(`Image file exceeds the ${IMAGE_FILE_MAX_BYTES/1024/1024} MiB limit`);let dimensions=await decoderDimensions(file);if(!dimensions){const bytes=new Uint8Array(await file.slice(0,Math.min(size,IMAGE_PROBE_BYTES)).arrayBuffer());dimensions=imageDimensionsFromBytes(bytes,file.type)}if(!dimensions)throw new Error('This image format cannot be safely inspected before decoding');return validateImageDimensions(dimensions)}
export async function boundedImageBitmap(file,maximum=IMAGE_RENDER_MAX_EDGE){const source=await inspectImageFile(file),scale=Math.min(1,maximum/Math.max(source.width,source.height)),targetWidth=Math.max(1,Math.round(source.width*scale)),targetHeight=Math.max(1,Math.round(source.height*scale)),options=scale<1?{resizeWidth:targetWidth,resizeHeight:targetHeight,resizeQuality:'high'}:undefined,bitmap=options?await createImageBitmap(file,options):await createImageBitmap(file);if(!bitmap||!Number.isInteger(bitmap.width)||!Number.isInteger(bitmap.height)||bitmap.width<1||bitmap.height<1||Math.max(bitmap.width,bitmap.height)>maximum){bitmap?.close?.();throw new Error(`Decoded image exceeds the ${maximum} px render limit`)}return{bitmap,sourceWidth:source.width,sourceHeight:source.height,resized:scale<1}}
export function renderedImageCanvas(pixels,width,height){
  if(!pixels||!width||!height)throw new Error('Load and render an image first');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{alpha:true,willReadFrequently:true});if(!context)throw new Error('Canvas export is unavailable');
  context.clearRect(0,0,width,height);context.putImageData(imageDataFromPixels(pixels,width,height),0,0);return canvas;
}
export function canvasBlob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The browser could not encode the image')),type));}
export async function verifyPngAlpha(blob,expected){
  if(!expected.hasAlpha)return expected;const bytes=new Uint8Array(await blob.slice(0,33).arrayBuffer()),signature=[137,80,78,71,13,10,26,10];if(bytes.length<26||signature.some((value,index)=>bytes[index]!==value)||String.fromCharCode(...bytes.subarray(12,16))!=='IHDR')throw new Error('The browser did not produce a valid PNG');const colorType=bytes[25];if(colorType!==4&&colorType!==6)throw new Error('The browser encoded a PNG without an alpha channel');return expected;
}
export function clipboardSupports(ClipboardItemCtor,type){if(typeof ClipboardItemCtor.supports!=='function')return type==='image/png';try{return ClipboardItemCtor.supports(type)}catch{return false}}
export async function writePngClipboard(blob){
  const ClipboardItemCtor=globalThis.ClipboardItem,representations={'image/png':blob};
  if(clipboardSupports(ClipboardItemCtor,'web image/png'))representations['web image/png']=blob;
  try{await navigator.clipboard.write([new ClipboardItemCtor(representations)]);return Object.keys(representations)}catch(error){if(Object.keys(representations).length===1)throw error;await navigator.clipboard.write([new ClipboardItemCtor({'image/png':blob})]);return['image/png'];}
}
