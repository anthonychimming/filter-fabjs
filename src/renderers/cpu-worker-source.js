/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { CHROMA_MODELS } from '../core/chroma.js';
import { CONTROL_COUNT, CONTROL_PAIR_COUNT, DEFAULT_CONTROL_VALUE } from '../core/controls.js';
import { MAX_FRACTAL_ITERATIONS } from '../core/formula-language.js';

export function workerProgram(){const float=CHROMA_MODELS.float,legacy=CHROMA_MODELS.legacy;return String.raw`
const FLOAT_CHROMA={uMin:${float.uMin},uMax:${float.uMax},uSpan:${float.uSpan},vMin:${float.vMin},vMax:${float.vMax},vSpan:${float.vSpan}},LEGACY_CHROMA={uMin:${legacy.uMin},uMax:${legacy.uMax},uSpan:${legacy.uSpan},vMin:${legacy.vMin},vMax:${legacy.vMax},vSpan:${legacy.vSpan}};
let srcPixels=null,W=0,H=0,controls=Array(${CONTROL_COUNT}).fill(${DEFAULT_CONTROL_VALUE}),rngSeed=691204,cells=new Float64Array(256),legacyMath=false,chroma=FLOAT_CHROMA,currentProgram=null,currentProgramKey=null;
const legacyRng={index1:0,index2:31,seedTable:new Uint32Array(56),seed:0,seedSave:1};
const pixel=[0,0,0,0],environment={x:0,y:0,z:0,p:pixel};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),int=v=>Number.isFinite(v)?Math.trunc(v):0,toI32=v=>Number.isFinite(v)?Math.trunc(v)|0:0,i32Div=(a,b)=>{a=toI32(a);b=toI32(b);return b===0?0:toI32(a/b)},i32Abs=v=>toI32(Math.abs(toI32(v))),div=(a,b)=>b===0?0:a/b,mod=(v,m)=>m===0?0:((v%m)+m)%m;
function legacySqrt(v){let root=toI32(v);if(root>1){const input=root;root>>=1;let estimate=2;while(root>estimate){estimate=i32Div(input,root);root=toI32(root+estimate)>>1}}return root}
function legacyPow(base,exponent){const value=Math.pow(toI32(base),toI32(exponent));if(!Number.isFinite(value))return 0;const floor=Math.floor(value);return toI32(floor+(value-floor>=0.5?1:0))}
function coordWrap(v,size){size=Math.max(1,Math.abs(size));return mod(v,size)}
function coordMirror(v,size){size=Math.max(1,Math.abs(size));const p=mod(v,size*2);return p<size?p:size*2-p-1e-9}
function sampleMode(x,y,z,mode='clamp'){z=int(z);if(z<0||z>3)return 0;if(mode==='wrap'){x=coordWrap(x,W);y=coordWrap(y,H)}else if(mode==='mirror'){x=coordMirror(x,W);y=coordMirror(y,H)}else{x=clamp(x,0,W-1);y=clamp(y,0,H-1)}x=clamp(int(x),0,W-1);y=clamp(int(y),0,H-1);return srcPixels[(y*W+x)*4+z]}
function sampleLinear(x,y,z,mode='clamp'){z=int(z);if(z<0||z>3)return 0;const x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;const a=sampleMode(x0,y0,z,mode),b=sampleMode(x0+1,y0,z,mode),c=sampleMode(x0,y0+1,z,mode),d=sampleMode(x0+1,y0+1,z,mode);return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty}
function rand(){rngSeed=(Math.imul(rngSeed,1664525)+1013904223)>>>0;return rngSeed/4294967296}
function fillLegacyRng(seed){let mj=(161803398-(seed&0x7fff))>>>0,mk=1,ii=0;legacyRng.seedTable[55]=mj;for(let i=1;i<=54;i++){if((ii+=21)>=55)ii-=55;legacyRng.seedTable[ii]=mk;mk=(mj-mk)>>>0;mj=legacyRng.seedTable[ii]}for(let k=1;k<=4;k++){ii=30;for(let i=1;i<=55;i++){if(++ii>=55)ii-=55;legacyRng.seedTable[i]=(legacyRng.seedTable[i]-legacyRng.seedTable[1+ii])>>>0}}legacyRng.seedSave=seed>>>0}
function resetLegacyRng(seed=0){legacyRng.index1=0;legacyRng.index2=31;legacyRng.seed=seed>>>0;legacyRng.seedSave=(legacyRng.seed+1)>>>0}
function legacyRst(seed){legacyRng.seed=seed>>>0;legacyRng.seedSave=(legacyRng.seed+1)>>>0}
function legacyRnd(a,b){a=toI32(a);b=toI32(b);if(legacyRng.seed!==legacyRng.seedSave){fillLegacyRng(legacyRng.seed);legacyRng.index1=0;legacyRng.index2=31}if(++legacyRng.index1===56)legacyRng.index1=1;if(++legacyRng.index2===56)legacyRng.index2=1;const value=(legacyRng.seedTable[legacyRng.index1]-legacyRng.seedTable[legacyRng.index2])>>>0;legacyRng.seedTable[legacyRng.index1]=value;const range=toI32(b-a);if(range<0)return 0;switch(range){case 255:return toI32(a+(value&0xff));case 127:return toI32(a+(value&0x7f));case 63:return toI32(a+(value&0x3f));case 31:return toI32(a+(value&0x1f));case 15:return toI32(a+(value&0xf));case 7:return toI32(a+(value&7));case 3:return toI32(a+(value&3));case 1:return toI32(a+(value&1));case 0:return a;default:return toI32(a+(value%(range+1)))}}
function hash01(x,y,seed){let h=Math.imul(int(x),374761393)^Math.imul(int(y),668265263)^Math.imul(int(seed),1442695041);h=(h^(h>>>13));h=Math.imul(h,1274126177);return ((h^(h>>>16))>>>0)/4294967295}
const fade=t=>t*t*t*(t*(t*6-15)+10),smooth01=t=>t*t*(3-2*t);
function valueNoise2(x,y,scale,seed){scale=Math.max(1e-6,Math.abs(scale));x/=scale;y/=scale;const x0=Math.floor(x),y0=Math.floor(y),tx=fade(x-x0),ty=fade(y-y0),a=hash01(x0,y0,seed),b=hash01(x0+1,y0,seed),c=hash01(x0,y0+1,seed),d=hash01(x0+1,y0+1,seed);return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty}
function gradDot(ix,iy,x,y,seed){const ang=hash01(ix,iy,seed)*Math.PI*2;return Math.cos(ang)*(x-ix)+Math.sin(ang)*(y-iy)}
function perlin2(x,y,scale,seed){scale=Math.max(1e-6,Math.abs(scale));x/=scale;y/=scale;const x0=Math.floor(x),y0=Math.floor(y),tx=fade(x-x0),ty=fade(y-y0),n00=gradDot(x0,y0,x,y,seed),n10=gradDot(x0+1,y0,x,y,seed),n01=gradDot(x0,y0+1,x,y,seed),n11=gradDot(x0+1,y0+1,x,y,seed),nx0=n00+(n10-n00)*tx,nx1=n01+(n11-n01)*tx;return clamp(0.5+(nx0+(nx1-nx0)*ty)*0.7071,0,1)}
function worleyPair(x,y,scale,seed){scale=Math.max(1e-6,Math.abs(scale));x/=scale;y/=scale;const ix=Math.floor(x),iy=Math.floor(y);let f1=1e9,f2=1e9;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const cx=ix+xx+hash01(ix+xx,iy+yy,seed),cy=iy+yy+hash01(ix+xx,iy+yy,seed+1013),d=Math.hypot(x-cx,y-cy);if(d<f1){f2=f1;f1=d}else if(d<f2)f2=d}return[clamp(f1/1.41421356,0,1),clamp(f2/1.41421356,0,1)]}
function fbm2(x,y,scale,octaves,lacunarity,gain,seed,mode='perlin'){octaves=clamp(int(octaves),1,12);lacunarity=Math.max(1.01,Math.abs(lacunarity));gain=clamp(gain,0.01,0.99);let amp=1,sum=0,norm=0,s=scale;for(let o=0;o<octaves;o++){const n=mode==='value'?valueNoise2(x,y,s,seed+o*101):perlin2(x,y,s,seed+o*101);sum+=n*amp;norm+=amp;amp*=gain;s/=lacunarity}return norm?sum/norm:0}
function turbulence2(x,y,scale,octaves,seed){octaves=clamp(int(octaves),1,12);let amp=1,sum=0,norm=0,s=scale;for(let o=0;o<octaves;o++){sum+=Math.abs(perlin2(x,y,s,seed+o*131)*2-1)*amp;norm+=amp;amp*=0.5;s/=2}return norm?sum/norm:0}
function ridged2(x,y,scale,octaves,seed){octaves=clamp(int(octaves),1,12);let amp=1,sum=0,norm=0,s=scale;for(let o=0;o<octaves;o++){const n=1-Math.abs(perlin2(x,y,s,seed+o*151)*2-1);sum+=n*n*amp;norm+=amp;amp*=0.5;s/=2}return norm?sum/norm:0}
function periodic2(x,y,px,py,seed){px=Math.max(1,Math.abs(px));py=Math.max(1,Math.abs(py));const u=coordWrap(x,px)/px,v=coordWrap(y,py)/py,cellsX=8,cellsY=8,gx=u*cellsX,gy=v*cellsY,x0=Math.floor(gx),y0=Math.floor(gy),tx=fade(gx-x0),ty=fade(gy-y0),h=(ix,iy)=>hash01(mod(ix,cellsX),mod(iy,cellsY),seed),a=h(x0,y0),b=h(x0+1,y0),c=h(x0,y0+1),d=h(x0+1,y0+1);return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty}
function fractalEscape2(zx,zy,cx,cy,iterations){const f32=Math.fround,limit=clamp(int(f32(iterations)),1,${MAX_FRACTAL_ITERATIONS});zx=f32(zx);zy=f32(zy);cx=f32(cx);cy=f32(cy);for(let iteration=0;iteration<limit;iteration++){const zx2=f32(zx*zx),zy2=f32(zy*zy),nextY=f32(f32(f32(2*zx)*zy)+cy),nextX=f32(f32(zx2-zy2)+cx);zx=nextX;zy=nextY;if(f32(f32(zx*zx)+f32(zy*zy))>4)return f32(iteration/limit)}return 1}
function shapeMask(distance,feather){feather=Math.max(0,Math.abs(feather));if(distance<=0)return 1;if(feather===0)return 0;const t=clamp(distance/feather,0,1);return 1-smooth01(t)}
function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;if(den<=1e-12)return Math.hypot(px-ax,py-ay);const t=clamp(((px-ax)*dx+(py-ay)*dy)/den,0,1);return Math.hypot(px-(ax+dx*t),py-(ay+dy*t))}
function lineDistance(px,py,ax,ay,bx,by,width){return segmentDistance(px,py,ax,ay,bx,by)-Math.abs(width)/2}
function circleDistance(px,py,cx,cy,radius){return Math.hypot(px-cx,py-cy)-Math.abs(radius)}
function boxDistance(px,py,cx,cy,width,height,rotation){const angle=rotation*Math.PI*2/1024,co=Math.cos(angle),si=Math.sin(angle),dx=px-cx,dy=py-cy,qx=Math.abs(co*dx+si*dy)-Math.abs(width)/2,qy=Math.abs(-si*dx+co*dy)-Math.abs(height)/2;return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)}
function smoothUnionDistance(a,b,radius){const k=Math.abs(radius);if(k===0)return Math.min(a,b);const h=clamp(0.5+0.5*(b-a)/k,0,1);return b+(a-b)*h-k*h*(1-h)}
function lineMask(px,py,ax,ay,bx,by,width,feather){return shapeMask(lineDistance(px,py,ax,ay,bx,by,width),feather)}
function circleMask(px,py,cx,cy,radius,feather){return shapeMask(circleDistance(px,py,cx,cy,radius),feather)}
function ringMask(px,py,cx,cy,radius,width,feather){return shapeMask(Math.abs(Math.hypot(px-cx,py-cy)-Math.abs(radius))-Math.abs(width)/2,feather)}
function boxMask(px,py,cx,cy,width,height,rotation,feather){return shapeMask(boxDistance(px,py,cx,cy,width,height,rotation),feather)}
function triangleMask(px,py,ax,ay,bx,by,cx,cy,feather){const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<=1e-9)return 0;const e0=(px-ax)*(by-ay)-(py-ay)*(bx-ax),e1=(px-bx)*(cy-by)-(py-by)*(cx-bx),e2=(px-cx)*(ay-cy)-(py-cy)*(ax-cx),hasNeg=e0<0||e1<0||e2<0,hasPos=e0>0||e1>0||e2>0,inside=!(hasNeg&&hasPos),distance=Math.min(segmentDistance(px,py,ax,ay,bx,by),segmentDistance(px,py,bx,by,cx,cy),segmentDistance(px,py,cx,cy,ax,ay));return shapeMask(inside?-distance:distance,feather)}
function gridMask(px,py,width,height,lineWidth,feather){width=Math.max(1,Math.abs(width));height=Math.max(1,Math.abs(height));const lx=coordWrap(px,width),ly=coordWrap(py,height),distance=Math.min(Math.min(lx,width-lx),Math.min(ly,height-ly))-Math.abs(lineWidth)/2;return shapeMask(distance,feather)}
function sierpinskiMask(px,py,cx,cy,size,depth,feather){size=Math.max(1e-6,Math.abs(size));const height=size*0.8660254037844386,top=cy-height/2,bottom=cy+height/2,left=cx-size/2,right=cx+size/2,base=triangleMask(px,py,cx,top,left,bottom,right,bottom,feather);if(base<=0)return 0;const yy=(py-top)/height;let u=yy/2-(px-cx)/size,v=yy/2+(px-cx)/size;if(u<0||v<0||u+v>1)return base;depth=clamp(int(depth),0,10);let localHeight=height;for(let level=0;level<depth;level++){const w=1-u-v;if(u<0.5&&v<0.5&&w<0.5){const holeDistance=Math.min(0.5-u,0.5-v,0.5-w)*localHeight;return shapeMask(holeDistance,feather)}if(u>=0.5){u=u*2-1;v*=2}else if(v>=0.5){u*=2;v=v*2-1}else{u*=2;v*=2}localHeight*=0.5}return base}
function opacityMix(base,blend,opacity){const t=clamp(opacity===undefined?1:(Math.abs(opacity)<=1?opacity:opacity/255),0,1);return base+(blend-base)*t}
function blendMode(n,a,b){a=clamp(a,0,255);b=clamp(b,0,255);switch(n){case'multiply':return a*b/255;case'screen':return 255-(255-a)*(255-b)/255;case'overlay':return a<128?2*a*b/255:255-2*(255-a)*(255-b)/255;case'softLight':{const A=a/255,B=b/255,res=(1-2*B)*A*A+2*B*A;return clamp(res*255,0,255)}case'difference':return Math.abs(a-b)}return a}
function vars(n,e){const p=e.p,z=e.z;switch(n){
case'r':case'r0':case'r1':return p[0];case'g':case'g0':case'g1':return p[1];case'b':case'b0':case'b1':return p[2];case'a':case'a0':case'a1':return p[3];case'c':case'c0':case'c1':return p[z];
case'i':case'i0':case'i1':return(299*p[0]+587*p[1]+114*p[2])/1000;case'u':case'u0':case'u1':return(-147407*p[0]-289391*p[1]+436798*p[2])/2000000;case'v':case'v0':case'v1':return(614777*p[0]-514799*p[1]-99978*p[2])/2000000;
case'x':return e.x;case'y':return e.y;case'nx':return W>1?e.x/(W-1):0.5;case'ny':return H>1?e.y/(H-1):0.5;case'cx':return W>1?e.x*2/(W-1)-1:0;case'cy':return H>1?e.y*2/(H-1)-1:0;case'z':case'p':return z;case'd':case'd0':case'd1':{const dx=W/2-e.x,dy=H/2-e.y;return Math.atan2(-dy,-dx)*1024/(2*Math.PI)}case'm':case'm0':case'm1':return Math.hypot(W/2-e.x,H/2-e.y);
case'X':case'xmax':return W;case'Y':case'ymax':return H;case'Z':case'P':case'pmax':case'zmax':return 4;case'D':return 1024;case'M':case'mmax':return Math.hypot(W,H)/2;
case'R':case'G':case'B':case'A':case'C':case'I':case'rmax':case'gmax':case'bmax':case'amax':case'cmax':case'imax':return 255;case'U':return chroma.uSpan;case'V':return chroma.vSpan;case'umax':return chroma.uMax;case'vmax':return chroma.vMax;case'dmax':return 512;
case'umin':return chroma.uMin;case'vmin':return chroma.vMin;case'dmin':return-512;case'tmax':case'total':return 1;
case't':case'rmin':case'gmin':case'bmin':case'amin':case'cmin':case'imin':case'mmin':case'pmin':case'xmin':case'ymin':case'zmin':case'tmin':return 0;
}return 0}
function call(n,a,e){const A=i=>a[i];switch(n){
case'src':case'src0':case'src1':return sampleMode(A(0),A(1),A(2));case'srcWrap':return sampleMode(A(0),A(1),A(2),'wrap');case'srcMirror':return sampleMode(A(0),A(1),A(2),'mirror');case'srcLinear':return sampleLinear(A(0),A(1),A(2));
case'rad':case'rad0':case'rad1':{const ang=A(0)*2*Math.PI/1024;return sampleMode(W/2+Math.cos(ang)*A(1),H/2+Math.sin(ang)*A(1),A(2))}
case'ctl':{const i=int(A(0));return i>=0&&i<${CONTROL_COUNT}?controls[i]:0}case'val':{const i=int(A(0)),c=i>=0&&i<${CONTROL_COUNT}?controls[i]:0;return c*(A(2)-A(1))/255+A(1)}
case'map':{const i=int(A(0)),v=clamp(A(1),0,255);if(i<0||i>=${CONTROL_PAIR_COUNT})return 0;const hi=controls[i*2],lo=controls[i*2+1];if(hi===lo)return v<hi?0:255;if(lo>hi){if(v<=hi)return 255;if(v>=lo)return 0}else{if(v<=lo)return 0;if(v>=hi)return 255}return (v-lo)*255/(hi-lo)}
case'min':return Math.min(A(0),A(1));case'max':return Math.max(A(0),A(1));case'abs':return Math.abs(A(0));case'add':return Math.min(A(0)+A(1),A(2));case'sub':return Math.max(Math.abs(A(0)-A(1)),A(2));case'dif':return Math.abs(A(0)-A(1));
case'rnd':{const lo=Math.min(A(0),A(1)),hi=Math.max(A(0),A(1));return Math.floor(lo+rand()*(hi-lo+1))}case'rst':rngSeed=(int(A(0))>>>0)||1;return 0;
case'mix':return A(3)===0?0:A(0)*A(2)/A(3)+A(1)*(A(3)-A(2))/A(3);case'scl':return A(2)===A(1)?0:A(3)+(A(4)-A(3))*(A(0)-A(1))/(A(2)-A(1));case'sqr':return A(0)*A(0);case'sqrt':return Math.sqrt(Math.max(0,A(0)));case'sin':return 512*Math.sin(A(0)*2*Math.PI/1024);case'cos':return 512*Math.cos(A(0)*2*Math.PI/1024);case'tan':return 1024*Math.tan(A(0)*2*Math.PI/1024);case'r2x':return Math.cos(A(0)*2*Math.PI/1024)*A(1);case'r2y':return Math.sin(A(0)*2*Math.PI/1024)*A(1);case'c2d':case'angle':return Math.atan2(A(1),A(0))*1024/(2*Math.PI);case'c2m':case'radius':return Math.hypot(A(0),A(1));
case'get':{const i=int(A(0));return i>=0&&i<256?cells[i]:0}case'put':{const i=int(A(1));if(i>=0&&i<256)cells[i]=A(0);return A(0)}case'pow':return Math.pow(A(0),A(1));
case'cnv':case'cnv0':case'cnv1':{const d=A(9);if(d===0)return 0;let t=0,k=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)t+=A(k++)*sampleMode(e.x+xx,e.y+yy,e.z);return t/d}
case'clamp':return clamp(A(0),A(1),A(2));case'lerp':{const t=clamp(Math.abs(A(2))<=1?A(2):A(2)/255,0,1);return A(0)+(A(1)-A(0))*t}case'step':return A(1)<A(0)?0:1;case'smoothstep':{if(A(1)===A(0))return A(2)<A(0)?0:1;const t=clamp((A(2)-A(0))/(A(1)-A(0)),0,1);return smooth01(t)}case'floor':return Math.floor(A(0));case'ceil':return Math.ceil(A(0));case'round':return Math.round(A(0));case'fract':return A(0)-Math.floor(A(0));case'sign':return Math.sign(A(0));case'bias':{const v=clamp(A(0),0,1),b=clamp(Math.abs(A(1))<=1?A(1):A(1)/255,0.001,0.999);return Math.pow(v,Math.log(b)/Math.log(0.5))}case'gain':{const v=clamp(A(0),0,1),g=clamp(Math.abs(A(1))<=1?A(1):A(1)/255,0.001,0.999);return v<0.5?call('bias',[v*2,g],e)/2:1-call('bias',[(1-v)*2,g],e)/2}
case'hash2':return hash01(A(0),A(1),A(2));case'valueNoise':return valueNoise2(A(0),A(1),A(2),A(3));case'perlin':return perlin2(A(0),A(1),A(2),A(3));case'worleyF1':return worleyPair(A(0),A(1),A(2),A(3))[0];case'worleyF2':return worleyPair(A(0),A(1),A(2),A(3))[1];case'fbm':return fbm2(A(0),A(1),A(2),A(3),A(4),A(5),A(6));case'turbulence':return turbulence2(A(0),A(1),A(2),A(3),A(4));case'ridged':return ridged2(A(0),A(1),A(2),A(3),A(4));case'periodicNoise':return periodic2(A(0),A(1),A(2),A(3),A(4));
case'mandelbrot':return fractalEscape2(0,0,A(0),A(1),A(2));case'julia':return fractalEscape2(A(0),A(1),A(2),A(3),A(4));
case'wrap':case'repeat':return coordWrap(A(0),A(1));case'mirror':case'mirrorRepeat':return coordMirror(A(0),A(1));case'gradient3':{const t=clamp(A(0),0,1);return t<=0.5?A(1)+(A(2)-A(1))*t*2:A(2)+(A(3)-A(2))*(t*2-1)}case'gradient4':{const t=clamp(A(0),0,1);if(t<=1/3)return A(1)+(A(2)-A(1))*t*3;if(t<=2/3)return A(2)+(A(3)-A(2))*(t*3-1);return A(3)+(A(4)-A(3))*(t*3-2)}
case'linearGrad':{const dx=A(4)-A(2),dy=A(5)-A(3),den=dx*dx+dy*dy;return den?clamp(((A(0)-A(2))*dx+(A(1)-A(3))*dy)/den,0,1):0}case'radialGrad':return clamp(1-Math.hypot(A(0)-A(2),A(1)-A(3))/Math.max(1e-6,Math.abs(A(4))),0,1);case'angularGrad':return mod(Math.atan2(A(1)-A(3),A(0)-A(2))/(Math.PI*2)+(Math.abs(A(4))<=1?A(4):A(4)/1024),1);case'checker':return (Math.floor(A(0)/Math.max(1,Math.abs(A(2))))+Math.floor(A(1)/Math.max(1,Math.abs(A(3)))))&1?1:0;case'brick':{const w=Math.max(1,Math.abs(A(2))),h=Math.max(1,Math.abs(A(3))),m=clamp(Math.abs(A(4)),0,Math.min(w,h)/2),row=Math.floor(A(1)/h),off=(Math.abs(A(5))<=1?A(5)*w:A(5))*(row&1),lx=coordWrap(A(0)+off,w),ly=coordWrap(A(1),h);return lx>=m&&lx<=w-m&&ly>=m&&ly<=h-m?1:0}
case'line':return lineMask(A(0),A(1),A(2),A(3),A(4),A(5),A(6),A(7));case'circle':return circleMask(A(0),A(1),A(2),A(3),A(4),A(5));case'ring':return ringMask(A(0),A(1),A(2),A(3),A(4),A(5),A(6));case'box':return boxMask(A(0),A(1),A(2),A(3),A(4),A(5),A(6),A(7));case'triangle':return triangleMask(A(0),A(1),A(2),A(3),A(4),A(5),A(6),A(7),A(8));case'grid':return gridMask(A(0),A(1),A(2),A(3),A(4),A(5));case'sierpinski':return sierpinskiMask(A(0),A(1),A(2),A(3),A(4),A(5),A(6));
case'sdfLine':return lineDistance(A(0),A(1),A(2),A(3),A(4),A(5),A(6));case'sdfCircle':return circleDistance(A(0),A(1),A(2),A(3),A(4));case'sdfBox':return boxDistance(A(0),A(1),A(2),A(3),A(4),A(5),A(6));
case'sdfUnion':return Math.min(A(0),A(1));case'sdfIntersect':return Math.max(A(0),A(1));case'sdfSubtract':return Math.max(A(0),-A(1));case'sdfSmoothUnion':return smoothUnionDistance(A(0),A(1),A(2));case'sdfFill':return shapeMask(A(0),a.length>1?A(1):0);case'sdfOutline':return shapeMask(Math.abs(A(0))-Math.abs(A(1))/2,a.length>2?A(2):0);
case'multiply':case'screen':case'overlay':case'softLight':case'difference':return opacityMix(A(0),blendMode(n,A(0),A(1)),a.length>2?A(2):undefined)
}return 0}
function callLegacy(n,a,e){const A=i=>toI32(a[i]);switch(n){
case'rnd':return legacyRnd(A(0),A(1));case'rst':legacyRst(A(0));return 0;
case'val':{const i=A(0),c=i>=0&&i<${CONTROL_COUNT}?toI32(controls[i]):0;return toI32(i32Div(Math.imul(c,toI32(A(2)-A(1))),255)+A(1))}
case'map':{const i=A(0),v=clamp(A(1),0,255);if(i<0||i>=${CONTROL_PAIR_COUNT})return 0;const hi=toI32(controls[i*2]),lo=toI32(controls[i*2+1]);if(hi===lo)return v<hi?0:255;if(lo>hi){if(v<=hi)return 255;if(v>=lo)return 0}else{if(v<=lo)return 0;if(v>=hi)return 255}return i32Div(Math.imul(toI32(v-lo),255),toI32(hi-lo))}
case'add':return Math.min(toI32(A(0)+A(1)),A(2));case'sub':return Math.max(i32Abs(toI32(A(0)-A(1))),A(2));case'dif':return i32Abs(toI32(A(0)-A(1)));case'abs':return i32Abs(A(0));
case'mix':return A(3)===0?0:toI32(i32Div(Math.imul(A(0),A(2)),A(3))+i32Div(Math.imul(A(1),toI32(A(3)-A(2))),A(3)));
case'scl':return A(2)===A(1)?0:toI32(A(3)+i32Div(Math.imul(toI32(A(4)-A(3)),toI32(A(0)-A(1))),toI32(A(2)-A(1))));
case'sqr':case'sqrt':return legacySqrt(A(0));case'pow':return legacyPow(A(0),A(1));
case'cnv':case'cnv0':case'cnv1':{const d=A(9);if(d===0)return 0;let total=0,k=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)total=toI32(total+Math.imul(A(k++),sampleMode(e.x+xx,e.y+yy,e.z)));return i32Div(total,d)}
}return toI32(call(n,a,e))}
function evFloat(n,e){switch(n.op){
case'const':return Number(n.value);
case'var':return vars(n.name,e);
case'unary':{const v=evFloat(n.input,e);return n.operator=='+'?v:n.operator=='-'?-v:n.operator=='!'?(v?0:1):~int(v)}
case'select':return evFloat(n.condition,e)?evFloat(n.whenTrue,e):evFloat(n.whenFalse,e);
case'binary':{
  if(n.operator=='&&')return evFloat(n.left,e)?(evFloat(n.right,e)?1:0):0;
  if(n.operator=='||')return evFloat(n.left,e)?1:(evFloat(n.right,e)?1:0);
  if(n.operator==','){evFloat(n.left,e);return evFloat(n.right,e)}
  const a=evFloat(n.left,e),b=evFloat(n.right,e);
  switch(n.operator){case'+':return a+b;case'-':return a-b;case'*':return a*b;case'/':return b===0?0:a/b;case'%':return b===0?0:a%b;case'<':return a<b?1:0;case'<=':return a<=b?1:0;case'>':return a>b?1:0;case'>=':return a>=b?1:0;case'==':return a===b?1:0;case'!=':return a!==b?1:0;case'&':return int(a)&int(b);case'^':return int(a)^int(b);case'|':return int(a)|int(b);case'<<':return int(a)<<int(b);case'>>':return int(a)>>int(b)}return 0
}
case'call':{const a=n.argumentValues||(n.argumentValues=new Float64Array(n.args.length));for(let i=0;i<n.args.length;i++)a[i]=evFloat(n.args[i],e);return call(n.fn,a,e)}
}return 0}
function evLegacy(n,e){switch(n.op){
case'const':return toI32(n.value);
case'var':return toI32(vars(n.name,e));
case'unary':{const v=evLegacy(n.input,e);return n.operator=='+'?v:n.operator=='-'?toI32(-v):n.operator=='!'?(v?0:1):~v}
case'select':return evLegacy(n.condition,e)?evLegacy(n.whenTrue,e):evLegacy(n.whenFalse,e);
case'binary':{
  if(n.operator=='&&')return evLegacy(n.left,e)?(evLegacy(n.right,e)?1:0):0;
  if(n.operator=='||')return evLegacy(n.left,e)?1:(evLegacy(n.right,e)?1:0);
  if(n.operator==','){evLegacy(n.left,e);return evLegacy(n.right,e)}
  const a=evLegacy(n.left,e),b=evLegacy(n.right,e);
  switch(n.operator){case'+':return toI32(a+b);case'-':return toI32(a-b);case'*':return Math.imul(a,b);case'/':return i32Div(a,b);case'%':return b===0?0:toI32(a%b);case'<':return a<b?1:0;case'<=':return a<=b?1:0;case'>':return a>b?1:0;case'>=':return a>=b?1:0;case'==':return a===b?1:0;case'!=':return a!==b?1:0;case'&':return a&b;case'^':return a^b;case'|':return a|b;case'<<':return a<<b;case'>>':return a>>b}return 0
}
case'call':{const a=n.argumentValues||(n.argumentValues=new Float64Array(n.args.length));for(let i=0;i<n.args.length;i++)a[i]=evLegacy(n.args[i],e);return callLegacy(n.fn,a,e)}
}return 0}
function ev(n,e){return legacyMath?evLegacy(n,e):evFloat(n,e)}
onmessage=e=>{const m=e.data;if(m.type=='init'){W=m.width;H=m.height;srcPixels=new Uint8ClampedArray(m.buffer);postMessage({type:'ready'});return}if(m.type=='render'){const program=m.program||(m.programKey===currentProgramKey?currentProgram:null),outputs=program?.outputs;if(!program||program.kind!=='filter-fab-program'||program.irVersion!==1||!Array.isArray(outputs)||outputs.length!==4)throw new Error('Invalid or unsupported Filter FabJS IR program');if(m.program){currentProgram=program;currentProgramKey=m.programKey}const start=performance.now();controls=Array.from({length:${CONTROL_COUNT}},(_,index)=>{const value=Number(m.controls?.[index]??${DEFAULT_CONTROL_VALUE});return Number.isFinite(value)?value:${DEFAULT_CONTROL_VALUE}});legacyMath=program.mathMode==='legacy';chroma=legacyMath?LEGACY_CHROMA:FLOAT_CHROMA;rngSeed=691204;resetLegacyRng();cells.fill(0);const out=new Uint8ClampedArray(W*H*4),step=Math.max(1,Math.floor(H/24));for(let y=0;y<H;y++){environment.y=y;for(let x=0;x<W;x++){const idx=(y*W+x)*4;environment.x=x;pixel[0]=srcPixels[idx];pixel[1]=srcPixels[idx+1];pixel[2]=srcPixels[idx+2];pixel[3]=srcPixels[idx+3];for(let z=0;z<4;z++){environment.z=z;out[idx+z]=clamp(ev(outputs[z].expression,environment),0,255)}}if(((y+1)%step===0)||y===H-1)postMessage({type:'progress',id:m.id,row:y+1,total:H,pct:((y+1)/H)*100})}postMessage({type:'result',id:m.id,buffer:out.buffer,ms:performance.now()-start},[out.buffer])}};`}
