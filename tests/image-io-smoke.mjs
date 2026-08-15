import assert from 'node:assert/strict';
import {
  IMAGE_FILE_MAX_BYTES,
  boundedImageBitmap,
  imageDimensionsFromBytes,
  inspectImageFile,
  verifyPngAlpha,
  writePngClipboard
} from '../src/io/image-io.js';

function pngHeader(width,height,colorType=6){
  const bytes=new Uint8Array(33),view=new DataView(bytes.buffer),signature=[137,80,78,71,13,10,26,10];bytes.set(signature);view.setUint32(8,13);bytes.set([73,72,68,82],12);view.setUint32(16,width);view.setUint32(20,height);bytes[24]=8;bytes[25]=colorType;return bytes;
}

const dimensions=imageDimensionsFromBytes(pngHeader(4000,2000),'image/png');
assert.deepEqual(dimensions,{width:4000,height:2000});

const imageDecoderDescriptor=Object.getOwnPropertyDescriptor(globalThis,'ImageDecoder');
const imageBitmapDescriptor=Object.getOwnPropertyDescriptor(globalThis,'createImageBitmap');
const clipboardItemDescriptor=Object.getOwnPropertyDescriptor(globalThis,'ClipboardItem');
const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');

try{
  Object.defineProperty(globalThis,'ImageDecoder',{configurable:true,value:undefined});
  const bitmapCalls=[];Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async(file,options)=>{bitmapCalls.push({file,options});return{width:options?.resizeWidth??4000,height:options?.resizeHeight??2000,closed:false,close(){this.closed=true}}}});
  const largePng=new Blob([pngHeader(4000,2000)],{type:'image/png'}),decoded=await boundedImageBitmap(largePng);
  assert.deepEqual(bitmapCalls[0].options,{resizeWidth:1800,resizeHeight:900,resizeQuality:'high'},'large images must request bounded decode dimensions instead of decoding full size');
  assert.equal(decoded.bitmap.width,1800);assert.equal(decoded.bitmap.height,900);assert.equal(decoded.resized,true);

  const callsBeforeBomb=bitmapCalls.length,decodeBomb=new Blob([pngHeader(50000,50000)],{type:'image/png'});
  await assert.rejects(inspectImageFile(decodeBomb),/safe 100 megapixel decode limit/);
  assert.equal(bitmapCalls.length,callsBeforeBomb,'unsafe image dimensions must be rejected before bitmap decoding');
  const oversizedFile={type:'image/png',size:IMAGE_FILE_MAX_BYTES+1,slice(){throw new Error('oversized files must not be read')}};
  await assert.rejects(inspectImageFile(oversizedFile),/64 MiB limit/);

  const expected={min:0,max:255,transparent:1,translucent:0,opaque:1,hasAlpha:true,total:2},alphaPng=new Blob([pngHeader(1,2,6)],{type:'image/png'});
  assert.equal(await verifyPngAlpha(alphaPng,expected),expected,'alpha verification must inspect the bounded PNG header without decoding pixels');
  await assert.rejects(verifyPngAlpha(new Blob([pngHeader(1,2,2)],{type:'image/png'}),expected),/without an alpha channel/);

  const clipboardWrites=[],clipboardItems=[];
  class FakeClipboardItem{static supports(){return true}constructor(representations){this.representations=representations;clipboardItems.push(this)}}
  Object.defineProperty(globalThis,'ClipboardItem',{configurable:true,value:FakeClipboardItem});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{async write(items){clipboardWrites.push(items)}}}});
  const representations=await writePngClipboard(alphaPng);
  assert.deepEqual(representations,['image/png','web image/png']);
  assert.equal('text/html' in clipboardItems[0].representations,false,'clipboard PNG copy must not create a base64 HTML duplicate');
  assert.equal(clipboardWrites.length,1);
}finally{
  if(imageDecoderDescriptor)Object.defineProperty(globalThis,'ImageDecoder',imageDecoderDescriptor);else delete globalThis.ImageDecoder;
  if(imageBitmapDescriptor)Object.defineProperty(globalThis,'createImageBitmap',imageBitmapDescriptor);else delete globalThis.createImageBitmap;
  if(clipboardItemDescriptor)Object.defineProperty(globalThis,'ClipboardItem',clipboardItemDescriptor);else delete globalThis.ClipboardItem;
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
}

console.log('Image I/O bounds and memory smoke: pass.');
