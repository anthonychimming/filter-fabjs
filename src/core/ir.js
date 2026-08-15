/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { FormulaError } from './formula-language.js';

export const IR_VERSION=1;
export const IRType=Object.freeze({SCALAR:'scalar',INTEGER:'integer',BOOLEAN:'boolean',MASK:'mask',CHANNEL:'channel',COLOR:'color',VECTOR2:'vector2',IMAGE:'image'});
const INTEGER_VARS=new Set('x y z p X Y Z P xmax ymax zmax pmax xmin ymin zmin pmin total'.split(' '));
const CHANNEL_VARS=new Set('r g b a c r0 g0 b0 a0 c0 r1 g1 b1 a1 c1'.split(' '));
const MASK_FUNCTIONS=new Set('step smoothstep hash2 valueNoise perlin worleyF1 worleyF2 fbm turbulence ridged periodicNoise linearGrad radialGrad angularGrad checker brick line circle ring box triangle grid sierpinski'.split(' '));
const INTEGER_FUNCTIONS=new Set('rnd floor ceil round rst'.split(' '));
const CHANNEL_FUNCTIONS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 cnv cnv0 cnv1'.split(' '));
const SOURCE_FUNCTIONS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 cnv cnv0 cnv1'.split(' '));
const STATEFUL_FUNCTIONS=new Set('rnd rst get put'.split(' '));
const NONDETERMINISTIC_FUNCTIONS=new Set('rnd rst'.split(' '));
const GPU_BLOCKED_FUNCTIONS=new Map([['rnd','sequential random state'],['rst','random-state mutation'],['get','shared cell memory'],['put','shared cell memory']]);
function variableIRType(name){if(INTEGER_VARS.has(name))return IRType.INTEGER;if(CHANNEL_VARS.has(name))return IRType.CHANNEL;return IRType.SCALAR}
function mergeIRTypes(a,b){if(a===b)return a;if(a===IRType.BOOLEAN&&b===IRType.BOOLEAN)return IRType.BOOLEAN;if(a===IRType.INTEGER&&b===IRType.INTEGER)return IRType.INTEGER;if(a===IRType.CHANNEL&&b===IRType.CHANNEL)return IRType.CHANNEL;if(a===IRType.MASK&&b===IRType.MASK)return IRType.MASK;return IRType.SCALAR}
function arithmeticIRType(operator,a,b){if(operator==='/' )return IRType.SCALAR;if(operator==='%'&&a===IRType.INTEGER&&b===IRType.INTEGER)return IRType.INTEGER;if(['+','-','*'].includes(operator)&&a===IRType.INTEGER&&b===IRType.INTEGER)return IRType.INTEGER;return IRType.SCALAR}
function callIRType(name,args){if(CHANNEL_FUNCTIONS.has(name))return IRType.CHANNEL;if(MASK_FUNCTIONS.has(name))return IRType.MASK;if(INTEGER_FUNCTIONS.has(name))return IRType.INTEGER;if(['clamp','abs','sign'].includes(name))return args[0]?.type||IRType.SCALAR;if(['min','max','lerp'].includes(name))return mergeIRTypes(args[0]?.type,args[1]?.type);if(['multiply','screen','overlay','softLight','difference'].includes(name))return args[0]?.type===IRType.CHANNEL||args[1]?.type===IRType.CHANNEL?IRType.CHANNEL:IRType.SCALAR;return IRType.SCALAR}
function constantIntegerFromAst(node){
  if(!node)return null;
  if(node.k==='n'&&Number.isFinite(Number(node.v)))return Math.trunc(Number(node.v));
  if(node.k==='u'){
    const value=constantIntegerFromAst(node.e);if(value===null)return null;
    if(node.o==='+')return value;if(node.o==='-')return -value;if(node.o==='~')return ~value;if(node.o==='!')return value?0:1;
  }
  if(node.k==='b'){
    const a=constantIntegerFromAst(node.l),b=constantIntegerFromAst(node.r);if(a===null||b===null)return null;
    switch(node.o){case'+':return a+b;case'-':return a-b;case'*':return a*b;case'/':return b===0?0:Math.trunc(a/b);case'%':return b===0?0:a%b;case'<<':return a<<b;case'>>':return a>>b;case'&':return a&b;case'^':return a^b;case'|':return a|b;case',':return b;}
  }
  if(node.k==='t'){
    const condition=constantIntegerFromAst(node.c);if(condition===null)return null;
    return constantIntegerFromAst(condition?node.y:node.n);
  }
  return null;
}
export class TypedIRCompiler{
  constructor({legacyMath=false}={}){
    this.legacyMath=Boolean(legacyMath);
    this.meta={nodeCount:0,controls:Array(8).fill(false),dynamicControls:false,functions:new Set(),variables:new Set(),usesSource:false,stateful:false,deterministic:true,gpuBlockers:new Set()};
    if(this.legacyMath)this.meta.gpuBlockers.add('legacy integer compatibility mode');
  }
  markControl(index,count=1){
    if(Number.isInteger(index)&&index>=0&&index+count<=8){for(let i=0;i<count;i++)this.meta.controls[index+i]=true}
    else{this.meta.dynamicControls=true;this.meta.controls.fill(true)}
  }
  trackCall(name,astArgs){
    this.meta.functions.add(name);
    if(SOURCE_FUNCTIONS.has(name))this.meta.usesSource=true;
    if(STATEFUL_FUNCTIONS.has(name))this.meta.stateful=true;
    if(NONDETERMINISTIC_FUNCTIONS.has(name))this.meta.deterministic=false;
    const blocker=GPU_BLOCKED_FUNCTIONS.get(name);if(blocker)this.meta.gpuBlockers.add(`${name}(): ${blocker}`);
    if(name==='ctl'||name==='val')this.markControl(constantIntegerFromAst(astArgs[0]));
    else if(name==='map'){
      const pair=constantIntegerFromAst(astArgs[0]);
      if(Number.isInteger(pair)&&pair>=0&&pair<4)this.markControl(pair*2,2);else this.markControl(null);
    }
  }
  compile(node){
    if(!node)throw new FormulaError('Cannot compile an empty expression');
    this.meta.nodeCount++;
    switch(node.k){
      case'n':return{op:'const',type:Number.isInteger(Number(node.v))?IRType.INTEGER:IRType.SCALAR,value:Number(node.v)};
      case'v':this.meta.variables.add(node.n);return{op:'var',type:variableIRType(node.n),name:node.n};
      case'u':{
        const input=this.compile(node.e),type=node.o==='!'?IRType.BOOLEAN:node.o==='~'?IRType.INTEGER:(input.type===IRType.INTEGER?IRType.INTEGER:IRType.SCALAR);
        return{op:'unary',type,operator:node.o,input};
      }
      case'b':{
        const left=this.compile(node.l),right=this.compile(node.r);let type;
        if(node.o===',')type=right.type;
        else if(['&&','||','==','!=','<','<=','>','>='].includes(node.o))type=IRType.BOOLEAN;
        else if(['&','^','|','<<','>>'].includes(node.o))type=IRType.INTEGER;
        else type=arithmeticIRType(node.o,left.type,right.type);
        return{op:'binary',type,operator:node.o,left,right};
      }
      case't':{
        const condition=this.compile(node.c),whenTrue=this.compile(node.y),whenFalse=this.compile(node.n);
        return{op:'select',type:mergeIRTypes(whenTrue.type,whenFalse.type),condition,whenTrue,whenFalse};
      }
      case'f':{
        this.trackCall(node.n,node.a);const args=node.a.map(arg=>this.compile(arg));
        return{op:'call',type:callIRType(node.n,args),fn:node.n,args};
      }
    }
    throw new FormulaError(`Unknown syntax node “${node.k}”`);
  }
  finish(){
    const gpuBlockers=[...this.meta.gpuBlockers];
    return{nodeCount:this.meta.nodeCount,controlMask:[...this.meta.controls],dynamicControls:this.meta.dynamicControls,functions:[...this.meta.functions].sort(),variables:[...this.meta.variables].sort(),usesSource:this.meta.usesSource,stateful:this.meta.stateful,deterministic:this.meta.deterministic,gpuCompatible:gpuBlockers.length===0,gpuBlockers};
  }
}
export function compileFilterProgram(astList,{legacyMath=false}={}){
  if(!Array.isArray(astList)||astList.length!==4)throw new FormulaError('A filter program requires four channel expressions');
  const compiler=new TypedIRCompiler({legacyMath});
  const outputs=astList.map((ast,channel)=>({channel,type:IRType.CHANNEL,expression:compiler.compile(ast)}));
  return{kind:'filter-fab-program',irVersion:IR_VERSION,mathMode:legacyMath?'legacy':'float',outputs,metadata:compiler.finish()};
}
