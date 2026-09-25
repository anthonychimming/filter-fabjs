/* GPU-local sign provenance for angle arguments. No physical -0 is required. */
import { CONTROL_COUNT } from '../core/controls.js';
// These CPU operations produce +0 when their result is zero (absolute values,
// nonnegative masks/samples, clamping against +0, or cancellation of magnitudes).
const POSITIVE_ZERO_CALLS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 map abs sub dif sqr sqrt cos c2m radius step smoothstep fract bias gain hash2 valueNoise perlin worleyF1 worleyF2 fbm turbulence ridged periodicNoise mandelbrot julia wrap mirror repeat mirrorRepeat linearGrad radialGrad angularGrad checker brick line circle ring box triangle grid sierpinski sdfLine sdfCircle sdfBox sdfFill sdfOutline multiply screen overlay softLight difference'.split(' '));
const and=(a,b)=>a==='false'||b==='false'?'false':a==='true'?b:b==='true'?a:`(${a} && ${b})`;
const or=(a,b)=>a==='true'||b==='true'?'true':a==='false'?b:b==='false'?a:`(${a} || ${b})`;
const not=a=>a==='true'?'false':a==='false'?'true':`(!${a})`;
const xor=(a,b)=>a===b?'false':a==='false'?b:b==='false'?a:a==='true'?not(b):b==='true'?not(a):`(${a} != ${b})`;

