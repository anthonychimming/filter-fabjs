/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { CHROMA_MODELS } from '../core/chroma.js';
import { CONTROL_COUNT, CONTROL_PAIR_COUNT } from '../core/controls.js';
import { IR_VERSION, IRType, programCacheKey } from '../core/ir.js';
import { WEBGPU_CONTROL_SLOT_COUNT } from './params-layout.js';

export class WGSLCompileError extends Error{constructor(message,blockers=[]){super(message);this.name='WGSLCompileError';this.blockers=blockers}}
const WEBGPU_FUNCTIONS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 cnv cnv0 cnv1 ctl val map min max abs add sub dif mix scl sqr sqrt sin cos tan r2x r2y c2d c2m radius angle clamp lerp step smoothstep floor ceil round fract sign bias gain hash2 valueNoise perlin worleyF1 worleyF2 fbm turbulence ridged periodicNoise wrap mirror repeat mirrorRepeat gradient3 gradient4 linearGrad radialGrad angularGrad checker brick line circle ring box triangle grid sierpinski multiply screen overlay softLight difference'.split(' '));
const WEBGPU_UNARY=new Set(['+','-','!']);
const WEBGPU_BINARY=new Set(['+','-','*','/','%','<','<=','>','>=','==','!=','&&','||']);
const WEBGPU_BOOLEAN_BINARY=new Set(['<','<=','>','>=','==','!=','&&','||']);
const EXACT_INTEGER_NOISE_FUNCTIONS=new Set(['hash2','valueNoise','perlin','worleyF1','worleyF2','fbm','turbulence','ridged','periodicNoise']);
export const MAX_WEBGPU_IR_NODES=4096;
export class WGSLCompiler{
  static analyze(program){
    const blockers=[];let nodeCount=0;
    if(!program||program.kind!=='filter-fab-program'||program.irVersion!==IR_VERSION)blockers.push('unsupported IR program');
    if(program?.mathMode!=='float')blockers.push('legacy integer compatibility mode');
    const walk=(node,exactIntegerContext=false)=>{
      if(!node)return;
      nodeCount++;
      switch(node.op){
        case'const':{
          const value=Number(node.value),rounded=Math.fround(value),label=String(node.value);
          if(!Number.isFinite(value))blockers.push(`constant ${label} is not finite`);
          else if(!Number.isFinite(rounded))blockers.push(`constant ${label} is outside f32 range`);
          else if(value!==0&&rounded===0)blockers.push(`constant ${label} underflows f32`);
          else if(exactIntegerContext&&node.type===IRType.INTEGER&&rounded!==value)blockers.push(`integer constant ${label} is not exactly representable as f32`);
          return;
        }
        case'var':return;
        case'unary':if(!WEBGPU_UNARY.has(node.operator))blockers.push(`operator ${node.operator}`);walk(node.input,exactIntegerContext);return;
        case'binary':if(!WEBGPU_BINARY.has(node.operator))blockers.push(node.operator===','?'comma sequencing':`operator ${node.operator}`);walk(node.left,exactIntegerContext);walk(node.right,exactIntegerContext);return;
        case'select':walk(node.condition);walk(node.whenTrue,exactIntegerContext);walk(node.whenFalse,exactIntegerContext);return;
        case'call':{
          if(!WEBGPU_FUNCTIONS.has(node.fn))blockers.push(`${node.fn}()`);
          const exactNoiseIntegers=EXACT_INTEGER_NOISE_FUNCTIONS.has(node.fn);
          node.args.forEach(arg=>walk(arg,exactIntegerContext||(exactNoiseIntegers&&arg.type===IRType.INTEGER)));
          return;
        }
        default:blockers.push(`IR operation ${node.op}`);
      }
    };
    program?.outputs?.forEach(output=>walk(output.expression));
    if(nodeCount>MAX_WEBGPU_IR_NODES)blockers.push(`program complexity ${nodeCount} exceeds WebGPU limit ${MAX_WEBGPU_IR_NODES}`);
    const unique=[...new Set(blockers)];
    return{compatible:unique.length===0,blockers:unique,subset:'phase-3.5-stateless'};
  }
  static key(program){return programCacheKey(program)}
  static compile(program,analysis=this.analyze(program)){
    if(!analysis.compatible)throw new WGSLCompileError(`WebGPU subset does not support: ${analysis.blockers.join(', ')}`,analysis.blockers);
    const compiler=new WGSLCompiler(program),expressions=program.outputs.map((output,channel)=>compiler.value(output.expression,channel));
    const code=compiler.shader(expressions);this.validateGeneratedSource(code);return{key:this.key(program),code,analysis};
  }
  static validateGeneratedSource(code){
    const malformed=code.match(/\breturn(?:\s+[^;\n{}]+)?}/g);
    if(malformed?.length)throw new WGSLCompileError('Generated WGSL contains an unterminated return statement',[...new Set(malformed)]);
  }
  constructor(program){this.program=program}
  number(value){value=Number(value);if(!Number.isFinite(value))throw new WGSLCompileError('WGSL constants must be finite');const rounded=Math.fround(value);if(!Number.isFinite(rounded))throw new WGSLCompileError(`WGSL constant ${value} is outside f32 range`);if(value!==0&&rounded===0)throw new WGSLCompileError(`WGSL constant ${value} underflows f32`);const raw=String(value);return/[.eE]/.test(raw)?raw:`${raw}.0`}
  bool(node,channel){
    if(node.op==='binary'&&['<','<=','>','>=','==','!='].includes(node.operator))return`(${this.value(node.left,channel)} ${node.operator} ${this.value(node.right,channel)})`;
    if(node.op==='binary'&&node.operator==='&&')return`(ff_bool(${this.value(node.left,channel)}) && ff_bool(${this.value(node.right,channel)}))`;
    if(node.op==='binary'&&node.operator==='||')return`(ff_bool(${this.value(node.left,channel)}) || ff_bool(${this.value(node.right,channel)}))`;
    if(node.op==='unary'&&node.operator==='!')return`(!ff_bool(${this.value(node.input,channel)}))`;
    return`ff_bool(${this.value(node,channel)})`;
  }
  variable(name,channel){
    const chroma=CHROMA_MODELS.float,direct={r:'sourceColor.x',g:'sourceColor.y',b:'sourceColor.z',a:'sourceColor.w',c:`ff_channel(sourceColor, ${channel}.0)`,i:'luminance',u:'chromaU',v:'chromaV',x:'pixelX',y:'pixelY',nx:'normalizedX',ny:'normalizedY',cx:'centeredX',cy:'centeredY',z:`${channel}.0`,p:`${channel}.0`,d:'direction',m:'radius',X:'widthF',Y:'heightF',Z:'4.0',P:'4.0',D:'1024.0',M:'maxRadius',R:'255.0',G:'255.0',B:'255.0',A:'255.0',C:'255.0',I:'255.0',U:this.number(chroma.uSpan),V:this.number(chroma.vSpan),t:'0.0',rmax:'255.0',gmax:'255.0',bmax:'255.0',amax:'255.0',cmax:'255.0',imax:'255.0',umax:this.number(chroma.uMax),vmax:this.number(chroma.vMax),dmax:'512.0',mmax:'maxRadius',pmax:'4.0',xmax:'widthF',ymax:'heightF',zmax:'4.0',rmin:'0.0',gmin:'0.0',bmin:'0.0',amin:'0.0',cmin:'0.0',imin:'0.0',umin:this.number(chroma.uMin),vmin:this.number(chroma.vMin),dmin:'-512.0',mmin:'0.0',pmin:'0.0',xmin:'0.0',ymin:'0.0',zmin:'0.0',tmin:'0.0',tmax:'1.0',total:'1.0'};
    if(name in direct)return direct[name];
    const alias={r0:'r',g0:'g',b0:'b',a0:'a',c0:'c',i0:'i',u0:'u',v0:'v',d0:'d',m0:'m',r1:'r',g1:'g',b1:'b',a1:'a',c1:'c',i1:'i',u1:'u',v1:'v',d1:'d',m1:'m'}[name];
    if(alias)return this.variable(alias,channel);
    throw new WGSLCompileError(`Variable ${name} is not supported by the WebGPU subset`,[name]);
  }
  value(node,channel){
    switch(node.op){
      case'const':return this.number(node.value);
      case'var':return this.variable(node.name,channel);
      case'unary':if(node.operator==='+')return`(${this.value(node.input,channel)})`;if(node.operator==='-')return`(-${this.value(node.input,channel)})`;return`ff_num(${this.bool(node,channel)})`;
      case'binary':{
        if(WEBGPU_BOOLEAN_BINARY.has(node.operator))return`ff_num(${this.bool(node,channel)})`;
        const a=this.value(node.left,channel),b=this.value(node.right,channel);
        if(node.operator==='/')return`ff_div(${a}, ${b})`;
        if(node.operator==='%')return`ff_rem(${a}, ${b})`;
        return`(${a} ${node.operator} ${b})`;
      }
      case'select':return`select(${this.value(node.whenFalse,channel)}, ${this.value(node.whenTrue,channel)}, ${this.bool(node.condition,channel)})`;
      case'call':return this.call(node.fn,node.args.map(arg=>this.value(arg,channel)),channel);
    }
    throw new WGSLCompileError(`Unsupported IR operation ${node.op}`,[node.op]);
  }
  call(name,a,channel){
    const A=i=>a[i];
    switch(name){
      case'src':case'src0':case'src1':return`ff_sample_nearest(${A(0)}, ${A(1)}, ${A(2)})`;
      case'srcWrap':return`ff_sample_wrap(${A(0)}, ${A(1)}, ${A(2)})`;
      case'srcMirror':return`ff_sample_mirror(${A(0)}, ${A(1)}, ${A(2)})`;
      case'srcLinear':return`ff_sample_linear(${A(0)}, ${A(1)}, ${A(2)})`;
      case'rad':case'rad0':case'rad1':return`ff_sample_polar(${A(0)}, ${A(1)}, ${A(2)})`;
      case'cnv':case'cnv0':case'cnv1':return`ff_convolve3x3(pixelX, pixelY, ${channel}.0, ${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)}, ${A(7)}, ${A(8)}, ${A(9)})`;
      case'ctl':return`ff_ctl(${A(0)})`;case'val':return`ff_val(${A(0)}, ${A(1)}, ${A(2)})`;
      case'map':return`ff_map(${A(0)}, ${A(1)})`;
      case'min':return`min(${A(0)}, ${A(1)})`;case'max':return`max(${A(0)}, ${A(1)})`;case'abs':return`abs(${A(0)})`;
      case'add':return`min(${A(0)} + ${A(1)}, ${A(2)})`;case'sub':return`max(abs(${A(0)} - ${A(1)}), ${A(2)})`;case'dif':return`abs(${A(0)} - ${A(1)})`;
      case'mix':return`ff_mix4(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)})`;case'scl':return`ff_scl(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'sqr':return`(${A(0)} * ${A(0)})`;case'sqrt':return`sqrt(max(0.0, ${A(0)}))`;
      case'sin':return`(512.0 * sin(${A(0)} * FF_TAU / 1024.0))`;case'cos':return`(512.0 * cos(${A(0)} * FF_TAU / 1024.0))`;case'tan':return`(1024.0 * tan(${A(0)} * FF_TAU / 1024.0))`;
      case'r2x':return`(cos(${A(0)} * FF_TAU / 1024.0) * ${A(1)})`;case'r2y':return`(sin(${A(0)} * FF_TAU / 1024.0) * ${A(1)})`;
      case'c2d':case'angle':return`(ff_atan2(${A(1)}, ${A(0)}) * 1024.0 / FF_TAU)`;case'c2m':case'radius':return`length(vec2<f32>(${A(0)}, ${A(1)}))`;
      case'clamp':return`ff_clamp(${A(0)}, ${A(1)}, ${A(2)})`;case'lerp':return`ff_lerp(${A(0)}, ${A(1)}, ${A(2)})`;
      case'step':return`ff_step(${A(0)}, ${A(1)})`;case'smoothstep':return`ff_smoothstep(${A(0)}, ${A(1)}, ${A(2)})`;
      case'floor':return`floor(${A(0)})`;case'ceil':return`ceil(${A(0)})`;case'round':return`ff_round(${A(0)})`;case'fract':return`fract(${A(0)})`;case'sign':return`sign(${A(0)})`;
      case'bias':return`ff_bias(${A(0)}, ${A(1)})`;case'gain':return`ff_gain(${A(0)}, ${A(1)})`;
      case'hash2':return`ff_hash01(${A(0)}, ${A(1)}, ${A(2)})`;
      case'valueNoise':return`ff_value_noise(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)})`;
      case'perlin':return`ff_perlin(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)})`;
      case'worleyF1':return`ff_worley(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}).x`;
      case'worleyF2':return`ff_worley(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}).y`;
      case'fbm':return`ff_fbm(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)})`;
      case'turbulence':return`ff_turbulence(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'ridged':return`ff_ridged(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'periodicNoise':return`ff_periodic_noise(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'wrap':case'repeat':return`ff_wrap(${A(0)}, ${A(1)})`;case'mirror':case'mirrorRepeat':return`ff_mirror(${A(0)}, ${A(1)})`;
      case'gradient3':return`ff_gradient3(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)})`;case'gradient4':return`ff_gradient4(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'linearGrad':return`ff_linear_grad(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'radialGrad':return`ff_radial_grad(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'angularGrad':return`ff_angular_grad(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'checker':return`ff_checker(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)})`;
      case'brick':return`ff_brick(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'line':return`ff_line(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)}, ${A(7)})`;
      case'circle':return`ff_circle(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'ring':return`ff_ring(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)})`;
      case'box':return`ff_box(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)}, ${A(7)})`;
      case'triangle':return`ff_triangle(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)}, ${A(7)}, ${A(8)})`;
      case'grid':return`ff_grid(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'sierpinski':return`ff_sierpinski(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)})`;
      case'multiply':case'screen':case'overlay':case'softLight':case'difference':return`ff_blend_${name}(${A(0)}, ${A(1)}, ${a.length>2?A(2):'255.0'})`;
    }
    throw new WGSLCompileError(`Function ${name}() is not implemented in WGSL`,[`${name}()`]);
  }
  shader(expr){return String.raw`
const FF_TAU : f32 = 6.283185307179586;
const FF_PI : f32 = 3.141592653589793;
struct Params { width:u32, height:u32, startRow:u32, rowCount:u32, controls:array<f32,${WEBGPU_CONTROL_SLOT_COUNT}>, };
@group(0) @binding(0) var<storage,read> srcPixels:array<u32>;
@group(0) @binding(1) var<storage,read_write> outPixels:array<u32>;
@group(0) @binding(2) var<storage,read> params:Params;
fn ff_bool(v:f32)->bool{return v!=0.0;}
fn ff_num(v:bool)->f32{return select(0.0,1.0,v);}
fn ff_negative_zero()->f32{return bitcast<f32>(0x80000000u);}
fn ff_round(v:f32)->f32{let rounded=floor(v+0.5);if(rounded==0.0&&(bitcast<u32>(v)&0x80000000u)!=0u){return ff_negative_zero();}return rounded;}
fn ff_atan2(y:f32,x:f32)->f32{if(y==0.0&&x==0.0){let yNegative=(bitcast<u32>(y)&0x80000000u)!=0u;let xNegative=(bitcast<u32>(x)&0x80000000u)!=0u;if(xNegative){return select(FF_PI,-FF_PI,yNegative);}return select(0.0,ff_negative_zero(),yNegative);}return atan2(y,x);}
fn ff_clamp(v:f32,lo:f32,hi:f32)->f32{return max(lo,min(hi,v));}
fn ff_normalized_coordinate(v:f32,size:f32)->f32{if(size<=1.0){return 0.5;}return v/(size-1.0);}
fn ff_div(a:f32,b:f32)->f32{if(b==0.0){return 0.0;}return a/b;}
fn ff_rem(a:f32,b:f32)->f32{if(b==0.0){return 0.0;}return a-b*trunc(a/b);}
fn ff_wrap(v:f32,size:f32)->f32{let s=max(1.0,abs(size));return ff_rem(ff_rem(v,s)+s,s);}
fn ff_mirror(v:f32,size:f32)->f32{let s=max(1.0,abs(size));let p=ff_wrap(v,s*2.0);if(p<s){return p;}return s*2.0-p-0.000000001;}
fn ff_gradient3(t0:f32,a:f32,b:f32,c:f32)->f32{let t=clamp(t0,0.0,1.0);if(t<=0.5){return mix(a,b,t*2.0);}return mix(b,c,t*2.0-1.0);}
fn ff_gradient4(t0:f32,a:f32,b:f32,c:f32,d:f32)->f32{let t=clamp(t0,0.0,1.0);if(t<=0.3333333333333333){return mix(a,b,t*3.0);}if(t<=0.6666666666666666){return mix(b,c,t*3.0-1.0);}return mix(c,d,t*3.0-2.0);}
fn ff_channel(p:vec4<f32>,z:f32)->f32{let i=i32(trunc(z));if(i==0){return p.x;}if(i==1){return p.y;}if(i==2){return p.z;}if(i==3){return p.w;}return 0.0;}
fn ff_unpack(v:u32)->vec4<f32>{return vec4<f32>(f32(v&255u),f32((v>>8u)&255u),f32((v>>16u)&255u),f32((v>>24u)&255u));}
fn ff_pack(v:vec4<f32>)->u32{let c=vec4<u32>(round(clamp(v,vec4<f32>(0.0),vec4<f32>(255.0))));return c.x|(c.y<<8u)|(c.z<<16u)|(c.w<<24u);}
fn ff_pixel_clamped(x:f32,y:f32)->vec4<f32>{let maxX=max(0.0,f32(params.width)-1.0);let maxY=max(0.0,f32(params.height)-1.0);let ix=u32(trunc(clamp(x,0.0,maxX)));let iy=u32(trunc(clamp(y,0.0,maxY)));return ff_unpack(srcPixels[iy*params.width+ix]);}
fn ff_pixel_wrap(x:f32,y:f32)->vec4<f32>{let ix=u32(trunc(ff_wrap(x,f32(params.width))));let iy=u32(trunc(ff_wrap(y,f32(params.height))));return ff_unpack(srcPixels[iy*params.width+ix]);}
fn ff_pixel_mirror(x:f32,y:f32)->vec4<f32>{let ix=min(u32(trunc(ff_mirror(x,f32(params.width)))),params.width-1u);let iy=min(u32(trunc(ff_mirror(y,f32(params.height)))),params.height-1u);return ff_unpack(srcPixels[iy*params.width+ix]);}
fn ff_sample_nearest(x:f32,y:f32,z:f32)->f32{return ff_channel(ff_pixel_clamped(x,y),z);}
fn ff_sample_wrap(x:f32,y:f32,z:f32)->f32{return ff_channel(ff_pixel_wrap(x,y),z);}
fn ff_sample_mirror(x:f32,y:f32,z:f32)->f32{return ff_channel(ff_pixel_mirror(x,y),z);}
fn ff_sample_linear(x:f32,y:f32,z:f32)->f32{let x0=floor(x);let y0=floor(y);let tx=x-x0;let ty=y-y0;let a=ff_sample_nearest(x0,y0,z);let b=ff_sample_nearest(x0+1.0,y0,z);let c=ff_sample_nearest(x0,y0+1.0,z);let d=ff_sample_nearest(x0+1.0,y0+1.0,z);return mix(a,b,tx)*(1.0-ty)+mix(c,d,tx)*ty;}
fn ff_sample_polar(angle:f32,distance:f32,z:f32)->f32{let radians=angle*FF_TAU/1024.0;return ff_sample_nearest(f32(params.width)*0.5+cos(radians)*distance,f32(params.height)*0.5+sin(radians)*distance,z);}
fn ff_convolve3x3(x:f32,y:f32,z:f32,k00:f32,k01:f32,k02:f32,k10:f32,k11:f32,k12:f32,k20:f32,k21:f32,k22:f32,divisor:f32)->f32{if(divisor==0.0){return 0.0;}let total=k00*ff_sample_nearest(x-1.0,y-1.0,z)+k01*ff_sample_nearest(x,y-1.0,z)+k02*ff_sample_nearest(x+1.0,y-1.0,z)+k10*ff_sample_nearest(x-1.0,y,z)+k11*ff_sample_nearest(x,y,z)+k12*ff_sample_nearest(x+1.0,y,z)+k20*ff_sample_nearest(x-1.0,y+1.0,z)+k21*ff_sample_nearest(x,y+1.0,z)+k22*ff_sample_nearest(x+1.0,y+1.0,z);return total/divisor;}
fn ff_ctl(index:f32)->f32{let i=i32(trunc(index));if(i<0||i>=${CONTROL_COUNT}){return 0.0;}return params.controls[u32(i)];}
fn ff_val(index:f32,a:f32,b:f32)->f32{return ff_ctl(index)*(b-a)/255.0+a;}
fn ff_map(index:f32,v0:f32)->f32{let i=i32(trunc(index));if(i<0||i>=${CONTROL_PAIR_COUNT}){return 0.0;}let v=clamp(v0,0.0,255.0);let hi=params.controls[u32(i*2)];let lo=params.controls[u32(i*2+1)];if(hi==lo){return select(255.0,0.0,v<hi);}if(lo>hi){if(v<=hi){return 255.0;}if(v>=lo){return 0.0;}}else{if(v<=lo){return 0.0;}if(v>=hi){return 255.0;}}return (v-lo)*255.0/(hi-lo);}
fn ff_lerp(a:f32,b:f32,t0:f32)->f32{let t=clamp(select(t0,t0/255.0,abs(t0)>1.0),0.0,1.0);return mix(a,b,t);}
fn ff_step(edge:f32,v:f32)->f32{return select(0.0,1.0,v>=edge);}
fn ff_smoothstep(a:f32,b:f32,v:f32)->f32{if(a==b){return select(0.0,1.0,v>=a);}let t=clamp((v-a)/(b-a),0.0,1.0);return t*t*(3.0-2.0*t);}
fn ff_mix4(a:f32,b:f32,c:f32,d:f32)->f32{if(d==0.0){return 0.0;}return a*c/d+b*(d-c)/d;}
fn ff_scl(v:f32,a:f32,b:f32,c:f32,d:f32)->f32{if(b==a){return 0.0;}return c+(d-c)*(v-a)/(b-a);}
fn ff_bias(v0:f32,b0:f32)->f32{let v=clamp(v0,0.0,1.0);let b=clamp(select(b0/255.0,b0,abs(b0)<=1.0),0.001,0.999);return pow(v,log(b)/log(0.5));}
fn ff_gain(v0:f32,g0:f32)->f32{let v=clamp(v0,0.0,1.0);let g=clamp(select(g0/255.0,g0,abs(g0)<=1.0),0.001,0.999);if(v<0.5){return ff_bias(v*2.0,g)*0.5;}return 1.0-ff_bias((1.0-v)*2.0,g)*0.5;}
fn ff_hash01(x:f32,y:f32,seed:f32)->f32{var h=(bitcast<u32>(i32(trunc(x)))*374761393u)^(bitcast<u32>(i32(trunc(y)))*668265263u)^(bitcast<u32>(i32(trunc(seed)))*1442695041u);h=h^(h>>13u);h=h*1274126177u;h=h^(h>>16u);return f32(h)/4294967295.0;}
fn ff_fade(t:f32)->f32{return t*t*t*(t*(t*6.0-15.0)+10.0);}
fn ff_value_noise(x0:f32,y0:f32,scale0:f32,seed:f32)->f32{let scale=max(0.000001,abs(scale0));let x=x0/scale;let y=y0/scale;let ix=floor(x);let iy=floor(y);let tx=ff_fade(x-ix);let ty=ff_fade(y-iy);let a=ff_hash01(ix,iy,seed);let b=ff_hash01(ix+1.0,iy,seed);let c=ff_hash01(ix,iy+1.0,seed);let d=ff_hash01(ix+1.0,iy+1.0,seed);return mix(a,b,tx)*(1.0-ty)+mix(c,d,tx)*ty;}
fn ff_grad_dot(ix:f32,iy:f32,x:f32,y:f32,seed:f32)->f32{let angle=ff_hash01(ix,iy,seed)*FF_TAU;return cos(angle)*(x-ix)+sin(angle)*(y-iy);}
fn ff_perlin(x0:f32,y0:f32,scale0:f32,seed:f32)->f32{let scale=max(0.000001,abs(scale0));let x=x0/scale;let y=y0/scale;let ix=floor(x);let iy=floor(y);let tx=ff_fade(x-ix);let ty=ff_fade(y-iy);let n00=ff_grad_dot(ix,iy,x,y,seed);let n10=ff_grad_dot(ix+1.0,iy,x,y,seed);let n01=ff_grad_dot(ix,iy+1.0,x,y,seed);let n11=ff_grad_dot(ix+1.0,iy+1.0,x,y,seed);let nx0=mix(n00,n10,tx);let nx1=mix(n01,n11,tx);return clamp(0.5+mix(nx0,nx1,ty)*0.7071,0.0,1.0);}
fn ff_worley(x0:f32,y0:f32,scale0:f32,seed:f32)->vec2<f32>{let scale=max(0.000001,abs(scale0));let x=x0/scale;let y=y0/scale;let ix=floor(x);let iy=floor(y);var f1=1000000000.0;var f2=1000000000.0;for(var yy:i32=-1;yy<=1;yy=yy+1){for(var xx:i32=-1;xx<=1;xx=xx+1){let cellX=ix+f32(xx);let cellY=iy+f32(yy);let cx=cellX+ff_hash01(cellX,cellY,seed);let cy=cellY+ff_hash01(cellX,cellY,seed+1013.0);let distance=length(vec2<f32>(x-cx,y-cy));if(distance<f1){f2=f1;f1=distance;}else if(distance<f2){f2=distance;}}}return clamp(vec2<f32>(f1,f2)/1.41421356,vec2<f32>(0.0),vec2<f32>(1.0));}
fn ff_fbm(x:f32,y:f32,scale0:f32,octaves0:f32,lacunarity0:f32,gain0:f32,seed:f32)->f32{let octaves=clamp(i32(trunc(octaves0)),1,12);let lacunarity=max(1.01,abs(lacunarity0));let gain=clamp(gain0,0.01,0.99);var amplitude=1.0;var sum=0.0;var norm=0.0;var scale=scale0;for(var octave:i32=0;octave<octaves;octave=octave+1){sum=sum+ff_perlin(x,y,scale,seed+f32(octave)*101.0)*amplitude;norm=norm+amplitude;amplitude=amplitude*gain;scale=scale/lacunarity;}return select(0.0,sum/norm,norm!=0.0);}
fn ff_turbulence(x:f32,y:f32,scale0:f32,octaves0:f32,seed:f32)->f32{let octaves=clamp(i32(trunc(octaves0)),1,12);var amplitude=1.0;var sum=0.0;var norm=0.0;var scale=scale0;for(var octave:i32=0;octave<octaves;octave=octave+1){sum=sum+abs(ff_perlin(x,y,scale,seed+f32(octave)*131.0)*2.0-1.0)*amplitude;norm=norm+amplitude;amplitude=amplitude*0.5;scale=scale/2.0;}return select(0.0,sum/norm,norm!=0.0);}
fn ff_ridged(x:f32,y:f32,scale0:f32,octaves0:f32,seed:f32)->f32{let octaves=clamp(i32(trunc(octaves0)),1,12);var amplitude=1.0;var sum=0.0;var norm=0.0;var scale=scale0;for(var octave:i32=0;octave<octaves;octave=octave+1){let ridge=1.0-abs(ff_perlin(x,y,scale,seed+f32(octave)*151.0)*2.0-1.0);sum=sum+ridge*ridge*amplitude;norm=norm+amplitude;amplitude=amplitude*0.5;scale=scale/2.0;}return select(0.0,sum/norm,norm!=0.0);}
fn ff_periodic_noise(x:f32,y:f32,periodX0:f32,periodY0:f32,seed:f32)->f32{let periodX=max(1.0,abs(periodX0));let periodY=max(1.0,abs(periodY0));let gx=ff_wrap(x,periodX)/periodX*8.0;let gy=ff_wrap(y,periodY)/periodY*8.0;let ix=floor(gx);let iy=floor(gy);let tx=ff_fade(gx-ix);let ty=ff_fade(gy-iy);let a=ff_hash01(ff_wrap(ix,8.0),ff_wrap(iy,8.0),seed);let b=ff_hash01(ff_wrap(ix+1.0,8.0),ff_wrap(iy,8.0),seed);let c=ff_hash01(ff_wrap(ix,8.0),ff_wrap(iy+1.0,8.0),seed);let d=ff_hash01(ff_wrap(ix+1.0,8.0),ff_wrap(iy+1.0,8.0),seed);return mix(a,b,tx)*(1.0-ty)+mix(c,d,tx)*ty;}
fn ff_linear_grad(x:f32,y:f32,x0:f32,y0:f32,x1:f32,y1:f32)->f32{let dx=x1-x0;let dy=y1-y0;let den=dx*dx+dy*dy;if(den==0.0){return 0.0;}return clamp(((x-x0)*dx+(y-y0)*dy)/den,0.0,1.0);}
fn ff_radial_grad(x:f32,y:f32,cx:f32,cy:f32,r:f32)->f32{return clamp(1.0-length(vec2<f32>(x-cx,y-cy))/max(0.000001,abs(r)),0.0,1.0);}
fn ff_angular_grad(x:f32,y:f32,cx:f32,cy:f32,offset0:f32)->f32{let offset=select(offset0/1024.0,offset0,abs(offset0)<=1.0);return ff_wrap(ff_atan2(y-cy,x-cx)/FF_TAU+offset,1.0);}
fn ff_checker(x:f32,y:f32,width0:f32,height0:f32)->f32{let width=max(1.0,abs(width0));let height=max(1.0,abs(height0));let parity=(i32(floor(x/width))+i32(floor(y/height)))&1;return select(0.0,1.0,parity!=0);}
fn ff_brick(x:f32,y:f32,width0:f32,height0:f32,mortar0:f32,offset0:f32)->f32{let width=max(1.0,abs(width0));let height=max(1.0,abs(height0));let mortar=clamp(abs(mortar0),0.0,min(width,height)*0.5);let row=i32(floor(y/height));let stagger=select(0.0,1.0,(row&1)!=0);let offset=select(offset0,offset0*width,abs(offset0)<=1.0);let localX=ff_wrap(x+offset*stagger,width);let localY=ff_wrap(y,height);return select(0.0,1.0,localX>=mortar&&localX<=width-mortar&&localY>=mortar&&localY<=height-mortar);}
fn ff_shape_mask(distance:f32,feather0:f32)->f32{let feather=max(0.0,abs(feather0));if(distance<=0.0){return 1.0;}if(feather==0.0){return 0.0;}return 1.0-ff_smoothstep(0.0,feather,distance);}
fn ff_segment_distance(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>)->f32{let delta=b-a;let den=dot(delta,delta);if(den<=0.000000000001){return length(p-a);}let t=clamp(dot(p-a,delta)/den,0.0,1.0);return length(p-(a+delta*t));}
fn ff_line(x:f32,y:f32,ax:f32,ay:f32,bx:f32,by:f32,width:f32,feather:f32)->f32{return ff_shape_mask(ff_segment_distance(vec2<f32>(x,y),vec2<f32>(ax,ay),vec2<f32>(bx,by))-abs(width)*0.5,feather);}
fn ff_circle(x:f32,y:f32,cx:f32,cy:f32,radius:f32,feather:f32)->f32{return ff_shape_mask(length(vec2<f32>(x-cx,y-cy))-abs(radius),feather);}
fn ff_ring(x:f32,y:f32,cx:f32,cy:f32,radius:f32,width:f32,feather:f32)->f32{return ff_shape_mask(abs(length(vec2<f32>(x-cx,y-cy))-abs(radius))-abs(width)*0.5,feather);}
fn ff_box(x:f32,y:f32,cx:f32,cy:f32,width:f32,height:f32,rotation:f32,feather:f32)->f32{let angle=rotation*FF_TAU/1024.0;let co=cos(angle);let si=sin(angle);let delta=vec2<f32>(x-cx,y-cy);let q=abs(vec2<f32>(co*delta.x+si*delta.y,-si*delta.x+co*delta.y))-vec2<f32>(abs(width),abs(height))*0.5;let distance=length(max(q,vec2<f32>(0.0)))+min(max(q.x,q.y),0.0);return ff_shape_mask(distance,feather);}
fn ff_triangle(x:f32,y:f32,ax:f32,ay:f32,bx:f32,by:f32,cx:f32,cy:f32,feather:f32)->f32{let p=vec2<f32>(x,y);let a=vec2<f32>(ax,ay);let b=vec2<f32>(bx,by);let c=vec2<f32>(cx,cy);let area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(abs(area)<=0.000000001){return 0.0;}let e0=(p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x);let e1=(p.x-b.x)*(c.y-b.y)-(p.y-b.y)*(c.x-b.x);let e2=(p.x-c.x)*(a.y-c.y)-(p.y-c.y)*(a.x-c.x);let hasNeg=e0<0.0||e1<0.0||e2<0.0;let hasPos=e0>0.0||e1>0.0||e2>0.0;let inside=!(hasNeg&&hasPos);let distance=min(ff_segment_distance(p,a,b),min(ff_segment_distance(p,b,c),ff_segment_distance(p,c,a)));return ff_shape_mask(select(distance,-distance,inside),feather);}
fn ff_grid(x:f32,y:f32,width0:f32,height0:f32,lineWidth:f32,feather:f32)->f32{let width=max(1.0,abs(width0));let height=max(1.0,abs(height0));let lx=ff_wrap(x,width);let ly=ff_wrap(y,height);let distance=min(min(lx,width-lx),min(ly,height-ly))-abs(lineWidth)*0.5;return ff_shape_mask(distance,feather);}
fn ff_sierpinski(x:f32,y:f32,cx:f32,cy:f32,size0:f32,depth0:f32,feather:f32)->f32{let size=max(0.000001,abs(size0));let height=size*0.8660254037844386;let top=cy-height*0.5;let bottom=cy+height*0.5;let base=ff_triangle(x,y,cx,top,cx-size*0.5,bottom,cx+size*0.5,bottom,feather);if(base<=0.0){return 0.0;}let yy=(y-top)/height;var u=yy*0.5-(x-cx)/size;var v=yy*0.5+(x-cx)/size;if(u<0.0||v<0.0||u+v>1.0){return base;}let depth=clamp(i32(trunc(depth0)),0,10);var localHeight=height;for(var level:i32=0;level<depth;level=level+1){let w=1.0-u-v;if(u<0.5&&v<0.5&&w<0.5){let holeDistance=min(0.5-u,min(0.5-v,0.5-w))*localHeight;return ff_shape_mask(holeDistance,feather);}if(u>=0.5){u=u*2.0-1.0;v=v*2.0;}else if(v>=0.5){u=u*2.0;v=v*2.0-1.0;}else{u=u*2.0;v=v*2.0;}localHeight=localHeight*0.5;}return base;}
fn ff_opacity(base:f32,blend:f32,opacity:f32)->f32{let t=clamp(select(opacity,opacity/255.0,abs(opacity)>1.0),0.0,1.0);return mix(base,blend,t);}
fn ff_blend_multiply(a0:f32,b0:f32,o:f32)->f32{let a=clamp(a0,0.0,255.0);let b=clamp(b0,0.0,255.0);return ff_opacity(a,a*b/255.0,o);}
fn ff_blend_screen(a0:f32,b0:f32,o:f32)->f32{let a=clamp(a0,0.0,255.0);let b=clamp(b0,0.0,255.0);return ff_opacity(a,255.0-(255.0-a)*(255.0-b)/255.0,o);}
fn ff_blend_overlay(a0:f32,b0:f32,o:f32)->f32{let a=clamp(a0,0.0,255.0);let b=clamp(b0,0.0,255.0);let v=select(2.0*a*b/255.0,255.0-2.0*(255.0-a)*(255.0-b)/255.0,a>=128.0);return ff_opacity(a,v,o);}
fn ff_blend_softLight(a0:f32,b0:f32,o:f32)->f32{let a=clamp(a0,0.0,255.0);let b=clamp(b0,0.0,255.0);let A=a/255.0;let B=b/255.0;let v=clamp(((1.0-2.0*B)*A*A+2.0*B*A)*255.0,0.0,255.0);return ff_opacity(a,v,o);}
fn ff_blend_difference(a0:f32,b0:f32,o:f32)->f32{let a=clamp(a0,0.0,255.0);let b=clamp(b0,0.0,255.0);return ff_opacity(a,abs(a-b),o);}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) gid:vec3<u32>){
  if(gid.x>=params.width||gid.y>=params.rowCount){return;}
  let px=gid.x;let py=params.startRow+gid.y;if(py>=params.height){return;}
  let index=py*params.width+px;let sourceColor=ff_unpack(srcPixels[index]);
  let pixelX=f32(px);let pixelY=f32(py);let widthF=f32(params.width);let heightF=f32(params.height);let normalizedX=ff_normalized_coordinate(pixelX,widthF);let normalizedY=ff_normalized_coordinate(pixelY,heightF);let centeredX=normalizedX*2.0-1.0;let centeredY=normalizedY*2.0-1.0;
  let luminance=(299.0*sourceColor.x+587.0*sourceColor.y+114.0*sourceColor.z)/1000.0;
  let chromaU=(-147407.0*sourceColor.x-289391.0*sourceColor.y+436798.0*sourceColor.z)/2000000.0;
  let chromaV=(614777.0*sourceColor.x-514799.0*sourceColor.y-99978.0*sourceColor.z)/2000000.0;
  let dx=widthF*0.5-pixelX;let dy=heightF*0.5-pixelY;let radius=length(vec2<f32>(dx,dy));let maxRadius=length(vec2<f32>(widthF,heightF))*0.5;let direction=ff_atan2(-dy,-dx)*1024.0/FF_TAU;
  outPixels[index]=ff_pack(vec4<f32>(${expr[0]},${expr[1]},${expr[2]},${expr[3]}));
}`}
}