export class AngleSignLowering{
  constructor(compiler,channel){this.compiler=compiler;this.channel=channel}
  constant(k){return{v:this.compiler.number(k),n:String(k<0||Object.is(k,-0)),k}}
  bind(expression,type='f32'){
    const name=`ff_sign_${this.compiler.nextTemporary++}`;
    this.compiler.statements.push(`let ${name}:${type} = ${expression};`);return name;
  }
  pair(expression,zeroNegative='false',known){
    const v=this.bind(expression);
    if(known!==undefined&&Number.isFinite(known))return{v,n:String(known<0||Object.is(known,-0)),k:known};
    const n=or(`(${v} < 0.0)`,and(`(${v} == 0.0)`,zeroNegative));
    return{v,n:this.bind(n,'bool')};
  }
  zero(a){return a.k!==undefined?String(a.k===0):`(${a.v} == 0.0)`}
  unary(a){return this.pair(`(-${a.v})`,not(a.n),a.k===undefined?undefined:-a.k)}
  binary(op,a,b){
    let nz,k;
    switch(op){
      case'+':nz=and(and(this.zero(a),this.zero(b)),and(a.n,b.n));if(a.k!==undefined&&b.k!==undefined)k=a.k+b.k;break;
      case'-':nz=and(and(this.zero(a),this.zero(b)),and(a.n,not(b.n)));if(a.k!==undefined&&b.k!==undefined)k=a.k-b.k;break;
      case'*':nz=xor(a.n,b.n);if(a.k!==undefined&&b.k!==undefined)k=a.k*b.k;break;
      case'/':nz=and(not(this.zero(b)),xor(a.n,b.n));if(a.k!==undefined&&b.k!==undefined)k=b.k===0?0:a.k/b.k;break;
      case'%':nz=and(not(this.zero(b)),a.n);if(a.k!==undefined&&b.k!==undefined)k=b.k===0?0:a.k%b.k;break;
      default:throw new Error(`Missing angle sign rule for ${op}`);
    }
    const expression=op==='/'?`ff_div(${a.v}, ${b.v})`:op==='%'?`ff_rem(${a.v}, ${b.v})`:`(${a.v} ${op} ${b.v})`;
    return this.pair(expression,nz,k);
  }
  minmax(op,a,b){
    const known=a.k!==undefined&&b.k!==undefined?Math[op](a.k,b.k):undefined;
    return this.pair(`${op}(${a.v}, ${b.v})`,op==='min'?or(a.n,b.n):and(a.n,b.n),known);
  }
  clamp(a,lo,hi){return this.minmax('max',lo,this.minmax('min',hi,a))}
  choose(condition,yes,no){
    // Both payload and sign stay in the selected scope, including expensive work.
    const c=this.compiler,name=`ff_sign_branch_${c.nextTemporary++}`;
    const y=c.captureStatements(yes),n=c.captureStatements(no);
    c.statements.push(`var ${name}:f32;\nvar ${name}_negative:bool;\nif (${condition}) {\n${y.statements}\n${name} = ${y.expression.v};\n${name}_negative = ${y.expression.n};\n} else {\n${n.statements}\n${name} = ${n.expression.v};\n${name}_negative = ${n.expression.n};\n}`);
    return{v:name,n:`${name}_negative`};
  }
  angle(node){
    const x=this.lower(node.args[0]),y=this.lower(node.args[1]);
    this.compiler.usesSemanticAngle=true;
    // atan2's result has Y's sign, including the zero result on the positive axis.
    return{v:`(ff_angle(${y.v}, ${x.v}, ${y.n}, ${x.n}) * 1024.0 / FF_TAU)`,n:y.n};
  }
  lower(node){
    const c=this.compiler,ch=this.channel;
    switch(node.op){
      case'const':return this.constant(Number(node.value));
      case'var':{
        // d is the only variable whose CPU definition can yield -0. Its sign
        // comes from -(height/2-y); coordinate/chroma cancellations yield +0.
        const nz=/^d[01]?$/.test(node.name)?'(dy >= 0.0)':'false';
        return{v:c.variable(node.name,ch),n:or(`(${c.variable(node.name,ch)} < 0.0)`,and(`(${c.variable(node.name,ch)} == 0.0)`,nz))};
      }
      case'unary':return node.operator==='+'?this.lower(node.input):node.operator==='-'?this.unary(this.lower(node.input)):this.pair(c.value(node,ch));
      case'binary':return ['+','-','*','/','%'].includes(node.operator)?this.binary(node.operator,this.lower(node.left),this.lower(node.right)):this.pair(c.value(node,ch));
      case'select':return this.choose(c.bool(node.condition,ch),()=>this.lower(node.whenTrue),()=>this.lower(node.whenFalse));
      case'call':return this.call(node);
      default:throw new Error(`Missing angle sign rule for ${node.op}`);
    }
  }
  call(node){
    const c=this.compiler,ch=this.channel,name=node.fn;
    if(name==='angle'||name==='c2d'){
      const result=this.angle(node);return{v:this.bind(result.v),n:result.n};
    }
    if(POSITIVE_ZERO_CALLS.has(name))return this.pair(c.value(node,ch));
    const a=node.args.map(arg=>this.lower(arg)),A=i=>a[i];
    const original=()=>c.call(name,a.map(arg=>arg.v),ch);
    const bin=(op,x,y)=>this.binary(op,x,y),K=n=>this.constant(n);
    const interpolate=(x,y,t)=>bin('+',x,bin('*',bin('-',y,x),t));
    let sign;
    switch(name){
      case'ctl':
        // Read runtime control-buffer bits before floating arithmetic. Invalid
        // indices return semantic +0 regardless of constant coalescing.
        return this.pair(original(),`ff_control_negative(${A(0).v})`);
      case'val':{
        const control=this.pair(c.call('ctl',[A(0).v],ch),`ff_control_negative(${A(0).v})`);
        sign=bin('+',bin('/',bin('*',control,bin('-',A(2),A(1))),K(255)),A(1)).n;break;
      }
      case'min':case'sdfUnion':sign=or(A(0).n,A(1).n);break;
      case'max':case'sdfIntersect':sign=and(A(0).n,A(1).n);break;
      case'sdfSubtract':sign=and(A(0).n,not(A(1).n));break;
      case'add':sign=or(bin('+',A(0),A(1)).n,A(2).n);break;
      case'clamp':sign=and(A(1).n,or(A(2).n,A(0).n));break;
      case'floor':case'ceil':case'round':case'sign':sign=A(0).n;break;
      case'sin':case'tan':sign=and(this.zero(A(0)),A(0).n);break;
      case'r2x':case'r2y':{
        const trig=this.pair(`(${name==='r2x'?'cos':'sin'}(${A(0).v} * FF_TAU / 1024.0))`,name==='r2y'?and(this.zero(A(0)),A(0).n):'false');
        sign=xor(trig.n,A(1).n);break;
      }
      case'cnv':case'cnv0':case'cnv1':sign=and(not(this.zero(A(9))),A(9).n);break;
      case'mix':sign=and(not(this.zero(A(3))),bin('+',bin('/',bin('*',A(0),A(2)),A(3)),bin('/',bin('*',A(1),bin('-',A(3),A(2))),A(3))).n);break;
      case'scl':sign=and(`(${A(2).v} != ${A(1).v})`,bin('+',A(3),bin('/',bin('*',bin('-',A(4),A(3)),bin('-',A(0),A(1))),bin('-',A(2),A(1)))).n);break;
      case'lerp':{
        const t=this.pair(`clamp(select(${A(2).v}, ${A(2).v}/255.0, abs(${A(2).v})>1.0),0.0,1.0)`);
        sign=interpolate(A(0),A(1),t).n;break;
      }
      case'gradient3':case'gradient4':{
        const t=this.clamp(A(0),K(0),K(1));
        if(name==='gradient3')sign=this.choose(`(${t.v} <= 0.5)`,()=>bin('+',A(1),bin('*',bin('*',bin('-',A(2),A(1)),t),K(2))),()=>interpolate(A(2),A(3),bin('-',bin('*',t,K(2)),K(1)))).n;
        else sign=this.choose(`(${t.v} <= 1.0/3.0)`,()=>bin('+',A(1),bin('*',bin('*',bin('-',A(2),A(1)),t),K(3))),()=>this.choose(`(${t.v} <= 2.0/3.0)`,()=>interpolate(A(2),A(3),bin('-',bin('*',t,K(3)),K(1))),()=>interpolate(A(3),A(4),bin('-',bin('*',t,K(3)),K(2))))).n;
        break;
      }
      case'sdfSmoothUnion':{
        const k=this.pair(`abs(${A(2).v})`);
        sign=this.choose(this.zero(k),()=>this.minmax('min',A(0),A(1)),()=>{
          const h=this.clamp(bin('+',K(0.5),bin('/',bin('*',K(0.5),bin('-',A(1),A(0))),k)),K(0),K(1));
          return bin('-',interpolate(A(1),A(0),h),bin('*',bin('*',k,h),bin('-',K(1),h)));
        }).n;break;
      }
      // Fail closed if a future function is added without a reviewed sign rule.
      default:throw new Error(`Missing angle zero-sign rule for ${name}()`);
    }
    return this.pair(original(),sign);
  }
}

export const SEMANTIC_ANGLE_WGSL=`
fn ff_control_negative(index:f32)->bool{let i=i32(trunc(index));if(i<0||i>=${CONTROL_COUNT}){return false;}return (bitcast<u32>(params.controls[u32(i)])&0x80000000u)!=0u;}
fn ff_angle(y:f32,x:f32,yNegative:bool,xNegative:bool)->f32{
  if(y==0.0){if(xNegative){return select(FF_PI,-FF_PI,yNegative);}return 0.0;}
  if(x==0.0){return select(FF_PI*0.5,-FF_PI*0.5,yNegative);}
  return atan2(y,x);
}
`;
