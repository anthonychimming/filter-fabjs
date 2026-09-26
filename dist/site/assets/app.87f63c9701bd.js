(()=>{'use strict';

/* src/core/utils.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const debounce = (fn, milliseconds = 150) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), milliseconds);
  };
};
const storageGet = (key, fallback = '') => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
const storageSet = (key, value) => {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
};
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const slug = value => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'filter';


/* src/core/controls.js */
/**
 * Filter FabJS
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */


const DEFAULT_CONTROL_VALUE=128;
const CONTROL_UI_WIDGETS=Object.freeze(['slider','number','toggle','seed']);
const CONTROL_UI_FORMATS=Object.freeze(['number','integer']);
const CONTROL_UNIT_MAX_LENGTH=12;
const DEFAULT_CONTROL_UI=Object.freeze({widget:'slider',displayMin:0,displayMax:255,step:1,format:'number',unit:''});
const CONTROL_DEFINITIONS=Object.freeze(Array.from({length:10},(_,index)=>Object.freeze({index,defaultValue:DEFAULT_CONTROL_VALUE,defaultLabel:`Control ${index+1}`})));
const CONTROL_COUNT=CONTROL_DEFINITIONS.length;
const CONTROL_PAIR_COUNT=Math.floor(CONTROL_COUNT/2);

function cloneControlUI(ui=DEFAULT_CONTROL_UI){return{widget:ui.widget,displayMin:ui.displayMin,displayMax:ui.displayMax,step:ui.step,format:ui.format,unit:ui.unit}}
function normalizeControlUI(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return cloneControlUI();
  const widget=CONTROL_UI_WIDGETS.includes(value.widget)?value.widget:DEFAULT_CONTROL_UI.widget;
  const format=widget==='seed'?'integer':CONTROL_UI_FORMATS.includes(value.format)?value.format:DEFAULT_CONTROL_UI.format;
  let displayMin=Number.isFinite(value.displayMin)?value.displayMin:DEFAULT_CONTROL_UI.displayMin;
  let displayMax=Number.isFinite(value.displayMax)?value.displayMax:DEFAULT_CONTROL_UI.displayMax;
  if(displayMax<=displayMin){displayMin=DEFAULT_CONTROL_UI.displayMin;displayMax=DEFAULT_CONTROL_UI.displayMax;}
  const range=displayMax-displayMin;
  const step=Number.isFinite(value.step)&&value.step>0&&value.step<=range?value.step:Math.min(DEFAULT_CONTROL_UI.step,range);
  const unit=typeof value.unit==='string'?value.unit.slice(0,CONTROL_UNIT_MAX_LENGTH):DEFAULT_CONTROL_UI.unit;
  return{widget,displayMin,displayMax,step,format,unit};
}
function validateControlUI(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Control presentation must be an object');
  if(!CONTROL_UI_WIDGETS.includes(value.widget))throw new Error(`Widget must be one of: ${CONTROL_UI_WIDGETS.join(', ')}`);
  if(!Number.isFinite(value.displayMin))throw new Error('Display minimum must be a finite number');
  if(!Number.isFinite(value.displayMax)||value.displayMax<=value.displayMin)throw new Error('Display maximum must be a finite number greater than the minimum');
  const range=value.displayMax-value.displayMin;
  if(!Number.isFinite(value.step)||value.step<=0||value.step>range)throw new Error('Step must be positive and no larger than the display range');
  if(!CONTROL_UI_FORMATS.includes(value.format))throw new Error(`Format must be one of: ${CONTROL_UI_FORMATS.join(', ')}`);
  if(typeof value.unit!=='string')throw new Error('Unit must be a string');
  if(value.unit.length>CONTROL_UNIT_MAX_LENGTH)throw new Error(`Unit exceeds ${CONTROL_UNIT_MAX_LENGTH} characters`);
  return{...cloneControlUI(value),format:value.widget==='seed'?'integer':value.format};
}
function rawToDisplay(raw,ui=DEFAULT_CONTROL_UI){const normalized=normalizeControlUI(ui);return normalized.displayMin+(clamp(Number(raw)||0,0,255)/255)*(normalized.displayMax-normalized.displayMin)}
function snapDisplay(value,ui=DEFAULT_CONTROL_UI){const normalized=normalizeControlUI(ui),numeric=Number(value);if(!Number.isFinite(numeric))return normalized.displayMin;const steps=Math.round((numeric-normalized.displayMin)/normalized.step);return clamp(normalized.displayMin+steps*normalized.step,normalized.displayMin,normalized.displayMax)}
function displayToRaw(value,ui=DEFAULT_CONTROL_UI){const normalized=normalizeControlUI(ui),display=snapDisplay(value,normalized),t=(display-normalized.displayMin)/(normalized.displayMax-normalized.displayMin);return clamp(t*255,0,255)}
function decimalPlaces(step){
  if(!Number.isFinite(step)||step<=0)return 0;
  const text=step.toString().toLowerCase();
  if(text.includes('e-'))return Math.min(12,Number(text.split('e-')[1])||0);
  return Math.min(12,(text.split('.')[1]||'').length);
}
function formatControlValue(value,ui=DEFAULT_CONTROL_UI){
  const normalized=normalizeControlUI(ui),numeric=Number(value);if(!Number.isFinite(numeric))return'';
  if(normalized.format==='integer')return String(Math.round(numeric));
  const precision=decimalPlaces(normalized.step),rounded=Number(numeric.toFixed(precision));return String(Object.is(rounded,-0)?0:rounded);
}
function normalizeToggleRaw(raw){return clamp(Number(raw)||0,0,255)<127.5?0:255}
function randomSeedDisplay(ui=DEFAULT_CONTROL_UI,random=Math.random){
  const normalized=normalizeControlUI(ui),minimum=Math.ceil(normalized.displayMin),maximum=Math.floor(normalized.displayMax);
  if(maximum<minimum)return Math.round(snapDisplay(normalized.displayMin,normalized));
  const value=minimum+Math.floor(clamp(Number(random())||0,0,0.9999999999999999)*(maximum-minimum+1));return Math.round(snapDisplay(value,normalized));
}
const defaultControlValues=()=>CONTROL_DEFINITIONS.map(definition=>definition.defaultValue);
const defaultControlLabels=()=>CONTROL_DEFINITIONS.map(definition=>definition.defaultLabel);
const defaultControlUIs=()=>CONTROL_DEFINITIONS.map(()=>cloneControlUI());


/* src/core/filter-metadata.js */
// Portable metadata only: no compiler or renderer dependencies.
function validatePortableId(id){
  if(id===undefined)return undefined;
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw new Error('Native filter id must contain 1–80 letters, digits, underscores or hyphens');
  return id;
}
function tagKey(tag){return tag.normalize('NFC').toLowerCase();}
function normalizeTags(tags=[]){
  if(!Array.isArray(tags)||tags.length>20)throw new Error('Tags must be an array of at most 20 tags');
  const result=[],seen=new Set();
  for(const value of tags){
    if(typeof value!=='string'||/[\p{Cc}\p{Cf}]/u.test(value))throw new Error('Tags must be text without control characters');
    const label=value.normalize('NFC').trim().replace(/\s+/gu,' ');
    if(!label||[...label].length>32)throw new Error('Each tag must contain 1–32 Unicode characters');
    const key=tagKey(label);if(!seen.has(key)){seen.add(key);result.push(label);}
  }
  return result;
}
function searchText(value){return String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/gu,' ');}
function portableContent(filter){
  return JSON.stringify([filter.name,filter.author||'',filter.description||'',normalizeTags(filter.tags).map(tagKey).sort(),filter.mathMode,filter.formulas,filter.controls]);
}


/* src/core/formula-language.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
const ARITY={src:3,rad:3,ctl:1,val:3,map:2,min:2,max:2,abs:1,add:3,sub:3,dif:2,rnd:2,mix:4,scl:5,sqr:1,sqrt:1,sin:1,cos:1,tan:1,r2x:2,r2y:2,c2d:2,c2m:2,radius:2,angle:2,get:1,put:2,cnv:10,rst:1,pow:2,src0:3,src1:3,rad0:3,rad1:3,cnv0:10,cnv1:10,clamp:3,lerp:3,step:2,smoothstep:3,floor:1,ceil:1,round:1,fract:1,sign:1,bias:2,gain:2,hash2:3,valueNoise:4,perlin:4,worleyF1:4,worleyF2:4,fbm:7,turbulence:5,ridged:5,periodicNoise:5,mandelbrot:3,julia:5,wrap:2,mirror:2,repeat:2,mirrorRepeat:2,gradient3:4,gradient4:5,srcWrap:3,srcMirror:3,srcLinear:3,linearGrad:6,radialGrad:5,angularGrad:5,checker:4,brick:6,line:8,circle:6,ring:7,box:8,triangle:9,grid:6,sierpinski:7,sdfLine:7,sdfCircle:5,sdfBox:7,sdfUnion:2,sdfIntersect:2,sdfSubtract:2,sdfSmoothUnion:3,sdfFill:[1,2],sdfOutline:[2,3],multiply:[2,3],screen:[2,3],overlay:[2,3],softLight:[2,3],difference:[2,3]};
const VARS=new Set(('r g b a c i u v x y nx ny cx cy z p d m X Y Z P D M R G B A C I U V t rmax gmax bmax amax cmax imax umax vmax dmax mmax pmax xmax ymax zmax rmin gmin bmin amin cmin imin umin vmin dmin mmin pmin xmin ymin zmin r0 g0 b0 a0 c0 i0 u0 v0 d0 m0 r1 g1 b1 a1 c1 i1 u1 v1 d1 m1 tmin tmax total').split(' '));
const FORMULA_LIMITS=Object.freeze({maxLength:8192,maxTokens:4096,maxNodes:4096,maxDepth:128});
const MAX_FRACTAL_ITERATIONS=512;

class FormulaError extends Error{constructor(message,pos=0){super(message);this.name='FormulaError';this.pos=pos}}

class Tokenizer{
  constructor(text){
    this.text=String(text??'');this.pos=0;this.tokenCount=0;
    if(this.text.length>FORMULA_LIMITS.maxLength)throw new FormulaError(`Formula exceeds the ${FORMULA_LIMITS.maxLength}-character limit`,FORMULA_LIMITS.maxLength);
    this.next();
  }
  emit(type,value,pos){
    if(type!=='eof'&&++this.tokenCount>FORMULA_LIMITS.maxTokens)throw new FormulaError(`Formula exceeds the ${FORMULA_LIMITS.maxTokens}-token limit`,pos);
    return this.current={type,value,pos};
  }
  next(){
    const source=this.text,length=source.length;
    while(this.pos<length){
      if(/\s/.test(source[this.pos])){this.pos++;continue}
      if(source[this.pos]==='/'&&source[this.pos+1]==='/'){while(this.pos<length&&!/[\r\n]/.test(source[this.pos]))this.pos++;continue}
      break;
    }
    if(this.pos>=length)return this.emit('eof','',this.pos);
    const start=this.pos;
    if(source[start]==='0'&&/[xX]/.test(source[start+1]||'')){
      this.pos+=2;let hex='';while(this.pos<length&&/[0-9a-f]/i.test(source[this.pos]))hex+=source[this.pos++];
      if(!hex)throw new FormulaError('Expected hexadecimal digits',start);
      const value=Number.parseInt(hex,16);if(!Number.isFinite(value))throw new FormulaError('Numeric literal must be finite',start);
      return this.emit('number',value,start);
    }
    if(/[0-9]/.test(source[start])){
      let raw='';while(this.pos<length&&/[0-9.]/.test(source[this.pos]))raw+=source[this.pos++];
      if((raw.match(/\./g)||[]).length>1)throw new FormulaError('Invalid number',start);
      const value=Number(raw);if(!Number.isFinite(value))throw new FormulaError('Numeric literal must be finite',start);
      return this.emit('number',value,start);
    }
    if(/[A-Za-z]/.test(source[start])){
      let id='';while(this.pos<length&&/[A-Za-z0-9]/.test(source[this.pos]))id+=source[this.pos++];
      return this.emit('id',id,start);
    }
    const two=source.slice(start,start+2);
    if(['<<','>>','<=','>=','==','!=','&&','||'].includes(two)){this.pos+=2;return this.emit('op',two,start)}
    const char=source[this.pos++];
    if('+-*/%<>&^|!?~,:()'.includes(char))return this.emit(char==='('? 'lparen':char===')'?'rparen':char===','?'comma':char===':'?'colon':'op',char,start);
    throw new FormulaError(`Disallowed character “${char}”`,start);
  }
}

class Parser{
  constructor(text){this.t=new Tokenizer(text);this.nodeCount=0}
  node(value,pos){if(++this.nodeCount>FORMULA_LIMITS.maxNodes)throw new FormulaError(`Formula exceeds the ${FORMULA_LIMITS.maxNodes}-node limit`,pos);return value}
  checkDepth(depth){if(depth>FORMULA_LIMITS.maxDepth)throw new FormulaError(`Formula exceeds the nesting limit of ${FORMULA_LIMITS.maxDepth}`,this.t.current.pos)}
  parse(){const node=this.expr(0,0);if(this.t.current.type!=='eof')throw new FormulaError(`Unexpected “${this.t.current.value}”`,this.t.current.pos);return node}
  expr(min,depth){
    this.checkDepth(depth);let left=this.prefix(depth);
    while(true){
      const token=this.t.current;
      if(token.type==='op'&&token.value==='?'&&2>=min){
        this.t.next();const whenTrue=this.expr(0,depth+1);
        if(this.t.current.type!=='colon')throw new FormulaError('Expected : in conditional',this.t.current.pos);
        this.t.next();left=this.node({k:'t',c:left,y:whenTrue,n:this.expr(2,depth+1)},token.pos);continue;
      }
      const operator=token.type==='comma'?',':token.type==='op'?token.value:null,precedence=this.prec(operator);
      if(!operator||precedence<min)break;
      this.t.next();left=this.node({k:'b',o:operator,l:left,r:this.expr(precedence+1,depth+1)},token.pos);
    }
    return left;
  }
  prefix(depth){
    this.checkDepth(depth);const token=this.t.current;
    if(token.type==='number'){this.t.next();return this.node({k:'n',v:token.value},token.pos)}
    if(token.type==='id'){
      this.t.next();const name=token.value;
      if(this.t.current.type==='lparen'){
        if(!(name in ARITY))throw new FormulaError(`Unknown function “${name}”`,token.pos);
        this.t.next();const args=[];
        if(this.t.current.type!=='rparen')while(true){args.push(this.expr(2,depth+1));if(this.t.current.type==='comma'){this.t.next();continue}break}
        if(this.t.current.type!=='rparen')throw new FormulaError('Expected )',this.t.current.pos);
        this.t.next();const arity=ARITY[name],valid=Array.isArray(arity)?arity.includes(args.length):args.length===arity;
        if(!valid){const expected=Array.isArray(arity)?arity.join(' or '):arity;throw new FormulaError(`${name}() expects ${expected} argument${Array.isArray(arity)||arity!==1?'s':''}`,token.pos)}
        return this.node({k:'f',n:name,a:args},token.pos);
      }
      if(!VARS.has(name))throw new FormulaError(`Unknown variable “${name}”`,token.pos);
      return this.node({k:'v',n:name},token.pos);
    }
    if(token.type==='lparen'){
      this.t.next();const node=this.expr(0,depth+1);
      if(this.t.current.type!=='rparen')throw new FormulaError('Expected )',this.t.current.pos);
      this.t.next();return node;
    }
    if(token.type==='op'&&['+','-','!','~'].includes(token.value)){this.t.next();return this.node({k:'u',o:token.value,e:this.expr(10,depth+1)},token.pos)}
    throw new FormulaError(token.type==='eof'?'Expression is empty':`Unexpected “${token.value}”`,token.pos);
  }
  prec(operator){if(operator===',')return 1;if(operator==='&&'||operator==='||')return 3;if(['&','^','|'].includes(operator))return 4;if(operator==='=='||operator==='!=')return 5;if(['<','<=','>','>='].includes(operator))return 6;if(operator==='<<'||operator==='>>')return 7;if(operator==='+'||operator==='-')return 8;if(['*','/','%'].includes(operator))return 9;return-1}
}


/* src/core/chroma.js */
/**
 * Filter FabJS
 * Chroma-variable contracts shared by the CPU and WebGPU renderers.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

const float=Object.freeze({uMin:-55,uMax:55,uSpan:110,vMin:-78,vMax:78,vSpan:156});
const legacy=Object.freeze({uMin:0,uMax:255,uSpan:255,vMin:0,vMax:255,vSpan:255});

const CHROMA_MODELS=Object.freeze({float,legacy});


/* src/core/ir.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */


const IR_VERSION=1;
const IRType=Object.freeze({SCALAR:'scalar',INTEGER:'integer',BOOLEAN:'boolean',MASK:'mask',CHANNEL:'channel',COLOR:'color',VECTOR2:'vector2',IMAGE:'image'});
const INTEGER_VARS=new Set('x y z p X Y Z P xmax ymax zmax pmax xmin ymin zmin pmin total'.split(' '));
const CHANNEL_VARS=new Set('r g b a c r0 g0 b0 a0 c0 r1 g1 b1 a1 c1'.split(' '));
const MASK_FUNCTIONS=new Set('step smoothstep hash2 valueNoise perlin worleyF1 worleyF2 fbm turbulence ridged periodicNoise mandelbrot julia linearGrad radialGrad angularGrad checker brick line circle ring box triangle grid sierpinski sdfFill sdfOutline'.split(' '));
const INTEGER_FUNCTIONS=new Set('rnd floor ceil round rst'.split(' '));
const CHANNEL_FUNCTIONS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 cnv cnv0 cnv1'.split(' '));
const SOURCE_FUNCTIONS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 cnv cnv0 cnv1'.split(' '));
const STATEFUL_FUNCTIONS=new Set('rnd rst get put'.split(' '));
const NONDETERMINISTIC_FUNCTIONS=new Set('rnd rst'.split(' '));
const PROGRAM_CACHE_KEYS=new WeakMap();
function appendKeyText(chunks,value){const text=String(value??'');chunks.push(String(text.length),':',text)}
function appendExpressionKey(chunks,node){
  if(!node||typeof node!=='object'){chunks.push('0');return}
  switch(node.op){
    case'const':chunks.push('N');appendKeyText(chunks,Object.is(node.value,-0)?'-0':node.value);return;
    case'var':chunks.push('V');appendKeyText(chunks,node.name);return;
    case'unary':chunks.push('U');appendKeyText(chunks,node.operator);appendExpressionKey(chunks,node.input);return;
    case'binary':chunks.push('B');appendKeyText(chunks,node.operator);appendExpressionKey(chunks,node.left);appendExpressionKey(chunks,node.right);return;
    case'select':chunks.push('S');appendExpressionKey(chunks,node.condition);appendExpressionKey(chunks,node.whenTrue);appendExpressionKey(chunks,node.whenFalse);return;
    case'call':{const args=Array.isArray(node.args)?node.args:[];chunks.push('F');appendKeyText(chunks,node.fn);chunks.push(String(args.length),';');args.forEach(arg=>appendExpressionKey(chunks,arg));return}
    default:chunks.push('X');appendKeyText(chunks,node.op);
  }
}
function programCacheKey(program){
  if(program&&typeof program==='object'){const cached=PROGRAM_CACHE_KEYS.get(program);if(cached)return cached}
  const chunks=['P'];appendKeyText(chunks,program?.kind);appendKeyText(chunks,program?.irVersion);appendKeyText(chunks,program?.mathMode);const outputs=Array.isArray(program?.outputs)?program.outputs:[];chunks.push(String(outputs.length),';');outputs.forEach(output=>appendExpressionKey(chunks,output?.expression));const key=chunks.join('');
  if(program&&typeof program==='object')PROGRAM_CACHE_KEYS.set(program,key);return key;
}
function variableIRType(name){if(INTEGER_VARS.has(name))return IRType.INTEGER;if(CHANNEL_VARS.has(name))return IRType.CHANNEL;return IRType.SCALAR}
function mergeIRTypes(a,b){if(a===b)return a;if(a===IRType.BOOLEAN&&b===IRType.BOOLEAN)return IRType.BOOLEAN;if(a===IRType.INTEGER&&b===IRType.INTEGER)return IRType.INTEGER;if(a===IRType.CHANNEL&&b===IRType.CHANNEL)return IRType.CHANNEL;if(a===IRType.MASK&&b===IRType.MASK)return IRType.MASK;return IRType.SCALAR}
function arithmeticIRType(operator,a,b){if(operator==='/' )return IRType.SCALAR;if(operator==='%'&&a===IRType.INTEGER&&b===IRType.INTEGER)return IRType.INTEGER;if(['+','-','*'].includes(operator)&&a===IRType.INTEGER&&b===IRType.INTEGER)return IRType.INTEGER;return IRType.SCALAR}
function callIRType(name,args){if(CHANNEL_FUNCTIONS.has(name))return IRType.CHANNEL;if(MASK_FUNCTIONS.has(name))return IRType.MASK;if(INTEGER_FUNCTIONS.has(name))return IRType.INTEGER;if(['clamp','abs','sign'].includes(name))return args[0]?.type||IRType.SCALAR;if(['min','max','lerp'].includes(name))return mergeIRTypes(args[0]?.type,args[1]?.type);if(['multiply','screen','overlay','softLight','difference'].includes(name))return args[0]?.type===IRType.CHANNEL||args[1]?.type===IRType.CHANNEL?IRType.CHANNEL:IRType.SCALAR;return IRType.SCALAR}
function constantNumberFromAst(node){
  if(!node)return null;
  if(node.k==='n'){const value=Number(node.v);return Number.isFinite(value)?value:null}
  if(node.k==='u'){
    const value=constantNumberFromAst(node.e);if(value===null)return null;
    if(node.o==='+')return value;if(node.o==='-')return-value;
  }
  if(node.k==='b'){
    const left=constantNumberFromAst(node.l),right=constantNumberFromAst(node.r);if(left===null||right===null)return null;
    let value=null;switch(node.o){case'+':value=left+right;break;case'-':value=left-right;break;case'*':value=left*right;break;case'/':value=right===0?0:left/right;break;case'%':value=right===0?0:left%right;break;}
    return Number.isFinite(value)?value:null;
  }
  return null;
}
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
class TypedIRCompiler{
  constructor({legacyMath=false}={}){
    this.legacyMath=Boolean(legacyMath);
    this.meta={nodeCount:0,controls:Array(CONTROL_COUNT).fill(false),controlMappings:Array(CONTROL_COUNT).fill(null),blockedControlMappings:Array(CONTROL_COUNT).fill(false),dynamicControls:false,functions:new Set(),variables:new Set(),usesSource:false,stateful:false,deterministic:true};
  }
  markControl(index,count=1){
    if(Number.isInteger(index)&&index>=0&&index+count<=CONTROL_COUNT){for(let i=0;i<count;i++)this.meta.controls[index+i]=true}
    else{this.meta.dynamicControls=true;this.meta.controls.fill(true)}
  }
  trackValMapping(astArgs){
    const index=constantNumberFromAst(astArgs[0]);if(!Number.isInteger(index)||index<0||index>=CONTROL_COUNT)return;
    const minimum=constantNumberFromAst(astArgs[1]),maximum=constantNumberFromAst(astArgs[2]),current=this.meta.controlMappings[index];
    if(minimum===null||maximum===null){this.meta.blockedControlMappings[index]=true;return}
    if(!current){this.meta.controlMappings[index]={type:'val',min:minimum,max:maximum};return}
    if(current.type==='conflict'||current.min!==minimum||current.max!==maximum)this.meta.controlMappings[index]={type:'conflict'};
  }
  trackCall(name,astArgs){
    this.meta.functions.add(name);
    if(SOURCE_FUNCTIONS.has(name))this.meta.usesSource=true;
    if(STATEFUL_FUNCTIONS.has(name))this.meta.stateful=true;
    if(NONDETERMINISTIC_FUNCTIONS.has(name))this.meta.deterministic=false;
    if(name==='ctl'||name==='val'){this.markControl(constantIntegerFromAst(astArgs[0]));if(name==='val')this.trackValMapping(astArgs)}
    else if(name==='map'){
      const pair=constantIntegerFromAst(astArgs[0]);
      if(Number.isInteger(pair)&&pair>=0&&pair<CONTROL_PAIR_COUNT)this.markControl(pair*2,2);else this.markControl(null);
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
    const controlMappings=this.meta.controlMappings.map((mapping,index)=>mapping&&this.meta.blockedControlMappings[index]?{type:'conflict'}:mapping?{...mapping}:null);
    return{nodeCount:this.meta.nodeCount,controlMask:[...this.meta.controls],controlMappings,dynamicControls:this.meta.dynamicControls,functions:[...this.meta.functions].sort(),variables:[...this.meta.variables].sort(),usesSource:this.meta.usesSource,stateful:this.meta.stateful,deterministic:this.meta.deterministic};
  }
}
function compileFilterProgram(astList,{legacyMath=false}={}){
  if(!Array.isArray(astList)||astList.length!==4)throw new FormulaError('A filter program requires four channel expressions');
  const compiler=new TypedIRCompiler({legacyMath});
  const outputs=astList.map((ast,channel)=>({channel,type:IRType.CHANNEL,expression:compiler.compile(ast)}));
  return{kind:'filter-fab-program',irVersion:IR_VERSION,mathMode:legacyMath?'legacy':'float',outputs,metadata:compiler.finish()};
}


/* src/presets/contributed-builtins.js */
/**
 * Filter FabJS contributed built-in filters.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
const contributedPresetDefinitions=[
  {
    "id": "c64multicolorbitmap",
    "name": "C64 Multicolor Bitmap",
    "description": "Approximation of Commodore 64 VIC-II Multicolor Bitmap Mode. Uses a 160x200 logical raster and a 40x25 cell grid. Every 4x8 logical-pixel cell is restricted to black plus one three-colour VIC-II bank selected from the cell's source colour. Logical-pixel luminance selects one of those four colours. Uses Colodore-style VIC-II RGB values. Tone changes conversion brightness, Dither adds logical-pixel checker dithering, and Chroma Threshold controls when a cell uses the neutral grey bank.",
    "author": "",
    "tags": [
      "Retro",
      "Pixelate",
      "Color",
      "Dither"
    ],
    "controls": [
      {
        "label": "Tone",
        "value": 123.515625,
        "ui": {
          "widget": "slider",
          "displayMin": -64,
          "displayMax": 64,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Dither",
        "value": 54.64285714285714,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 28,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Chroma Threshold",
        "value": 137.0625,
        "ui": {
          "widget": "slider",
          "displayMin": 10,
          "displayMax": 90,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 4",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 5",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 6",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "((max(max(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2))-min(min(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2))<val(2,10,90))?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,74,178,255):(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0)&&src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2)?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,86,169,237):(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2)?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,85,129,237):gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,46,117,112))))",
      "((max(max(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2))-min(min(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2))<val(2,10,90))?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,74,178,255):(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0)&&src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2)?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,172,255,241):(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2)?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,56,51,241):gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,44,206,109))))",
      "((max(max(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2))-min(min(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)),src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2))<val(2,10,90))?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,74,178,255):(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0)&&src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,1)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2)?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,77,159,113):(src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,0)>src((floor(x*40/X)+0.5)*X/40,(floor(y*25/Y)+0.5)*Y/25,2)?gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,0,56,113):gradient4(min(3,floor(clamp(((src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,0)+2*src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,1)+src((floor(x*160/X)+0.5)*X/160,(floor(y*200/Y)+0.5)*Y/200,2))/4+val(0,-64,64)+(checker(x*160/X,y*200/Y,1,1)*2-1)*val(1,0,28)),0,255)/64))/3,0,155,200,235))))",
      "a"
    ]
  },
  {
    "id": "differenceclouds",
    "name": "Difference Clouds",
    "description": "Generates soft FBM cloud fields and applies difference blending against the source image. Cloud Scale controls structure size, Cloud Contrast adjusts the harshness of the cloud field, Seed regenerates the pattern, and Effect Mix controls blend strength.",
    "author": "",
    "tags": [
      "Noise",
      "Procedural",
      "Texture"
    ],
    "controls": [
      {
        "label": "Cloud Scale",
        "value": 80,
        "ui": {
          "widget": "slider",
          "displayMin": 16,
          "displayMax": 220,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Cloud Contrast",
        "value": 31.166666666666664,
        "ui": {
          "widget": "slider",
          "displayMin": 0.6,
          "displayMax": 2.4,
          "step": 0.01,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Seed",
        "value": 18.440188037607523,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 5",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 6",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "difference(r,clamp((fbm(x,y,val(0,16,220),5,2,0.5,round(val(2,1,9999)))-0.5)*val(1,0.6,2.4)+0.5,0,1)*255,ctl(3))",
      "difference(g,clamp((fbm(x+173,y+59,val(0,16,220),5,2,0.5,round(val(2,1,9999))+101)-0.5)*val(1,0.6,2.4)+0.5,0,1)*255,ctl(3))",
      "difference(b,clamp((fbm(x+347,y+281,val(0,16,220),5,2,0.5,round(val(2,1,9999))+202)-0.5)*val(1,0.6,2.4)+0.5,0,1)*255,ctl(3))",
      "a"
    ]
  },
  {
    "id": "linearprismecho",
    "name": "Linear Prism Echo",
    "description": "Creates a linear prism-lens echo using the source plus three progressively faded, directional bilinear samples. Echo Spacing controls the separation, Angle rotates the echo train, Echo Fade controls attenuation, Chromatic Dispersion slightly varies the offset per RGB channel, and Effect Mix blends the result with the original.",
    "author": "",
    "tags": [
      "Distortion",
      "Color",
      "Blur"
    ],
    "controls": [
      {
        "label": "Echo Spacing",
        "value": 85,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 30,
          "step": 1,
          "format": "number",
          "unit": "% width"
        }
      },
      {
        "label": "Angle",
        "value": 235.16666666666669,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "number",
          "unit": "deg"
        }
      },
      {
        "label": "Echo Fade",
        "value": 140.25,
        "ui": {
          "widget": "slider",
          "displayMin": 35,
          "displayMax": 95,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Chromatic Dispersion",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 8,
          "step": 0.1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 204,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 6",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(\n  c,\n  (\n    c\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*2*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*2*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100*val(2,35,95)/100\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*3*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*3*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100*val(2,35,95)/100*val(2,35,95)/100\n  )\n  /\n  (\n    1\n    +val(2,35,95)/100\n    +val(2,35,95)/100*val(2,35,95)/100\n    +val(2,35,95)/100*val(2,35,95)/100*val(2,35,95)/100\n  ),\n  ctl(4)\n)",
      "lerp(\n  c,\n  (\n    c\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*2*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*2*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100*val(2,35,95)/100\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*3*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*3*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100*val(2,35,95)/100*val(2,35,95)/100\n  )\n  /\n  (\n    1\n    +val(2,35,95)/100\n    +val(2,35,95)/100*val(2,35,95)/100\n    +val(2,35,95)/100*val(2,35,95)/100*val(2,35,95)/100\n  ),\n  ctl(4)\n)",
      "lerp(\n  c,\n  (\n    c\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*2*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*2*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100*val(2,35,95)/100\n    +\n    srcLinear(\n      x-r2x(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*3*(1+(z-1)*val(3,0,8)/100)\n      ),\n      y-r2y(\n        val(1,0,360)*1024/360,\n        X*val(0,0,30)/100*3*(1+(z-1)*val(3,0,8)/100)\n      ),\n      z\n    )*val(2,35,95)/100*val(2,35,95)/100*val(2,35,95)/100\n  )\n  /\n  (\n    1\n    +val(2,35,95)/100\n    +val(2,35,95)/100*val(2,35,95)/100\n    +val(2,35,95)/100*val(2,35,95)/100*val(2,35,95)/100\n  ),\n  ctl(4)\n)",
      "a"
    ]
  },
  {
    "id": "lomochromepurplexr",
    "name": "LomoChrome Purple XR",
    "description": "An  approximation of the Lomography LomoChrome Purple XR 100–400 look. Green foliage is pushed much toward purple/magenta, yellow-green vegetation can skew pink, and blue-dominant areas can drift toward cyan. XR ISO changes the overall warm/cool bias, Grain adds fine deterministic texture, Contrast shapes density, and Effect Mix controls the final blend. Best results come from foliage, parks, trees, grass, flowers, and open-sky outdoor scenes.",
    "author": "",
    "tags": [
      "Color",
      "Retro",
      "Film",
      "Foliage"
    ],
    "controls": [
      {
        "label": "Purple Strength",
        "value": 130.05,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Green Selectivity",
        "value": 81.60000000000001,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Blue→Cyan",
        "value": 96,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Yellow→Pink",
        "value": 210,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "XR ISO",
        "value": 26,
        "ui": {
          "widget": "slider",
          "displayMin": 100,
          "displayMax": 400,
          "step": 1,
          "format": "integer",
          "unit": "ISO"
        }
      },
      {
        "label": "Grain",
        "value": 70,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Contrast",
        "value": 186,
        "ui": {
          "widget": "slider",
          "displayMin": 80,
          "displayMax": 140,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(r,clamp((lerp(lerp(lerp(r,clamp(i*1.08+72+val(4,22,-14),0,255),smoothstep(val(1,-10,18),val(1,18,85),g-(r+b)/2)*val(0,0,1)),clamp(i*0.10+val(4,8,-8),0,255),smoothstep(6,80,b-(r+g)/2)*val(2,0,1)),clamp(i*1.15+82+val(4,14,-14),0,255),smoothstep(8,75,min(r,g)-b)*val(3,0,1))-128)*val(6,0.8,1.4)+128+(hash2(x,y,101)-0.5)*val(5,0,28)*(0.7+0.3*(1-i/255)),0,255),ctl(7))",
      "lerp(g,clamp((lerp(lerp(lerp(g,clamp(i*0.12+4+val(4,2,10),0,255),smoothstep(val(1,-10,18),val(1,18,85),g-(r+b)/2)*val(0,0,1)),clamp(i*0.88+60+val(4,-6,6),0,255),smoothstep(6,80,b-(r+g)/2)*val(2,0,1)),clamp(i*0.32+12+val(4,4,-2),0,255),smoothstep(8,75,min(r,g)-b)*val(3,0,1))-128)*val(6,0.8,1.4)+128+(hash2(x,y,131)-0.5)*val(5,0,24)*(0.7+0.3*(1-i/255)),0,255),ctl(7))",
      "lerp(b,clamp((lerp(lerp(lerp(b,clamp(i*1.02+92+val(4,-2,18),0,255),smoothstep(val(1,-10,18),val(1,18,85),g-(r+b)/2)*val(0,0,1)),clamp(i*0.96+90+val(4,2,18),0,255),smoothstep(6,80,b-(r+g)/2)*val(2,0,1)),clamp(i*0.80+82+val(4,2,8),0,255),smoothstep(8,75,min(r,g)-b)*val(3,0,1))-128)*val(6,0.8,1.4)+128+(hash2(x,y,151)-0.5)*val(5,0,32)*(0.7+0.3*(1-i/255)),0,255),ctl(7))",
      "a"
    ]
  },
  {
    "id": "popprintquad",
    "name": "Pop Print Quad",
    "description": "Four-panel Pop Art treatment inspired by screenprint and comic-print aesthetics. Repeats the source into a 2×2 grid, compresses luminance into black/midtone/background bands, assigns a distinct high-chroma palette to each quadrant, and overlays deterministic black stipple. Tone Bias changes the tonal breakup; Dot Spacing, Density, Radius, and Seed control the print texture; Style Mix blends between the clean 2×2 source grid and the full effect.",
    "author": "",
    "tags": [
      "Print",
      "Color",
      "Pop Art",
      "Halftone"
    ],
    "controls": [
      {
        "label": "Tone Bias",
        "value": 71.71875,
        "ui": {
          "widget": "slider",
          "displayMin": -64,
          "displayMax": 64,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Dot Spacing",
        "value": 159.375,
        "ui": {
          "widget": "slider",
          "displayMin": 4,
          "displayMax": 12,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Dot Density",
        "value": 79.05,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Seed",
        "value": 50.57661532306461,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Dot Radius",
        "value": 18.2142857142857,
        "ui": {
          "widget": "slider",
          "displayMin": 0.08,
          "displayMax": 0.22,
          "step": 0.01,
          "format": "number",
          "unit": "ratio"
        }
      },
      {
        "label": "Style Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,z),(circle(repeat(x,val(1,4,12)),repeat(y,val(1,4,12)),val(1,4,12)/2,val(1,4,12)/2,val(1,4,12)*val(4,0.08,0.22),0.35)>0.5&&hash2(floor(x/val(1,4,12)),floor(y/val(1,4,12)),val(3,1,9999)+(x>=X/2?101:0)+(y>=Y/2?211:0))>val(2,0.998,0.80))?0:gradient3(round(clamp(((299*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,0)+587*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,1)+114*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,2))/1000)+val(0,-64,64),0,255)*2/255)/2,0,y<Y/2?(x<X/2?(z==0?255:z==1?166:73):(z==0?244:z==1?141:206)):(x<X/2?(z==0?67:z==1?224:211):(z==0?255:z==1?225:83)),y<Y/2?(x<X/2?(z==0?75:z==1?255:22):(z==0?24:z==1?210:247)):(x<X/2?(z==0?255:z==1?240:26):(z==0?241:z==1?45:153))),ctl(5))",
      "lerp(srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,z),(circle(repeat(x,val(1,4,12)),repeat(y,val(1,4,12)),val(1,4,12)/2,val(1,4,12)/2,val(1,4,12)*val(4,0.08,0.22),0.35)>0.5&&hash2(floor(x/val(1,4,12)),floor(y/val(1,4,12)),val(3,1,9999)+(x>=X/2?101:0)+(y>=Y/2?211:0))>val(2,0.998,0.80))?0:gradient3(round(clamp(((299*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,0)+587*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,1)+114*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,2))/1000)+val(0,-64,64),0,255)*2/255)/2,0,y<Y/2?(x<X/2?(z==0?255:z==1?166:73):(z==0?244:z==1?141:206)):(x<X/2?(z==0?67:z==1?224:211):(z==0?255:z==1?225:83)),y<Y/2?(x<X/2?(z==0?75:z==1?255:22):(z==0?24:z==1?210:247)):(x<X/2?(z==0?255:z==1?240:26):(z==0?241:z==1?45:153))),ctl(5))",
      "lerp(srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,z),(circle(repeat(x,val(1,4,12)),repeat(y,val(1,4,12)),val(1,4,12)/2,val(1,4,12)/2,val(1,4,12)*val(4,0.08,0.22),0.35)>0.5&&hash2(floor(x/val(1,4,12)),floor(y/val(1,4,12)),val(3,1,9999)+(x>=X/2?101:0)+(y>=Y/2?211:0))>val(2,0.998,0.80))?0:gradient3(round(clamp(((299*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,0)+587*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,1)+114*srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,2))/1000)+val(0,-64,64),0,255)*2/255)/2,0,y<Y/2?(x<X/2?(z==0?255:z==1?166:73):(z==0?244:z==1?141:206)):(x<X/2?(z==0?67:z==1?224:211):(z==0?255:z==1?225:83)),y<Y/2?(x<X/2?(z==0?75:z==1?255:22):(z==0?24:z==1?210:247)):(x<X/2?(z==0?255:z==1?240:26):(z==0?241:z==1?45:153))),ctl(5))",
      "srcLinear(repeat(x,X/2)*2,repeat(y,Y/2)*2,3)"
    ]
  },
  {
    "id": "spectraltearglitch",
    "name": "Spectral Tear Glitch",
    "description": "Analog-style glitch filter with horizontal tear bands, watery ripple distortion, monochrome bias, and RGB fringe. RGB Fringe Amount controls split distance; Fringe Intensity controls how visible the split-color edge is.",
    "author": "",
    "tags": [
      "Glitch",
      "Distortion",
      "Color",
      "Retro"
    ],
    "controls": [
      {
        "label": "Slice Height",
        "value": 40,
        "ui": {
          "widget": "slider",
          "displayMin": 4,
          "displayMax": 80,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Tear Strength",
        "value": 76,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 120,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Ripple Amount",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 24,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Ripple Period",
        "value": 96,
        "ui": {
          "widget": "slider",
          "displayMin": 16,
          "displayMax": 320,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "RGB Fringe Amount",
        "value": 96,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 16,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Fringe Intensity",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 200,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Monochrome",
        "value": 194,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Tear Density",
        "value": 108,
        "ui": {
          "widget": "slider",
          "displayMin": 5,
          "displayMax": 95,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Seed",
        "value": 82,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,clamp(lerp(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z),(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),0)*299+srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),1)*587+srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),2)*114)/1000,val(6,0,1))+(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy))))+(z-1)*val(4,0,16),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z)-srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z))*val(5,0,2),0,255),ctl(9))",
      "lerp(c,clamp(lerp(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z),(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),0)*299+srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),1)*587+srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),2)*114)/1000,val(6,0,1))+(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy))))+(z-1)*val(4,0,16),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z)-srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z))*val(5,0,2),0,255),ctl(9))",
      "lerp(c,clamp(lerp(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z),(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),0)*299+srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),1)*587+srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),2)*114)/1000,val(6,0,1))+(srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy))))+(z-1)*val(4,0,16),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z)-srcLinear(wrap(x+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),11,val(8,1,9999))-0.5)*2*val(1,0,120)*(1-smoothstep(0.35,1,abs(cy)))+(sin(y*(1024/val(3,16,320))+val(8,1,9999))/512)*val(2,0,24)*(0.35+0.65*(1-smoothstep(0.35,1,abs(cy)))),X),wrap(y+step(1-val(7,0.05,0.95),hash2(floor(y/val(0,4,80)),23,val(8,1,9999)+71))*(hash2(floor(y/val(0,4,80)),41,val(8,1,9999)+131)-0.5)*val(2,0,8)*(1-smoothstep(0.35,1,abs(cy))),Y),z))*val(5,0,2),0,255),ctl(9))",
      "a"
    ]
  },
  {
    "id": "teallimemodularweave",
    "name": "Teal Lime Modular Weave",
    "description": "A modular weave. Horizontal Phase and Vertical Phase wrap the pattern. Hue Shift performs a chroma rotation through the original palette. Saturation scales the chroma while preserving each swatch's luminance structure.",
    "author": "",
    "tags": [
      "Pattern",
      "Textile",
      "Procedural",
      "Color"
    ],
    "controls": [
      {
        "label": "Horizontal Phase",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -50,
          "displayMax": 50,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Vertical Phase",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -50,
          "displayMax": 50,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Hue Shift",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -180,
          "displayMax": 180,
          "step": 1,
          "format": "number",
          "unit": "deg"
        }
      },
      {
        "label": "Saturation",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 200,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Seed",
        "value": 157.31546309261853,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Control 6",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "clamp(gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,220.666667,193.333333,146.333333)+gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,10.088497,43.471574,55.633723)*val(3,0,200)/100*cos(gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,123.371593,183.667346,528.943533)+val(2,-512,512))/512,0,255)",
      "clamp(gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,220.666667,193.333333,146.333333)+gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,10.088497,43.471574,55.633723)*val(3,0,200)/100*cos(gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,123.371593,183.667346,528.943533)+val(2,-512,512)-341.333333)/512,0,255)",
      "clamp(gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,220.666667,193.333333,146.333333)+gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,10.088497,43.471574,55.633723)*val(3,0,200)/100*cos(gradient3((floor(wrap(ny+val(1,-0.5,0.5),1)*16)<9?(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<3?wrap(2-floor(wrap(nx+val(0,-0.5,0.5),1)*5)-(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2)+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3):wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)-2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)<2?wrap(floor(wrap(nx+val(0,-0.5,0.5),1)*5)+1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0),3):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==2?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3):(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0)):(floor(wrap(nx+val(0,-0.5,0.5),1)*5)==3?(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),2,val(4,1,9999))>0.75?2:0):wrap(2+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),0,val(4,1,9999))>0.5?1:0),3)):(floor(wrap(ny+val(1,-0.5,0.5),1)*16)%2?(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),3,val(4,1,9999))>0.5?2:0):wrap(1+(hash2(floor(wrap(nx+val(0,-0.5,0.5),1)*5),1,val(4,1,9999))>0.66?1:0),3))))))/2,123.371593,183.667346,528.943533)+val(2,-512,512)+341.333333)/512,0,255)",
      "a"
    ]
  },
  {
    "id": "vhstrackingglitch",
    "name": "VHS Tracking Glitch",
    "description": "Static one-pass VHS damage approximation with horizontal tracking jitter, tear bands, RGB chroma misregistration, tape smear, scanline darkening, deterministic tape noise, and sparse dropout hits. Best for title cards, degraded video frames, horror graphics, and analog-video stylization. Tracking Distortion and Band Height shape the horizontal instability; Tear Scale controls where stronger tracking regions appear; Chroma Offset splits RGB registration; Smear softens detail horizontally; Scanlines and Noise add tape texture; Dropouts adds sparse bright defects; Effect Mix blends back to the source.",
    "author": "OpenAI",
    "tags": [
      "Glitch",
      "Retro",
      "Distortion",
      "Noise"
    ],
    "controls": [
      {
        "label": "Tracking Distortion",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 24,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Band Height",
        "value": 69.54545454545455,
        "ui": {
          "widget": "slider",
          "displayMin": 2,
          "displayMax": 24,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Tear Scale",
        "value": 105,
        "ui": {
          "widget": "slider",
          "displayMin": 24,
          "displayMax": 160,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Chroma Offset",
        "value": 102,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 5,
          "step": 0.25,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Smear",
        "value": 76.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 10,
          "step": 0.5,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Scanlines",
        "value": 111.5625,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 32,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Noise",
        "value": 85,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 18,
          "step": 0.5,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Seed",
        "value": 122.16943388677736,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Dropouts",
        "value": 68,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 45,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(\n  c,\n  clamp(\n    (\n      srcLinear(\n        wrap(\n          x\n          +(valueNoise(0,floor(y/val(1,2,24))*val(1,2,24),64,val(7,1,9999))-0.5)\n           *2*val(0,0,24)\n           *(0.35+1.65*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +(z-1)*val(3,0,5)\n           *(0.4+0.6*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23))),\n          X\n        ),\n        y,\n        z\n      )*0.74\n      +\n      srcLinear(\n        wrap(\n          x\n          +(valueNoise(0,floor(y/val(1,2,24))*val(1,2,24),64,val(7,1,9999))-0.5)\n           *2*val(0,0,24)\n           *(0.35+1.65*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +(z-1)*val(3,0,5)\n           *(0.4+0.6*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +val(4,0,10),\n          X\n        ),\n        y,\n        z\n      )*0.26\n    )\n    *(1-val(5,0,0.32)*step(0.25,fract(y/2)))\n    +(hash2(x,floor(y/2),val(7,1,9999)+47)-0.5)*val(6,0,18)\n    +255*smoothstep(0.9985,0.99995,hash2(x*0.5,y*13,val(7,1,9999)+59))*val(8,0,0.45),\n    0,\n    255\n  ),\n  ctl(9)\n)",
      "lerp(\n  c,\n  clamp(\n    (\n      srcLinear(\n        wrap(\n          x\n          +(valueNoise(0,floor(y/val(1,2,24))*val(1,2,24),64,val(7,1,9999))-0.5)\n           *2*val(0,0,24)\n           *(0.35+1.65*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +(z-1)*val(3,0,5)\n           *(0.4+0.6*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23))),\n          X\n        ),\n        y,\n        z\n      )*0.74\n      +\n      srcLinear(\n        wrap(\n          x\n          +(valueNoise(0,floor(y/val(1,2,24))*val(1,2,24),64,val(7,1,9999))-0.5)\n           *2*val(0,0,24)\n           *(0.35+1.65*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +(z-1)*val(3,0,5)\n           *(0.4+0.6*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +val(4,0,10),\n          X\n        ),\n        y,\n        z\n      )*0.26\n    )\n    *(1-val(5,0,0.32)*step(0.25,fract(y/2)))\n    +(hash2(x,floor(y/2),val(7,1,9999)+47)-0.5)*val(6,0,18)\n    +255*smoothstep(0.9985,0.99995,hash2(x*0.5,y*13,val(7,1,9999)+59))*val(8,0,0.45),\n    0,\n    255\n  ),\n  ctl(9)\n)",
      "lerp(\n  c,\n  clamp(\n    (\n      srcLinear(\n        wrap(\n          x\n          +(valueNoise(0,floor(y/val(1,2,24))*val(1,2,24),64,val(7,1,9999))-0.5)\n           *2*val(0,0,24)\n           *(0.35+1.65*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +(z-1)*val(3,0,5)\n           *(0.4+0.6*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23))),\n          X\n        ),\n        y,\n        z\n      )*0.74\n      +\n      srcLinear(\n        wrap(\n          x\n          +(valueNoise(0,floor(y/val(1,2,24))*val(1,2,24),64,val(7,1,9999))-0.5)\n           *2*val(0,0,24)\n           *(0.35+1.65*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +(z-1)*val(3,0,5)\n           *(0.4+0.6*smoothstep(0.55,0.9,valueNoise(0,y,val(2,24,160),val(7,1,9999)+23)))\n          +val(4,0,10),\n          X\n        ),\n        y,\n        z\n      )*0.26\n    )\n    *(1-val(5,0,0.32)*step(0.25,fract(y/2)))\n    +(hash2(x,floor(y/2),val(7,1,9999)+47)-0.5)*val(6,0,18)\n    +255*smoothstep(0.9985,0.99995,hash2(x*0.5,y*13,val(7,1,9999)+59))*val(8,0,0.45),\n    0,\n    255\n  ),\n  ctl(9)\n)",
      "a"
    ]
  }
];


/* src/presets/pass2-builtins.js */
/**
 * Filter FabJS pass-two built-in filters.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
const pass2PresetDefinitions=[
  {
    "id": "clarendon-cool-grade",
    "name": "Clarendon",
    "description": "A crisp Clarendon-style color grade that increases contrast and saturation, then applies a cool cyan-blue overlay through Overlay blending. Defaults are tuned to the widely used CSSGram Clarendon approximation: 120% contrast, 135% saturation, and a 20% #7FBBE3 overlay. Best for landscapes, cityscapes, products, and vivid portraits; reduce Cool Tint or Effect Mix when warm skin needs gentler treatment.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Tone",
      "Portrait"
    ],
    "controls": [
      {
        "label": "Contrast",
        "value": 102,
        "ui": {
          "widget": "slider",
          "displayMin": 100,
          "displayMax": 150,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Saturation",
        "value": 111.5625,
        "ui": {
          "widget": "slider",
          "displayMin": 100,
          "displayMax": 180,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Cool Tint",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 40,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Control 5",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 6",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(r,overlay(clamp(127.5+val(0,100,150)/100*((0.213*r+0.715*g+0.072*b-127.5)+(r-(0.213*r+0.715*g+0.072*b))*val(1,100,180)/100),0,255),127,val(2,0,40)*2.55),ctl(3))",
      "lerp(g,overlay(clamp(127.5+val(0,100,150)/100*((0.213*r+0.715*g+0.072*b-127.5)+(g-(0.213*r+0.715*g+0.072*b))*val(1,100,180)/100),0,255),187,val(2,0,40)*2.55),ctl(3))",
      "lerp(b,overlay(clamp(127.5+val(0,100,150)/100*((0.213*r+0.715*g+0.072*b-127.5)+(b-(0.213*r+0.715*g+0.072*b))*val(1,100,180)/100),0,255),227,val(2,0,40)*2.55),ctl(3))",
      "a"
    ]
  },
  {
    "id": "gameboydmg01",
    "name": "Game Boy DMG-01",
    "description": "Emulates the original Game Boy DMG display raster: a 160×144 logical pixel grid quantized to four shade indices and mapped to a photo-derived olive-green DMG-01 palette. Exposure shifts the luminance before 2-bit quantization. Dither Strength adds an optional 2×2 ordered dither; leave it at 0 for the cleanest hardware-style raster. Effect Mix blends the emulation with the source. For square Game Boy pixels, use a 10:9 source/output aspect ratio (ideally 160×144 or a nearest-neighbor multiple).",
    "author": "Anthony Chimming",
    "tags": [
      "Retro",
      "Pixel Art",
      "Monochrome"
    ],
    "controls": [
      {
        "label": "Exposure",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -64,
          "displayMax": 64,
          "step": 1,
          "format": "number",
          "unit": "luma"
        }
      },
      {
        "label": "Dither Strength",
        "value": 0,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 32,
          "step": 1,
          "format": "number",
          "unit": "luma"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 4",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 5",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 6",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(c,gradient4(round(clamp((299*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,0)+587*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,1)+114*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,2))/1000+val(0,-64,64)+(((min(floor(nx*160),159)%2)==0?((min(floor(ny*144),143)%2)==0?-1.5:1.5):((min(floor(ny*144),143)%2)==0?0.5:-0.5))/1.5)*val(1,0,32),0,255)*3/255)/3,27,14,73,154),ctl(2))",
      "lerp(c,gradient4(round(clamp((299*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,0)+587*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,1)+114*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,2))/1000+val(0,-64,64)+(((min(floor(nx*160),159)%2)==0?((min(floor(ny*144),143)%2)==0?-1.5:1.5):((min(floor(ny*144),143)%2)==0?0.5:-0.5))/1.5)*val(1,0,32),0,255)*3/255)/3,42,69,107,158),ctl(2))",
      "lerp(c,gradient4(round(clamp((299*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,0)+587*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,1)+114*src((min(floor(nx*160),159)+0.5)*X/160,(min(floor(ny*144),143)+0.5)*Y/144,2))/1000+val(0,-64,64)+(((min(floor(nx*160),159)%2)==0?((min(floor(ny*144),143)%2)==0?-1.5:1.5):((min(floor(ny*144),143)%2)==0?0.5:-0.5))/1.5)*val(1,0,32),0,255)*3/255)/3,9,11,34,63),ctl(2))",
      "a"
    ]
  },
  {
    "id": "gingham-vintage-haze",
    "name": "Gingham",
    "description": "A muted, faded vintage grade inspired by classic Gingham-style processing. It gently lowers contrast, reduces saturation, adds a restrained sepia-warm bias, lifts overall brightness, and compresses upper tones toward a warm cream haze without adding a vignette. Best for portraits, minimalist scenes, cafés, books, soft landscapes, and subdued fashion imagery. Fade controls contrast compression; Saturation controls color restraint; Warmth controls the sepia-style tint; Brightness sets the airy lift; Highlight Haze controls the washed upper-tone shoulder; Effect Mix controls overall strength.",
    "author": "Anthony Chimming",
    "tags": [
      "Film",
      "Tone",
      "Warm",
      "Retro",
      "Portrait"
    ],
    "controls": [
      {
        "label": "Fade",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 20,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Saturation",
        "value": 141.66666666666669,
        "ui": {
          "widget": "slider",
          "displayMin": 55,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Warmth",
        "value": 102,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 35,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Brightness",
        "value": 170,
        "ui": {
          "widget": "slider",
          "displayMin": 95,
          "displayMax": 110,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Highlight Haze",
        "value": 158.66666666666666,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 45,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(c,lerp(clamp(((i+(lerp(c,min(255,0.393*r+0.769*g+0.189*b),val(2,0,35)/100)-i)*(val(1,55,100)/100)-128)*(1-val(0,0,20)/100)+128)*(val(3,95,110)/100),0,255),248,smoothstep(100,245,i)*(val(4,0,45)/100)),ctl(5))",
      "lerp(c,lerp(clamp(((i+(lerp(c,min(255,0.349*r+0.686*g+0.168*b),val(2,0,35)/100)-i)*(val(1,55,100)/100)-128)*(1-val(0,0,20)/100)+128)*(val(3,95,110)/100),0,255),244,smoothstep(100,245,i)*(val(4,0,45)/100)),ctl(5))",
      "lerp(c,lerp(clamp(((i+(lerp(c,min(255,0.272*r+0.534*g+0.131*b),val(2,0,35)/100)-i)*(val(1,55,100)/100)-128)*(1-val(0,0,20)/100)+128)*(val(3,95,110)/100),0,255),236,smoothstep(100,245,i)*(val(4,0,45)/100)),ctl(5))",
      "a"
    ]
  },
  {
    "id": "radialecho",
    "name": "Radial Echo",
    "description": "Creates rotational echo trails by blending four progressively rotated bilinear source samples with the original around an adjustable pivot. Rotation sets the base echo angle, signed Echo Spacing controls trail direction and separation, and Radial Shift expands or contracts each successive echo. Strength and Falloff control trail energy, Centre X and Centre Y move the pivot, Distortion adds a radially phased angular wobble, and Effect Mix blends the result with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Distortion",
      "Radial",
      "Motion",
      "Photography"
    ],
    "controls": [
      {
        "label": "Rotation",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -180,
          "displayMax": 180,
          "step": 1,
          "format": "number",
          "unit": "°"
        }
      },
      {
        "label": "Echo Spacing",
        "value": 162.91666666666666,
        "ui": {
          "widget": "slider",
          "displayMin": -36,
          "displayMax": 36,
          "step": 1,
          "format": "number",
          "unit": "°"
        }
      },
      {
        "label": "Radial Shift",
        "value": 151.40625,
        "ui": {
          "widget": "slider",
          "displayMin": -8,
          "displayMax": 8,
          "step": 0.5,
          "format": "number",
          "unit": "%/echo"
        }
      },
      {
        "label": "Strength",
        "value": 204,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Falloff",
        "value": 76.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Centre X",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -25,
          "displayMax": 25,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Centre Y",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -25,
          "displayMax": 25,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Distortion",
        "value": 30.599999999999998,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 229.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(c,(c+(ctl(3)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-1*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-1*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-2*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-2*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-3*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-3*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-4*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-4*val(2,-0.08,0.08))),z)))))/(1+(ctl(3)/255)*(1+(1-ctl(4)/255)*(1+(1-ctl(4)/255)*(1+(1-ctl(4)/255))))),ctl(8))",
      "lerp(c,(c+(ctl(3)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-1*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-1*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-2*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-2*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-3*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-3*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-4*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-4*val(2,-0.08,0.08))),z)))))/(1+(ctl(3)/255)*(1+(1-ctl(4)/255)*(1+(1-ctl(4)/255)*(1+(1-ctl(4)/255))))),ctl(8))",
      "lerp(c,(c+(ctl(3)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-1*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+1*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*1/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-1*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-2*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+2*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*2/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-2*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*(srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-3*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+3*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*3/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-3*val(2,-0.08,0.08))),z)+(1-ctl(4)/255)*srcLinear(((X*(0.5+val(5,-0.25,0.25)))+(r2x((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(x-(X*(0.5+val(5,-0.25,0.25)))))-r2y((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-4*val(2,-0.08,0.08))),((Y*(0.5+val(6,-0.25,0.25)))+(r2y((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(x-(X*(0.5+val(5,-0.25,0.25)))))+r2x((val(0,-512,512)+4*val(1,-102.4,102.4)+sin(c2m(cx-val(5,-0.5,0.5),cy-val(6,-0.5,0.5))*1536)*(val(7,0,72)/512)*4/4),(y-(Y*(0.5+val(6,-0.25,0.25))))))*(1-4*val(2,-0.08,0.08))),z)))))/(1+(ctl(3)/255)*(1+(1-ctl(4)/255)*(1+(1-ctl(4)/255)*(1+(1-ctl(4)/255))))),ctl(8))",
      "a"
    ]
  },
  {
    "id": "softmeshgradient",
    "name": "Soft Mesh Gradient — Seeded",
    "description": "Art-directable six-point soft mesh gradient for backgrounds, key art, overlays, and abstract colour fields. Seed changes composition only, so palette decisions stay stable while exploring layouts. Blob Size controls the overall field scale; Offset X/Y repositions the composition; Temperature shifts warm versus cool balance; Layout Variation blends between the authored layout and the seeded layout; Softness controls how gradually each colour field falls off; Hue Rotation rotates the generated palette around the colour wheel while largely preserving luminance relationships; Colour Intensity controls palette strength from neutral to vivid; Effect Mix blends the generated gradient with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Gradient",
      "Procedural",
      "Color",
      "Utility"
    ],
    "controls": [
      {
        "label": "Blob Size",
        "value": 103.88888888888889,
        "ui": {
          "widget": "slider",
          "displayMin": 45,
          "displayMax": 180,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Offset X",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -25,
          "displayMax": 25,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Offset Y",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -25,
          "displayMax": 25,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Temperature",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -100,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Seed",
        "value": 97,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Layout Variation",
        "value": 89.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Softness",
        "value": 204,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Hue Rotation",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -180,
          "displayMax": 180,
          "step": 1,
          "format": "number",
          "unit": "°"
        }
      },
      {
        "label": "Colour Intensity",
        "value": 160.55555555555557,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 135,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(r,clamp((176.532+0.042068*cos(val(7,-512,512)+507.974137))+val(3,-100,100)*0.32+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.14,0.05+hash2(11,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.12,0.05+hash2(101,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.72*val(0,45,180)/100),0,1)))*(1.2+0.246582*cos(val(7,-512,512)+160.528503))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.7,0.05+hash2(23,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.1,0.05+hash2(113,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.7*val(0,45,180)/100),0,1)))*(-37.567+0.220192*cos(val(7,-512,512)-58.442611))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.4,0.05+hash2(37,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.34,0.05+hash2(127,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.45*val(0,45,180)/100),0,1)))*(13.222+0.232356*cos(val(7,-512,512)+315.129516))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.5,0.05+hash2(53,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.6,0.05+hash2(139,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.54*val(0,45,180)/100),0,1)))*(-7.461+0.171438*cos(val(7,-512,512)-353.732332))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.12,0.05+hash2(67,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.86,0.05+hash2(151,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.64*val(0,45,180)/100),0,1)))*(-63.577+0.272281*cos(val(7,-512,512)+61.570257))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.82,0.05+hash2(79,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.82,0.05+hash2(163,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.68*val(0,45,180)/100),0,1)))*(-55.254+0.243097*cos(val(7,-512,512)-9.503741))*val(8,0,135)/100,0,255),ctl(9))",
      "lerp(g,clamp((176.532+0.013236*cos(val(7,-512,512)+49.402728))+val(3,-100,100)*0.10+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.14,0.05+hash2(11,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.12,0.05+hash2(101,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.72*val(0,45,180)/100),0,1)))*(1.2+0.077459*cos(val(7,-512,512)-298.392174))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.7,0.05+hash2(23,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.1,0.05+hash2(113,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.7*val(0,45,180)/100),0,1)))*(-37.567+0.069236*cos(val(7,-512,512)+507.116776))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.4,0.05+hash2(37,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.34,0.05+hash2(127,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.45*val(0,45,180)/100),0,1)))*(13.222+0.072895*cos(val(7,-512,512)-143.427737))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.5,0.05+hash2(53,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.6,0.05+hash2(139,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.54*val(0,45,180)/100),0,1)))*(-7.461+0.053857*cos(val(7,-512,512)+211.346456))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.12,0.05+hash2(67,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.86,0.05+hash2(151,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.64*val(0,45,180)/100),0,1)))*(-63.577+0.085667*cos(val(7,-512,512)-397.203862))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.82,0.05+hash2(79,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.82,0.05+hash2(163,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.68*val(0,45,180)/100),0,1)))*(-55.254+0.076486*cos(val(7,-512,512)-468.059061))*val(8,0,135)/100,0,255),ctl(9))",
      "lerp(b,clamp((176.532+0.042068*cos(val(7,-512,512)-260.025863))-val(3,-100,100)*0.32+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.14,0.05+hash2(11,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.12,0.05+hash2(101,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.72*val(0,45,180)/100),0,1)))*(1.2+0.246582*cos(val(7,-512,512)+416.528503))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.7,0.05+hash2(23,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.1,0.05+hash2(113,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.7*val(0,45,180)/100),0,1)))*(-37.567+0.220192*cos(val(7,-512,512)+197.557389))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.4,0.05+hash2(37,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.34,0.05+hash2(127,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.45*val(0,45,180)/100),0,1)))*(13.222+0.232356*cos(val(7,-512,512)-452.870484))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.5,0.05+hash2(53,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.6,0.05+hash2(139,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.54*val(0,45,180)/100),0,1)))*(-7.461+0.171438*cos(val(7,-512,512)-97.732332))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.12,0.05+hash2(67,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.86,0.05+hash2(151,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.64*val(0,45,180)/100),0,1)))*(-63.577+0.272281*cos(val(7,-512,512)+317.570257))*val(8,0,135)/100+(smoothstep(0,lerp(0.35,1,ctl(6)),clamp(1-c2m(x-(X*(lerp(0.82,0.05+hash2(79,17,val(4,1,9999))*0.90,ctl(5))+val(1,-25,25)/100)),y-(Y*(lerp(0.82,0.05+hash2(163,29,val(4,1,9999))*0.90,ctl(5))+val(2,-25,25)/100)))/(min(X,Y)*0.68*val(0,45,180)/100),0,1)))*(-55.254+0.243097*cos(val(7,-512,512)+246.496259))*val(8,0,135)/100,0,255),ctl(9))",
      "a"
    ]
  },
  {
    "id": "balanced-hdr-detail",
    "name": "Balanced HDR Detail",
    "description": "Balances high-contrast photographs with endpoint-preserving shadow lift and highlight compression, then adds controlled 3×3 local detail. Contrast and detail taper toward pure black and pure white, reducing endpoint drift and harsh edge halos while retaining midtone separation. Tune Shadows and Highlights first, then Detail, Saturation, Contrast, and Effect Mix.",
    "author": "Anthony Chimming",
    "tags": [
      "Tone",
      "Detail",
      "Color"
    ],
    "controls": [
      {
        "label": "Shadows",
        "value": 170,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 150,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Highlights",
        "value": 170,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 150,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Detail",
        "value": 106.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 120,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Saturation",
        "value": 138.42857142857142,
        "ui": {
          "widget": "slider",
          "displayMin": 70,
          "displayMax": 140,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Contrast",
        "value": 138.42857142857142,
        "ui": {
          "widget": "slider",
          "displayMin": 85,
          "displayMax": 120,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 229.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(c,clamp(i+(i-128)*((val(4,85,120)/100)-1)*4*(i/255)*((255-i)/255)+(c-i)*(val(3,70,140)/100)+i*((255-i)/255)*((255-i)/255)*(val(0,0,150)/100)-(255-i)*(i/255)*(i/255)*(val(1,0,150)/100)+(c-cnv(1,1,1,1,1,1,1,1,1,9))*(val(2,0,120)/100)*4*(i/255)*((255-i)/255),0,255),ctl(5))",
      "lerp(c,clamp(i+(i-128)*((val(4,85,120)/100)-1)*4*(i/255)*((255-i)/255)+(c-i)*(val(3,70,140)/100)+i*((255-i)/255)*((255-i)/255)*(val(0,0,150)/100)-(255-i)*(i/255)*(i/255)*(val(1,0,150)/100)+(c-cnv(1,1,1,1,1,1,1,1,1,9))*(val(2,0,120)/100)*4*(i/255)*((255-i)/255),0,255),ctl(5))",
      "lerp(c,clamp(i+(i-128)*((val(4,85,120)/100)-1)*4*(i/255)*((255-i)/255)+(c-i)*(val(3,70,140)/100)+i*((255-i)/255)*((255-i)/255)*(val(0,0,150)/100)-(255-i)*(i/255)*(i/255)*(val(1,0,150)/100)+(c-cnv(1,1,1,1,1,1,1,1,1,9))*(val(2,0,120)/100)*4*(i/255)*((255-i)/255),0,255),ctl(5))",
      "a"
    ]
  },
  {
    "id": "chromatic-glass",
    "name": "Chromatic Glass",
    "description": "Refracts the source through irregular smooth cellular glass. Worley-derived facet normals bend the image, while RGB channels use slightly different refraction strengths to create chromatic dispersion. Refraction sets lens strength, Glass Scale sets facet size, Chromatic Split controls RGB separation, Distortion adds organic FBM warping, Facet Smoothness adjusts the normal-sampling spread, Seed regenerates the structure, and Effect Mix blends with the original.",
    "author": "Anthony Chimming",
    "tags": [
      "Distortion",
      "Color",
      "Texture",
      "Procedural"
    ],
    "controls": [
      {
        "label": "Refraction",
        "value": 106.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 48,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Glass Scale",
        "value": 82.875,
        "ui": {
          "widget": "slider",
          "displayMin": 20,
          "displayMax": 180,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Chromatic Split",
        "value": 79.6875,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 16,
          "step": 0.5,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Distortion",
        "value": 72.85714285714285,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 28,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Facet Smoothness",
        "value": 68,
        "ui": {
          "widget": "slider",
          "displayMin": 0.5,
          "displayMax": 8,
          "step": 0.5,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Seed",
        "value": 47.08241648329666,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(c,srcLinear(x+((worleyF1(x+val(4,0.5,8),y,val(1,20,180),val(5,1,9999))-worleyF1(x-val(4,0.5,8),y,val(1,20,180),val(5,1,9999)))*val(1,20,180)/(2*val(4,0.5,8))*max(val(0,0,48)+(1-z)*val(2,0,16),0)+(fbm(x,y,val(1,20,180)*1.25,4,2,0.5,val(5,1,9999)+137)-0.5)*val(3,0,28)),y+((worleyF1(x,y+val(4,0.5,8),val(1,20,180),val(5,1,9999))-worleyF1(x,y-val(4,0.5,8),val(1,20,180),val(5,1,9999)))*val(1,20,180)/(2*val(4,0.5,8))*max(val(0,0,48)+(1-z)*val(2,0,16),0)+(fbm(x+431,y+719,val(1,20,180)*1.25,4,2,0.5,val(5,1,9999)+911)-0.5)*val(3,0,28)),z),ctl(6))",
      "lerp(c,srcLinear(x+((worleyF1(x+val(4,0.5,8),y,val(1,20,180),val(5,1,9999))-worleyF1(x-val(4,0.5,8),y,val(1,20,180),val(5,1,9999)))*val(1,20,180)/(2*val(4,0.5,8))*max(val(0,0,48)+(1-z)*val(2,0,16),0)+(fbm(x,y,val(1,20,180)*1.25,4,2,0.5,val(5,1,9999)+137)-0.5)*val(3,0,28)),y+((worleyF1(x,y+val(4,0.5,8),val(1,20,180),val(5,1,9999))-worleyF1(x,y-val(4,0.5,8),val(1,20,180),val(5,1,9999)))*val(1,20,180)/(2*val(4,0.5,8))*max(val(0,0,48)+(1-z)*val(2,0,16),0)+(fbm(x+431,y+719,val(1,20,180)*1.25,4,2,0.5,val(5,1,9999)+911)-0.5)*val(3,0,28)),z),ctl(6))",
      "lerp(c,srcLinear(x+((worleyF1(x+val(4,0.5,8),y,val(1,20,180),val(5,1,9999))-worleyF1(x-val(4,0.5,8),y,val(1,20,180),val(5,1,9999)))*val(1,20,180)/(2*val(4,0.5,8))*max(val(0,0,48)+(1-z)*val(2,0,16),0)+(fbm(x,y,val(1,20,180)*1.25,4,2,0.5,val(5,1,9999)+137)-0.5)*val(3,0,28)),y+((worleyF1(x,y+val(4,0.5,8),val(1,20,180),val(5,1,9999))-worleyF1(x,y-val(4,0.5,8),val(1,20,180),val(5,1,9999)))*val(1,20,180)/(2*val(4,0.5,8))*max(val(0,0,48)+(1-z)*val(2,0,16),0)+(fbm(x+431,y+719,val(1,20,180)*1.25,4,2,0.5,val(5,1,9999)+911)-0.5)*val(3,0,28)),z),ctl(6))",
      "a"
    ]
  },
  {
    "id": "cinematic-split-grade",
    "name": "Cinematic Split Grade",
    "description": "Applies a film-inspired teal-shadow / amber-highlight grade using a shoulder-safe S-curve, near-luminance-neutral shadow toning, fully tapered specular highlight protection, lifted blacks, an aspect-independent vignette, and global mix. Designed for portraits, street scenes, travel, and narrative stills while preserving source alpha.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Film",
      "Tone"
    ],
    "controls": [
      {
        "label": "Contrast",
        "value": 161.5,
        "ui": {
          "widget": "slider",
          "displayMin": 80,
          "displayMax": 140,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Saturation",
        "value": 141.23076923076923,
        "ui": {
          "widget": "slider",
          "displayMin": 70,
          "displayMax": 135,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Teal Shadows",
        "value": 142.8,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 50,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Warm Highlights",
        "value": 148.36363636363635,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 55,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Tone Balance",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 80,
          "displayMax": 176,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Black Fade",
        "value": 63.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 24,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Vignette",
        "value": 114.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 40,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(r,clamp((val(0,80,140)>=100?lerp(i,smoothstep(0,255,i)*255,(val(0,80,140)-100)/40):lerp(i,128,(100-val(0,80,140))/100))+(r-i)*val(1,70,135)/100-val(2,0,50)*0.8*(1-smoothstep(val(4,80,176)-56,val(4,80,176)+8,i))*smoothstep(8,48,i)+val(3,0,55)*0.7*smoothstep(val(4,80,176),val(4,80,176)+72,i)*(1-smoothstep(220,255,i))+(1-smoothstep(0,88,i))*val(5,0,24),0,255)*(1-smoothstep(0.55,1.35,sqrt(cx*cx+cy*cy))*val(6,0,40)/100),ctl(7))",
      "lerp(g,clamp((val(0,80,140)>=100?lerp(i,smoothstep(0,255,i)*255,(val(0,80,140)-100)/40):lerp(i,128,(100-val(0,80,140))/100))+(g-i)*val(1,70,135)/100+val(2,0,50)*0.2*(1-smoothstep(val(4,80,176)-56,val(4,80,176)+8,i))*smoothstep(8,48,i)+val(3,0,55)*0.05*smoothstep(val(4,80,176),val(4,80,176)+72,i)*(1-smoothstep(220,255,i))+(1-smoothstep(0,88,i))*val(5,0,24),0,255)*(1-smoothstep(0.55,1.35,sqrt(cx*cx+cy*cy))*val(6,0,40)/100),ctl(7))",
      "lerp(b,clamp((val(0,80,140)>=100?lerp(i,smoothstep(0,255,i)*255,(val(0,80,140)-100)/40):lerp(i,128,(100-val(0,80,140))/100))+(b-i)*val(1,70,135)/100+val(2,0,50)*1.05*(1-smoothstep(val(4,80,176)-56,val(4,80,176)+8,i))*smoothstep(8,48,i)-val(3,0,55)*1.3*smoothstep(val(4,80,176),val(4,80,176)+72,i)*(1-smoothstep(220,255,i))+(1-smoothstep(0,88,i))*val(5,0,24),0,255)*(1-smoothstep(0.55,1.35,sqrt(cx*cx+cy*cy))*val(6,0,40)/100),ctl(7))",
      "a"
    ]
  },
  {
    "id": "circular-halftone-photo",
    "name": "Circular Halftone Photo",
    "description": "Converts source luminance into variable-width concentric ink rings for a high-contrast engraved/halftone portrait look on warm paper. Ring Spacing sets screen frequency; Center X/Y can move the ring origin on- or off-canvas; Contrast and Tone Bias control ink coverage; Edge Softness gives consistent pixel-scale antialiasing; Print Texture roughens the screen and paper stock; Paper Tone/Warmth set the substrate; Effect Mix blends back to the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Halftone",
      "Print",
      "Monochrome",
      "Portrait",
      "Retro"
    ],
    "controls": [
      {
        "label": "Ring Spacing",
        "value": 46.973684210526315,
        "ui": {
          "widget": "slider",
          "displayMin": 2.5,
          "displayMax": 12,
          "step": 0.25,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Contrast",
        "value": 110.11363636363635,
        "ui": {
          "widget": "slider",
          "displayMin": 0.8,
          "displayMax": 3,
          "step": 0.05,
          "format": "number",
          "unit": "x"
        }
      },
      {
        "label": "Tone Bias",
        "value": 117.9375,
        "ui": {
          "widget": "slider",
          "displayMin": -80,
          "displayMax": 80,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Center X",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -50,
          "displayMax": 150,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Center Y",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -50,
          "displayMax": 150,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Edge Softness",
        "value": 91.8,
        "ui": {
          "widget": "slider",
          "displayMin": 0.25,
          "displayMax": 1.5,
          "step": 0.05,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Paper Tone",
        "value": 182.14285714285714,
        "ui": {
          "widget": "slider",
          "displayMin": 220,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Print Texture",
        "value": 70.83333333333334,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 36,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Paper Warmth",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 32,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(r,lerp(clamp(val(6,220,255)+(hash2(x+37,y+19,6029)-0.5)*val(7,0,36)*0.28,0,255),5,smoothstep(0,1,clamp(((1-abs(fract(c2m(x-X*val(3,-50,150)/100,y-Y*val(4,-50,150)/100)/val(0,2.5,12))-0.5)*2)-clamp(((i-128)*val(1,0.8,3)+128+val(2,-80,80)+(hash2(x,y,1733)-0.5)*val(7,0,36))/255,0,1))*val(0,2.5,12)/(2*val(5,0.25,1.5))+0.5,0,1))),ctl(9))",
      "lerp(g,lerp(clamp(val(6,220,255)-val(8,0,32)*0.38+(hash2(x+37,y+19,6029)-0.5)*val(7,0,36)*0.28,0,255),4,smoothstep(0,1,clamp(((1-abs(fract(c2m(x-X*val(3,-50,150)/100,y-Y*val(4,-50,150)/100)/val(0,2.5,12))-0.5)*2)-clamp(((i-128)*val(1,0.8,3)+128+val(2,-80,80)+(hash2(x,y,1733)-0.5)*val(7,0,36))/255,0,1))*val(0,2.5,12)/(2*val(5,0.25,1.5))+0.5,0,1))),ctl(9))",
      "lerp(b,lerp(clamp(val(6,220,255)-val(8,0,32)+(hash2(x+37,y+19,6029)-0.5)*val(7,0,36)*0.28,0,255),3,smoothstep(0,1,clamp(((1-abs(fract(c2m(x-X*val(3,-50,150)/100,y-Y*val(4,-50,150)/100)/val(0,2.5,12))-0.5)*2)-clamp(((i-128)*val(1,0.8,3)+128+val(2,-80,80)+(hash2(x,y,1733)-0.5)*val(7,0,36))/255,0,1))*val(0,2.5,12)/(2*val(5,0.25,1.5))+0.5,0,1))),ctl(9))",
      "a"
    ]
  },
  {
    "id": "complementary-split-toning",
    "name": "Complementary Split Toning",
    "description": "Applies one hue to highlights and the opposing complementary tint to shadows while keeping the tonal handoff neutral at the Balance point. Highlight Hue rotates the color pair; Shadow Strength and Highlight Strength set each side independently; Balance positions the neutral crossover; Transition Softness controls how gradually each tint fades into the midpoint; Color Intensity sets chroma amplitude; Effect Mix blends the grade with the source. Source alpha is preserved.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Tone",
      "Film",
      "Portrait"
    ],
    "controls": [
      {
        "label": "Highlight Hue",
        "value": 26.916666666666668,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "integer",
          "unit": "°"
        }
      },
      {
        "label": "Shadow Strength",
        "value": 114.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Highlight Strength",
        "value": 89.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Balance",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -50,
          "displayMax": 50,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Transition Softness",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 8,
          "displayMax": 96,
          "step": 1,
          "format": "integer",
          "unit": "levels"
        }
      },
      {
        "label": "Color Intensity",
        "value": 122.39999999999999,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(c,clamp(c+(cos(ctl(0)/255*1024)/512)*(ctl(5)/255*96)*(smoothstep(128-val(3,-50,50),128-val(3,-50,50)+val(4,8,96),i)*(ctl(2)/255)-(1-smoothstep(128-val(3,-50,50)-val(4,8,96),128-val(3,-50,50),i))*(ctl(1)/255)),0,255),ctl(6))",
      "lerp(c,clamp(c+(cos(ctl(0)/255*1024-341.333333333)/512)*(ctl(5)/255*96)*(smoothstep(128-val(3,-50,50),128-val(3,-50,50)+val(4,8,96),i)*(ctl(2)/255)-(1-smoothstep(128-val(3,-50,50)-val(4,8,96),128-val(3,-50,50),i))*(ctl(1)/255)),0,255),ctl(6))",
      "lerp(c,clamp(c+(cos(ctl(0)/255*1024+341.333333333)/512)*(ctl(5)/255*96)*(smoothstep(128-val(3,-50,50),128-val(3,-50,50)+val(4,8,96),i)*(ctl(2)/255)-(1-smoothstep(128-val(3,-50,50)-val(4,8,96),128-val(3,-50,50),i))*(ctl(1)/255)),0,255),ctl(6))",
      "a"
    ]
  },
  {
    "id": "duotone-gradient-map",
    "name": "Duotone Gradient Map",
    "description": "Maps source luminance between adjustable black and white points, reshapes midtones with a bias control, and applies a four-stop ramp derived from shadow and highlight RGB colours. Effect Mix blends the grade with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Gradient",
      "Tone",
      "Duotone",
      "Print"
    ],
    "controls": [
      {
        "label": "Shadow R",
        "value": 14,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Shadow G",
        "value": 12,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Shadow B",
        "value": 18,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Highlight R",
        "value": 255,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Highlight G",
        "value": 48,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Highlight B",
        "value": 72,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Midtone Bias",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -100,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Black Point",
        "value": 24.094488188976378,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 127,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "White Point",
        "value": 228.89763779527559,
        "ui": {
          "widget": "slider",
          "displayMin": 128,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(r,gradient4(bias(clamp(scl(i,val(7,0,127),val(8,128,255),0,1),0,1),0.5+val(6,-100,100)/400),ctl(0),lerp(ctl(0),ctl(3),0.18),lerp(ctl(0),ctl(3),0.65),ctl(3)),ctl(9))",
      "lerp(g,gradient4(bias(clamp(scl(i,val(7,0,127),val(8,128,255),0,1),0,1),0.5+val(6,-100,100)/400),ctl(1),lerp(ctl(1),ctl(4),0.18),lerp(ctl(1),ctl(4),0.65),ctl(4)),ctl(9))",
      "lerp(b,gradient4(bias(clamp(scl(i,val(7,0,127),val(8,128,255),0,1),0,1),0.5+val(6,-100,100)/400),ctl(2),lerp(ctl(2),ctl(5),0.18),lerp(ctl(2),ctl(5),0.65),ctl(5)),ctl(9))",
      "a"
    ]
  },
  {
    "id": "fractal-contours",
    "name": "Fractal Contour Designer",
    "description": "Builds graphic Mandelbrot or Julia contour linework for posters, backgrounds, map-like textures, and image overlays. Zoom and Center X/Y frame the set; Contours sets band density; Line Weight controls graphic stroke coverage; Contour Focus redistributes detail between broad outer regions and the fractal boundary; Contour Phase slides the contour bands without moving the fractal. Palette selects 0 Ink/Paper, 1 Blueprint, 2 Charcoal/Acid, 3 Burgundy/Peach, or 4 monochrome White Linework. Iterations controls boundary detail. Fractal Type switches between Mandelbrot (Off) and Julia (On); the Julia mode uses c = -0.8 + 0.156i.",
    "author": "Anthony Chimming",
    "tags": [
      "Fractal",
      "Procedural",
      "Pattern",
      "Print",
      "Texture"
    ],
    "controls": [
      {
        "label": "Zoom",
        "value": 3.3552631578947363,
        "ui": {
          "widget": "slider",
          "displayMin": 0.8,
          "displayMax": 16,
          "step": 0.1,
          "format": "number",
          "unit": "x"
        }
      },
      {
        "label": "Center X",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -1.5,
          "displayMax": 1.5,
          "step": 0.005,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Center Y",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -1.5,
          "displayMax": 1.5,
          "step": 0.005,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Contours",
        "value": 95.625,
        "ui": {
          "widget": "number",
          "displayMin": 8,
          "displayMax": 72,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Line Weight",
        "value": 102,
        "ui": {
          "widget": "slider",
          "displayMin": 4,
          "displayMax": 24,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Contour Focus",
        "value": 147.33333333333331,
        "ui": {
          "widget": "slider",
          "displayMin": 30,
          "displayMax": 75,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Palette",
        "value": 0,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 4,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Iterations",
        "value": 127.5,
        "ui": {
          "widget": "number",
          "displayMin": 64,
          "displayMax": 256,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Contour Phase",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -10,
          "displayMax": 10,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Fractal Type — Mandelbrot / Julia",
        "value": 0,
        "ui": {
          "widget": "toggle",
          "displayMin": 0,
          "displayMax": 1,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp((ctl(6)<32?244:ctl(6)<96?6:ctl(6)<160?25:ctl(6)<224?76:7),(ctl(6)<32?15:ctl(6)<96?61:ctl(6)<160?222:ctl(6)<224?255:246),(1-smoothstep(val(4,4,24)/200,val(4,4,24)/200+0.015,abs(fract(bias((ctl(9)<128?mandelbrot((1.5*cx*X/(min(X,Y)*val(0,0.8,16))-0.5+val(1,-1.5,1.5)),(1.5*cy*Y/(min(X,Y)*val(0,0.8,16))+val(2,-1.5,1.5)),round(val(7,64,256))):julia((1.5*cx*X/(min(X,Y)*val(0,0.8,16))+val(1,-1.5,1.5)),(1.5*cy*Y/(min(X,Y)*val(0,0.8,16))+val(2,-1.5,1.5)),-0.8,0.156,round(val(7,64,256)))),val(5,30,75)/100)*round(val(3,8,72))+0.75+val(8,-10,10)/100)-0.5))))",
      "lerp((ctl(6)<32?238:ctl(6)<96?16:ctl(6)<160?25:ctl(6)<224?16:7),(ctl(6)<32?14:ctl(6)<96?226:ctl(6)<160?255:ctl(6)<224?181:246),(1-smoothstep(val(4,4,24)/200,val(4,4,24)/200+0.015,abs(fract(bias((ctl(9)<128?mandelbrot((1.5*cx*X/(min(X,Y)*val(0,0.8,16))-0.5+val(1,-1.5,1.5)),(1.5*cy*Y/(min(X,Y)*val(0,0.8,16))+val(2,-1.5,1.5)),round(val(7,64,256))):julia((1.5*cx*X/(min(X,Y)*val(0,0.8,16))+val(1,-1.5,1.5)),(1.5*cy*Y/(min(X,Y)*val(0,0.8,16))+val(2,-1.5,1.5)),-0.8,0.156,round(val(7,64,256)))),val(5,30,75)/100)*round(val(3,8,72))+0.75+val(8,-10,10)/100)-0.5))))",
      "lerp((ctl(6)<32?224:ctl(6)<96?38:ctl(6)<160?23:ctl(6)<224?34:8),(ctl(6)<32?12:ctl(6)<96?255:ctl(6)<160?54:ctl(6)<224?153:242),(1-smoothstep(val(4,4,24)/200,val(4,4,24)/200+0.015,abs(fract(bias((ctl(9)<128?mandelbrot((1.5*cx*X/(min(X,Y)*val(0,0.8,16))-0.5+val(1,-1.5,1.5)),(1.5*cy*Y/(min(X,Y)*val(0,0.8,16))+val(2,-1.5,1.5)),round(val(7,64,256))):julia((1.5*cx*X/(min(X,Y)*val(0,0.8,16))+val(1,-1.5,1.5)),(1.5*cy*Y/(min(X,Y)*val(0,0.8,16))+val(2,-1.5,1.5)),-0.8,0.156,round(val(7,64,256)))),val(5,30,75)/100)*round(val(3,8,72))+0.75+val(8,-10,10)/100)-0.5))))",
      "a"
    ]
  },
  {
    "id": "fractal-displacement",
    "name": "Julia Fractal Displacement",
    "description": "Warps the complete source image, including alpha, with two related Julia escape-time fields used as hidden X/Y displacement maps. The default Julia constant is tuned for filamentary boundary structure rather than a literal fractal picture, producing sharp contour-driven folds and tearing-like bends while remaining deterministic. Strength sets displacement in pixels; Field Scale and Detail control fractal density; Angle rotates the field; Julia Real and Julia Imag change the Julia-set topology; Contour Bands increases fold frequency; Field Split decorrelates the X/Y maps; Direction Bias favors one displacement axis; Effect Mix blends back to the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Distortion",
      "Fractal",
      "Procedural",
      "Texture"
    ],
    "controls": [
      {
        "label": "Strength",
        "value": 59.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 120,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Field Scale",
        "value": 136.6071428571429,
        "ui": {
          "widget": "slider",
          "displayMin": 0.6,
          "displayMax": 2,
          "step": 0.01,
          "format": "number",
          "unit": "x"
        }
      },
      {
        "label": "Detail",
        "value": 114.3103448275862,
        "ui": {
          "widget": "slider",
          "displayMin": 24,
          "displayMax": 256,
          "step": 1,
          "format": "integer",
          "unit": "iter"
        }
      },
      {
        "label": "Angle",
        "value": 21.958333333333332,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "integer",
          "unit": "deg"
        }
      },
      {
        "label": "Julia Real",
        "value": 39.23076923076922,
        "ui": {
          "widget": "slider",
          "displayMin": -1,
          "displayMax": 0.3,
          "step": 0.01,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Julia Imag",
        "value": 160.65,
        "ui": {
          "widget": "slider",
          "displayMin": -0.6,
          "displayMax": 0.6,
          "step": 0.01,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Contour Bands",
        "value": 72.85714285714285,
        "ui": {
          "widget": "slider",
          "displayMin": 1,
          "displayMax": 8,
          "step": 1,
          "format": "integer",
          "unit": "bands"
        }
      },
      {
        "label": "Field Split",
        "value": 95.2,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 0.75,
          "step": 0.01,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Direction Bias",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -100,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,srcLinear(x+sin((julia((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),(r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1+val(8,-1,1)*0.65),y+sin((julia(((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))+val(7,0,0.75),((r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))-val(7,0,0.75)*0.73,val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1-val(8,-1,1)*0.65),z),ctl(9))",
      "lerp(c,srcLinear(x+sin((julia((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),(r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1+val(8,-1,1)*0.65),y+sin((julia(((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))+val(7,0,0.75),((r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))-val(7,0,0.75)*0.73,val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1-val(8,-1,1)*0.65),z),ctl(9))",
      "lerp(c,srcLinear(x+sin((julia((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),(r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1+val(8,-1,1)*0.65),y+sin((julia(((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))+val(7,0,0.75),((r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))-val(7,0,0.75)*0.73,val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1-val(8,-1,1)*0.65),z),ctl(9))",
      "lerp(c,srcLinear(x+sin((julia((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),(r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2),val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1+val(8,-1,1)*0.65),y+sin((julia(((r2x(val(3,0,360)*1024/360,cx*X/min(X,Y))-r2y(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))+val(7,0,0.75),((r2y(val(3,0,360)*1024/360,cx*X/min(X,Y))+r2x(val(3,0,360)*1024/360,cy*Y/min(X,Y)))*val(1,0.6,2))-val(7,0,0.75)*0.73,val(4,-1,0.3),val(5,-0.6,0.6),round(val(2,24,256))))*round(val(6,1,8))*1024)/512*val(0,0,120)*(1-val(8,-1,1)*0.65),z),ctl(9))"
    ]
  },
  {
    "id": "gradient-map-studio",
    "name": "Gradient Map Studio",
    "description": "Maps source luminance through black/white normalization, a true midpoint remap, and contrast shaping before a four-stop colour ramp. Four Hue controls define the palette; fixed stop lightness and a shared Saturation control keep the ten-control layout focused on tone shaping. The default palette runs near-black burgundy through burgundy and orange to a chromatic pale cream. The highlight stop retains enough chroma for Highlight Hue to produce a clearly visible colour shift while remaining light. Midpoint is levels-style: the displayed input tone maps to 50% output even when Contrast changes. Mix blends the mapped result with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Gradient",
      "Tone",
      "Utility"
    ],
    "controls": [
      {
        "label": "Shadow Hue",
        "value": 244.375,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "integer",
          "unit": "°"
        }
      },
      {
        "label": "Mid A Hue",
        "value": 247.91666666666666,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "integer",
          "unit": "°"
        }
      },
      {
        "label": "Mid B Hue",
        "value": 19.833333333333332,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "integer",
          "unit": "°"
        }
      },
      {
        "label": "Highlight Hue",
        "value": 31.875,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "integer",
          "unit": "°"
        }
      },
      {
        "label": "Midpoint",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 10,
          "displayMax": 90,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Contrast",
        "value": 63.75,
        "ui": {
          "widget": "slider",
          "displayMin": 50,
          "displayMax": 250,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Black Point",
        "value": 0,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 127,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "White Point",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 128,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Saturation",
        "value": 216.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,gradient4(clamp((bias(clamp((i-val(6,0,127))/(val(7,128,255)-val(6,0,127)),0,1),1-val(4,0.10,0.90))-0.5)*val(5,0.5,2.5)+0.5,0,1),255*(0.06+0.1140*val(8,0,1)*(clamp(abs(fract(val(0,0,360)/360)*6-3)-1,0,1)-0.5)),255*(0.22+0.4400*val(8,0,1)*(clamp(abs(fract(val(1,0,360)/360)*6-3)-1,0,1)-0.5)),255*(0.55+0.8550*val(8,0,1)*(clamp(abs(fract(val(2,0,360)/360)*6-3)-1,0,1)-0.5)),255*(0.88+0.24*val(8,0,1)*(clamp(abs(fract(val(3,0,360)/360)*6-3)-1,0,1)-0.5))),ctl(9))",
      "lerp(c,gradient4(clamp((bias(clamp((i-val(6,0,127))/(val(7,128,255)-val(6,0,127)),0,1),1-val(4,0.10,0.90))-0.5)*val(5,0.5,2.5)+0.5,0,1),255*(0.06+0.1140*val(8,0,1)*(clamp(abs(fract(val(0,0,360)/360+0.6666667)*6-3)-1,0,1)-0.5)),255*(0.22+0.4400*val(8,0,1)*(clamp(abs(fract(val(1,0,360)/360+0.6666667)*6-3)-1,0,1)-0.5)),255*(0.55+0.8550*val(8,0,1)*(clamp(abs(fract(val(2,0,360)/360+0.6666667)*6-3)-1,0,1)-0.5)),255*(0.88+0.24*val(8,0,1)*(clamp(abs(fract(val(3,0,360)/360+0.6666667)*6-3)-1,0,1)-0.5))),ctl(9))",
      "lerp(c,gradient4(clamp((bias(clamp((i-val(6,0,127))/(val(7,128,255)-val(6,0,127)),0,1),1-val(4,0.10,0.90))-0.5)*val(5,0.5,2.5)+0.5,0,1),255*(0.06+0.1140*val(8,0,1)*(clamp(abs(fract(val(0,0,360)/360+0.3333333)*6-3)-1,0,1)-0.5)),255*(0.22+0.4400*val(8,0,1)*(clamp(abs(fract(val(1,0,360)/360+0.3333333)*6-3)-1,0,1)-0.5)),255*(0.55+0.8550*val(8,0,1)*(clamp(abs(fract(val(2,0,360)/360+0.3333333)*6-3)-1,0,1)-0.5)),255*(0.88+0.24*val(8,0,1)*(clamp(abs(fract(val(3,0,360)/360+0.3333333)*6-3)-1,0,1)-0.5))),ctl(9))",
      "a"
    ]
  },
  {
    "id": "halftone-print",
    "name": "Halftone Print",
    "description": "An area-aware graphic offset-print halftone that converts source tone into a rotated field of adjustable round-to-square dots on a subtly warm paper base. Monochrome mode screens luminance; Colour Mode screens the RGB channels independently, with RGB Angle Split separating their screen angles. Dot Scale sets cell pitch, Contrast shapes source tone, Ink Spread adds or removes ink coverage, Squareness morphs dot geometry while preserving shadow fill, Paper Tone sets stock brightness, Edge Softness controls print-edge crispness, and Effect Mix blends the result with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Halftone",
      "Print",
      "Retro",
      "Color"
    ],
    "controls": [
      {
        "label": "Dot Scale",
        "value": 51,
        "ui": {
          "widget": "slider",
          "displayMin": 3,
          "displayMax": 48,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Screen Rotation",
        "value": 23.90625,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 1024,
          "step": 1,
          "format": "integer",
          "unit": "angle"
        }
      },
      {
        "label": "Contrast",
        "value": 89.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0.5,
          "displayMax": 2.5,
          "step": 0.05,
          "format": "number",
          "unit": "x"
        }
      },
      {
        "label": "Ink Spread",
        "value": 141.66666666666669,
        "ui": {
          "widget": "slider",
          "displayMin": -18,
          "displayMax": 18,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Squareness",
        "value": 63.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Colour Mode",
        "value": 0,
        "ui": {
          "widget": "toggle",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Paper Tone",
        "value": 229.5,
        "ui": {
          "widget": "slider",
          "displayMin": 185,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "RGB Angle Split",
        "value": 85,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 96,
          "step": 1,
          "format": "integer",
          "unit": "angle"
        }
      },
      {
        "label": "Edge Softness",
        "value": 72.85714285714285,
        "ui": {
          "widget": "slider",
          "displayMin": 0.25,
          "displayMax": 2,
          "step": 0.05,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,clamp(val(6,185,255)-z*5,0,255)*(ctl(5)>127?(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=1?1:(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))<=0?0:smoothstep(-val(8,0.25,2),val(8,0.25,2),lerp(c2m((repeat(r2x((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2y((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2),(repeat(-r2y((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2x((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),max(abs((repeat(r2x((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2y((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),abs((repeat(-r2y((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2x((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)))*1.128379,ctl(4))-(val(0,3,48)*(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=0.214602?(0.56418958*sqrt(clamp(1-((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.785398))):(0.5+((0.214602-clamp(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.214602))/0.214602)*((lerp(0.70710678,0.56418958,ctl(4)))-0.5))))))):(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=1?1:(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))<=0?0:smoothstep(-val(8,0.25,2),val(8,0.25,2),lerp(c2m((repeat(r2x(val(1,0,1024),x-X/2)+r2y(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2),(repeat(-r2y(val(1,0,1024),x-X/2)+r2x(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),max(abs((repeat(r2x(val(1,0,1024),x-X/2)+r2y(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),abs((repeat(-r2y(val(1,0,1024),x-X/2)+r2x(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)))*1.128379,ctl(4))-(val(0,3,48)*(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=0.214602?(0.56418958*sqrt(clamp(1-((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.785398))):(0.5+((0.214602-clamp(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.214602))/0.214602)*((lerp(0.70710678,0.56418958,ctl(4)))-0.5)))))))),ctl(9))",
      "lerp(c,clamp(val(6,185,255)-z*5,0,255)*(ctl(5)>127?(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=1?1:(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))<=0?0:smoothstep(-val(8,0.25,2),val(8,0.25,2),lerp(c2m((repeat(r2x((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2y((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2),(repeat(-r2y((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2x((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),max(abs((repeat(r2x((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2y((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),abs((repeat(-r2y((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2x((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)))*1.128379,ctl(4))-(val(0,3,48)*(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=0.214602?(0.56418958*sqrt(clamp(1-((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.785398))):(0.5+((0.214602-clamp(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.214602))/0.214602)*((lerp(0.70710678,0.56418958,ctl(4)))-0.5))))))):(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=1?1:(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))<=0?0:smoothstep(-val(8,0.25,2),val(8,0.25,2),lerp(c2m((repeat(r2x(val(1,0,1024),x-X/2)+r2y(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2),(repeat(-r2y(val(1,0,1024),x-X/2)+r2x(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),max(abs((repeat(r2x(val(1,0,1024),x-X/2)+r2y(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),abs((repeat(-r2y(val(1,0,1024),x-X/2)+r2x(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)))*1.128379,ctl(4))-(val(0,3,48)*(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=0.214602?(0.56418958*sqrt(clamp(1-((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.785398))):(0.5+((0.214602-clamp(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.214602))/0.214602)*((lerp(0.70710678,0.56418958,ctl(4)))-0.5)))))))),ctl(9))",
      "lerp(c,clamp(val(6,185,255)-z*5,0,255)*(ctl(5)>127?(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=1?1:(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))<=0?0:smoothstep(-val(8,0.25,2),val(8,0.25,2),lerp(c2m((repeat(r2x((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2y((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2),(repeat(-r2y((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2x((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),max(abs((repeat(r2x((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2y((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),abs((repeat(-r2y((val(1,0,1024)+(z-1)*val(7,0,96)),x-X/2)+r2x((val(1,0,1024)+(z-1)*val(7,0,96)),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)))*1.128379,ctl(4))-(val(0,3,48)*(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=0.214602?(0.56418958*sqrt(clamp(1-((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.785398))):(0.5+((0.214602-clamp(((clamp(((c)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.214602))/0.214602)*((lerp(0.70710678,0.56418958,ctl(4)))-0.5))))))):(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=1?1:(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))<=0?0:smoothstep(-val(8,0.25,2),val(8,0.25,2),lerp(c2m((repeat(r2x(val(1,0,1024),x-X/2)+r2y(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2),(repeat(-r2y(val(1,0,1024),x-X/2)+r2x(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),max(abs((repeat(r2x(val(1,0,1024),x-X/2)+r2y(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)),abs((repeat(-r2y(val(1,0,1024),x-X/2)+r2x(val(1,0,1024),y-Y/2)+val(0,3,48)/2,val(0,3,48))-val(0,3,48)/2)))*1.128379,ctl(4))-(val(0,3,48)*(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18))))>=0.214602?(0.56418958*sqrt(clamp(1-((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.785398))):(0.5+((0.214602-clamp(((clamp(((i)-128)*(val(2,0.5,2.5))+128,0,255)/255-(val(3,-0.18,0.18)))),0,0.214602))/0.214602)*((lerp(0.70710678,0.56418958,ctl(4)))-0.5)))))))),ctl(9))",
      "a"
    ]
  },
  {
    "id": "instant-print-frame",
    "name": "Instant Print Frame",
    "description": "Builds a more realistic classic instant-film print inside the current canvas: narrow side/top borders, a deeper bottom margin, neutral-to-warm off-white paper with fine multi-scale texture, subtle directional paper shading, restrained opening/outer-edge depth, and a gentle adjustable instant-film response inside the photo area. The source is cover-fitted into the opening with smooth sampling while preserving aspect ratio and allowing Crop X/Y repositioning plus Photo Zoom. Paper Tone shifts the border stock from clean white toward a warmer aged cream. Set Film Character to 0% for an ungraded source. Paper remains opaque while source alpha is preserved inside the photo opening.",
    "author": "Anthony Chimming",
    "tags": [
      "Retro",
      "Print",
      "Film",
      "Utility"
    ],
    "controls": [
      {
        "label": "Side Border",
        "value": 25.5,
        "ui": {
          "widget": "slider",
          "displayMin": 4,
          "displayMax": 14,
          "step": 0.5,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Top Border",
        "value": 56.666666666666664,
        "ui": {
          "widget": "slider",
          "displayMin": 3,
          "displayMax": 12,
          "step": 0.5,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Bottom Border",
        "value": 57.95454545454545,
        "ui": {
          "widget": "slider",
          "displayMin": 16,
          "displayMax": 38,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Photo Zoom",
        "value": 12.75,
        "ui": {
          "widget": "slider",
          "displayMin": 100,
          "displayMax": 140,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Crop X",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -100,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Crop Y",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -100,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Paper Tone",
        "value": 114.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Paper Texture",
        "value": 63.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 8,
          "step": 0.5,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Opening Depth",
        "value": 85,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 18,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Film Character",
        "value": 89.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(clamp(248+val(6,0,1)*9+((hash2(x,y,731)-0.5)*0.35+(valueNoise(x,y,max(min(X,Y)*0.09,24),1973)-0.5)*0.65)*val(7,0,8)+(0.5-linearGrad(x,y,0,0,X,Y))*1.4-sdfOutline(sdfBox(x,y,X/2,Y*(0.5+(val(1,3,12)-val(2,16,38))/200),X*(1-2*val(0,4,14)/100),Y*(1-(val(1,3,12)+val(2,16,38))/100),0),max(min(X,Y)*0.006,2),clamp(min(X,Y)*0.0015,0.75,2))*val(8,0,18)-sdfOutline(sdfBox(x,y,X/2,Y/2,max(X-2,1),max(Y-2,1),0),max(min(X,Y)*0.007,2),clamp(min(X,Y)*0.0015,0.75,2))*4,0,255),clamp(srcLinear((X/2+val(4,-100,100)/100*max(0,X/2-(X*(1-2*val(0,4,14)/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(x-X/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),(Y/2+val(5,-100,100)/100*max(0,Y/2-(Y*(1-(val(1,3,12)+val(2,16,38))/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(y-(Y*(0.5+(val(1,3,12)-val(2,16,38))/200)))/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),0)*(1-val(9,0,0.04))+val(9,0,4.2),0,255),box(x,y,X/2,Y*(0.5+(val(1,3,12)-val(2,16,38))/200),X*(1-2*val(0,4,14)/100),Y*(1-(val(1,3,12)+val(2,16,38))/100),0,clamp(min(X,Y)*0.001,0.75,2)))",
      "lerp(clamp(247+val(6,0,1)*5+((hash2(x,y,731)-0.5)*0.35+(valueNoise(x,y,max(min(X,Y)*0.09,24),1973)-0.5)*0.65)*val(7,0,8)+(0.5-linearGrad(x,y,0,0,X,Y))*1.4-sdfOutline(sdfBox(x,y,X/2,Y*(0.5+(val(1,3,12)-val(2,16,38))/200),X*(1-2*val(0,4,14)/100),Y*(1-(val(1,3,12)+val(2,16,38))/100),0),max(min(X,Y)*0.006,2),clamp(min(X,Y)*0.0015,0.75,2))*val(8,0,18)-sdfOutline(sdfBox(x,y,X/2,Y/2,max(X-2,1),max(Y-2,1),0),max(min(X,Y)*0.007,2),clamp(min(X,Y)*0.0015,0.75,2))*4,0,255),clamp(srcLinear((X/2+val(4,-100,100)/100*max(0,X/2-(X*(1-2*val(0,4,14)/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(x-X/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),(Y/2+val(5,-100,100)/100*max(0,Y/2-(Y*(1-(val(1,3,12)+val(2,16,38))/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(y-(Y*(0.5+(val(1,3,12)-val(2,16,38))/200)))/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),1)*(1-val(9,0,0.05))+val(9,0,4),0,255),box(x,y,X/2,Y*(0.5+(val(1,3,12)-val(2,16,38))/200),X*(1-2*val(0,4,14)/100),Y*(1-(val(1,3,12)+val(2,16,38))/100),0,clamp(min(X,Y)*0.001,0.75,2)))",
      "lerp(clamp(246-val(6,0,1)*12+((hash2(x,y,731)-0.5)*0.35+(valueNoise(x,y,max(min(X,Y)*0.09,24),1973)-0.5)*0.65)*val(7,0,8)+(0.5-linearGrad(x,y,0,0,X,Y))*1.4-sdfOutline(sdfBox(x,y,X/2,Y*(0.5+(val(1,3,12)-val(2,16,38))/200),X*(1-2*val(0,4,14)/100),Y*(1-(val(1,3,12)+val(2,16,38))/100),0),max(min(X,Y)*0.006,2),clamp(min(X,Y)*0.0015,0.75,2))*val(8,0,18)-sdfOutline(sdfBox(x,y,X/2,Y/2,max(X-2,1),max(Y-2,1),0),max(min(X,Y)*0.007,2),clamp(min(X,Y)*0.0015,0.75,2))*4,0,255),clamp(srcLinear((X/2+val(4,-100,100)/100*max(0,X/2-(X*(1-2*val(0,4,14)/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(x-X/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),(Y/2+val(5,-100,100)/100*max(0,Y/2-(Y*(1-(val(1,3,12)+val(2,16,38))/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(y-(Y*(0.5+(val(1,3,12)-val(2,16,38))/200)))/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),2)*(1-val(9,0,0.07))+val(9,0,3.6),0,255),box(x,y,X/2,Y*(0.5+(val(1,3,12)-val(2,16,38))/200),X*(1-2*val(0,4,14)/100),Y*(1-(val(1,3,12)+val(2,16,38))/100),0,clamp(min(X,Y)*0.001,0.75,2)))",
      "lerp(255,srcLinear((X/2+val(4,-100,100)/100*max(0,X/2-(X*(1-2*val(0,4,14)/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(x-X/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),(Y/2+val(5,-100,100)/100*max(0,Y/2-(Y*(1-(val(1,3,12)+val(2,16,38))/100)/2)/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100)))+(y-(Y*(0.5+(val(1,3,12)-val(2,16,38))/200)))/(max((1-2*val(0,4,14)/100),(1-(val(1,3,12)+val(2,16,38))/100))*val(3,100,140)/100),3),box(x,y,X/2,Y*(0.5+(val(1,3,12)-val(2,16,38))/200),X*(1-2*val(0,4,14)/100),Y*(1-(val(1,3,12)+val(2,16,38))/100),0,clamp(min(X,Y)*0.001,0.75,2)))"
    ]
  },
  {
    "id": "iridescent-shift",
    "name": "Iridescent Shift",
    "description": "Applies a pearlescent / holographic material sheen using a directional spectral field, source luminance, and organic FBM phase distortion. A seamless violet-to-cyan-to-green-to-gold palette catches midtones and highlights while deep shadows retain the source image. Hue Rotation moves the spectral phase; Spectrum Width controls band spacing; Angle rotates the sheen; Iridescence controls material strength; Distortion warps the bands; Contrast and Highlight Bias shape where the sheen catches; Saturation controls chroma; Mix blends the finished material response.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Gradient",
      "Procedural",
      "Portrait",
      "Texture"
    ],
    "controls": [
      {
        "label": "Hue Rotation",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -180,
          "displayMax": 180,
          "step": 1,
          "format": "integer",
          "unit": "deg"
        }
      },
      {
        "label": "Spectrum Width",
        "value": 61.199999999999996,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Angle",
        "value": 48.166666666666664,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 360,
          "step": 1,
          "format": "integer",
          "unit": "deg"
        }
      },
      {
        "label": "Iridescence",
        "value": 224.4,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Distortion",
        "value": 209.1,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Contrast",
        "value": 98.6,
        "ui": {
          "widget": "slider",
          "displayMin": 50,
          "displayMax": 200,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Highlight Bias",
        "value": 66.3,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Saturation",
        "value": 119.85,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 200,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(c,overlay(c,clamp(128+(gradient4(1-abs(fract(val(0,-0.5,0.5)+((linearGrad(x,y,X/2-r2x(val(2,0,1024),M),Y/2-r2y(val(2,0,1024),M),X/2+r2x(val(2,0,1024),M),Y/2+r2y(val(2,0,1024),M))-0.5)*val(1,3.2,0.65)+(clamp((i/255-0.5)*val(5,0.5,2)+0.5,0,1)-0.5)*0.9+(fbm(x,y,min(X,Y)*0.14,4,2,0.5,1337)-0.5)*val(4,0,0.9)))*2-1),150,22,62,255)-128)*val(7,0,2),0,255),(ctl(3)/255)*smoothstep(val(6,0.05,0.75),1,clamp((i/255-0.5)*val(5,0.5,2)+0.5,0,1))),ctl(8))",
      "lerp(c,overlay(c,clamp(128+(gradient4(1-abs(fract(val(0,-0.5,0.5)+((linearGrad(x,y,X/2-r2x(val(2,0,1024),M),Y/2-r2y(val(2,0,1024),M),X/2+r2x(val(2,0,1024),M),Y/2+r2y(val(2,0,1024),M))-0.5)*val(1,3.2,0.65)+(clamp((i/255-0.5)*val(5,0.5,2)+0.5,0,1)-0.5)*0.9+(fbm(x,y,min(X,Y)*0.14,4,2,0.5,1337)-0.5)*val(4,0,0.9)))*2-1),54,225,250,194)-128)*val(7,0,2),0,255),(ctl(3)/255)*smoothstep(val(6,0.05,0.75),1,clamp((i/255-0.5)*val(5,0.5,2)+0.5,0,1))),ctl(8))",
      "lerp(c,overlay(c,clamp(128+(gradient4(1-abs(fract(val(0,-0.5,0.5)+((linearGrad(x,y,X/2-r2x(val(2,0,1024),M),Y/2-r2y(val(2,0,1024),M),X/2+r2x(val(2,0,1024),M),Y/2+r2y(val(2,0,1024),M))-0.5)*val(1,3.2,0.65)+(clamp((i/255-0.5)*val(5,0.5,2)+0.5,0,1)-0.5)*0.9+(fbm(x,y,min(X,Y)*0.14,4,2,0.5,1337)-0.5)*val(4,0,0.9)))*2-1),255,255,112,34)-128)*val(7,0,2),0,255),(ctl(3)/255)*smoothstep(val(6,0.05,0.75),1,clamp((i/255-0.5)*val(5,0.5,2)+0.5,0,1))),ctl(8))",
      "a"
    ]
  },
  {
    "id": "juno",
    "name": "Juno",
    "description": "A Juno-style photographic grade. It deepens shadows, lifts highlights, increases saturation, selectively intensifies reds/oranges/yellows and warm skin, and can push greens/blues toward cooler cyan-blue separation. Best for portraits, fashion, food, sunsets, and warm-toned scenes.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Tone",
      "Warm",
      "Portrait"
    ],
    "controls": [
      {
        "label": "Shadow Depth",
        "value": 76.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Warm Pop",
        "value": 76.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Saturation",
        "value": 104.31818181818183,
        "ui": {
          "widget": "slider",
          "displayMin": 70,
          "displayMax": 180,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Highlight Lift",
        "value": 76.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Cool Separation",
        "value": 38.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Control 7",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 8",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 9",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(r,clamp(i+(r-i)*val(2,70,180)/100-val(0,0,100)/100*36*(1-smoothstep(20,122,i))+val(3,0,100)/100*30*smoothstep(108,240,i)+val(1,0,100)/100*42*(max(smoothstep(20,78,r-g)*smoothstep(8,46,r-b),smoothstep(8,46,r-b)*smoothstep(-10,30,g-b))*smoothstep(10,48,i))-val(4,0,100)/100*16*(max(smoothstep(5,50,b-r),smoothstep(8,55,g-r))*smoothstep(10,42,i)),0,255),ctl(5))",
      "lerp(g,clamp(i+(g-i)*val(2,70,180)/100-val(0,0,100)/100*36*(1-smoothstep(20,122,i))+val(3,0,100)/100*30*smoothstep(108,240,i)+val(1,0,100)/100*14*(max(smoothstep(20,78,r-g)*smoothstep(8,46,r-b),smoothstep(8,46,r-b)*smoothstep(-10,30,g-b))*smoothstep(10,48,i))*smoothstep(-2,52,g-b)+val(4,0,100)/100*6*(max(smoothstep(5,50,b-r),smoothstep(8,55,g-r))*smoothstep(10,42,i)),0,255),ctl(5))",
      "lerp(b,clamp(i+(b-i)*val(2,70,180)/100-val(0,0,100)/100*36*(1-smoothstep(20,122,i))+val(3,0,100)/100*30*smoothstep(108,240,i)-val(1,0,100)/100*20*(max(smoothstep(20,78,r-g)*smoothstep(8,46,r-b),smoothstep(8,46,r-b)*smoothstep(-10,30,g-b))*smoothstep(10,48,i))+val(4,0,100)/100*34*(max(smoothstep(5,50,b-r),smoothstep(8,55,g-r))*smoothstep(10,42,i)),0,255),ctl(5))",
      "a"
    ]
  },
  {
    "id": "mandelbrotjuliaatlas",
    "name": "Mandelbrot / Julia Atlas",
    "description": "Explores Mandelbrot and Julia escape-time fractals with aspect-correct navigation, 1–100× zoom, 32–512 iteration depth, Julia constants, palette accents, and interior tone. Julia Mode off renders Mandelbrot; on renders Julia. Pan X/Y are offsets from the natural family center, so switching modes keeps a useful default view. Designed for deterministic single-pass fractal exploration and benchmark use; very deep arbitrary-precision zoom remains outside the native float model.",
    "author": "Anthony Chimming",
    "tags": [
      "Fractal",
      "Procedural",
      "Benchmark"
    ],
    "controls": [
      {
        "label": "Zoom",
        "value": 0,
        "ui": {
          "widget": "slider",
          "displayMin": 1,
          "displayMax": 100,
          "step": 0.1,
          "format": "number",
          "unit": "×"
        }
      },
      {
        "label": "Pan X",
        "value": 127.5,
        "ui": {
          "widget": "number",
          "displayMin": -1.5,
          "displayMax": 1.5,
          "step": 0.00001,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Pan Y",
        "value": 127.5,
        "ui": {
          "widget": "number",
          "displayMin": -1.5,
          "displayMax": 1.5,
          "step": 0.00001,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Iterations",
        "value": 68,
        "ui": {
          "widget": "slider",
          "displayMin": 32,
          "displayMax": 512,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Julia Mode",
        "value": 0,
        "ui": {
          "widget": "toggle",
          "displayMin": 0,
          "displayMax": 1,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Julia C Real",
        "value": 59.5,
        "ui": {
          "widget": "number",
          "displayMin": -1.5,
          "displayMax": 1.5,
          "step": 0.0001,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Julia C Imag",
        "value": 140.76,
        "ui": {
          "widget": "number",
          "displayMin": -1.5,
          "displayMax": 1.5,
          "step": 0.0001,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Red Accent",
        "value": 190,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Blue Accent",
        "value": 220,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Interior",
        "value": 8,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      }
    ],
    "f": [
      "gradient4(sqrt(julia(ctl(4)<128?0:cx*X/min(X,Y)*(1.5/val(0,1,100))+val(1,-1.5,1.5)+(ctl(4)<128?-0.5:0),ctl(4)<128?0:cy*Y/min(X,Y)*(1.5/val(0,1,100))+val(2,-1.5,1.5),ctl(4)<128?cx*X/min(X,Y)*(1.5/val(0,1,100))+val(1,-1.5,1.5)+(ctl(4)<128?-0.5:0):val(5,-1.5,1.5),ctl(4)<128?cy*Y/min(X,Y)*(1.5/val(0,1,100))+val(2,-1.5,1.5):val(6,-1.5,1.5),val(3,32,512))),4,ctl(7),242,ctl(9))",
      "gradient4(sqrt(julia(ctl(4)<128?0:cx*X/min(X,Y)*(1.5/val(0,1,100))+val(1,-1.5,1.5)+(ctl(4)<128?-0.5:0),ctl(4)<128?0:cy*Y/min(X,Y)*(1.5/val(0,1,100))+val(2,-1.5,1.5),ctl(4)<128?cx*X/min(X,Y)*(1.5/val(0,1,100))+val(1,-1.5,1.5)+(ctl(4)<128?-0.5:0):val(5,-1.5,1.5),ctl(4)<128?cy*Y/min(X,Y)*(1.5/val(0,1,100))+val(2,-1.5,1.5):val(6,-1.5,1.5),val(3,32,512))),8,40,190,ctl(9))",
      "gradient4(sqrt(julia(ctl(4)<128?0:cx*X/min(X,Y)*(1.5/val(0,1,100))+val(1,-1.5,1.5)+(ctl(4)<128?-0.5:0),ctl(4)<128?0:cy*Y/min(X,Y)*(1.5/val(0,1,100))+val(2,-1.5,1.5),ctl(4)<128?cx*X/min(X,Y)*(1.5/val(0,1,100))+val(1,-1.5,1.5)+(ctl(4)<128?-0.5:0):val(5,-1.5,1.5),ctl(4)<128?cy*Y/min(X,Y)*(1.5/val(0,1,100))+val(2,-1.5,1.5):val(6,-1.5,1.5),val(3,32,512))),32,ctl(8),110,ctl(9))",
      "a"
    ]
  },
  {
    "id": "radial-aura",
    "name": "Radial Aura",
    "description": "Radiates a movable three-stop colour aura through the source image. A shaped luminance mask protects deep shadows and concentrates colour on brighter planes, while soft-light integration preserves local contrast. A restrained screen lift adds luminous highlight colour without turning the field into a flat radial overlay. Inner, Mid, and Outer Colour sweep a curated cyan → violet → orange → cyan spectrum. Falloff controls the radial transition, Luminosity Influence controls how strongly source brightness gates the aura, Intensity sets lighting strength, and Effect Mix blends the complete treatment back with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Gradient",
      "Portrait",
      "Procedural"
    ],
    "controls": [
      {
        "label": "Centre X",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Centre Y",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Radius",
        "value": 137.3076923076923,
        "ui": {
          "widget": "slider",
          "displayMin": 20,
          "displayMax": 150,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Inner Colour",
        "value": 0,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "spectrum"
        }
      },
      {
        "label": "Mid Colour",
        "value": 84.15,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "spectrum"
        }
      },
      {
        "label": "Outer Colour",
        "value": 170.85000000000002,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "spectrum"
        }
      },
      {
        "label": "Falloff",
        "value": 121.42857142857142,
        "ui": {
          "widget": "slider",
          "displayMin": 12,
          "displayMax": 75,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Luminosity Influence",
        "value": 209.1,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Intensity",
        "value": 158.1,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,screen(softLight(c,gradient3(radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)),gradient4(val(5,0,1),0,150,255,0),gradient4(val(4,0,1),0,150,255,0),gradient4(val(3,0,1),0,150,255,0)),(ctl(8)/255)*lerp(1,smoothstep(0.08,0.88,i/255),ctl(7))*smoothstep(0,val(6,0.12,0.75),radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)))),gradient3(radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)),gradient4(val(5,0,1),0,150,255,0),gradient4(val(4,0,1),0,150,255,0),gradient4(val(3,0,1),0,150,255,0)),(ctl(8)/255)*0.18*lerp(1,smoothstep(0.08,0.88,i/255),ctl(7))*smoothstep(0,val(6,0.12,0.75),radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)))),ctl(9))",
      "lerp(c,screen(softLight(c,gradient3(radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)),gradient4(val(5,0,1),220,55,105,220),gradient4(val(4,0,1),220,55,105,220),gradient4(val(3,0,1),220,55,105,220)),(ctl(8)/255)*lerp(1,smoothstep(0.08,0.88,i/255),ctl(7))*smoothstep(0,val(6,0.12,0.75),radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)))),gradient3(radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)),gradient4(val(5,0,1),220,55,105,220),gradient4(val(4,0,1),220,55,105,220),gradient4(val(3,0,1),220,55,105,220)),(ctl(8)/255)*0.18*lerp(1,smoothstep(0.08,0.88,i/255),ctl(7))*smoothstep(0,val(6,0.12,0.75),radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)))),ctl(9))",
      "lerp(c,screen(softLight(c,gradient3(radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)),gradient4(val(5,0,1),255,255,20,255),gradient4(val(4,0,1),255,255,20,255),gradient4(val(3,0,1),255,255,20,255)),(ctl(8)/255)*lerp(1,smoothstep(0.08,0.88,i/255),ctl(7))*smoothstep(0,val(6,0.12,0.75),radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)))),gradient3(radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)),gradient4(val(5,0,1),255,255,20,255),gradient4(val(4,0,1),255,255,20,255),gradient4(val(3,0,1),255,255,20,255)),(ctl(8)/255)*0.18*lerp(1,smoothstep(0.08,0.88,i/255),ctl(7))*smoothstep(0,val(6,0.12,0.75),radialGrad(x,y,ctl(0)/255*X,ctl(1)/255*Y,val(2,0.2,1.5)*min(X,Y)))),ctl(9))",
      "a"
    ]
  },
  {
    "id": "red-black-diagonal-plaid",
    "name": "Red-Black Diagonal Plaid",
    "description": "Reconstructs the supplied red-and-black plaid: alternating solid colour and black checks with 45-degree colour/black diagonal hatching in the intervening cells. Cell Size sets the square repeat; Stripe Spacing and Black Stripe Width shape the hatch; X/Y Phase translate the complete plaid across its full two-cell repeat; Stripe Offset fine-tunes hatch registration; Hue Rotation rotates the plaid colour; Saturation ranges from grayscale through the default colour to intensified chroma; Effect Mix blends the generated pattern with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Pattern",
      "Textile",
      "Procedural",
      "Texture"
    ],
    "controls": [
      {
        "label": "Cell Size",
        "value": 104.39062500000001,
        "ui": {
          "widget": "slider",
          "displayMin": 8,
          "displayMax": 24,
          "step": 0.01,
          "format": "number",
          "unit": "% short"
        }
      },
      {
        "label": "Stripe Spacing",
        "value": 100.24687499999999,
        "ui": {
          "widget": "slider",
          "displayMin": 8,
          "displayMax": 24,
          "step": 0.01,
          "format": "number",
          "unit": "% cell"
        }
      },
      {
        "label": "Black Stripe Width",
        "value": 170,
        "ui": {
          "widget": "slider",
          "displayMin": 35,
          "displayMax": 65,
          "step": 1,
          "format": "number",
          "unit": "% cycle"
        }
      },
      {
        "label": "X Phase",
        "value": 77.775,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 2,
          "step": 0.01,
          "format": "number",
          "unit": "cells"
        }
      },
      {
        "label": "Y Phase",
        "value": 63.75,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 2,
          "step": 0.01,
          "format": "number",
          "unit": "cells"
        }
      },
      {
        "label": "Stripe Offset",
        "value": 46.49422673198056,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 0.1,
          "format": "number",
          "unit": "% cycle"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Hue Rotation",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -180,
          "displayMax": 180,
          "step": 1,
          "format": "integer",
          "unit": "deg"
        }
      },
      {
        "label": "Saturation",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 200,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Control 10",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      }
    ],
    "f": [
      "lerp(r,clamp(211*(0.299+1.13983*((-0.14713*(sin((val(7,-180,180)*1024/360))/512)+0.615*(cos((val(7,-180,180)*1024/360))/512))*(val(8,0,200)/100))),0,255)*((1-floor(repeat(x/(min(X,Y)*val(0,8,24)/100)+val(3,0,2),2)))*(1-floor(repeat(y/(min(X,Y)*val(0,8,24)/100)+val(4,0,2),2)))+abs((1-floor(repeat(x/(min(X,Y)*val(0,8,24)/100)+val(3,0,2),2)))-(1-floor(repeat(y/(min(X,Y)*val(0,8,24)/100)+val(4,0,2),2))))*(fract((x+y+(min(X,Y)*val(0,8,24)/100)*(val(3,0,2)+val(4,0,2)))/((min(X,Y)*val(0,8,24)/100)*val(1,8,24)/100)+val(5,0,100)/100)>=val(2,35,65)/100?1:0)),ctl(6))",
      "lerp(g,clamp(211*(0.299-0.39465*((-0.14713*(cos((val(7,-180,180)*1024/360))/512)-0.615*(sin((val(7,-180,180)*1024/360))/512))*(val(8,0,200)/100))-0.58060*((-0.14713*(sin((val(7,-180,180)*1024/360))/512)+0.615*(cos((val(7,-180,180)*1024/360))/512))*(val(8,0,200)/100))),0,255)*((1-floor(repeat(x/(min(X,Y)*val(0,8,24)/100)+val(3,0,2),2)))*(1-floor(repeat(y/(min(X,Y)*val(0,8,24)/100)+val(4,0,2),2)))+abs((1-floor(repeat(x/(min(X,Y)*val(0,8,24)/100)+val(3,0,2),2)))-(1-floor(repeat(y/(min(X,Y)*val(0,8,24)/100)+val(4,0,2),2))))*(fract((x+y+(min(X,Y)*val(0,8,24)/100)*(val(3,0,2)+val(4,0,2)))/((min(X,Y)*val(0,8,24)/100)*val(1,8,24)/100)+val(5,0,100)/100)>=val(2,35,65)/100?1:0)),ctl(6))",
      "lerp(b,clamp(211*(0.299+2.03211*((-0.14713*(cos((val(7,-180,180)*1024/360))/512)-0.615*(sin((val(7,-180,180)*1024/360))/512))*(val(8,0,200)/100))),0,255)*((1-floor(repeat(x/(min(X,Y)*val(0,8,24)/100)+val(3,0,2),2)))*(1-floor(repeat(y/(min(X,Y)*val(0,8,24)/100)+val(4,0,2),2)))+abs((1-floor(repeat(x/(min(X,Y)*val(0,8,24)/100)+val(3,0,2),2)))-(1-floor(repeat(y/(min(X,Y)*val(0,8,24)/100)+val(4,0,2),2))))*(fract((x+y+(min(X,Y)*val(0,8,24)/100)*(val(3,0,2)+val(4,0,2)))/((min(X,Y)*val(0,8,24)/100)*val(1,8,24)/100)+val(5,0,100)/100)>=val(2,35,65)/100?1:0)),ctl(6))",
      "a"
    ]
  },
  {
    "id": "selective-color-isolate",
    "name": "Selective Color Isolate",
    "description": "Isolates a chosen colour family while converting the rest of the image to monochrome. The selector compares normalized opponent-chroma direction, so tints and shaded versions of the target colour stay selected more reliably than simple RGB chromaticity matching. Minimum Saturation suppresses neutral spill and an automatic deep-shadow gate reduces dark chroma noise. Use Target Red/Green/Blue to choose the accent colour, Tolerance and Edge Softness to shape the selection, Mono Contrast/Brightness for the background, Color Boost for the retained colour, and Effect Mix for the final strength. Best suited to distinctly coloured subjects rather than neutral grey/white isolation.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Monochrome",
      "Utility",
      "Tone"
    ],
    "controls": [
      {
        "label": "Target Red",
        "value": 235,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Target Green",
        "value": 60,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Target Blue",
        "value": 45,
        "ui": {
          "widget": "number",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Tolerance",
        "value": 70,
        "ui": {
          "widget": "slider",
          "displayMin": 0.03,
          "displayMax": 1.2,
          "step": 0.01,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Edge Softness",
        "value": 50,
        "ui": {
          "widget": "slider",
          "displayMin": 0.01,
          "displayMax": 0.4,
          "step": 0.005,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Minimum Saturation",
        "value": 30,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 120,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Mono Contrast",
        "value": 142,
        "ui": {
          "widget": "slider",
          "displayMin": 0.6,
          "displayMax": 1.5,
          "step": 0.05,
          "format": "number",
          "unit": "x"
        }
      },
      {
        "label": "Mono Brightness",
        "value": 128,
        "ui": {
          "widget": "slider",
          "displayMin": -40,
          "displayMax": 40,
          "step": 1,
          "format": "number",
          "unit": ""
        }
      },
      {
        "label": "Color Boost",
        "value": 102,
        "ui": {
          "widget": "slider",
          "displayMin": 0.5,
          "displayMax": 1.75,
          "step": 0.05,
          "format": "number",
          "unit": "x"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,lerp(clamp((i-128)*val(6,0.6,1.5)+128+val(7,-40,40),0,255),clamp(i+(c-i)*val(8,0.5,1.75),0,255),clamp((1-smoothstep(val(3,0.03,1.2),val(3,0.03,1.2)+val(4,0.01,0.4),abs((r-g)/max(max(max(r,g),b)-min(min(r,g),b),1)-(ctl(0)-ctl(1))/max(max(max(ctl(0),ctl(1)),ctl(2))-min(min(ctl(0),ctl(1)),ctl(2)),1))+abs((b-g)/max(max(max(r,g),b)-min(min(r,g),b),1)-(ctl(2)-ctl(1))/max(max(max(ctl(0),ctl(1)),ctl(2))-min(min(ctl(0),ctl(1)),ctl(2)),1))))*smoothstep(val(5,0,120),val(5,0,120)+20,max(max(r,g),b)-min(min(r,g),b))*smoothstep(4,16,i),0,1)),ctl(9))",
      "lerp(c,lerp(clamp((i-128)*val(6,0.6,1.5)+128+val(7,-40,40),0,255),clamp(i+(c-i)*val(8,0.5,1.75),0,255),clamp((1-smoothstep(val(3,0.03,1.2),val(3,0.03,1.2)+val(4,0.01,0.4),abs((r-g)/max(max(max(r,g),b)-min(min(r,g),b),1)-(ctl(0)-ctl(1))/max(max(max(ctl(0),ctl(1)),ctl(2))-min(min(ctl(0),ctl(1)),ctl(2)),1))+abs((b-g)/max(max(max(r,g),b)-min(min(r,g),b),1)-(ctl(2)-ctl(1))/max(max(max(ctl(0),ctl(1)),ctl(2))-min(min(ctl(0),ctl(1)),ctl(2)),1))))*smoothstep(val(5,0,120),val(5,0,120)+20,max(max(r,g),b)-min(min(r,g),b))*smoothstep(4,16,i),0,1)),ctl(9))",
      "lerp(c,lerp(clamp((i-128)*val(6,0.6,1.5)+128+val(7,-40,40),0,255),clamp(i+(c-i)*val(8,0.5,1.75),0,255),clamp((1-smoothstep(val(3,0.03,1.2),val(3,0.03,1.2)+val(4,0.01,0.4),abs((r-g)/max(max(max(r,g),b)-min(min(r,g),b),1)-(ctl(0)-ctl(1))/max(max(max(ctl(0),ctl(1)),ctl(2))-min(min(ctl(0),ctl(1)),ctl(2)),1))+abs((b-g)/max(max(max(r,g),b)-min(min(r,g),b),1)-(ctl(2)-ctl(1))/max(max(max(ctl(0),ctl(1)),ctl(2))-min(min(ctl(0),ctl(1)),ctl(2)),1))))*smoothstep(val(5,0,120),val(5,0,120)+20,max(max(r,g),b)-min(min(r,g),b))*smoothstep(4,16,i),0,1)),ctl(9))",
      "a"
    ]
  },
  {
    "id": "futuristic-sci-fi-glitch-photo",
    "name": "Signal Rupture",
    "description": "High-contrast monochrome sci-fi photo corruption with localized horizontal tearing, restrained RGB separation, fine scanlines, black dropout streaks, deterministic grain, and sparse neon magenta/cyan/lime/red interruptions. Tuned to keep the source readable while most color appears as thin streaks and selective blocks. Best on portraits, vehicles, fashion, architecture, and other graphic subjects. Glitch Density controls tear/dropout frequency; Horizontal Tear sets displacement; Band Height and Glitch Width set corruption geometry; Color Burst controls neon accents; Contrast drives the crushed monochrome base; Effect Mix restores the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Glitch",
      "Monochrome",
      "Distortion",
      "Color",
      "Texture"
    ],
    "controls": [
      {
        "label": "Glitch Density",
        "value": 45.9,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Horizontal Tear",
        "value": 136,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 240,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Band Height",
        "value": 80.52631578947368,
        "ui": {
          "widget": "slider",
          "displayMin": 2,
          "displayMax": 40,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Scanline Strength",
        "value": 112.2,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Scanline Pitch",
        "value": 63.75,
        "ui": {
          "widget": "slider",
          "displayMin": 2,
          "displayMax": 6,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Color Burst",
        "value": 66.3,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Contrast",
        "value": 136,
        "ui": {
          "widget": "slider",
          "displayMin": 100,
          "displayMax": 400,
          "step": 5,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Seed",
        "value": 143.18563712742548,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Glitch Width",
        "value": 137.83783783783784,
        "ui": {
          "widget": "slider",
          "displayMin": 24,
          "displayMax": 320,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,clamp((screen(((clamp((((lerp(i,srcWrap((x+(((hash2(17,floor((y/val(2,2,40))),(val(7,1,9999)+37))-0.5)*(val(1,0,240)*(step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))))+((val(1,0,240)*0.055)*max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.5),((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433)))))))),y,0),max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.92),(((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433))))*0.45)))-128)*val(6,1,4))+128),0,255)*(1-(((ctl(3)/255)*0.42)*step((1-(1/val(4,2,6))),fract((y/val(4,2,6)))))))*(1-(0.82*(step((1-((ctl(0)/255)*0.18)),hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+503)))*step(0.5,fract((y/2))))))),gradient4(hash2(floor((x/val(8,24,320))),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+211)),255,40,210,255),(max((((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433))))*0.95),max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.38),((step((1-((ctl(5)/255)*0.11)),hash2(floor((x/val(8,24,320))),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+97)))*step(0.36,hash2((floor((x/val(8,24,320)))+7),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+121))))*(0.18+(0.42*(ctl(5)/255))))))*(0.15+(0.85*(ctl(5)/255)))))+((hash2(x,y,(val(7,1,9999)+701))-0.5)*(3+((12*(ctl(0)/255))+(6*(ctl(3)/255)))))),0,255),ctl(9))",
      "lerp(c,clamp((screen(((clamp((((lerp(i,srcWrap((x+(((hash2(17,floor((y/val(2,2,40))),(val(7,1,9999)+37))-0.5)*(val(1,0,240)*(step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))))+0)),y,1),max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.92),(((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433))))*0.45)))-128)*val(6,1,4))+128),0,255)*(1-(((ctl(3)/255)*0.42)*step((1-(1/val(4,2,6))),fract((y/val(4,2,6)))))))*(1-(0.82*(step((1-((ctl(0)/255)*0.18)),hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+503)))*step(0.5,fract((y/2))))))),gradient4(hash2(floor((x/val(8,24,320))),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+211)),0,235,255,42),(max((((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433))))*0.95),max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.38),((step((1-((ctl(5)/255)*0.11)),hash2(floor((x/val(8,24,320))),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+97)))*step(0.36,hash2((floor((x/val(8,24,320)))+7),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+121))))*(0.18+(0.42*(ctl(5)/255))))))*(0.15+(0.85*(ctl(5)/255)))))+((hash2(x,y,(val(7,1,9999)+701))-0.5)*(3+((12*(ctl(0)/255))+(6*(ctl(3)/255)))))),0,255),ctl(9))",
      "lerp(c,clamp((screen(((clamp((((lerp(i,srcWrap((x+(((hash2(17,floor((y/val(2,2,40))),(val(7,1,9999)+37))-0.5)*(val(1,0,240)*(step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))))+(-((val(1,0,240)*0.055)*max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.5),((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433))))))))),y,2),max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.92),(((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433))))*0.45)))-128)*val(6,1,4))+128),0,255)*(1-(((ctl(3)/255)*0.42)*step((1-(1/val(4,2,6))),fract((y/val(4,2,6)))))))*(1-(0.82*(step((1-((ctl(0)/255)*0.18)),hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+503)))*step(0.5,fract((y/2))))))),gradient4(hash2(floor((x/val(8,24,320))),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+211)),255,255,30,10),(max((((step((1-((ctl(0)/255)*0.28)),hash2(0,floor((y/2)),(val(7,1,9999)+401)))*step(0.5,fract((y/2))))*step(0.34,hash2(floor((x/val(8,24,320))),floor((y/2)),(val(7,1,9999)+433))))*0.95),max(((step((1-((ctl(0)/255)*0.62)),hash2(0,floor((y/val(2,2,40))),(val(7,1,9999)+37)))*step(0.58,hash2(floor((x/val(8,24,320))),floor((y/val(2,2,40))),(val(7,1,9999)+83))))*0.38),((step((1-((ctl(5)/255)*0.11)),hash2(floor((x/val(8,24,320))),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+97)))*step(0.36,hash2((floor((x/val(8,24,320)))+7),floor((y/(val(2,2,40)*2.5))),(val(7,1,9999)+121))))*(0.18+(0.42*(ctl(5)/255))))))*(0.15+(0.85*(ctl(5)/255)))))+((hash2(x,y,(val(7,1,9999)+701))-0.5)*(3+((12*(ctl(0)/255))+(6*(ctl(3)/255)))))),0,255),ctl(9))",
      "a"
    ]
  },
  {
    "id": "touchingrandomcapsules",
    "name": "Touching Random Capsules",
    "description": "Staggered capsule pattern with no vertical spacing. Every two-unit vertical block is either one tall capsule or two shorter touching capsules, chosen deterministically from Seed. White Background Opacity reveals the input image between capsules from 0% to 100% white.",
    "author": "Anthony Chimming",
    "tags": [
      "Pattern",
      "Shapes",
      "Procedural"
    ],
    "controls": [
      {
        "label": "Column Spacing",
        "value": 31.166666666666664,
        "ui": {
          "widget": "slider",
          "displayMin": 110,
          "displayMax": 200,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Pill Width",
        "value": 165.75000000000009,
        "ui": {
          "widget": "slider",
          "displayMin": 80,
          "displayMax": 96,
          "step": 0.1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Base Height",
        "value": 161.925,
        "ui": {
          "widget": "slider",
          "displayMin": 200,
          "displayMax": 400,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Background Opacity",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Horizontal Phase",
        "value": 80.325,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 200,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Vertical Phase",
        "value": 0,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 800,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Seed",
        "value": 177.9235847169434,
        "ui": {
          "widget": "seed",
          "displayMin": 1,
          "displayMax": 9999,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Effect Mix",
        "value": 255,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 100,
          "step": 1,
          "format": "number",
          "unit": "%"
        }
      },
      {
        "label": "Hue Shift",
        "value": 159.8,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 300,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Saturation",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 200,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      }
    ],
    "f": [
      "lerp(c,lerp(c,255,ctl(3))+((((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==0?val(8,0,3)<1?lerp(clamp(108+(0-108)*val(9,0,2),0,255),clamp(108+(157-108)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(108+(157-108)*val(9,0,2),0,255),clamp(108+(136-108)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(108+(136-108)*val(9,0,2),0,255),clamp(108+(0-108)*val(9,0,2),0,255),val(8,0,3)-2):((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==1?val(8,0,3)<1?lerp(clamp(153+(89-153)*val(9,0,2),0,255),clamp(153+(189-153)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(153+(189-153)*val(9,0,2),0,255),clamp(153+(139-153)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(153+(139-153)*val(9,0,2),0,255),clamp(153+(89-153)*val(9,0,2),0,255),val(8,0,3)-2):val(8,0,3)<1?lerp(clamp(192+(164-192)*val(9,0,2),0,255),clamp(192+(217-192)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(192+(217-192)*val(9,0,2),0,255),clamp(192+(137-192)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(192+(137-192)*val(9,0,2),0,255),clamp(192+(164-192)*val(9,0,2),0,255),val(8,0,3)-2))))-lerp(c,255,ctl(3)))*line(repeat(x+val(4,0,200),val(0,110,200)),repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?0:val(2,200,400)):0)+(val(0,110,200)*val(1,80,96)/100)/2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?val(2,200,400):val(2,200,400)*2):val(2,200,400)*2)-(val(0,110,200)*val(1,80,96)/100)/2),(val(0,110,200)*val(1,80,96)/100),0),ctl(7))",
      "lerp(c,lerp(c,255,ctl(3))+((((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==0?val(8,0,3)<1?lerp(clamp(108+(157-108)*val(9,0,2),0,255),clamp(108+(136-108)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(108+(136-108)*val(9,0,2),0,255),clamp(108+(0-108)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(108+(0-108)*val(9,0,2),0,255),clamp(108+(157-108)*val(9,0,2),0,255),val(8,0,3)-2):((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==1?val(8,0,3)<1?lerp(clamp(153+(189-153)*val(9,0,2),0,255),clamp(153+(139-153)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(153+(139-153)*val(9,0,2),0,255),clamp(153+(89-153)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(153+(89-153)*val(9,0,2),0,255),clamp(153+(189-153)*val(9,0,2),0,255),val(8,0,3)-2):val(8,0,3)<1?lerp(clamp(192+(217-192)*val(9,0,2),0,255),clamp(192+(137-192)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(192+(137-192)*val(9,0,2),0,255),clamp(192+(164-192)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(192+(164-192)*val(9,0,2),0,255),clamp(192+(217-192)*val(9,0,2),0,255),val(8,0,3)-2))))-lerp(c,255,ctl(3)))*line(repeat(x+val(4,0,200),val(0,110,200)),repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?0:val(2,200,400)):0)+(val(0,110,200)*val(1,80,96)/100)/2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?val(2,200,400):val(2,200,400)*2):val(2,200,400)*2)-(val(0,110,200)*val(1,80,96)/100)/2),(val(0,110,200)*val(1,80,96)/100),0),ctl(7))",
      "lerp(c,lerp(c,255,ctl(3))+((((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==0?val(8,0,3)<1?lerp(clamp(108+(136-108)*val(9,0,2),0,255),clamp(108+(0-108)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(108+(0-108)*val(9,0,2),0,255),clamp(108+(157-108)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(108+(157-108)*val(9,0,2),0,255),clamp(108+(136-108)*val(9,0,2),0,255),val(8,0,3)-2):((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==1?val(8,0,3)<1?lerp(clamp(153+(139-153)*val(9,0,2),0,255),clamp(153+(89-153)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(153+(89-153)*val(9,0,2),0,255),clamp(153+(189-153)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(153+(189-153)*val(9,0,2),0,255),clamp(153+(139-153)*val(9,0,2),0,255),val(8,0,3)-2):val(8,0,3)<1?lerp(clamp(192+(137-192)*val(9,0,2),0,255),clamp(192+(164-192)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(192+(164-192)*val(9,0,2),0,255),clamp(192+(217-192)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(192+(217-192)*val(9,0,2),0,255),clamp(192+(137-192)*val(9,0,2),0,255),val(8,0,3)-2))))-lerp(c,255,ctl(3)))*line(repeat(x+val(4,0,200),val(0,110,200)),repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?0:val(2,200,400)):0)+(val(0,110,200)*val(1,80,96)/100)/2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?val(2,200,400):val(2,200,400)*2):val(2,200,400)*2)-(val(0,110,200)*val(1,80,96)/100)/2),(val(0,110,200)*val(1,80,96)/100),0),ctl(7))",
      "a"
    ]
  }
];


/* src/presets/builtins.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */


const BUILTIN_AUTHOR='Anthony Chimming';

const richControl=(label,value,widget,displayMin,displayMax,step=1,format='number',unit='')=>({label,value,ui:{widget,displayMin,displayMax,step,format,unit}});
const unusedControl=index=>richControl(`Control ${index+1}`,128,'slider',0,255);
const sierpinskiMask=`sierpinski(x,y,X/2,Y/2,min(X,Y)*val(1,0.5,0.96),val(0,2,9),val(2,0,2.5))`;
const sierpinskiShade=`(0.76+linearGrad(x,y,0,Y*0.15,0,Y*0.85)*0.24)`;
const sierpinskiFormulas=[
  `lerp(r,ctl(6)+(ctl(3)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  `lerp(g,ctl(6)+(ctl(4)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  `lerp(b,ctl(6)+(ctl(5)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  'a'
];
const warpedSdfScale='val(1,20,110)',warpedSdfAmount='val(0,0,30)',warpedSdfSeed='val(2,1,9999)';
const warpedSdfX=`x+(valueNoise(x,y,${warpedSdfScale},${warpedSdfSeed})-0.5)*${warpedSdfAmount}`;
const warpedSdfY=`y+(valueNoise(x+431,y+719,${warpedSdfScale},${warpedSdfSeed})-0.5)*${warpedSdfAmount}`;
const warpedSdfSize='min(X,Y)*val(3,0.12,0.32)',warpedSdfSmooth='val(4,0,28)',warpedSdfCutout='min(X,Y)*val(5,0.03,0.16)';
const warpedSdfOuter=`sdfSmoothUnion(sdfCircle(${warpedSdfX},${warpedSdfY},X/2,Y/2,${warpedSdfSize}),sdfBox(${warpedSdfX},${warpedSdfY},X/2,Y/2,${warpedSdfSize}*1.55,${warpedSdfSize}*1.05,128),${warpedSdfSmooth})`;
const warpedSdfField=`sdfSubtract(${warpedSdfOuter},sdfCircle(${warpedSdfX},${warpedSdfY},X/2,Y/2,${warpedSdfCutout}))`;
const warpedSdfFill=`sdfFill(${warpedSdfField},val(7,0,3))`,warpedSdfOutline=`sdfOutline(${warpedSdfField},val(6,0.5,8),val(7,0,3))`,warpedSdfHue='val(8,0,1)';
const warpedSdfFormulas=[
  `lerp(r,clamp(10+${warpedSdfFill}*(80+${warpedSdfHue}*130),0,255),ctl(9))`,
  `lerp(g,clamp(12+${warpedSdfOutline}*(70+${warpedSdfHue}*130),0,255),ctl(9))`,
  `lerp(b,clamp(22+${warpedSdfFill}*(230-${warpedSdfHue}*80),0,255),ctl(9))`,
  'a'
];
const benchmarkNoiseScale='val(0,10,96)',benchmarkNoiseOctaves='val(1,2,8)',benchmarkNoiseSeed='val(2,1,9999)',benchmarkNoiseContrast='val(3,0.65,1.65)';
const benchmarkNoiseFormulas=[
  `lerp(r,clamp(fbm(x,y,${benchmarkNoiseScale},${benchmarkNoiseOctaves},2,0.5,${benchmarkNoiseSeed})*255*${benchmarkNoiseContrast},0,255),ctl(9))`,
  `lerp(g,clamp(turbulence(x+37,y+71,${benchmarkNoiseScale},${benchmarkNoiseOctaves},${benchmarkNoiseSeed})*255*${benchmarkNoiseContrast},0,255),ctl(9))`,
  `lerp(b,clamp(ridged(x-53,y+29,${benchmarkNoiseScale},${benchmarkNoiseOctaves},${benchmarkNoiseSeed})*255*${benchmarkNoiseContrast},0,255),ctl(9))`,
  'a'
];
const presetDescriptions={
  pass:'Returns the source image unchanged. Use it as a neutral starting point for a new filter.',
  invert:'Inverts the red, green, and blue channels while preserving the source alpha channel.',
  amberfilm:'Applies a warm amber film grade with adjustable strength and warmth. It works especially well on portraits and high-contrast scenes.',
  analoggrain:'Adds deterministic monochrome grain to simulate a lightly textured analog image. Adjust Amount for intensity and Seed for a different grain pattern.',
  brightcontrast:'Adjusts image brightness and contrast while preserving colour relationships and alpha.',
  chromasolar:'Solarizes each colour channel around a shared threshold with adjustable channel separation.',
  digitalglitch:'Displaces RGB channels in deterministic rectangular blocks. Block dimensions, displacement, and seed control the glitch structure.',
  fractalclouds:'Blends the image with deterministic multi-octave fractal noise. Adjust scale, seed, and mix to create cloud-like texture.',
  sierpinskifractal:'Generates a recursive triangular Sierpiński mask with adjustable depth, scale, edge softness, colours, and source mix.',
  layerednoisebenchmark:'Exercises bounded FBM, turbulence, and ridged noise in separate colour channels for repeatable CPU/WebGPU performance and parity comparisons.',
  mosaic:'Samples the centre of repeating rectangular blocks to produce a pixelated mosaic.',
  poster:'Reduces each RGB channel to a controlled number of tonal levels while preserving alpha.',
  rgbshift:'Offsets the red, green, and blue channels independently in two dimensions for chromatic misregistration effects.',
  saturation:'Adjusts colour saturation around perceptual luminance, from grayscale through exaggerated colour.',
  sharpen:'Blends a fixed 3×3 sharpening convolution with the source image.',
  softfocus:'Blends four diagonal bilinear samples with the original image to produce an adjustable soft-focus glow.',
  swirl:'Rotates source sampling progressively around the image centre to create a radial swirl.',
  vignettepro:'Darkens the image progressively toward the edges with adjustable strength and radius.',
  warpedsdfbloom:'Combines, subtracts, outlines, and noise-warps signed-distance shapes. It also serves as the SDF composition benchmark.',
  warmcool:'Applies opposing warm and cool colour shifts along a diagonal image gradient.'
};

const presetDefinitions=[
{id:'pass',name:'Pass Through',controls:[],f:['r','g','b','a']},
{id:'invert',name:'Invert',controls:[],f:['255-r','255-g','255-b','a']},
{id:'amberfilm',name:'Amber Film',controls:[richControl('Strength',115,'slider',0,100,1,'number','%'),richControl('Warmth',140,'slider',0,100,1,'number','%')],f:['lerp(r,clamp(i+val(1,10,65),0,255),ctl(0))','lerp(g,clamp(i+val(1,-10,20),0,255),ctl(0))','lerp(b,clamp(i-val(1,15,80),0,255),ctl(0))','a']},
{id:'analoggrain',name:'Analog Grain',controls:[richControl('Amount',52,'slider',0,90,1,'number','levels'),richControl('Seed',91,'seed',1,9999,1,'integer')],f:Array(3).fill('clamp(c+(hash2(x,y,val(1,1,9999))-0.5)*val(0,0,90),0,255)').concat('a')},
{id:'brightcontrast',name:'Brightness / Contrast',controls:[richControl('Brightness',128,'slider',-128,128,1,'number','levels'),richControl('Contrast',85,'slider',0,300,1,'number','%')],f:Array(3).fill('clamp(((c-128)*val(1,0,300))/100+128+val(0,-128,128),0,255)').concat('a')},
{id:'chromasolar',name:'Chromatic Solarize',controls:[richControl('Threshold',128,'slider',0,255,1,'integer'),richControl('Channel Spread',64,'slider',-72,72,1,'number','levels')],f:['r>=clamp(ctl(0)+val(1,-72,72),0,255)?255-r:r','g>=ctl(0)?255-g:g','b>=clamp(ctl(0)-val(1,-72,72),0,255)?255-b:b','a']},
{id:'digitalglitch',name:'Digital Block Glitch',controls:[richControl('Displacement',77,'slider',0,100,1,'number','px'),richControl('Block Width',64,'slider',8,96,1,'integer','px'),richControl('Block Height',45,'slider',4,48,1,'integer','px'),richControl('Seed',91,'seed',1,9999,1,'integer')],f:['srcWrap(x+(hash2(floor(x/val(1,8,96)),floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,100),y,0)','srcWrap(x+(hash2(floor(x/val(1,8,96))+11,floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,70),y,1)','srcWrap(x+(hash2(floor(x/val(1,8,96))+23,floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,100),y,2)','a']},
{id:'fractalclouds',name:'Fractal Clouds',controls:[richControl('Scale',58,'slider',12,180,1,'integer','px'),richControl('Seed',135,'seed',1,9999,1,'integer'),richControl('Blend',190,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,fbm(x,y,val(0,12,180),5,2,0.5,val(1,1,9999))*255,ctl(2))').concat('a')},
{id:'sierpinskifractal',name:'Sierpiński Fractal',controls:[richControl('Recursion Depth',174,'number',2,9,1,'integer'),richControl('Fractal Scale',208,'slider',0.5,0.96,0.01),richControl('Edge Softness',32,'slider',0,2.5,0.1,'number','px'),richControl('Foreground R',238,'number',0,255,1,'integer'),richControl('Foreground G',232,'number',0,255,1,'integer'),richControl('Foreground B',214,'number',0,255,1,'integer'),richControl('Background',8,'number',0,255,1,'integer'),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:sierpinskiFormulas},
{id:'layerednoisebenchmark',name:'Layered Noise Benchmark',benchmark:true,controls:[richControl('Noise Scale',92,'slider',10,96,1,'integer','px'),richControl('Octaves',192,'slider',2,8,1,'integer'),richControl('Seed',73,'seed',1,9999,1,'integer'),richControl('Contrast',150,'slider',0.65,1.65,0.01,'number','×'),unusedControl(4),unusedControl(5),unusedControl(6),unusedControl(7),unusedControl(8),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:benchmarkNoiseFormulas},
{id:'mosaic',name:'Mosaic',controls:[richControl('Block Width',35,'slider',2,64,1,'integer','px'),richControl('Block Height',35,'slider',2,64,1,'integer','px')],f:Array(4).fill('srcLinear(floor(x/val(0,2,64))*val(0,2,64)+val(0,2,64)/2,floor(y/val(1,2,64))*val(1,2,64)+val(1,2,64)/2,z)')},
{id:'poster',name:'Posterize',controls:[richControl('Levels',72,'slider',2,16,1,'integer')],f:Array(3).fill('round(c*(val(0,2,16)-1)/255)*255/(val(0,2,16)-1)').concat('a')},
{id:'rgbshift',name:'RGB Shift',controls:[richControl('Red X',136,'number',-128,127,1,'number','px'),richControl('Red Y',128,'number',-128,127,1,'number','px'),richControl('Green X',120,'number',-128,127,1,'number','px'),richControl('Green Y',128,'number',-128,127,1,'number','px'),richControl('Blue X',128,'number',-128,127,1,'number','px'),richControl('Blue Y',136,'number',-128,127,1,'number','px')],f:['srcLinear(x+ctl(0)-128,y+ctl(1)-128,0)','srcLinear(x+ctl(2)-128,y+ctl(3)-128,1)','srcLinear(x+ctl(4)-128,y+ctl(5)-128,2)','a']},
{id:'saturation',name:'Saturation',controls:[richControl('Saturation',85,'slider',0,300,1,'number','%')],f:Array(3).fill('clamp(i+((c-i)*val(0,0,300))/100,0,255)').concat('a')},
{id:'sharpen',name:'Sharpen',controls:[richControl('Amount',128,'slider',0,200,1,'number','%')],f:Array(3).fill('clamp(c+((cnv(0,-1,0,-1,5,-1,0,-1,0,1)-c)*val(0,0,200))/100,0,255)').concat('a')},
{id:'softfocus',name:'Soft Focus',controls:[richControl('Radius',75,'slider',1,14,0.5,'number','px'),richControl('Blend',175,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,(c+srcLinear(x-val(0,1,14),y-val(0,1,14),z)+srcLinear(x+val(0,1,14),y-val(0,1,14),z)+srcLinear(x-val(0,1,14),y+val(0,1,14),z)+srcLinear(x+val(0,1,14),y+val(0,1,14),z))/5,ctl(1))').concat('a')},
{id:'swirl',name:'Swirl',controls:[richControl('Twist',165,'slider',-91.4,91.4,0.1,'number','°')],f:['rad(d+((M-m)*val(0,-260,260))/max(1,M),m,0)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,1)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,2)','a']},
{id:'vignettepro',name:'Vignette Pro',controls:[richControl('Strength',160,'slider',0,100,1,'number','%'),richControl('Radius',105,'slider',0,100,1,'number','%')],f:Array(3).fill('clamp(c*(1-smoothstep(val(1,0,M),M,m)*val(0,0,100)/100),0,255)').concat('a')},
{id:'warpedsdfbloom',name:'Warped SDF Bloom',benchmark:true,controls:[richControl('Warp Amount',80,'slider',0,30,0.1,'number','px'),richControl('Warp Scale',100,'slider',20,110,1,'number','px'),richControl('Seed',73,'seed',1,9999,1,'integer'),richControl('Shape Size',150,'slider',0.12,0.32,0.01),richControl('Smooth Union',100,'slider',0,28,0.5,'number','px'),richControl('Cutout Size',75,'slider',0.03,0.16,0.01),richControl('Outline Width',80,'slider',0.5,8,0.1,'number','px'),richControl('Edge Softness',48,'slider',0,3,0.1,'number','px'),richControl('Colour Shift',115,'slider',0,1,0.01),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:warpedSdfFormulas},
{id:'warmcool',name:'Warm–Cool Gradient',controls:[richControl('Warm Strength',120,'slider',0,100,1,'number','%'),richControl('Cool Strength',120,'slider',0,100,1,'number','%')],f:['clamp(r+linearGrad(x,y,0,0,X,Y)*val(0,0,70)-val(1,0,30),0,255)','g','clamp(b+(1-linearGrad(x,y,0,0,X,Y))*val(1,0,70)-val(0,0,30),0,255)','a']}
];

const presetTags={"pass": ["Utility"], "invert": ["Color", "Negative"], "amberfilm": ["Retro", "Warm", "Portrait"], "analoggrain": ["Noise", "Retro"], "brightcontrast": ["Tone"], "chromasolar": ["Color", "Retro"], "digitalglitch": ["Glitch"], "fractalclouds": ["Noise", "Procedural"], "sierpinskifractal": ["Fractal", "Shapes"], "layerednoisebenchmark": ["Noise", "Procedural"], "mosaic": ["Pixelate"], "poster": ["Color", "Print"], "rgbshift": ["Color", "Distortion"], "saturation": ["Color"], "sharpen": ["Detail"], "softfocus": ["Blur", "Portrait"], "swirl": ["Distortion"], "vignettepro": ["Tone", "Portrait"], "warpedsdfbloom": ["Shapes", "Procedural"], "warmcool": ["Color", "Gradient"]};

const presets=[
  ...presetDefinitions.map(preset=>({...preset,tags:[...(presetTags[preset.id]||[]),...(preset.benchmark?['Benchmark']:[])],description:presetDescriptions[preset.id],author:BUILTIN_AUTHOR})),
  ...contributedPresetDefinitions.map(preset=>({...preset,author:BUILTIN_AUTHOR,tags:[...preset.tags],controls:preset.controls.map(control=>({...control,ui:{...control.ui}})),f:[...preset.f]})),
  ...pass2PresetDefinitions.map(preset=>({...preset,author:BUILTIN_AUTHOR,tags:[...preset.tags],controls:preset.controls.map(control=>({...control,ui:{...control.ui}})),f:[...preset.f]}))
];


/* src/renderers/cpu-worker-source.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */



function workerProgram(){const float=CHROMA_MODELS.float,legacy=CHROMA_MODELS.legacy;return String.raw`
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


/* src/gpu/params-layout.js */
/**
 * Filter FabJS
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */


const WEBGPU_CONTROL_SLOT_COUNT=Math.ceil(CONTROL_COUNT/4)*4;
const WEBGPU_PARAMS_HEADER_BYTES=16;
const WEBGPU_PARAMS_BYTES=WEBGPU_PARAMS_HEADER_BYTES+WEBGPU_CONTROL_SLOT_COUNT*4;


/* src/gpu/angle-sign.js */
/* GPU-local sign provenance for angle arguments. No physical -0 is required. */

// These CPU operations produce +0 when their result is zero (absolute values,
// nonnegative masks/samples, clamping against +0, or cancellation of magnitudes).
const POSITIVE_ZERO_CALLS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 map abs sub dif sqr sqrt cos c2m radius step smoothstep fract bias gain hash2 valueNoise perlin worleyF1 worleyF2 fbm turbulence ridged periodicNoise mandelbrot julia wrap mirror repeat mirrorRepeat linearGrad radialGrad angularGrad checker brick line circle ring box triangle grid sierpinski sdfLine sdfCircle sdfBox sdfFill sdfOutline multiply screen overlay softLight difference'.split(' '));
const and=(a,b)=>a==='false'||b==='false'?'false':a==='true'?b:b==='true'?a:`(${a} && ${b})`;
const or=(a,b)=>a==='true'||b==='true'?'true':a==='false'?b:b==='false'?a:`(${a} || ${b})`;
const not=a=>a==='true'?'false':a==='false'?'true':`(!${a})`;
const xor=(a,b)=>a===b?'false':a==='false'?b:b==='false'?a:a==='true'?not(b):b==='true'?not(a):`(${a} != ${b})`;

class AngleSignLowering{
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
  lower(node,centeredInput=true){
    const c=this.compiler,ch=this.channel;
    switch(node.op){
      case'const':return this.constant(Number(node.value));
      case'var':{
        if(centeredInput&&(node.name==='cx'||node.name==='cy')){
          // Only angle arithmetic receives the CPU's exact centered +0. Keep
          // the original f32 value elsewhere, including neighbors and edges.
          // Integer equality cannot introduce a center in an even dimension.
          const x=node.name==='cx',coordinate=x?'px':'py',size=x?'width':'height';
          const v=this.bind(`select(${c.variable(node.name,ch)}, 0.0, 2u*${coordinate} == params.${size}-1u)`);
          return{v,n:`(${v} < 0.0)`};
        }
        // d is the only variable whose CPU definition can yield -0. Its sign
        // comes from -(height/2-y); coordinate/chroma cancellations yield +0.
        const nz=/^d[01]?$/.test(node.name)?'(dy >= 0.0)':'false';
        return{v:c.variable(node.name,ch),n:or(`(${c.variable(node.name,ch)} < 0.0)`,and(`(${c.variable(node.name,ch)} == 0.0)`,nz))};
      }
      case'unary':return node.operator==='+'?this.lower(node.input,centeredInput):node.operator==='-'?this.unary(this.lower(node.input,centeredInput)):this.pair(c.value(node,ch));
      case'binary':return ['+','-','*','/','%'].includes(node.operator)?this.binary(node.operator,this.lower(node.left,centeredInput),this.lower(node.right,centeredInput)):this.pair(c.value(node,ch));
      case'select':return this.choose(c.bool(node.condition,ch),()=>this.lower(node.whenTrue,centeredInput),()=>this.lower(node.whenFalse,centeredInput));
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
    // Other calls are semantic boundaries: do not alter their coordinate
    // inputs. An explicit nested angle establishes its own local correction.
    const a=node.args.map(arg=>this.lower(arg,false)),A=i=>a[i];
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

const SEMANTIC_ANGLE_WGSL=`
fn ff_control_negative(index:f32)->bool{let i=i32(trunc(index));if(i<0||i>=${CONTROL_COUNT}){return false;}return (bitcast<u32>(params.controls[u32(i)])&0x80000000u)!=0u;}
fn ff_angle(y:f32,x:f32,yNegative:bool,xNegative:bool)->f32{
  if(y==0.0){if(xNegative){return select(FF_PI,-FF_PI,yNegative);}return 0.0;}
  if(x==0.0){return select(FF_PI*0.5,-FF_PI*0.5,yNegative);}
  return atan2(y,x);
}
`;


/* src/gpu/wgsl-compiler.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */






class WGSLCompileError extends Error{constructor(message,blockers=[]){super(message);this.name='WGSLCompileError';this.blockers=blockers}}
const WEBGPU_FUNCTIONS=new Set('src src0 src1 srcWrap srcMirror srcLinear rad rad0 rad1 cnv cnv0 cnv1 ctl val map min max abs add sub dif mix scl sqr sqrt sin cos tan r2x r2y c2d c2m radius angle clamp lerp step smoothstep floor ceil round fract sign bias gain hash2 valueNoise perlin worleyF1 worleyF2 fbm turbulence ridged periodicNoise mandelbrot julia wrap mirror repeat mirrorRepeat gradient3 gradient4 linearGrad radialGrad angularGrad checker brick line circle ring box triangle grid sierpinski sdfLine sdfCircle sdfBox sdfUnion sdfIntersect sdfSubtract sdfSmoothUnion sdfFill sdfOutline multiply screen overlay softLight difference'.split(' '));
const WEBGPU_UNARY=new Set(['+','-','!']);
const WEBGPU_BINARY=new Set(['+','-','*','/','%','<','<=','>','>=','==','!=','&&','||']);
const WEBGPU_BOOLEAN_BINARY=new Set(['<','<=','>','>=','==','!=','&&','||']);
const EXACT_INTEGER_NOISE_FUNCTIONS=new Set(['hash2','valueNoise','perlin','worleyF1','worleyF2','fbm','turbulence','ridged','periodicNoise']);
// Calls with bounded iteration or repeated sampling. Classification is local to
// WGSL lowering and never changes neutral IR metadata or compatibility.
const EXPENSIVE_BRANCH_FUNCTIONS=new Set(['mandelbrot','julia','fbm','turbulence','ridged','worleyF1','worleyF2','cnv','cnv0','cnv1','sierpinski']);
const SHAREABLE_FIELD_FUNCTIONS=new Set(['mandelbrot','julia','fbm','turbulence','ridged','worleyF1','worleyF2']);
const CHANNEL_DEPENDENT_VARIABLES=new Set(['c','c0','c1','z','p']);
const IMPLICIT_CHANNEL_FUNCTIONS=new Set(['cnv','cnv0','cnv1']);
const MAX_WEBGPU_IR_NODES=4096;
class WGSLCompiler{
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
    const compiler=new WGSLCompiler(program);compiler.prepareSharedFields();
    const expressions=program.outputs.map((output,channel)=>compiler.value(output.expression,channel));
    const code=compiler.shader(expressions);this.validateGeneratedSource(code);return{key:this.key(program),code,analysis};
  }
  static validateGeneratedSource(code){
    const malformed=code.match(/\breturn(?:\s+[^;\n{}]+)?}/g);
    if(malformed?.length)throw new WGSLCompileError('Generated WGSL contains an unterminated return statement',[...new Set(malformed)]);
  }
  constructor(program){this.program=program;this.statements=[];this.nextTemporary=0;this.expensiveNodes=new WeakMap();this.fieldNodes=new WeakMap();this.sharedFields=new Map()}
  prepareSharedFields(){
    // Intern structural signatures using child IDs: bounded by validated IR size,
    // without serializing whole subtrees or mutating IR/cache-key metadata.
    const signatures=new Map(),candidates=new Map();
    const inspect=(node,channel,required)=>{
      let children=[],tag='',independent=true;
      switch(node.op){
        case'const':tag=Object.is(node.value,-0)?'-0':String(node.value);break;
        case'var':tag=node.name;independent=!CHANNEL_DEPENDENT_VARIABLES.has(node.name);break;
        case'unary':tag=node.operator;children=[inspect(node.input,channel,required)];break;
        case'binary':tag=node.operator;children=[inspect(node.left,channel,required),inspect(node.right,channel,required&&node.operator!=='&&'&&node.operator!=='||')];break;
        case'select':children=[inspect(node.condition,channel,required),inspect(node.whenTrue,channel,false),inspect(node.whenFalse,channel,false)];break;
        case'call':tag=node.fn;independent=WEBGPU_FUNCTIONS.has(node.fn)&&!IMPLICIT_CHANNEL_FUNCTIONS.has(node.fn);children=node.args.map(arg=>inspect(arg,channel,required));break;
        default:independent=false;
      }
      independent=independent&&children.every(child=>child.independent);
      const signature=JSON.stringify([node.op,node.type,tag,...children.map(child=>child.id)]);
      if(!signatures.has(signature))signatures.set(signature,signatures.size);
      const id=signatures.get(signature),info={id,independent};this.fieldNodes.set(node,info);
      if(required&&independent&&node.op==='call'&&SHAREABLE_FIELD_FUNCTIONS.has(node.fn)){
        const candidate=candidates.get(id)||{id,node,channels:0};candidate.channels|=1<<channel;candidates.set(id,candidate);
      }
      return info;
    };
    this.program.outputs.forEach((output,channel)=>inspect(output.expression,channel,true));
    // Child IDs precede parent IDs, so nested shared fields are defined first.
    for(const {id,node,channels} of [...candidates.values()].sort((a,b)=>a.id-b.id)){
      if((channels&(channels-1))===0)continue;
      const expression=this.value(node,0),name=`ff_shared_${this.sharedFields.size}`;
      this.statements.push(`let ${name}:f32 = ${expression};`);this.sharedFields.set(id,name);
    }
  }
  hasExpensiveWork(node){
    if(this.expensiveNodes.has(node))return this.expensiveNodes.get(node);
    let expensive=false;
    switch(node.op){
      case'call':expensive=EXPENSIVE_BRANCH_FUNCTIONS.has(node.fn)||node.args.some(arg=>this.hasExpensiveWork(arg));break;
      case'unary':expensive=this.hasExpensiveWork(node.input);break;
      case'binary':expensive=this.hasExpensiveWork(node.left)||this.hasExpensiveWork(node.right);break;
      case'select':expensive=this.hasExpensiveWork(node.condition)||this.hasExpensiveWork(node.whenTrue)||this.hasExpensiveWork(node.whenFalse);break;
    }
    this.expensiveNodes.set(node,expensive);return expensive;
  }
  captureStatements(emit){
    const parent=this.statements;this.statements=[];
    try{const expression=emit();return{expression,statements:this.statements.join('\n')}}finally{this.statements=parent}
  }
  selectValue(node,channel){
    if(!this.hasExpensiveWork(node.whenTrue)&&!this.hasExpensiveWork(node.whenFalse))return`select(${this.value(node.whenFalse,channel)}, ${this.value(node.whenTrue,channel)}, ${this.bool(node.condition,channel)})`;
    const condition=this.bool(node.condition,channel),name=`ff_branch_${this.nextTemporary++}`;
    const yes=this.captureStatements(()=>this.value(node.whenTrue,channel)),no=this.captureStatements(()=>this.value(node.whenFalse,channel));
    this.statements.push(`var ${name}:f32;\nif (${condition}) {\n${yes.statements}\n${name} = ${yes.expression};\n} else {\n${no.statements}\n${name} = ${no.expression};\n}`);
    return name;
  }
  logicalValue(node,channel){
    const left=this.value(node.left,channel),right=this.captureStatements(()=>this.value(node.right,channel));
    if(!right.statements)return`(ff_bool(${left}) ${node.operator} ff_bool(${right.expression}))`;
    // A nested lazy select on the RHS must stay inside the short-circuit guard.
    const name=`ff_logic_${this.nextTemporary++}`;
    this.statements.push(`var ${name}:bool = ff_bool(${left});\nif (${node.operator==='&&'?name:`!${name}`}) {\n${right.statements}\n${name} = ff_bool(${right.expression});\n}`);
    return name;
  }
  number(value){value=Number(value);if(!Number.isFinite(value))throw new WGSLCompileError('WGSL constants must be finite');const rounded=Math.fround(value);if(!Number.isFinite(rounded))throw new WGSLCompileError(`WGSL constant ${value} is outside f32 range`);if(value!==0&&rounded===0)throw new WGSLCompileError(`WGSL constant ${value} underflows f32`);const raw=String(value);return/[.eE]/.test(raw)?raw:`${raw}.0`}
  bool(node,channel){
    if(node.op==='binary'&&['<','<=','>','>=','==','!='].includes(node.operator))return`(${this.value(node.left,channel)} ${node.operator} ${this.value(node.right,channel)})`;
    if(node.op==='binary'&&(node.operator==='&&'||node.operator==='||'))return this.logicalValue(node,channel);
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
    const shared=this.sharedFields.get(this.fieldNodes.get(node)?.id);if(shared)return shared;
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
      case'select':return this.selectValue(node,channel);
      case'call':if(node.fn==='angle'||node.fn==='c2d')return new AngleSignLowering(this,channel).angle(node).v;return this.call(node.fn,node.args.map(arg=>this.value(arg,channel)),channel);
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
      case'mandelbrot':return`ff_mandelbrot(${A(0)}, ${A(1)}, ${A(2)})`;
      case'julia':return`ff_julia(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'wrap':case'repeat':return`ff_wrap(${A(0)}, ${A(1)})`;case'mirror':case'mirrorRepeat':return`ff_mirror(${A(0)}, ${A(1)})`;
      case'gradient3':return`ff_gradient3(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)})`;case'gradient4':return`ff_gradient4(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'linearGrad':return`ff_linear_grad(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'radialGrad':return`ff_radial_grad(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'angularGrad':this.usesAngularGrad=true;return`ff_angular_grad(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'checker':return`ff_checker(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)})`;
      case'brick':return`ff_brick(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'line':return`ff_line(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)}, ${A(7)})`;
      case'circle':return`ff_circle(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'ring':return`ff_ring(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)})`;
      case'box':return`ff_box(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)}, ${A(7)})`;
      case'triangle':return`ff_triangle(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)}, ${A(7)}, ${A(8)})`;
      case'grid':return`ff_grid(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)})`;
      case'sierpinski':return`ff_sierpinski(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)})`;
      case'sdfLine':return`ff_line_distance(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)})`;
      case'sdfCircle':return`ff_circle_distance(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)})`;
      case'sdfBox':return`ff_box_distance(${A(0)}, ${A(1)}, ${A(2)}, ${A(3)}, ${A(4)}, ${A(5)}, ${A(6)})`;
      case'sdfUnion':return`min(${A(0)}, ${A(1)})`;case'sdfIntersect':return`max(${A(0)}, ${A(1)})`;case'sdfSubtract':return`max(${A(0)}, -(${A(1)}))`;
      case'sdfSmoothUnion':return`ff_sdf_smooth_union(${A(0)}, ${A(1)}, ${A(2)})`;
      case'sdfFill':return`ff_shape_mask(${A(0)}, ${a.length>1?A(1):'0.0'})`;
      case'sdfOutline':return`ff_sdf_outline(${A(0)}, ${A(1)}, ${a.length>2?A(2):'0.0'})`;
      case'multiply':case'screen':case'overlay':case'softLight':case'difference':return`ff_blend_${name}(${A(0)}, ${A(1)}, ${a.length>2?A(2):'255.0'})`;
    }
    throw new WGSLCompileError(`Function ${name}() is not implemented in WGSL`,[`${name}()`]);
  }
  shader(expr){return String.raw`
const FF_TAU : f32 = 6.283185307179586;
const FF_PI : f32 = 3.141592653589793;
const FF_MAX_FRACTAL_ITERATIONS : i32 = ${MAX_FRACTAL_ITERATIONS};
struct Params { width:u32, height:u32, startRow:u32, rowCount:u32, controls:array<f32,${WEBGPU_CONTROL_SLOT_COUNT}>, };
@group(0) @binding(0) var<storage,read> srcPixels:array<u32>;
@group(0) @binding(1) var<storage,read_write> outPixels:array<u32>;
@group(0) @binding(2) var<storage,read> params:Params;
fn ff_bool(v:f32)->bool{return v!=0.0;}
fn ff_num(v:bool)->f32{return select(0.0,1.0,v);}
fn ff_negative_zero()->f32{return bitcast<f32>(0x80000000u);}
fn ff_round(v:f32)->f32{let rounded=floor(v+0.5);if(rounded==0.0&&(bitcast<u32>(v)&0x80000000u)!=0u){return ff_negative_zero();}return rounded;}
fn ff_atan2(y:f32,x:f32)->f32{if(y==0.0&&x==0.0){let yNegative=(bitcast<u32>(y)&0x80000000u)!=0u;let xNegative=(bitcast<u32>(x)&0x80000000u)!=0u;if(xNegative){return select(FF_PI,-FF_PI,yNegative);}return select(0.0,ff_negative_zero(),yNegative);}return atan2(y,x);}
${this.usesSemanticAngle?SEMANTIC_ANGLE_WGSL:''}
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
fn ff_fractal_escape(zx0:f32,zy0:f32,cx:f32,cy:f32,iterations0:f32)->f32{let limit=clamp(i32(trunc(iterations0)),1,FF_MAX_FRACTAL_ITERATIONS);var zx=zx0;var zy=zy0;for(var iteration:i32=0;iteration<FF_MAX_FRACTAL_ITERATIONS;iteration=iteration+1){if(iteration>=limit){break;}let nextY=2.0*zx*zy+cy;let nextX=zx*zx-zy*zy+cx;zx=nextX;zy=nextY;if(zx*zx+zy*zy>4.0){return f32(iteration)/f32(limit);}}return 1.0;}
fn ff_mandelbrot(cx:f32,cy:f32,iterations:f32)->f32{return ff_fractal_escape(0.0,0.0,cx,cy,iterations);}
fn ff_julia(x:f32,y:f32,cx:f32,cy:f32,iterations:f32)->f32{return ff_fractal_escape(x,y,cx,cy,iterations);}
fn ff_linear_grad(x:f32,y:f32,x0:f32,y0:f32,x1:f32,y1:f32)->f32{let dx=x1-x0;let dy=y1-y0;let den=dx*dx+dy*dy;if(den==0.0){return 0.0;}return clamp(((x-x0)*dx+(y-y0)*dy)/den,0.0,1.0);}
fn ff_radial_grad(x:f32,y:f32,cx:f32,cy:f32,r:f32)->f32{return clamp(1.0-length(vec2<f32>(x-cx,y-cy))/max(0.000001,abs(r)),0.0,1.0);}
${this.usesAngularGrad?String.raw`// Exact rays use binary turn fractions before the wrap discontinuity.
// Keep the existing origin and non-exact atan2 paths; never snap nearby rays.
fn ff_angular_turn(y:f32,x:f32)->f32{
  if(x==0.0&&y==0.0){return ff_atan2(y,x)/FF_TAU;}
  if(y==0.0){return select(0.0,0.5,x<0.0);}
  if(x==0.0){return select(0.25,-0.25,y<0.0);}
  if(abs(x)==abs(y)){let magnitude=select(0.125,0.375,x<0.0);return select(magnitude,-magnitude,y<0.0);}
  return ff_atan2(y,x)/FF_TAU;
}
`:''}fn ff_angular_grad(x:f32,y:f32,cx:f32,cy:f32,offset0:f32)->f32{let offset=select(offset0/1024.0,offset0,abs(offset0)<=1.0);return ff_wrap(${this.usesAngularGrad?'ff_angular_turn(y-cy,x-cx)':'ff_atan2(y-cy,x-cx)/FF_TAU'}+offset,1.0);}
fn ff_checker(x:f32,y:f32,width0:f32,height0:f32)->f32{let width=max(1.0,abs(width0));let height=max(1.0,abs(height0));let parity=(i32(floor(x/width))+i32(floor(y/height)))&1;return select(0.0,1.0,parity!=0);}
fn ff_brick(x:f32,y:f32,width0:f32,height0:f32,mortar0:f32,offset0:f32)->f32{let width=max(1.0,abs(width0));let height=max(1.0,abs(height0));let mortar=clamp(abs(mortar0),0.0,min(width,height)*0.5);let row=i32(floor(y/height));let stagger=select(0.0,1.0,(row&1)!=0);let offset=select(offset0,offset0*width,abs(offset0)<=1.0);let localX=ff_wrap(x+offset*stagger,width);let localY=ff_wrap(y,height);return select(0.0,1.0,localX>=mortar&&localX<=width-mortar&&localY>=mortar&&localY<=height-mortar);}
fn ff_shape_mask(distance:f32,feather0:f32)->f32{let feather=max(0.0,abs(feather0));if(distance<=0.0){return 1.0;}if(feather==0.0){return 0.0;}return 1.0-ff_smoothstep(0.0,feather,distance);}
fn ff_segment_distance(p:vec2<f32>,a:vec2<f32>,b:vec2<f32>)->f32{let delta=b-a;let den=dot(delta,delta);if(den<=0.000000000001){return length(p-a);}let t=clamp(dot(p-a,delta)/den,0.0,1.0);return length(p-(a+delta*t));}
fn ff_line_distance(x:f32,y:f32,ax:f32,ay:f32,bx:f32,by:f32,width:f32)->f32{return ff_segment_distance(vec2<f32>(x,y),vec2<f32>(ax,ay),vec2<f32>(bx,by))-abs(width)*0.5;}
fn ff_circle_distance(x:f32,y:f32,cx:f32,cy:f32,radius:f32)->f32{return length(vec2<f32>(x-cx,y-cy))-abs(radius);}
fn ff_box_distance(x:f32,y:f32,cx:f32,cy:f32,width:f32,height:f32,rotation:f32)->f32{let angle=rotation*FF_TAU/1024.0;let co=cos(angle);let si=sin(angle);let delta=vec2<f32>(x-cx,y-cy);let q=abs(vec2<f32>(co*delta.x+si*delta.y,-si*delta.x+co*delta.y))-vec2<f32>(abs(width),abs(height))*0.5;return length(max(q,vec2<f32>(0.0)))+min(max(q.x,q.y),0.0);}
fn ff_sdf_smooth_union(a:f32,b:f32,radius0:f32)->f32{let radius=abs(radius0);if(radius==0.0){return min(a,b);}let h=clamp(0.5+0.5*(b-a)/radius,0.0,1.0);return mix(b,a,h)-radius*h*(1.0-h);}
fn ff_sdf_outline(distance:f32,width:f32,feather:f32)->f32{return ff_shape_mask(abs(distance)-abs(width)*0.5,feather);}
fn ff_line(x:f32,y:f32,ax:f32,ay:f32,bx:f32,by:f32,width:f32,feather:f32)->f32{return ff_shape_mask(ff_line_distance(x,y,ax,ay,bx,by,width),feather);}
fn ff_circle(x:f32,y:f32,cx:f32,cy:f32,radius:f32,feather:f32)->f32{return ff_shape_mask(ff_circle_distance(x,y,cx,cy,radius),feather);}
fn ff_ring(x:f32,y:f32,cx:f32,cy:f32,radius:f32,width:f32,feather:f32)->f32{return ff_shape_mask(abs(length(vec2<f32>(x-cx,y-cy))-abs(radius))-abs(width)*0.5,feather);}
fn ff_box(x:f32,y:f32,cx:f32,cy:f32,width:f32,height:f32,rotation:f32,feather:f32)->f32{return ff_shape_mask(ff_box_distance(x,y,cx,cy,width,height,rotation),feather);}
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
  ${this.statements.join('\n')}
  outPixels[index]=ff_pack(vec4<f32>(${expr[0]},${expr[1]},${expr[2]},${expr[3]}));
}`}
}


/* src/renderers/renderer-backend.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
class RenderCancelledError extends Error{constructor(message='Render cancelled'){super(message);this.name='RenderCancelledError'}}
class RendererBackend{
  constructor(id,label){this.id=id;this.label=label}
  setSource(){throw new Error(`${this.label} does not implement setSource()`)}
  render(){throw new Error(`${this.label} does not implement render()`)}
  cancel(){return Promise.resolve(false)}
  dispose(){}
}


/* src/renderers/ir-numeric-bounds.js */
/** Conservative float-mode bounds for CPU budgeting, not IR capability metadata. */
function numericBounds(node,depth=0){
  if(!node||depth>128)return null;
  const bounds=child=>numericBounds(child,depth+1);
  const range=(lo,hi)=>Number.isNaN(lo)||Number.isNaN(hi)?null:{lo,hi};
  if(node.op==='const')return Number.isFinite(node.value)?range(node.value,node.value):null;
  if(node.op==='unary'){
    const a=bounds(node.input);if(!a)return null;
    if(node.operator==='+')return a;
    if(node.operator==='-')return range(-a.hi,-a.lo);
  }
  if(node.op==='select'){
    const a=bounds(node.whenTrue),b=bounds(node.whenFalse);
    return a&&b?range(Math.min(a.lo,b.lo),Math.max(a.hi,b.hi)):null;
  }
  if(node.op!=='call'||!Array.isArray(node.args))return null;
  const args=node.args;
  if(node.fn==='ctl')return range(0,255);
  if(node.fn==='val'){
    const a=bounds(args[1]),b=bounds(args[2]);
    if(!a||!b||a.lo!==a.hi||b.lo!==b.hi)return null;
    // Match the evaluator's operation order, including endpoint roundoff.
    const delta=b.hi-a.lo,end=255*delta/255+a.lo;
    if(!Number.isFinite(delta)||!Number.isFinite(end))return null;
    return range(Math.min(a.lo,end),Math.max(a.lo,end));
  }
  // Unknown values can include NaN. NaN propagates through these calls and
  // becomes one iteration in the worker; the finite/infinite cases bound work.
  const unknown={lo:-Infinity,hi:Infinity};
  const a=bounds(args[0])||unknown,b=bounds(args[1])||unknown;
  if(node.fn==='min')return range(Math.min(a.lo,b.lo),Math.min(a.hi,b.hi));
  if(node.fn==='max')return range(Math.max(a.lo,b.lo),Math.max(a.hi,b.hi));
  if(node.fn==='clamp'){
    const c=bounds(args[2])||unknown;
    // CPU clamp is max(lower,min(upper,value)), even for reversed bounds.
    return range(Math.max(b.lo,Math.min(c.lo,a.lo)),Math.max(b.hi,Math.min(c.hi,a.hi)));
  }
  return null;
}


/* src/renderers/cpu-renderer.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */




const MAX_CPU_RENDER_WORK=3_000_000_000;
const CPU_CALL_WEIGHTS=Object.freeze({src:2,src0:2,src1:2,srcWrap:2,srcMirror:2,srcLinear:5,rad:3,rad0:3,rad1:3,cnv:10,cnv0:10,cnv1:10,hash2:4,valueNoise:12,perlin:20,worleyF1:30,worleyF2:30,fbm:240,turbulence:240,ridged:240,periodicNoise:12,mandelbrot:MAX_FRACTAL_ITERATIONS,julia:MAX_FRACTAL_ITERATIONS,sierpinski:12});

class RenderBudgetError extends Error{constructor(message){super(message);this.name='RenderBudgetError'}}

function estimateCpuProgramCost(program){
  if(!Array.isArray(program?.outputs)||program.outputs.length!==4)return Infinity;
  const costs=new Map(),stack=program.outputs.map(output=>({node:output?.expression,visited:false}));
  while(stack.length){
    const {node,visited}=stack.pop();if(!node||typeof node!=='object')return Infinity;
    let children;
    switch(node.op){case'const':case'var':children=[];break;case'unary':children=[node.input];break;case'binary':children=[node.left,node.right];break;case'select':children=[node.condition,node.whenTrue,node.whenFalse];break;case'call':if(!Array.isArray(node.args))return Infinity;children=node.args;break;default:return Infinity}
    if(!visited){stack.push({node,visited:true},...children.map(child=>({node:child,visited:false})));continue}
    let weight=node.op==='call'?(CPU_CALL_WEIGHTS[node.fn]||1):1;
    if(node.op==='call'&&(node.fn==='mandelbrot'||node.fn==='julia')&&program.mathMode==='float'){
      const upper=numericBounds(node.args.at(-1))?.hi;
      // Round to f32 before truncating, exactly as the fractal worker does.
      if(Number.isFinite(upper))weight=Math.max(1,Math.min(MAX_FRACTAL_ITERATIONS,Math.trunc(Math.fround(upper))));
    }
    const nested=node.op==='select'?costs.get(node.condition)+Math.max(costs.get(node.whenTrue),costs.get(node.whenFalse)):children.reduce((sum,child)=>sum+costs.get(child),0);
    costs.set(node,weight+nested);
  }
  return program.outputs.reduce((sum,output)=>sum+costs.get(output.expression),0);
}

function assertCpuRenderBudget(program,width,height){
  const pixels=width*height,cost=estimateCpuProgramCost(program);
  if(!Number.isSafeInteger(pixels)||pixels<1||!Number.isFinite(cost)||cost>MAX_CPU_RENDER_WORK/pixels)throw new RenderBudgetError(`CPU render cost exceeds the ${MAX_CPU_RENDER_WORK.toLocaleString('en-US')} work-unit limit`);
  return cost*pixels;
}

class CpuRenderer extends RendererBackend{
  constructor(programFactory){super('cpu','CPU Worker');this.programFactory=programFactory;this.worker=null;this.workerProgramKey=null;this.source=null;this.width=0;this.height=0;this.pending=new Map();this.readyPromise=Promise.resolve();this.resolveReady=null;this.rejectReady=null}
  spawnWorker(){
    this.worker?.terminate();
    const workerUrl=URL.createObjectURL(new Blob([this.programFactory()],{type:'application/javascript'}));
    const worker=new Worker(workerUrl);this.worker=worker;this.workerProgramKey=null;URL.revokeObjectURL(workerUrl);
    this.readyPromise=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject});
    worker.onmessage=e=>{
      if(this.worker!==worker)return;
      const m=e.data;
      if(m.type==='ready'){this.resolveReady?.();this.resolveReady=this.rejectReady=null;return}
      const job=this.pending.get(m.id);if(!job)return;
      if(m.type==='progress'){job.onProgress?.(m);return}
      if(m.type==='result'){this.pending.delete(m.id);job.resolve({pixels:new Uint8ClampedArray(m.buffer),ms:m.ms,backend:this.id,label:this.label})}
    };
    worker.onerror=e=>this.failWorker(worker,new Error(e.message||`${this.label} failed`));
    worker.onmessageerror=e=>this.failWorker(worker,new Error(e.message||`${this.label} message failed`));
  }
  failWorker(worker,error){if(this.worker!==worker)return;this.worker=null;this.workerProgramKey=null;this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;this.rejectPending(error);worker.terminate();this.readyPromise=Promise.resolve()}
  rejectPending(error){for(const job of this.pending.values())job.reject(error);this.pending.clear()}
  postSource(){
    if(!this.worker||!this.source||!this.width||!this.height)return;
    const copy=this.source.slice();
    this.worker.postMessage({type:'init',width:this.width,height:this.height,buffer:copy.buffer},[copy.buffer]);
  }
  ensureWorker(){if(!this.worker){this.spawnWorker();this.postSource()}return this.readyPromise}
  setSource(pixels,width,height){
    this.source=pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels);this.width=width;this.height=height;
    this.rejectPending(new RenderCancelledError('Source replaced'));
    this.spawnWorker();this.postSource();return this.readyPromise;
  }
  async render({id,program,controls,legacyMath,onProgress}){
    if(!this.source||!this.width||!this.height)throw new Error('Renderer source is not initialized');
    assertCpuRenderBudget(program,this.width,this.height);
    await this.ensureWorker();
    if(!this.worker)throw new Error(`${this.label} is unavailable`);
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject,onProgress});
      try{const key=programCacheKey(program),message={type:'render',id,programKey:key,controls,legacyMath};if(key!==this.workerProgramKey)message.program=program;this.worker.postMessage(message);this.workerProgramKey=key}
      catch(error){this.pending.delete(id);reject(error)}
    });
  }
  async cancel(){
    const hadWork=this.pending.size>0;
    const error=new RenderCancelledError();
    this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;
    this.rejectPending(error);
    this.worker?.terminate();this.worker=null;this.workerProgramKey=null;this.readyPromise=Promise.resolve();
    return hadWork;
  }
  releaseSource(){
    const error=new RenderCancelledError('Source released');
    this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;
    this.rejectPending(error);this.worker?.terminate();this.worker=null;this.workerProgramKey=null;
    this.source=null;this.width=this.height=0;this.readyPromise=Promise.resolve();
  }
  dispose(){
    const error=new RenderCancelledError('Renderer disposed');
    this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;
    this.rejectPending(error);this.worker?.terminate();this.worker=null;this.workerProgramKey=null;
    this.source=null;this.width=this.height=0;
  }
}


/* src/renderers/webgpu-renderer.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */




const MAX_PIPELINES=32,MAX_PIPELINE_CACHE_BYTES=8*1024*1024;
const pipelineEntryBytes=plan=>(String(plan?.key??'').length+String(plan?.code??'').length)*2;
class WebGPUValidationError extends Error{constructor(message){super(message);this.name='WebGPUValidationError'}}

class WebGpuRenderer extends RendererBackend{
  constructor({onCompile=null}={}){super('webgpu','WebGPU');this.onCompile=onCompile;this.adapter=null;this.device=null;this.deviceGeneration=0;this.initPromise=null;this.source=null;this.width=0;this.height=0;this.sourceBuffer=null;this.outputBuffer=null;this.readbackBuffer=null;this.paramsBuffer=null;this.bufferGeneration=0;this.pipelineCache=new Map();this.pipelineCacheBytes=0;this.cancelVersion=0;this.active=false;this.lastShader='';this.operationQueue=Promise.resolve();this.disposed=false}
  static unavailableReason(){if(!globalThis.navigator?.gpu)return globalThis.isSecureContext===false?'WebGPU requires HTTPS or localhost':'WebGPU API unavailable';return''}
  async ensureDevice(){
    if(this.disposed)throw new Error('WebGPU renderer is disposed');
    if(this.device)return this.device;if(this.initPromise)return this.initPromise;
    const reason=WebGpuRenderer.unavailableReason();if(reason)throw new Error(reason);
    const init=(async()=>{const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('No WebGPU adapter was returned');const device=await adapter.requestDevice();if(this.disposed){device.destroy?.();throw new Error('WebGPU renderer is disposed')}this.adapter=adapter;this.device=device;this.deviceGeneration++;device.lost.then(info=>{if(this.device!==device)return;console.warn('WebGPU device lost',info);this.cancelVersion++;this.active=false;this.device=null;this.adapter=null;this.clearPipelineCache();this.destroyBuffers()});device.addEventListener?.('uncapturederror',event=>console.error('WebGPU uncaptured error',event.error));return device})();
    this.initPromise=init;try{return await init}finally{if(this.initPromise===init)this.initPromise=null}
  }
  destroyBuffers(){for(const key of ['sourceBuffer','outputBuffer','readbackBuffer','paramsBuffer']){try{if(key==='readbackBuffer'&&this[key]?.mapState==='mapped')this[key].unmap()}catch{}try{this[key]?.destroy()}catch{}this[key]=null}this.bufferGeneration=0}
  setSource(pixels,width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('WebGPU source dimensions must be positive integers');const count=width*height;if(!Number.isSafeInteger(count)||pixels?.length!==count*4)throw new Error('WebGPU source pixel length does not match its dimensions');const source=pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels),token=++this.cancelVersion;const job=this.operationQueue.then(()=>this.configureSource(source,width,height,token));this.operationQueue=job.catch(()=>{});return job}
  assertGeneration(token,message='WebGPU operation was cancelled'){if(token!==this.cancelVersion)throw new RenderCancelledError(message)}
  async configureSource(pixels,width,height,token){
    this.assertGeneration(token,'Stale WebGPU source upload');this.active=false;this.source=pixels;this.width=width;this.height=height;await this.uploadSource(token);return true;
  }
  async uploadSource(token=this.cancelVersion){
    this.assertGeneration(token,'Stale WebGPU source upload');if(!this.source||!this.width||!this.height)throw new Error('WebGPU source is not initialized');const device=await this.ensureDevice();this.assertGeneration(token,'Stale WebGPU source upload');if(device!==this.device)throw new RenderCancelledError('WebGPU device changed during source upload');this.destroyBuffers();
    const size=Math.max(4,this.width*this.height*4);
    try{this.sourceBuffer=device.createBuffer({label:'Filter FabJS source',size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.outputBuffer=device.createBuffer({label:'Filter FabJS output',size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});this.readbackBuffer=device.createBuffer({label:'Filter FabJS readback',size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});this.paramsBuffer=device.createBuffer({label:'Filter FabJS params',size:WEBGPU_PARAMS_BYTES,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(this.sourceBuffer,0,this.source);this.bufferGeneration=this.deviceGeneration}catch(error){this.destroyBuffers();throw error}
    return device;
  }
  async ensureSourceBuffers(token=this.cancelVersion){this.assertGeneration(token);if(!this.source||!this.width||!this.height)throw new Error('WebGPU source is not initialized');if(this.device&&this.bufferGeneration===this.deviceGeneration&&this.sourceBuffer&&this.outputBuffer&&this.readbackBuffer&&this.paramsBuffer)return this.device;return this.uploadSource(token)}
  releaseSource(){this.cancelVersion++;const job=this.operationQueue.then(()=>{this.active=false;this.destroyBuffers();this.source=null;this.width=this.height=0});this.operationQueue=job.catch(()=>{});return job}
  writeParams(device,paramsBuffer,startRow,rowCount,controls){const data=new ArrayBuffer(WEBGPU_PARAMS_BYTES),view=new DataView(data);view.setUint32(0,this.width,true);view.setUint32(4,this.height,true);view.setUint32(8,startRow,true);view.setUint32(12,rowCount,true);for(let i=0;i<WEBGPU_CONTROL_SLOT_COUNT;i++)view.setFloat32(16+i*4,Number(i<CONTROL_COUNT?controls?.[i]??DEFAULT_CONTROL_VALUE:DEFAULT_CONTROL_VALUE),true);device.queue.writeBuffer(paramsBuffer,0,data)}
  clearPipelineCache(){this.pipelineCache.clear();this.pipelineCacheBytes=0}
  cachedPipeline(key){const entry=this.pipelineCache.get(key);if(!entry)return null;this.pipelineCache.delete(key);this.pipelineCache.set(key,entry);return entry}
  rememberPipeline(plan,pipeline,deviceGeneration=this.deviceGeneration){const prior=this.pipelineCache.get(plan.key);if(prior){this.pipelineCache.delete(plan.key);this.pipelineCacheBytes-=prior.cacheBytes}const cacheBytes=pipelineEntryBytes(plan);if(cacheBytes>MAX_PIPELINE_CACHE_BYTES)return;this.pipelineCache.set(plan.key,{plan,pipeline,deviceGeneration,cacheBytes});this.pipelineCacheBytes+=cacheBytes;while(this.pipelineCache.size>MAX_PIPELINES||this.pipelineCacheBytes>MAX_PIPELINE_CACHE_BYTES){const oldestKey=this.pipelineCache.keys().next().value,oldest=this.pipelineCache.get(oldestKey);this.pipelineCache.delete(oldestKey);this.pipelineCacheBytes-=oldest.cacheBytes}}
  planFor(program,analysis){const key=WGSLCompiler.key(program),entry=this.cachedPipeline(key);return entry?.plan||WGSLCompiler.compile(program,analysis)}
  async pipelineFor(plan){
    const cached=this.cachedPipeline(plan.key);if(cached?.pipeline&&cached.deviceGeneration===this.deviceGeneration&&this.device)return cached.pipeline;const device=await this.ensureDevice(),generation=this.deviceGeneration;device.pushErrorScope('validation');let pipeline,pipelineError=null,validationError=null;
    try{const module=device.createShaderModule({label:'Filter FabJS generated WGSL',code:plan.code});const info=await module.getCompilationInfo?.();const failures=info?.messages?.filter(message=>message.type==='error')||[];if(failures.length)throw new WGSLCompileError(failures.map(message=>`${message.lineNum}:${message.linePos} ${message.message}`).join('\n'));pipeline=device.createComputePipelineAsync?await device.createComputePipelineAsync({label:'Filter FabJS compute pipeline',layout:'auto',compute:{module,entryPoint:'main'}}):device.createComputePipeline({label:'Filter FabJS compute pipeline',layout:'auto',compute:{module,entryPoint:'main'}})}catch(error){pipelineError=error}
    try{validationError=await device.popErrorScope()}catch(error){if(!pipelineError)pipelineError=error}
    if(device!==this.device||generation!==this.deviceGeneration)throw new RenderCancelledError('WebGPU device changed during pipeline creation');if(pipelineError?.name==='WGSLCompileError')throw pipelineError;if(validationError)throw new WebGPUValidationError(validationError.message);if(pipelineError)throw pipelineError;this.rememberPipeline(plan,pipeline,generation);return pipeline;
  }
  render(args){const token=this.cancelVersion,job=this.operationQueue.then(()=>this.performRender(args,token));this.operationQueue=job.catch(()=>{});return job}
  async performRender({program,controls,onProgress,webgpuAnalysis},token){
    this.assertGeneration(token);if(!this.source||!this.width||!this.height)throw new Error('WebGPU source is not initialized');const start=performance.now();this.active=true;
    try{
      const plan=this.planFor(program,webgpuAnalysis);this.lastShader=plan.code;this.onCompile?.({wgsl:plan.code,analysis:plan.analysis});const device=await this.ensureSourceBuffers(token);if(token!==this.cancelVersion||device!==this.device)throw new RenderCancelledError();const pipeline=await this.pipelineFor(plan);if(token!==this.cancelVersion||device!==this.device)throw new RenderCancelledError();
      const sourceBuffer=this.sourceBuffer,outputBuffer=this.outputBuffer,readbackBuffer=this.readbackBuffer,paramsBuffer=this.paramsBuffer;if(!sourceBuffer||!outputBuffer||!readbackBuffer||!paramsBuffer)throw new Error('WebGPU source buffers were lost before dispatch');if(readbackBuffer.mapState==='mapped')readbackBuffer.unmap();this.writeParams(device,paramsBuffer,0,this.height,controls);
      const bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:sourceBuffer}},{binding:1,resource:{buffer:outputBuffer}},{binding:2,resource:{buffer:paramsBuffer}}]}),encoder=device.createCommandEncoder({label:'Filter FabJS GPU frame'}),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8));pass.end();encoder.copyBufferToBuffer(outputBuffer,0,readbackBuffer,0,this.width*this.height*4);device.queue.submit([encoder.finish()]);
      try{await readbackBuffer.mapAsync(GPUMapMode.READ,0,this.width*this.height*4)}catch(error){if(token!==this.cancelVersion||device!==this.device)throw new RenderCancelledError();throw error}if(token!==this.cancelVersion||device!==this.device){try{if(readbackBuffer.mapState==='mapped')readbackBuffer.unmap()}catch{}throw new RenderCancelledError()}let raw;try{raw=readbackBuffer.getMappedRange(0,this.width*this.height*4).slice(0)}finally{if(readbackBuffer.mapState==='mapped')readbackBuffer.unmap()}onProgress?.({row:this.height,total:this.height,pct:100});return{pixels:new Uint8ClampedArray(raw),ms:performance.now()-start,backend:this.id,label:this.label};
    }finally{this.active=false}
  }
  async cancel(){const hadWork=this.active;this.cancelVersion++;if(hadWork){const device=this.device;this.device=null;this.adapter=null;this.clearPipelineCache();this.destroyBuffers();try{device?.destroy?.()}catch{}}return hadWork}
  dispose(){this.disposed=true;this.cancelVersion++;this.active=false;this.destroyBuffers();this.clearPipelineCache();const device=this.device;this.device=null;this.adapter=null;this.source=null;this.width=this.height=0;try{device?.destroy?.()}catch{}}
}


/* src/renderers/renderer-manager.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */



const MAX_ANALYSES=64,MAX_GPU_FAILURES=64,MAX_ANALYSIS_CACHE_BYTES=2*1024*1024,MAX_GPU_FAILURE_CACHE_BYTES=2*1024*1024;
const textBytes=value=>String(value??'').length*2;
const analysisEntryBytes=(key,analysis)=>textBytes(key)+textBytes(analysis?.subset)+(analysis?.blockers||[]).reduce((total,blocker)=>total+textBytes(blocker),0);
const gpuFailureEntryBytes=(key,failure)=>textBytes(key)+textBytes(failure?.reason);

class RendererManager{
  constructor(factories){this.factories=factories;this.instances=new Map();this.instanceVersions=new Map();this.syncPromises=new Map();this.source=null;this.width=0;this.height=0;this.sourceVersion=0;this.active=null;this.analysisCache=new Map();this.analysisCacheBytes=0;this.gpuFailures=new Map();this.gpuFailureCacheBytes=0}
  setSource(pixels,width,height){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('Renderer source dimensions must be positive integers');
    const count=width*height;if(!Number.isSafeInteger(count)||pixels?.length!==count*4)throw new Error('Renderer source pixel length does not match its dimensions');
    const releases=[];
    for(const [id,renderer] of this.instances){
      this.instanceVersions.delete(id);
      try{const release=typeof renderer.releaseSource==='function'?renderer.releaseSource():renderer.cancel?.();if(release)releases.push(Promise.resolve(release).catch(error=>console.warn(`${renderer.label||id} source release failed`,error)))}catch(error){console.warn(`${renderer.label||id} source release failed`,error)}
    }
    this.active=null;this.source=pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels);this.width=width;this.height=height;this.sourceVersion++;
    return Promise.all(releases).then(()=>undefined);
  }
  async syncSource(id,renderer){const source=this.source,width=this.width,height=this.height,version=this.sourceVersion;await renderer.setSource(source,width,height);if(version===this.sourceVersion)this.instanceVersions.set(id,version)}
  async get(id){let renderer=this.instances.get(id);if(!renderer){const factory=this.factories[id];if(!factory)throw new Error(`Unknown renderer backend “${id}”`);renderer=factory();this.instances.set(id,renderer)}while(this.source&&this.instanceVersions.get(id)!==this.sourceVersion){let sync=this.syncPromises.get(id);if(!sync){sync={version:this.sourceVersion,promise:this.syncSource(id,renderer)};this.syncPromises.set(id,sync)}try{await sync.promise}catch(error){if(sync.version===this.sourceVersion)throw error}finally{if(this.syncPromises.get(id)===sync)this.syncPromises.delete(id)}}return renderer}
  programKey(program){return WGSLCompiler.key(program)}
  analyze(program){const key=this.programKey(program),cached=this.analysisCache.get(key);if(cached){this.analysisCache.delete(key);this.analysisCache.set(key,cached);return cached}const analysis=WGSLCompiler.analyze(program),bytes=analysisEntryBytes(key,analysis);if(bytes<=MAX_ANALYSIS_CACHE_BYTES){this.analysisCache.set(key,analysis);this.analysisCacheBytes+=bytes;while(this.analysisCache.size>MAX_ANALYSES||this.analysisCacheBytes>MAX_ANALYSIS_CACHE_BYTES){const oldestKey=this.analysisCache.keys().next().value,oldest=this.analysisCache.get(oldestKey);this.analysisCache.delete(oldestKey);this.analysisCacheBytes-=analysisEntryBytes(oldestKey,oldest)}}return analysis}
  diagnose(program,preference='auto'){
    const analysis=this.analyze(program),gpuReason=!analysis.compatible?`GPU subset: ${analysis.blockers.slice(0,3).join(', ')}`:WebGpuRenderer.unavailableReason()||this.gpuFailure(program),gpuEligible=!gpuReason,forcedCpu=preference==='cpu';
    return{analysis,preference,rendererId:forcedCpu||!gpuEligible?'cpu':'webgpu',mode:forcedCpu?'cpu-selected':gpuEligible?'gpu-eligible':'cpu-fallback',gpuCompatible:analysis.compatible,gpuEligible,gpuReason,operationCount:Number(program?.metadata?.nodeCount)||0,passes:1};
  }
  gpuFailure(program){
    const key=this.programKey(program),failure=this.gpuFailures.get(key),renderer=this.instances.get('webgpu');
    if(!failure)return'';
    if(!renderer?.device||renderer.deviceGeneration!==failure.deviceGeneration){this.gpuFailures.delete(key);this.gpuFailureCacheBytes-=gpuFailureEntryBytes(key,failure);return''}
    return failure.reason;
  }
  rememberGpuFailure(program,renderer,error){
    const message=error?.message||'WebGPU render failed',persistent=error?.name==='WGSLCompileError'||(error?.name==='WebGPUValidationError'&&!/(?:device\s+(?:is\s+)?lost|destroyed|out\s+of\s+memory|internal)/i.test(message));
    if(!persistent)return;
    const key=this.programKey(program),prior=this.gpuFailures.get(key);if(prior){this.gpuFailures.delete(key);this.gpuFailureCacheBytes-=gpuFailureEntryBytes(key,prior)}const failure={deviceGeneration:renderer?.deviceGeneration??0,reason:`GPU error: ${message}`},bytes=gpuFailureEntryBytes(key,failure);if(bytes>MAX_GPU_FAILURE_CACHE_BYTES)return;this.gpuFailures.set(key,failure);this.gpuFailureCacheBytes+=bytes;
    while(this.gpuFailures.size>MAX_GPU_FAILURES||this.gpuFailureCacheBytes>MAX_GPU_FAILURE_CACHE_BYTES){const oldestKey=this.gpuFailures.keys().next().value,oldest=this.gpuFailures.get(oldestKey);this.gpuFailures.delete(oldestKey);this.gpuFailureCacheBytes-=gpuFailureEntryBytes(oldestKey,oldest)}
  }
  assertCurrent(isCurrent){if(typeof isCurrent==='function'&&!isCurrent())throw new RenderCancelledError()}
  throwIfCancelled(error,isCurrent){if(error?.name==='RenderCancelledError')throw error;this.assertCurrent(isCurrent)}
  progressHandler(onProgress,isCurrent){return message=>{if(typeof isCurrent==='function'&&!isCurrent())return;onProgress?.(message)}}
  async select(program,preference='auto',isCurrent){
    const diagnostic=this.diagnose(program,preference),analysis=diagnostic.analysis;
    if(preference==='cpu'){const renderer=await this.get('cpu');this.assertCurrent(isCurrent);this.active=renderer;return{renderer,analysis,fallbackReason:''}}
    let reason=diagnostic.gpuReason;
    if(!reason){try{const renderer=await this.get('webgpu');this.assertCurrent(isCurrent);this.active=renderer;return{renderer,analysis,fallbackReason:''}}catch(error){this.throwIfCancelled(error,isCurrent);console.warn('WebGPU initialization failed; using CPU',error);reason=error.message||'WebGPU initialization failed'}}
    const renderer=await this.get('cpu');this.assertCurrent(isCurrent);this.active=renderer;return{renderer,analysis,fallbackReason:reason};
  }
  async renderWithFallback({program,preference='auto',id,controls,legacyMath,onProgress,onSelection,isCurrent}){
    let selection;
    try{selection=await this.select(program,preference,isCurrent)}catch(error){this.throwIfCancelled(error,isCurrent);throw error}
    this.assertCurrent(isCurrent);onSelection?.(selection,{runtimeFallback:false,gpuError:null});
    const args={id,program,controls,legacyMath,webgpuAnalysis:selection.analysis,onProgress:this.progressHandler(onProgress,isCurrent)};
    try{
      const result=await selection.renderer.render(args);this.assertCurrent(isCurrent);return{...selection,result,gpuError:null,runtimeFallback:false};
    }catch(gpuError){
      this.throwIfCancelled(gpuError,isCurrent);
      if(selection.renderer.id!=='webgpu')throw gpuError;
      console.error('WebGPU render failed; retrying on CPU',gpuError);this.rememberGpuFailure(program,selection.renderer,gpuError);
      let cpu;
      try{cpu=await this.get('cpu');this.assertCurrent(isCurrent)}catch(cpuInitError){this.throwIfCancelled(cpuInitError,isCurrent);throw this.fallbackError(gpuError,cpuInitError)}
      this.active=cpu;selection={renderer:cpu,analysis:selection.analysis,fallbackReason:`GPU error: ${gpuError.message||'WebGPU render failed'}`};onSelection?.(selection,{runtimeFallback:true,gpuError});
      try{const result=await cpu.render({...args,onProgress:this.progressHandler(onProgress,isCurrent)});this.assertCurrent(isCurrent);return{...selection,result,gpuError,runtimeFallback:true}}
      catch(cpuError){this.throwIfCancelled(cpuError,isCurrent);throw this.fallbackError(gpuError,cpuError)}
    }
  }
  fallbackError(gpuError,cpuError){const error=new Error(`GPU: ${gpuError.message}; CPU: ${cpuError.message}`);error.name='RendererFallbackError';error.gpuError=gpuError;error.cpuError=cpuError;return error}
  async cancelActive(){return this.active?.cancel?.()??false}
  dispose(){for(const renderer of this.instances.values())renderer.dispose();this.instances.clear();this.instanceVersions.clear();this.syncPromises.clear();this.analysisCache.clear();this.analysisCacheBytes=0;this.gpuFailures.clear();this.gpuFailureCacheBytes=0;this.active=null;this.source=null;this.width=this.height=0}
}


/* src/io/filter-format.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */




const FILTER_FILE_MAX_BYTES=256*1024;
const FILTER_TEXT_MAX_LENGTH=256*1024;
const FILTER_DESCRIPTION_MAX_LENGTH=2000;
const validatedFormulaAsts=new WeakMap();

function normalizeFilterText(text){return String(text??'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')}
function assertFilterTextSize(text){if(String(text??'').length>FILTER_TEXT_MAX_LENGTH)throw new Error(`Filter file exceeds the ${FILTER_FILE_MAX_BYTES/1024} KiB limit`)}
function boundedString(value,name,maxLength,fallback=''){
  if(value===undefined||value===null)return fallback;
  if(typeof value!=='string')throw new Error(`Native filter ${name} must be a string`);
  const result=value.trim();if(result.length>maxLength)throw new Error(`Native filter ${name} exceeds ${maxLength} characters`);return result||fallback;
}
function validatedFormulas(formulas,label='Native filter'){
  if(!Array.isArray(formulas)||formulas.length!==4)throw new Error(`${label} must contain exactly four channel formulas`);
  const asts=[];
  const normalized=formulas.map((formula,index)=>{
    if(typeof formula!=='string'||!formula.trim())throw new Error(`${label} channel ${index+1} must be a non-empty formula string`);
    const normalized=formula.trim();if(normalized.length>FORMULA_LIMITS.maxLength)throw new Error(`${label} channel ${index+1} exceeds the ${FORMULA_LIMITS.maxLength}-character formula limit`);
    try{asts.push(new Parser(normalized).parse())}catch(error){throw new Error(`${label} channel ${index+1}: ${error.message}`)}
    return normalized;
  });
  return{normalized,asts};
}
function getValidatedFormulaAsts(filter){return validatedFormulaAsts.get(filter)||null}
function controlValue(value,index){if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Native filter control ${index+1} must be a finite number`);return clamp(value,0,255)}
function controlLabel(value,index){if(value===undefined||value===null||value==='')return`Control ${index+1}`;if(typeof value!=='string')throw new Error(`Native filter control ${index+1} label must be a string`);const label=value.trim();if(label.length>80)throw new Error(`Native filter control ${index+1} label exceeds 80 characters`);return label||`Control ${index+1}`}
function normalizeNativeControls(data){
  if(data.controls!==undefined){
    if(!Array.isArray(data.controls)||data.controls.length>CONTROL_COUNT)throw new Error(`Native filter controls must be an array of at most ${CONTROL_COUNT} entries`);
    const controls=data.controls.map((control,index)=>{
      if(typeof control==='number')return{label:`Control ${index+1}`,value:controlValue(control,index),ui:cloneControlUI()};
      if(!control||typeof control!=='object'||Array.isArray(control))throw new Error(`Native filter control ${index+1} must be a number or object`);
      const ui=normalizeControlUI(control.ui),value=ui.widget==='toggle'?(controlValue(control.value,index)<127.5?0:255):controlValue(control.value,index);
      return{label:controlLabel(control.label,index),value,ui};
    });
    while(controls.length<CONTROL_COUNT){const definition=CONTROL_DEFINITIONS[controls.length];controls.push({label:definition.defaultLabel,value:definition.defaultValue,ui:cloneControlUI()});}
    return controls;
  }
  const values=data.values===undefined?[]:data.values,labels=data.labels===undefined?[]:data.labels;
  if(!Array.isArray(values)||values.length>CONTROL_COUNT)throw new Error(`Native filter values must be an array of at most ${CONTROL_COUNT} entries`);
  if(!Array.isArray(labels)||labels.length>CONTROL_COUNT)throw new Error(`Native filter labels must be an array of at most ${CONTROL_COUNT} entries`);
  return CONTROL_DEFINITIONS.map((definition,index)=>({label:controlLabel(labels[index],index),value:index<values.length?controlValue(values[index],index):definition.defaultValue,ui:cloneControlUI()}));
}
function validateNativeFilter(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Native filter JSON must contain an object');
  if(data.format!=='filter-fab-js')throw new Error('Native filter format must be “filter-fab-js”');
  if(!Number.isInteger(data.version)||![1,2].includes(data.version))throw new Error('Native filter version must be 1 or 2');
  if(data.mathMode!==undefined&&!['float','legacy'].includes(data.mathMode))throw new Error('Native filter mathMode must be “float” or “legacy”');
  const formulas=validatedFormulas(Array.isArray(data.formulas)?data.formulas:data.f);
  const result={format:'filter-fab-js',version:data.version,...(data.id===undefined?{}:{id:validatePortableId(data.id)}),tags:normalizeTags(data.tags),mathMode:data.mathMode??(data.version===1?'legacy':'float'),name:boundedString(data.name,'name',120,'Untitled Filter'),description:boundedString(data.description,'description',FILTER_DESCRIPTION_MAX_LENGTH),author:boundedString(data.author,'author',120),formulas:formulas.normalized,controls:normalizeNativeControls(data)};
  validatedFormulaAsts.set(result,formulas.asts);return result;
}
function cleanAFSFormula(group){
  let formula='',continued=false;
  for(const rawLine of group.split('\n')){
    const lineContinues=/\\(?:r|n)/i.test(rawLine),line=rawLine.replace(/\\(?:r|n)/gi,'').trim();
    if(!line)continue;
    formula+=(formula?(continued?' ':'\n'):'')+line;continued=lineContinues;
  }
  return formula.trim();
}
function splitAFSFormulaGroups(body){
  const separated=body.split(/\n[ \t]*\n+/).map(cleanAFSFormula).filter(Boolean);
  if(separated.length>=4)return separated;
  const formulas=[];let current='',depth=0,continued=false;
  for(const rawLine of body.split('\n')){
    const lineContinues=/\\(?:r|n)/i.test(rawLine),line=rawLine.replace(/\\(?:r|n)/gi,'').trim();
    if(!line){if(current.trim()&&depth===0){formulas.push(current.trim());current='';continued=false}continue}
    current+=(current?(continued?' ':'\n'):'')+line;continued=lineContinues;
    for(const ch of line.replace(/\/\/.*$/,'')){if(ch==='(')depth++;else if(ch===')')depth=Math.max(0,depth-1)}
    if(depth===0&&!continued){formulas.push(current.trim());current=''}
  }
  if(current.trim())formulas.push(current.trim());
  return formulas;
}
function parseAFS(text,fileName=''){
  assertFilterTextSize(text);
  const normalized=normalizeFilterText(text),lines=normalized.split('\n'),header=(lines.shift()||'').trim();
  if(!/^%RGB(?:-[0-9]+(?:\.[0-9]+)*)?$/i.test(header))throw new Error('Not a supported RGB AFS file');
  if(lines.length<8)throw new Error('AFS file is missing its eight control values');
  const values=lines.splice(0,8).map((raw,index)=>{
    const token=raw.trim();
    if(!/^[+-]?\d+$/.test(token))throw new Error(`AFS control ${index+1} is not a valid integer`);
    const value=Number(token);
    if(!Number.isSafeInteger(value))throw new Error(`AFS control ${index+1} is not a valid integer`);
    return clamp(value,0,255);
  });
  const f=splitAFSFormulaGroups(lines.join('\n'));
  if(f.length!==4)throw new Error(`AFS file contains ${f.length} channel formula${f.length===1?'':'s'}; expected 4`);
  const formulas=validatedFormulas(f,'AFS filter');
  const base=String(fileName||'').replace(/\.[^.]+$/,'').trim();
  const labels=Array.from({length:8},(_,i)=>`Control ${i+1}`),controls=CONTROL_DEFINITIONS.map((definition,index)=>({label:labels[index]??definition.defaultLabel,value:values[index]??definition.defaultValue,ui:cloneControlUI()}));
  const result={format:'filter-factory-afs',version:header.replace(/^%RGB-?/i,'')||'1.0',name:base||'Imported AFS Filter',description:'',author:'',mathMode:'legacy',values,labels,f:formulas.normalized,controls};
  validatedFormulaAsts.set(result,formulas.asts);return result;
}
function detectFilterFormat(text,fileName=''){
  assertFilterTextSize(text);
  const normalized=normalizeFilterText(text),trimmed=normalized.trimStart(),extension=(fileName.match(/\.([^.]+)$/)?.[1]||'').toLowerCase();
  if(trimmed.startsWith('{')||extension==='json')return{kind:'native',data:validateNativeFilter(JSON.parse(normalized))};
  if(/^%RGB(?:-[0-9]+(?:\.[0-9]+)*)?/i.test(trimmed)||extension==='afs')return{kind:'afs',data:parseAFS(normalized,fileName)};
  throw new Error('Unsupported filter format. Choose a Filter FabJS .json file or a historic .afs file');
}


/* src/io/image-io.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

function imageFromClipboardData(data){
  if(!data)return null;
  for(const item of Array.from(data.items||[])){
    if(item.kind==='file'&&String(item.type||'').startsWith('image/')){
      const file=item.getAsFile();if(file)return file;
    }
  }
  return Array.from(data.files||[]).find(file=>String(file.type||'').startsWith('image/'))||null;
}
function alphaStats(pixels){
  let min=255,max=0,transparent=0,translucent=0,opaque=0;
  for(let i=3;i<pixels.length;i+=4){const value=pixels[i];min=Math.min(min,value);max=Math.max(max,value);if(value===0)transparent++;else if(value===255)opaque++;else translucent++;}
  return{min,max,transparent,translucent,opaque,hasAlpha:min<255,total:Math.floor(pixels.length/4)};
}
function imageDataFromPixels(pixels,width,height){return new ImageData(pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels),width,height);}
function renderedImageCanvas(pixels,width,height){
  if(!pixels||!width||!height)throw new Error('Load and render an image first');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{alpha:true,willReadFrequently:true});if(!context)throw new Error('Canvas export is unavailable');
  context.clearRect(0,0,width,height);context.putImageData(imageDataFromPixels(pixels,width,height),0,0);return canvas;
}
function canvasBlob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The browser could not encode the image')),type));}
function blobDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('The PNG data URL could not be created'));reader.readAsDataURL(blob);});}
async function verifyPngAlpha(blob,expected){
  if(!expected.hasAlpha)return expected;
  const bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d',{alpha:true,willReadFrequently:true});if(!context){bitmap.close?.();throw new Error('PNG alpha verification is unavailable');}
  context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0);bitmap.close?.();
  const actual=alphaStats(context.getImageData(0,0,canvas.width,canvas.height).data);if(!actual.hasAlpha)throw new Error('The browser encoded an opaque PNG even though the rendered image contains transparency');return actual;
}
function clipboardSupports(ClipboardItemCtor,type){if(typeof ClipboardItemCtor.supports!=='function')return type==='image/png'||type==='text/html';try{return ClipboardItemCtor.supports(type)}catch{return false}}
async function writePngClipboard(blob){
  const ClipboardItemCtor=globalThis.ClipboardItem,representations={'image/png':blob};
  if(clipboardSupports(ClipboardItemCtor,'web image/png'))representations['web image/png']=blob;
  if(blob.size<=16*1024*1024&&clipboardSupports(ClipboardItemCtor,'text/html')){const dataURL=await blobDataURL(blob);representations['text/html']=new Blob([`<img src="${dataURL}" alt="">`],{type:'text/html'});}
  try{await navigator.clipboard.write([new ClipboardItemCtor(representations)]);return Object.keys(representations)}catch(error){if(Object.keys(representations).length===1)throw error;await navigator.clipboard.write([new ClipboardItemCtor({'image/png':blob})]);return['image/png'];}
}


/* src/app/filter-thumbnail-service.js */

const THUMBNAIL_MAX_DIMENSION=160;
const THUMBNAIL_CACHE_LIMIT=48;
const THUMBNAIL_CONCURRENCY=1;

function thumbnailDimensions(width,height,maxDimension=THUMBNAIL_MAX_DIMENSION){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('Thumbnail source dimensions must be positive integers');
  if(!Number.isInteger(maxDimension)||maxDimension<1)throw new Error('Thumbnail maximum dimension must be a positive integer');
  const scale=Math.min(1,maxDimension/Math.max(width,height));
  return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

function prepareThumbnailSource(pixels,width,height,{maxDimension=THUMBNAIL_MAX_DIMENSION}={}){
  const dimensions=thumbnailDimensions(width,height,maxDimension),count=width*height;
  if(!Number.isSafeInteger(count)||pixels?.length!==count*4)throw new Error('Thumbnail source pixel length does not match its dimensions');
  const sourcePixels=pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels);
  if(dimensions.width===width&&dimensions.height===height)return{pixels:sourcePixels.slice(),...dimensions};
  if(!globalThis.document?.createElement)throw new Error('Canvas thumbnail preparation is unavailable');
  const sourceCanvas=document.createElement('canvas'),targetCanvas=document.createElement('canvas');sourceCanvas.width=width;sourceCanvas.height=height;targetCanvas.width=dimensions.width;targetCanvas.height=dimensions.height;
  const sourceContext=sourceCanvas.getContext('2d',{alpha:true,willReadFrequently:true}),targetContext=targetCanvas.getContext('2d',{alpha:true,willReadFrequently:true});
  if(!sourceContext||!targetContext)throw new Error('Canvas thumbnail preparation is unavailable');
  sourceContext.putImageData(imageDataFromPixels(sourcePixels,width,height),0,0);targetContext.imageSmoothingEnabled=true;targetContext.imageSmoothingQuality='high';targetContext.clearRect(0,0,dimensions.width,dimensions.height);targetContext.drawImage(sourceCanvas,0,0,dimensions.width,dimensions.height);
  return{pixels:targetContext.getImageData(0,0,dimensions.width,dimensions.height).data,...dimensions};
}

function cancellation(error){return error?.name==='RenderCancelledError'}

class FilterThumbnailService{
  constructor({rendererManager,prepareSource=prepareThumbnailSource,maxDimension=THUMBNAIL_MAX_DIMENSION,cacheLimit=THUMBNAIL_CACHE_LIMIT,getPreference=()=> 'auto'}={}){
    if(!rendererManager?.setSource||!rendererManager?.renderWithFallback)throw new Error('Thumbnail renderer manager is required');
    if(!Number.isInteger(cacheLimit)||cacheLimit<1)throw new Error('Thumbnail cache limit must be a positive integer');
    this.rendererManager=rendererManager;this.prepareSource=prepareSource;this.maxDimension=maxDimension;this.cacheLimit=cacheLimit;this.getPreference=getPreference;this.cache=new Map();this.queue=[];this.active=null;this.opened=false;this.suspended=false;this.pumping=false;this.sourceRevision=0;this.requestGeneration=0;this.renderId=0;this.sequence=0;this.width=0;this.height=0;this.sourceReady=false;this.sourcePromise=Promise.resolve(false);this.idleWaiters=[];this.stats={hits:0,misses:0,renders:0,failures:0,cancellations:0,invalidations:0};
  }
  cacheKey(signature){return`${this.sourceRevision}\u0000${this.width}x${this.height}\u0000${signature}`}
  notify(job,state){if(job.generation!==this.requestGeneration||job.sourceRevision!==this.sourceRevision)return;for(const callback of job.callbacks){try{callback(state)}catch{}}}
  cached(key){const value=this.cache.get(key);if(!value)return null;this.cache.delete(key);this.cache.set(key,value);return value}
  remember(key,value){this.cache.delete(key);this.cache.set(key,value);while(this.cache.size>this.cacheLimit)this.cache.delete(this.cache.keys().next().value)}
  async cancelManager(){try{return await this.rendererManager.cancelActive()}catch{return false}}
  clearRequests(){
    this.requestGeneration++;this.queue.length=0;
    if(this.active){this.active.discarded=true;this.stats.cancellations++;}
    const cancellationPromise=this.cancelManager();this.resolveIdle();return cancellationPromise;
  }
  async setSource(pixels,width,height){
    const dimensions=thumbnailDimensions(width,height,this.maxDimension),revision=++this.sourceRevision;this.stats.invalidations++;this.sourceReady=false;this.width=dimensions.width;this.height=dimensions.height;this.cache.clear();void this.clearRequests();
    const sourcePromise=(async()=>{
      const prepared=await this.prepareSource(pixels,width,height,{maxDimension:this.maxDimension});
      if(revision!==this.sourceRevision)return false;
      if(prepared?.width!==dimensions.width||prepared?.height!==dimensions.height||prepared?.pixels?.length!==dimensions.width*dimensions.height*4)throw new Error('Prepared thumbnail source is malformed');
      await this.rendererManager.setSource(prepared.pixels,prepared.width,prepared.height);
      if(revision!==this.sourceRevision)return false;this.sourceReady=true;this.pump();return true;
    })();
    this.sourcePromise=sourcePromise;return sourcePromise;
  }
  open(){this.opened=true;this.suspended=false;this.pump()}
  close(){this.opened=false;this.suspended=false;return this.clearRequests()}
  suspend(){if(this.suspended)return;this.suspended=true;if(this.active){this.active.interrupted=true;this.stats.cancellations++;void this.cancelManager();}}
  resume(){if(!this.suspended)return;this.suspended=false;this.pump()}
  request({entryKey='',signature,program,controls,legacyMath=false},callback,{priority=0}={}){
    if(typeof callback!=='function')throw new Error('Thumbnail state callback is required');
    if(typeof signature!=='string'||!signature)throw new Error('Thumbnail render signature is required');
    if(!program)throw new Error('Thumbnail program is required');
    if(this.sourceRevision<1){callback({state:'failed',error:new Error('Thumbnail source is unavailable')});return{cached:false}}
    const key=this.cacheKey(signature),cached=this.cached(key);
    if(cached){this.stats.hits++;callback({state:'ready',...cached,cached:true});return{cached:true,key}}
    this.stats.misses++;
    const duplicate=(this.active?.key===key&&!this.active.discarded?this.active:null)||this.queue.find(job=>job.key===key&&job.generation===this.requestGeneration);
    if(duplicate){duplicate.priority=Math.max(duplicate.priority,priority);if(!duplicate.callbacks.includes(callback))duplicate.callbacks.push(callback);this.queue.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);callback({state:this.active===duplicate?'rendering':'queued'});return{cached:false,key}}
    const job={key,entryKey,signature,program,controls:[...(controls||[])],legacyMath:Boolean(legacyMath),priority:Number(priority)||0,sequence:++this.sequence,generation:this.requestGeneration,sourceRevision:this.sourceRevision,callbacks:[callback],interrupted:false,discarded:false};
    this.queue.push(job);this.queue.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);callback({state:'queued'});this.pump();return{cached:false,key};
  }
  canRun(){return this.opened&&!this.suspended&&this.sourceRevision>0}
  current(job){return this.canRun()&&!job.discarded&&job.generation===this.requestGeneration&&job.sourceRevision===this.sourceRevision&&this.active===job}
  failQueued(error){const jobs=this.queue.splice(0);for(const job of jobs){this.stats.failures++;this.notify(job,{state:'failed',error})}}
  pump(){if(this.pumping||!this.canRun()||!this.queue.length)return;this.pumping=true;queueMicrotask(()=>this.runQueue())}
  async runQueue(){
    try{
      try{await this.sourcePromise}catch(error){this.failQueued(error);return}
      if(!this.sourceReady)return;
      while(this.canRun()&&this.queue.length){
        const job=this.queue.shift();if(job.generation!==this.requestGeneration||job.sourceRevision!==this.sourceRevision)continue;
        this.active=job;job.interrupted=false;this.notify(job,{state:'rendering'});const id=++this.renderId;
        try{
          const outcome=await this.rendererManager.renderWithFallback({id,program:job.program,preference:this.getPreference(),controls:job.controls,legacyMath:job.legacyMath,isCurrent:()=>this.current(job)});
          if(!this.current(job))continue;
          const result=outcome.result,value={pixels:result.pixels,width:this.width,height:this.height,backend:result.backend,ms:result.ms};this.remember(job.key,value);this.stats.renders++;this.notify(job,{state:'ready',...value,cached:false});
        }catch(error){
          const requested=!job.discarded&&job.generation===this.requestGeneration&&job.sourceRevision===this.sourceRevision;
          if(requested&&job.interrupted&&this.opened){job.interrupted=false;this.queue.unshift(job);this.notify(job,{state:'queued'});break;}
          if(requested&&!cancellation(error)){this.stats.failures++;this.notify(job,{state:'failed',error});}
        }finally{if(this.active===job)this.active=null}
      }
    }finally{
      this.pumping=false;this.resolveIdle();if(this.canRun()&&this.queue.length)queueMicrotask(()=>this.pump());
    }
  }
  resolveIdle(){if(this.pumping||this.active||this.queue.length)return;for(const resolve of this.idleWaiters.splice(0))resolve()}
  whenIdle(){if(!this.pumping&&!this.active&&!this.queue.length)return Promise.resolve();return new Promise(resolve=>this.idleWaiters.push(resolve))}
  diagnostics(){return Object.freeze({sourceRevision:this.sourceRevision,width:this.width,height:this.height,queueLength:this.queue.length,cacheSize:this.cache.size,cacheLimit:this.cacheLimit,active:Boolean(this.active),suspended:this.suspended,opened:this.opened,maxConcurrency:THUMBNAIL_CONCURRENCY,...this.stats})}
  dispose(){this.opened=false;this.suspended=false;void this.clearRequests();this.cache.clear();this.rendererManager.dispose();}
}


/* src/io/png-metadata.js */
/**
 * Filter FabJS PNG metadata carrier. This module intentionally has no DOM,
 * renderer, compiler, or application-state dependencies.
 */

const FILTER_FAB_PNG_KEYWORD='FilterFabJS';
const FILTER_FAB_PNG_SCHEMA='filter-fab-js/png';
const FILTER_FAB_PNG_SCHEMA_VERSION=1;
const FILTER_FAB_PNG_DOCUMENT_MAX_BYTES=256*1024;
const FILTER_FAB_PNG_METADATA_MAX_BYTES=FILTER_FAB_PNG_DOCUMENT_MAX_BYTES+4096;
const PNG_PARSE_MAX_BYTES=128*1024*1024;

const PNG_SIGNATURE=Uint8Array.of(137,80,78,71,13,10,26,10);
const textEncoder=new TextEncoder(),textDecoder=new TextDecoder('utf-8',{fatal:true});
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let value=n;for(let bit=0;bit<8;bit++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;table[n]=value>>>0;}return table;})();

class PngMetadataError extends Error{
  constructor(message,code='invalid'){super(message);this.name='PngMetadataError';this.code=code;}
}

function fail(message,code){throw new PngMetadataError(message,code)}
function bytesEqual(bytes,offset,expected){return expected.every((value,index)=>bytes[offset+index]===value)}
function readU32(bytes,offset){return ((bytes[offset]*0x1000000)+((bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3]))>>>0}
function writeU32(bytes,offset,value){bytes[offset]=(value>>>24)&255;bytes[offset+1]=(value>>>16)&255;bytes[offset+2]=(value>>>8)&255;bytes[offset+3]=value&255;}
function concatBytes(parts){const length=parts.reduce((sum,part)=>sum+part.length,0),result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;}
function crc32(parts){let crc=0xffffffff;for(const part of parts)for(const byte of part)crc=crcTable[(crc^byte)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function chunk(type,data){const typeBytes=textEncoder.encode(type),result=new Uint8Array(12+data.length);writeU32(result,0,data.length);result.set(typeBytes,4);result.set(data,8);writeU32(result,8+data.length,crc32([typeBytes,data]));return result;}
function jsonBytes(value,label){let json;try{json=JSON.stringify(value);}catch{fail(`${label} is not serializable`)}if(json===undefined)fail(`${label} is not serializable`);return textEncoder.encode(json);}

function createFilterFabPngEnvelope(document,appVersion){
  if(!document||typeof document!=='object'||Array.isArray(document))fail('PNG filter document must be an object');
  if(document.format!=='filter-fab-js'||document.version!==2)fail('PNG metadata requires a native Filter FabJS version 2 document');
  if(typeof appVersion!=='string'||!appVersion.trim()||appVersion.length>40)fail('PNG generator version is invalid');
  if(jsonBytes(document,'PNG filter document').length>FILTER_FAB_PNG_DOCUMENT_MAX_BYTES)fail('Embedded filter document exceeds the 256 KiB limit','oversized');
  return{schema:FILTER_FAB_PNG_SCHEMA,schemaVersion:FILTER_FAB_PNG_SCHEMA_VERSION,generator:{name:'Filter FabJS',version:appVersion.trim()},documentType:'filter',document};
}

function validateFilterFabPngEnvelope(value){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Filter FabJS PNG metadata must contain an object');
  if(value.schema!==FILTER_FAB_PNG_SCHEMA)fail('Filter FabJS PNG metadata schema is invalid');
  if(value.schemaVersion!==FILTER_FAB_PNG_SCHEMA_VERSION)fail('Unsupported Filter FabJS PNG metadata version','unsupported');
  if(value.documentType!=='filter')fail('Unsupported Filter FabJS PNG document type','unsupported');
  if(!value.generator||typeof value.generator!=='object'||Array.isArray(value.generator)||value.generator.name!=='Filter FabJS'||typeof value.generator.version!=='string'||!value.generator.version.trim()||value.generator.version.length>40)fail('Filter FabJS PNG generator metadata is invalid');
  if(!value.document||typeof value.document!=='object'||Array.isArray(value.document))fail('Filter FabJS PNG filter document is invalid');
  if(value.document.format!=='filter-fab-js'||value.document.version!==2)fail('PNG metadata requires a native Filter FabJS version 2 document');
  if(jsonBytes(value.document,'PNG filter document').length>FILTER_FAB_PNG_DOCUMENT_MAX_BYTES)fail('Embedded filter document exceeds the 256 KiB limit','oversized');
  return value;
}

function parseChunks(bytes){
  if(bytes.length<PNG_SIGNATURE.length||!bytesEqual(bytes,0,PNG_SIGNATURE))fail('File does not have a valid PNG signature');
  const chunks=[];let offset=PNG_SIGNATURE.length,sawIend=false;
  while(offset<bytes.length){
    if(bytes.length-offset<12)fail('PNG contains a truncated chunk');
    const length=readU32(bytes,offset),dataStart=offset+8,dataEnd=dataStart+length,chunkEnd=dataEnd+4;
    if(!Number.isSafeInteger(chunkEnd)||chunkEnd>bytes.length)fail('PNG chunk length exceeds the available data');
    const typeBytes=bytes.subarray(offset+4,offset+8);let type;try{type=textDecoder.decode(typeBytes);}catch{fail('PNG chunk type is invalid')}
    if(!/^[A-Za-z]{4}$/.test(type))fail('PNG chunk type is invalid');
    chunks.push({type,typeBytes,data:bytes.subarray(dataStart,dataEnd),crc:readU32(bytes,dataEnd),start:offset,end:chunkEnd});offset=chunkEnd;
    if(type==='IEND'){if(length!==0)fail('PNG IEND chunk is malformed');sawIend=true;break;}
  }
  if(!sawIend)fail('PNG is missing its IEND chunk');
  if(offset!==bytes.length)fail('PNG contains data after IEND');
  return chunks;
}

function metadataPayload(data){
  const keywordEnd=data.indexOf(0);if(keywordEnd<0)return null;
  let keyword;try{keyword=textDecoder.decode(data.subarray(0,keywordEnd));}catch{return null}
  if(keyword!==FILTER_FAB_PNG_KEYWORD)return null;
  let offset=keywordEnd+1;if(data.length-offset<4)fail('Filter FabJS iTXt metadata is truncated');
  const compressionFlag=data[offset++],compressionMethod=data[offset++];if(compressionFlag!==0||compressionMethod!==0)fail('Filter FabJS iTXt metadata must be uncompressed');
  const languageEnd=data.indexOf(0,offset);if(languageEnd<0)fail('Filter FabJS iTXt language field is truncated');offset=languageEnd+1;
  const translatedEnd=data.indexOf(0,offset);if(translatedEnd<0)fail('Filter FabJS iTXt translated keyword is truncated');offset=translatedEnd+1;
  return data.subarray(offset);
}

async function blobBytes(blob){
  if(!blob||typeof blob.arrayBuffer!=='function')fail('PNG metadata input must be a Blob or File');
  if(Number.isFinite(Number(blob.size))&&Number(blob.size)>PNG_PARSE_MAX_BYTES)fail('PNG exceeds the bounded metadata parsing limit','oversized');
  const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes.length>PNG_PARSE_MAX_BYTES)fail('PNG exceeds the bounded metadata parsing limit','oversized');return bytes;
}

async function embedFilterFabMetadata(pngBlob,envelope){
  const validated=validateFilterFabPngEnvelope(envelope),bytes=await blobBytes(pngBlob),chunks=parseChunks(bytes),payload=jsonBytes(validated,'Filter FabJS PNG metadata');
  if(payload.length>FILTER_FAB_PNG_METADATA_MAX_BYTES)fail('Filter FabJS PNG metadata exceeds its size limit','oversized');
  for(const item of chunks)if(item.type==='iTXt'&&metadataPayload(item.data)!==null)fail('PNG already contains Filter FabJS metadata','duplicate');
  const prefix=textEncoder.encode(`${FILTER_FAB_PNG_KEYWORD}\0`),fields=Uint8Array.of(0,0,0,0),metadataChunk=chunk('iTXt',concatBytes([prefix,fields,payload])),iend=chunks.at(-1);
  const output=concatBytes([bytes.subarray(0,iend.start),metadataChunk,bytes.subarray(iend.start)]);return new Blob([output],{type:'image/png'});
}

async function extractFilterFabMetadata(pngBlobOrFile){
  const bytes=await blobBytes(pngBlobOrFile),chunks=parseChunks(bytes);let matched=null;
  for(const item of chunks){
    if(item.type!=='iTXt')continue;const payload=metadataPayload(item.data);if(payload===null)continue;
    if(matched)fail('PNG contains duplicate Filter FabJS metadata chunks','duplicate');matched={item,payload};
  }
  if(!matched)return null;
  if(matched.payload.length>FILTER_FAB_PNG_METADATA_MAX_BYTES)fail('Filter FabJS PNG metadata exceeds its size limit','oversized');
  if(crc32([matched.item.typeBytes,matched.item.data])!==matched.item.crc)fail('Filter FabJS PNG metadata CRC check failed','crc');
  let text;try{text=textDecoder.decode(matched.payload);}catch{fail('Filter FabJS PNG metadata is not valid UTF-8')}
  let value;try{value=JSON.parse(text);}catch{fail('Filter FabJS PNG metadata is not valid JSON')}
  return validateFilterFabPngEnvelope(value);
}

// Publishing inspection reuses this module's bounded chunk parser; no pixel decoding.
async function readPngDimensions(pngBlobOrFile){
  const chunks=parseChunks(await blobBytes(pngBlobOrFile)),header=chunks[0];
  if(header?.type!=='IHDR'||header.data.length!==13||chunks.filter(item=>item.type==='IHDR').length!==1)fail('PNG requires one leading 13-byte IHDR');
  if(crc32([header.typeBytes,header.data])!==header.crc)fail('PNG IHDR CRC check failed','crc');
  const width=readU32(header.data,0),height=readU32(header.data,4);
  if(!width||!height)fail('PNG dimensions must be positive');
  return{width,height};
}


/* src/io/filter-library-manifest.js */
// Metadata validation only; transport and portable filter documents are separate boundaries.

const ONLINE_LIBRARY_MAX_ENTRIES=1000;
const ONLINE_LIBRARY_MAX_ASSET_PATH_LENGTH=2048;
const ONLINE_LIBRARY_MAX_TIMESTAMP_LENGTH=120;

function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`Online library ${label} must be an object`);
}
function positiveInteger(value,label){
  if(!Number.isSafeInteger(value)||value<1)throw new Error(`Online library ${label} must be a positive safe integer`);
  return value;
}
function metadataText(value,label,limit,required=false){
  if(value===undefined&&!required)return '';
  if(typeof value!=='string')throw new Error(`Online library filter ${label} must be a string`);
  const result=value.trim();
  if(result.length>limit||(required&&!result))throw new Error(`Online library filter ${label} must contain ${required?'1':'0'}–${limit} characters`);
  return result;
}
function assetPath(value,label,extension){
  const fail=()=>{throw new Error(`Online library ${label} path must be a relative ${label==='package'?'PNG':'PNG or WebP'} asset`);};
  if(typeof value!=='string'||value.length>ONLINE_LIBRARY_MAX_ASSET_PATH_LENGTH||/\p{Cc}/u.test(value))fail();
  const path=value.trim();
  // Check encoded traversal/separators too, without rewriting the supplied path.
  let decoded;try{decoded=decodeURIComponent(path);}catch{fail();}
  for(const candidate of [path,decoded]){
    if(!candidate||candidate.startsWith('/')||/[\\?#\p{Cc}]/u.test(candidate)||/^[A-Za-z][A-Za-z0-9+.-]*:/.test(candidate)||candidate.split('/').some(segment=>segment==='.'||segment==='..'))fail();
  }
  if(!extension.test(path))fail();
  return path;
}
function publicationDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Online library publishedAt must be a real YYYY-MM-DD date');
  const date=new Date(`${value}T00:00:00Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Online library publishedAt must be a real YYYY-MM-DD date');
  return value;
}
function filterMetadata(value){
  object(value,'filter');
  if(value.id===undefined)throw new Error('Online library filter id is required');
  const id=validatePortableId(value.id),revision=positiveInteger(value.revision,'filter revision');
  if(value.documentType!=='filter')throw new Error('Unsupported online library document type');
  if(value.filterFormat!==2)throw new Error('Unsupported online library filter format');
  object(value.preview,'preview');object(value.package,'package');
  for(const dimension of ['width','height'])if(!Number.isInteger(value.preview[dimension])||value.preview[dimension]<1||value.preview[dimension]>2048)throw new Error(`Online library preview ${dimension} must be an integer from 1 to 2048`);
  return{
    id,revision,name:metadataText(value.name,'name',120,true),
    author:metadataText(value.author,'author',120),description:metadataText(value.description,'description',2000),
    tags:normalizeTags(value.tags),documentType:'filter',filterFormat:2,
    ...(value.publishedAt===undefined?{}:{publishedAt:publicationDate(value.publishedAt)}),
    preview:{url:assetPath(value.preview.url,'preview',/\.(png|webp)$/i),width:value.preview.width,height:value.preview.height},
    package:{url:assetPath(value.package.url,'package',/\.png$/i)}
  };
}

/** Validate an already-parsed manifest and return a fresh, known-fields-only projection. */
function validateOnlineLibraryManifest(value){
  object(value,'manifest');
  if(value.schema!=='filter-fab-js/library')throw new Error('Online library schema is invalid');
  if(value.schemaVersion!==1)throw new Error('Unsupported online library schema version');
  const libraryVersion=positiveInteger(value.libraryVersion,'libraryVersion');
  if(!Array.isArray(value.filters)||value.filters.length>ONLINE_LIBRARY_MAX_ENTRIES)throw new Error(`Online library filters must be an array of at most ${ONLINE_LIBRARY_MAX_ENTRIES} entries`);
  if(value.generatedAt!==undefined&&(typeof value.generatedAt!=='string'||!value.generatedAt.trim()||value.generatedAt.length>ONLINE_LIBRARY_MAX_TIMESTAMP_LENGTH||!Number.isFinite(Date.parse(value.generatedAt))))throw new Error('Online library generatedAt must be a valid timestamp of at most 120 characters');
  const filters=[],ids=new Set();
  for(const valueFilter of value.filters){
    const filter=filterMetadata(valueFilter);
    if(ids.has(filter.id))throw new Error(`Online library contains duplicate filter ID "${filter.id}"`);
    ids.add(filter.id);filters.push(filter);
  }
  return{schema:'filter-fab-js/library',schemaVersion:1,libraryVersion,...(value.generatedAt===undefined?{}:{generatedAt:value.generatedAt}),filters};
}


/* src/io/filter-library-cache.js */

const ONLINE_LIBRARY_CACHE_KEY='ffw-online-library-cache-v1';
const ONLINE_LIBRARY_PERSISTED_MANIFEST_MAX_BYTES=2*1024*1024;

function onlineCacheStorage(storage){return typeof storage==='function'?storage():storage;}
function onlineCacheFits(text){return text.length<=ONLINE_LIBRARY_PERSISTED_MANIFEST_MAX_BYTES&&new TextEncoder().encode(text).byteLength<=ONLINE_LIBRARY_PERSISTED_MANIFEST_MAX_BYTES;}

// Storage access is lazy and best-effort; browser-local data is untrusted.
function readOnlineLibraryCache({storage,manifestUrl}){
  try{
    const raw=onlineCacheStorage(storage)?.getItem(ONLINE_LIBRARY_CACHE_KEY);
    if(typeof raw!=='string'||!onlineCacheFits(raw))return null;
    const record=JSON.parse(raw);
    if(record?.cacheSchema!==1||record.manifestUrl!==manifestUrl)return null;
    return validateOnlineLibraryManifest(record.manifest);
  }catch{return null;}
}

function writeOnlineLibraryCache({storage,manifestUrl,manifest,now=()=>new Date().toISOString()}){
  try{
    const normalized=validateOnlineLibraryManifest(manifest),target=onlineCacheStorage(storage);
    if(!target)return false;
    // Another tab may have stored a newer valid catalogue since our hydration.
    const previous=readOnlineLibraryCache({storage:target,manifestUrl});
    if(previous&&previous.libraryVersion>normalized.libraryVersion)return false;
    const raw=JSON.stringify({cacheSchema:1,manifestUrl,storedAt:now(),manifest:normalized});
    if(!onlineCacheFits(raw))return false;
    target.setItem(ONLINE_LIBRARY_CACHE_KEY,raw);return true;
  }catch{return false;}
}


/* src/io/filter-library-client.js */

const DEFAULT_ONLINE_LIBRARY_MANIFEST_URL='https://anthonychimming.github.io/filter-fabjs-library/catalogue.json';
const ONLINE_LIBRARY_MANIFEST_MAX_BYTES=8*1024*1024;
const ONLINE_LIBRARY_TIMEOUT_MS=12000;

function onlineManifestUrl(value){
  const url=new URL(value);
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback))||url.username||url.password||url.hash)throw new Error('Online library manifest requires HTTPS (or localhost for testing)');
  return url;
}

// relativePath must come from the Stage 1 validator; also fail closed on origin escape.
function resolveOnlineLibraryAssetUrl(manifestUrl,relativePath){
  const base=onlineManifestUrl(manifestUrl);
  if(typeof relativePath!=='string'||!relativePath||relativePath!==relativePath.trim()||/^[A-Za-z][A-Za-z0-9+.-]*:|^[\/\\]|[\\?#\p{Cc}]/u.test(relativePath))throw new Error('Online library asset must be a relative path');
  const url=new URL(relativePath,base);
  if(url.origin!==base.origin)throw new Error('Online library asset must remain on the manifest origin');
  return url.href;
}

async function fetchOnlineLibraryManifest(manifestUrl,{fetchImpl=globalThis.fetch,signal,timeoutMs=ONLINE_LIBRARY_TIMEOUT_MS}={}){
  const url=onlineManifestUrl(manifestUrl).href;
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('Online library timeout must be positive and finite');
  const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new Error('Online library request timed out')),timeoutMs);
  let rejectAbort;
  const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(controller.signal.reason);if(controller.signal.aborted)rejectAbort();else controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  try{
    return await Promise.race([aborted,(async()=>{
      controller.signal.throwIfAborted();
      const response=await fetchImpl(url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok)throw new Error(`Online library HTTP ${response.status}`);
      if(Number(response.headers.get('Content-Length'))>ONLINE_LIBRARY_MANIFEST_MAX_BYTES)throw new Error('Online library manifest exceeds 8 MiB');
      const bytes=new Uint8Array(await response.arrayBuffer());controller.signal.throwIfAborted();
      if(bytes.byteLength>ONLINE_LIBRARY_MANIFEST_MAX_BYTES)throw new Error('Online library manifest exceeds 8 MiB');
      if(!bytes.byteLength)throw new Error('Online library manifest is empty');
      let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('Online library manifest is not valid UTF-8');}
      let value;try{value=JSON.parse(text);}catch{throw new Error('Online library manifest is not valid JSON');}
      return{manifest:validateOnlineLibraryManifest(value),manifestUrl:url};
    })()]);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);}
}


/* src/io/filter-library-package.js */




const ONLINE_LIBRARY_PACKAGE_MAX_BYTES=8*1024*1024;
const ONLINE_LIBRARY_PACKAGE_TIMEOUT_MS=18000;

function onlinePackageFilename(id){
  if(!validatePortableId(id))throw new Error('Online package requires a portable id');
  return `filterfab-${id}.png`;
}

async function readOnlinePackageBytes(response,signal){
  // Stop oversized bodies while receiving them, even without Content-Length.
  if(!response.body?.getReader){
    const bytes=new Uint8Array(await response.arrayBuffer());signal.throwIfAborted();
    if(bytes.byteLength>ONLINE_LIBRARY_PACKAGE_MAX_BYTES)throw new Error('Online package exceeds 8 MiB');
    return bytes;
  }
  const reader=response.body.getReader(),parts=[];
  let length=0,complete=false;
  const abort=()=>{reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
  try{
    while(true){
      signal.throwIfAborted();const {done,value}=await reader.read();signal.throwIfAborted();
      if(done){complete=true;break;}
      length+=value.byteLength;if(length>ONLINE_LIBRARY_PACKAGE_MAX_BYTES)throw new Error('Online package exceeds 8 MiB');
      parts.push(value);
    }
    const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}return bytes;
  }finally{signal.removeEventListener('abort',abort);if(!complete)reader.cancel().catch(()=>{});reader.releaseLock();}
}

function assertOnlinePackageIdentity(entry,document){
  for(const [field,expected] of [['id',entry.remote.id],['name',entry.name],['author',entry.author],['description',entry.description]]){
    if(document[field]!==expected)throw new Error(`Online package ${field} does not match the catalogue`);
  }
  const canonicalTags=tags=>JSON.stringify(normalizeTags(tags).map(tagKey).sort());
  if(canonicalTags(document.tags)!==canonicalTags(entry.tags))throw new Error('Online package tags do not match the catalogue');
}

// Network trust path; the session cache only stores successful results of this function.
async function fetchOnlineFilterPackage(entry,{fetchImpl=globalThis.fetch,signal,manifestUrl,timeoutMs=ONLINE_LIBRARY_PACKAGE_TIMEOUT_MS}={}){
  if(entry?.source!=='online'||entry.document!==null||entry.remote?.documentType!=='filter'||entry.remote?.filterFormat!==2)throw new Error('Expected an Online filter entry');
  const packageUrl=resolveOnlineLibraryAssetUrl(manifestUrl,entry.remote.package.url);
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('Online package timeout must be positive and finite');
  const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new Error('Online package request timed out')),timeoutMs);
  let rejectAbort;
  const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(controller.signal.reason);if(controller.signal.aborted)rejectAbort();else controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  try{
    return await Promise.race([aborted,(async()=>{
      controller.signal.throwIfAborted();
      const response=await fetchImpl(packageUrl,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      controller.signal.throwIfAborted();
      if(!response.ok)throw new Error(`Online package HTTP ${response.status}`);
      if(response.url&&new URL(response.url).origin!==new URL(packageUrl).origin)throw new Error('Online package response escaped the manifest origin');
      if(Number(response.headers.get('Content-Length'))>ONLINE_LIBRARY_PACKAGE_MAX_BYTES)throw new Error('Online package exceeds 8 MiB');
      const bytes=await readOnlinePackageBytes(response,controller.signal);controller.signal.throwIfAborted();
      if(!bytes.byteLength)throw new Error('Online package is empty');
      const envelope=await extractFilterFabMetadata(new Blob([bytes],{type:'image/png'}));controller.signal.throwIfAborted();
      if(!envelope)throw new Error('Online package has no FilterFabJS metadata');
      const document=validateNativeFilter(envelope.document);
      assertOnlinePackageIdentity(entry,document);
      controller.signal.throwIfAborted();
      return{entryKey:entry.key,revision:entry.remote.revision,packageUrl,bytes,document};
    })()]);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);controller.abort();}
}

const ONLINE_PACKAGE_CACHE_MAX_ENTRIES=12;
const ONLINE_PACKAGE_CACHE_MAX_BYTES=32*1024*1024;

function createOnlinePackageCache({manifestUrl,fetchImpl=globalThis.fetch,maxEntries=ONLINE_PACKAGE_CACHE_MAX_ENTRIES,maxBytes=ONLINE_PACKAGE_CACHE_MAX_BYTES}={}){
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw new Error('Package cache bounds must be positive safe integers');
  const records=new Map();let byteLength=0,generation=0;
  const keyFor=entry=>JSON.stringify([manifestUrl,entry.key,entry.remote.revision,resolveOnlineLibraryAssetUrl(manifestUrl,entry.remote.package.url)]);
  const remove=key=>{const record=records.get(key);if(record){byteLength-=record.size;records.delete(key);}};
  const copy=record=>({entryKey:record.entryKey,revision:record.revision,packageUrl:record.packageUrl,bytes:record.bytes.slice(),document:JSON.parse(record.documentJson)});
  return{
    async resolve(entry,{signal}={}){
      signal?.throwIfAborted();const key=keyFor(entry),epoch=generation;
      let record=records.get(key);
      if(record){
        // Same-version catalogue metadata is authoritative too; never reuse a mismatch.
        try{assertOnlinePackageIdentity(entry,JSON.parse(record.documentJson));}catch{remove(key);record=null;}
      }
      if(record){records.delete(key);records.set(key,record);await Promise.resolve();signal?.throwIfAborted();return copy(record);}
      const resolved=await fetchOnlineFilterPackage(entry,{manifestUrl,fetchImpl,signal});signal?.throwIfAborted();
      const documentJson=JSON.stringify(resolved.document),bytes=resolved.bytes.slice(),size=bytes.byteLength+new TextEncoder().encode(documentJson).byteLength;
      record={entryKey:resolved.entryKey,revision:resolved.revision,packageUrl:resolved.packageUrl,bytes,documentJson,size};
      if(epoch===generation&&size<=maxBytes){
        remove(key);records.set(key,record);byteLength+=size;
        while(records.size>maxEntries||byteLength>maxBytes)remove(records.keys().next().value);
      }
      return copy(record);
    },
    prune(entries){
      generation++;const current=new Map(entries.map(entry=>[keyFor(entry),entry]));
      for(const [key,record] of records){
        const entry=current.get(key);if(!entry){remove(key);continue;}
        try{assertOnlinePackageIdentity(entry,JSON.parse(record.documentJson));}catch{remove(key);}
      }
    },
    clear(){generation++;records.clear();byteLength=0;},
    diagnostics:()=>({entries:records.size,bytes:byteLength})
  };
}


/* src/app/filter-catalog.js */

const PREFERENCE_PREFIX='ffw-entry-v1:';
function readEntryPreference(storage,key){
  const raw=storage.getItem(PREFERENCE_PREFIX+key);
  if(raw===null)return{version:1,favorite:false,tags:[]};
  const value=JSON.parse(raw);
  if(!value||value.version!==1||typeof value.favorite!=='boolean')throw new Error('Organization preferences are corrupt; stored data was preserved');
  return{...value,tags:normalizeTags(value.tags)};
}
function writeEntryPreference(storage,key,change){
  const next={...readEntryPreference(storage,key),...change,version:1};next.tags=normalizeTags(next.tags);
  storage.setItem(PREFERENCE_PREFIX+key,JSON.stringify(next));return next;
}
function catalogEntry(document,source,preference){
  let tags=[],unavailable=false;
  try{tags=normalizeTags(document.tags);}catch{unavailable=true;}
  if(source==='builtin')tags=[...new Map([...tags,...preference.tags].map(tag=>[tagKey(tag),tag])).values()];
  const name=String(document.name||'Unavailable filter'),description=String(document.description||''),author=String(document.author||'');
  return{key:`${source}:${document.id}`,source,name,description,author,tags,favorite:preference.favorite,document,unavailable,index:[name,description,author,...tags].map(searchText)};
}
// metadata is one normalized filter from validateOnlineLibraryManifest().
function onlineCatalogEntry(metadata,preference){
  const {id,revision,name,description,author,documentType,filterFormat}=metadata,tags=[...metadata.tags];
  return{key:`online:${id}`,source:'online',name,description,author,tags,favorite:preference.favorite,document:null,unavailable:false,
    remote:{id,revision,documentType,filterFormat,...(metadata.publishedAt===undefined?{}:{publishedAt:metadata.publishedAt}),preview:{...metadata.preview},package:{...metadata.package}},
    index:[name,description,author,...tags].map(searchText)};
}
function searchCatalog(entries,{query='',source='all',favorites=false,tags=[],sort='az'}={}){
  const text=searchText(query),terms=text.split(' ').filter(Boolean);
  const scoped=entries.filter(entry=>(source==='all'||(source==='local'?entry.source==='builtin'||entry.source==='custom':entry.source===source))&&(!favorites||entry.favorite));
  const choices=new Map();for(const entry of scoped)for(const tag of entry.tags)if(!choices.has(tagKey(tag)))choices.set(tagKey(tag),tag);
  const rank=entry=>entry.index[0]===text?0:entry.index[0].startsWith(text)?1:terms.every(term=>entry.index[0].includes(term))?2:3;
  const results=scoped.filter(entry=>tags.every(tag=>entry.tags.some(label=>tagKey(label)===tag))&&terms.every(term=>entry.index.some(field=>field.includes(term))));
  results.sort((a,b)=>(text&&sort==='relevance'?rank(a)-rank(b):0)||a.name.localeCompare(b.name)||a.source.localeCompare(b.source)||a.key.localeCompare(b.key));
  return{results,choices:[...choices].sort((a,b)=>a[1].localeCompare(b[1]))};
}
function readLibrary(storage,normalize){
  const raw=storage.getItem('ffw-custom-presets');
  const parsed=raw===null?[]:JSON.parse(raw);
  if(!Array.isArray(parsed))throw new Error('Saved filter storage is corrupt; Export your draft. Stored data was preserved.');
  const result=normalize(parsed);
  if(result.migrated)storage.setItem('ffw-custom-presets',JSON.stringify(result.storageList));
  return result;
}
function writeLibraryRecord(storage,normalize,filter,{targetId=null,expected=null}={}){
  const {storageList}=readLibrary(storage,normalize),index=storageList.findIndex(item=>item?.id===(targetId||filter.id));
  if(targetId&&(index<0||JSON.stringify(storageList[index])!==expected))throw new Error('This filter changed in another tab. Review the current record before updating.');
  if(!targetId&&index>=0)throw new Error('An existing filter has this ID.');
  const now=new Date().toISOString(),record={...(targetId?storageList[index]:{}),...filter,createdAt:targetId?storageList[index].createdAt||now:now,updatedAt:now};
  if(targetId)storageList[index]=record;else storageList.push(record);
  storage.setItem('ffw-custom-presets',JSON.stringify(storageList));return record;
}


/* src/ui/filter-browser.js */


const PAGE_SIZE=50;
const THUMBNAIL_ROOT_MARGIN='180px 0px';
const THUMBNAIL_FALLBACK_COUNT=8;

function browserNode(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
function browserButton(text,action){const button=browserNode('button',text);button.type='button';button.onclick=action;return button;}

// Native modal dialogs provide focus containment and Escape handling.
function chooseFilterAction(title,choices,{name,detail=''}={}){
  return new Promise(resolve=>{
    const previous=document.activeElement,dialog=browserNode('dialog',null,'filter-choice'),heading=browserNode('h2',title),body=browserNode('div',null,'modal-body');
    heading.id='filterChoiceTitle';dialog.setAttribute('aria-labelledby',heading.id);body.append(heading,browserNode('p',detail));
    let input;if(name!==undefined){const label=browserNode('label','Filter name');input=browserNode('input');input.type='text';input.maxLength=120;input.value=name;label.append(input);body.append(label);}
    const actions=browserNode('div',null,'filter-actions');
    for(const [value,label] of choices)actions.append(browserButton(label,()=>{if(input&&!input.value.trim()){input.focus();return;}dialog.close(value);}));
    body.append(actions);dialog.append(body);document.body.append(dialog);
    dialog.addEventListener('close',()=>{const result={action:dialog.returnValue||'cancel',name:input?.value.trim()};dialog.remove();if(previous?.isConnected&&!previous.disabled)previous.focus();resolve(result);},{once:true});dialog.showModal();
  });
}

function createFilterBrowser({launcher,getEntries,begin,preview,previewOnline=null,downloadOnline=null,apply,cancel,toggleFavorite,requestThumbnail=null,clearThumbnailRequests=()=>{},getOnlineState=()=>({status:'idle'}),loadOnline=()=>{},resolveOnlinePreviewUrl,onError}){
  const dialog=browserNode('dialog',null,'filter-browser');dialog.id='filterLibraryDialog';dialog.setAttribute('aria-labelledby','filterBrowserTitle');
  dialog.innerHTML='<div class="modal-head library-head"><div><strong id="filterBrowserTitle">Filter Library</strong><small>Preview treatments on your image, then apply one when it feels right.</small></div><button type="button" data-close aria-label="Cancel and close Filter Library">×</button></div><div class="browser-tools"><label class="library-search"><span>Search</span><input type="search" placeholder="Name, description, author or tag" data-search></label><button data-clear hidden>Clear search</button><div class="filter-actions"><label>Source<select data-source><option value="local">All local</option><option value="builtin">Built-in</option><option value="custom">My Filters</option><option value="online">Online</option></select></label><label><input type="checkbox" data-favorites> Favorites only</label><label>Sort<select data-sort><option value="az">A–Z</option><option value="relevance">Relevance</option></select></label></div><details><summary>Tags</summary><label>Find tags<input type="search" data-tag-search></label><div data-choices class="tag-choices"></div><small>Match all selected tags. Up to 50 suggestions; type to narrow.</small></details><div data-selected class="chips"></div><div class="filter-actions browser-count-row"><span data-count role="status" aria-live="polite"></span><button data-reset>Reset view</button></div><div data-online-notice hidden><span data-online-message role="status" aria-live="polite"></span><button type="button" data-online-retry>Retry</button></div><p data-error role="alert"></p></div><ul class="filter-results" aria-label="Filter results"></ul><div class="browser-pages" data-pages><button data-prev>Previous</button><span data-page></span><button data-next>Next</button></div><div class="library-actions"><span data-preview-status role="status" aria-live="polite">Choose a filter to preview it on the canvas.</span><div><button type="button" data-cancel>Cancel</button><button type="button" class="primary" data-apply disabled>Apply Filter</button></div></div>';
  document.body.append(dialog);launcher.setAttribute('aria-controls',dialog.id);
  const find=selector=>dialog.querySelector(selector),query=find('[data-search]'),source=find('[data-source]'),favorites=find('[data-favorites]'),sort=find('[data-sort]'),selected=new Set();
  let page=0,composing=false,countTimer,selectedKey=null,previewing=false,sessionOpen=false,actionId=0,thumbnailObserver=null,thumbnailGeneration=0,thumbnailId=0,pendingKey=null,pendingPhase=null,previewErrorKey=null,sessionEpoch=0,sessionEnding=false;
  const downloads=new Set();

  function disconnectThumbnailWork(){thumbnailGeneration++;thumbnailObserver?.disconnect();thumbnailObserver=null;clearThumbnailRequests();}
  function updateThumbnail(row,entry,result,generation){
    if(generation!==thumbnailGeneration||!dialog.open||!row.isConnected)return;
    const thumbnail=row.querySelector('.filter-thumbnail'),canvas=row.querySelector('.filter-thumbnail-image'),label=row.querySelector('.filter-thumbnail-state'),description=row.querySelector('.thumbnail-accessibility'),button=row.querySelector('[data-entry-action="preview"]'),state=result?.state||'failed';thumbnail.dataset.thumbnailState=state;
    if(state==='ready'){
      try{canvas.width=result.width;canvas.height=result.height;const context=canvas.getContext('2d',{alpha:true});if(!context)throw new Error('Canvas thumbnail display is unavailable');context.putImageData(new ImageData(result.pixels,result.width,result.height),0,0);label.textContent='';description.textContent='';button.removeAttribute('aria-describedby');row.dataset.thumbnailReady='true';}
      catch(error){updateThumbnail(row,entry,{state:'failed',error},generation);}
      return;
    }
    row.dataset.thumbnailReady='false';label.textContent=state==='failed'?'Preview unavailable':state==='idle'?'Preview':'Previewing…';
    if(state==='failed'){description.textContent=`Preview unavailable for ${entry.name}. The filter can still be selected.`;button.setAttribute('aria-describedby',description.id);}else{description.textContent='';button.removeAttribute('aria-describedby');}
  }
  function enqueueSample(row){
    if(row.dataset.sampleRequested)return;row.dataset.sampleRequested='true';
    const generation=thumbnailGeneration,thumb=row.querySelector('.filter-thumbnail'),image=row.querySelector('img'),label=row.querySelector('.filter-thumbnail-state'),description=row.querySelector('.thumbnail-accessibility');
    const complete=state=>{if(generation!==thumbnailGeneration||!dialog.open||!row.isConnected)return;thumb.dataset.thumbnailState=state;label.textContent=state==='ready'?'':'Sample unavailable';description.textContent=state==='ready'?'Standardized Online sample; the canvas preview uses your current image.':'Sample unavailable; you can still preview this filter on the canvas.';};
    image.onload=()=>complete('ready');image.onerror=()=>complete('failed');thumb.dataset.thumbnailState='loading';label.textContent='Loading sample…';
    try{image.src=resolveOnlinePreviewUrl(row.thumbnailEntry);}catch{complete('failed');}
  }
  function enqueueThumbnail(row,priority=0){
    if(!row?.isConnected||!dialog.open)return;
    if(row.thumbnailEntry.source==='online'){enqueueSample(row);return;}
    if(!requestThumbnail)return;const requested=Number(row.dataset.thumbnailPriority??-1);if(requested>=priority)return;row.dataset.thumbnailPriority=String(priority);const entry=row.thumbnailEntry,generation=thumbnailGeneration,callback=result=>updateThumbnail(row,entry,result,generation);
    try{requestThumbnail(entry,callback,priority);}catch(error){updateThumbnail(row,entry,{state:'failed',error},generation);}
  }
  function observeThumbnails(list){
    disconnectThumbnailWork();const rows=[...list.querySelectorAll('.filter-card')];if(!rows.length)return;
    if(typeof IntersectionObserver==='function'){
      const generation=thumbnailGeneration;
      thumbnailObserver=new IntersectionObserver(entries=>{if(generation!==thumbnailGeneration||!dialog.open)return;for(const observation of entries)if(observation.isIntersecting){thumbnailObserver?.unobserve(observation.target);enqueueThumbnail(observation.target,20);}}, {root:list,rootMargin:THUMBNAIL_ROOT_MARGIN,threshold:0.01});rows.forEach(row=>thumbnailObserver.observe(row));
    }else rows.slice(0,THUMBNAIL_FALLBACK_COUNT).forEach(row=>enqueueThumbnail(row,10));
  }

  function syncActions(){find('[data-apply]').disabled=previewing||!selectedKey;find('[data-preview-status]').dataset.state=previewing?'busy':selectedKey?'ready':'idle';}
  async function cancelAndClose(){
    if(sessionEnding)return;sessionEnding=true;
    const id=++actionId;sessionEpoch++;downloads.clear();previewing=true;syncActions();find('[data-error]').textContent='';
    try{await cancel();if(id!==actionId)return;sessionOpen=false;dialog.close('cancel');}
    catch(error){sessionEnding=false;previewing=false;syncActions();find('[data-error]').textContent=`Could not restore the working filter: ${error.message}`;onError(error);}
  }
  async function applyAndClose(){
    if(previewing||!selectedKey||sessionEnding)return;sessionEnding=true;
    const id=++actionId;sessionEpoch++;downloads.clear();previewing=true;syncActions();find('[data-error]').textContent='';find('[data-preview-status]').textContent='Applying selected filter…';
    try{if(!await apply()||id!==actionId){sessionEnding=false;previewing=false;syncActions();return;}sessionOpen=false;dialog.close('apply');}
    catch(error){sessionEnding=false;previewing=false;syncActions();find('[data-error]').textContent=`Could not apply filter: ${error.message}`;onError(error);}
  }
  find('[data-close]').onclick=cancelAndClose;find('[data-cancel]').onclick=cancelAndClose;find('[data-apply]').onclick=applyAndClose;
  dialog.addEventListener('cancel',event=>{event.preventDefault();cancelAndClose();});
  dialog.addEventListener('close',()=>{actionId++;sessionEpoch++;downloads.clear();disconnectThumbnailWork();if(sessionOpen){Promise.resolve(cancel()).catch(onError);sessionOpen=false;}if(!launcher.disabled)launcher.focus();});

  function reset(){query.value='';source.value='local';favorites.checked=false;sort.value='az';selected.clear();find('[data-tag-search]').value='';page=0;refresh();}
  function createResult(entry){
    const online=entry.source==='online';
    const row=browserNode('li',null,'filter-card');row.dataset.entryKey=entry.key;row.dataset.selected=String(entry.key===selectedKey);
    const cardTop=browserNode('div',null,'filter-card-main');
    const previewButton=online&&!previewOnline?browserNode('div'):browserButton('',async()=>{
      if(sessionEnding)return;
      const id=++actionId;pendingKey=entry.key;pendingPhase=online?'loading':'rendering';previewErrorKey=null;previewing=true;find('[data-error]').textContent='';find('[data-preview-status]').textContent=`Previewing ${entry.name}…`;refresh();syncActions();
      enqueueThumbnail(dialog.querySelector(`[data-entry-key="${CSS.escape(entry.key)}"]`),100);
      try{
        const accepted=await (online?previewOnline(entry,phase=>{if(id!==actionId)return;pendingPhase=phase;find('[data-preview-status]').textContent=phase==='loading'?`Loading preview for ${entry.name}…`:`Previewing ${entry.name}…`;refresh();}):preview(entry));if(id!==actionId)return;
        if(!accepted){pendingKey=null;previewing=false;refresh();syncActions();return;}
        selectedKey=entry.key;pendingKey=null;
        previewing=false;find('[data-preview-status]').textContent=`Previewing ${entry.name}. Apply it or keep browsing.`;refresh();syncActions();
      }catch(error){if(id!==actionId)return;pendingKey=null;previewErrorKey=entry.key;previewing=false;find('[data-preview-status]').textContent=selectedKey?'Your previous preview is still on the canvas.':'Choose a filter to preview it on the canvas.';refresh();syncActions();find('[data-error]').textContent=`Could not preview this filter. Your previous preview was kept.`;}
    });
    previewButton.className='filter-card-preview';
    if(!online||previewOnline){previewButton.setAttribute('aria-label',`Preview ${entry.name}`);previewButton.setAttribute('aria-pressed',String(entry.key===selectedKey));previewButton.dataset.entryKey=entry.key;previewButton.dataset.entryAction='preview';}
    const thumb=browserNode('span',null,'filter-thumbnail');thumb.dataset.thumbnailState='idle';thumb.setAttribute('aria-hidden','true');const thumbnailCanvas=browserNode(online?'img':'canvas',null,'filter-thumbnail-image'),thumbnailState=browserNode('span',online?'Sample':'Preview','filter-thumbnail-state'),thumbnailDescription=browserNode('span',null,'visually-hidden thumbnail-accessibility');
    if(online){thumbnailCanvas.alt='';thumbnailCanvas.decoding='async';thumbnailCanvas.loading='lazy';thumbnailCanvas.referrerPolicy='no-referrer';thumbnailDescription.textContent='Standardized Online sample; the canvas preview uses your current image.';thumb.append(browserNode('span','Sample','filter-sample-badge'));}else{thumbnailCanvas.width=1;thumbnailCanvas.height=1;}
    thumbnailDescription.id=`filterThumbnailStatus${++thumbnailId}`;thumb.append(thumbnailCanvas,thumbnailState);previewButton.append(thumb,thumbnailDescription);
    const copy=browserNode('span',null,'filter-card-copy'),heading=browserNode('span',entry.name,'filter-card-name'),meta=browserNode('span',null,'result-meta');
    const sourceLabel=online?'Online':entry.source==='builtin'?'Built-in':'My Filter',authorLabel=entry.author||(entry.source==='builtin'?'Filter FabJS':'Author not specified');
    meta.append(browserNode('span',sourceLabel,'source-badge'),document.createTextNode(` · ${authorLabel}${entry.document?.benchmark?' · Benchmark':''}${entry.unavailable?' · Unavailable':''}`));
    if(entry.key===pendingKey)copy.append(browserNode('span',pendingPhase==='loading'?'Loading preview…':'Previewing…','filter-selection-label'));
    else if(entry.key===selectedKey)copy.append(browserNode('span',online?'✓ Previewing on canvas':'✓ Selected preview','filter-selection-label'));
    if(entry.key===previewErrorKey)copy.append(browserNode('span','Preview unavailable','filter-package-error'));copy.append(heading,meta,browserNode('span',entry.description||'No description provided.','filter-excerpt'));previewButton.append(copy);
    const star=browserButton(entry.favorite?'★':'☆',()=>{try{toggleFavorite(entry);find('[data-error]').textContent='';refresh();}catch(error){find('[data-error]').textContent=`Couldn’t save favorites in this browser. ${error.message}`;onError(error);}});star.className='filter-card-favorite';star.setAttribute('aria-pressed',String(entry.favorite));star.setAttribute('aria-label',`${entry.favorite?'Remove':'Add'} ${entry.name} ${entry.favorite?'from':'to'} favorites`);star.dataset.entryKey=entry.key;star.dataset.entryAction='favorite';
    const actions=browserNode('div',null,'filter-card-actions');actions.append(star);
    if(online&&downloadOnline){
      const download=browserButton(downloads.has(entry.key)?'…':'↓',async()=>{
        if(sessionEnding||downloads.has(entry.key))return;const epoch=sessionEpoch;downloads.add(entry.key);refresh();
        try{await downloadOnline(entry);}catch(error){if(epoch===sessionEpoch)find('[data-error]').textContent='Could not download this filter. The package was unavailable or invalid.';}
        finally{if(epoch===sessionEpoch){downloads.delete(entry.key);refresh();}}
      });
      download.className='filter-card-download';download.disabled=downloads.has(entry.key);download.setAttribute('aria-label',`Download PNG for ${entry.name}`);download.setAttribute('aria-busy',String(download.disabled));download.dataset.entryKey=entry.key;download.dataset.entryAction='download';actions.append(download);
    }
    cardTop.append(previewButton,actions);row.append(cardTop);
    const tags=browserNode('div',null,'result-tags');
    for(const tag of entry.tags){
      const button=browserButton(tag,()=>{query.value='';source.value=online?'online':'local';favorites.checked=false;sort.value='az';selected.clear();selected.add(tagKey(tag));find('[data-tag-search]').value='';page=0;refresh();find('[data-selected] button')?.focus();});
      button.setAttribute('aria-label',`Show all filters tagged ${tag}`);tags.append(button);
    }
    row.append(tags);row.thumbnailEntry=entry;return row;
  }
  function refresh(){
    if(!dialog.open)return;
    const active=document.activeElement,focusKey=active?.dataset?.entryKey,focusAction=active?.dataset?.entryAction,oldButtons=[...dialog.querySelectorAll('[data-entry-action="favorite"]')],oldIndex=oldButtons.indexOf(active);
    let entries;try{entries=getEntries();}catch(error){find('[data-error]').textContent=error.message;entries=[];}
    const online=source.value==='online',onlineState=online?getOnlineState():{},onlineStatus=onlineState.status,waiting=online&&onlineStatus!=='ready';
    const notice=find('[data-online-notice]'),message=find('[data-online-message]'),saved=onlineState.provenance==='saved'?'saved':'previous';
    notice.hidden=!online||(!onlineState.refreshing&&!onlineState.refreshWarning);
    const noticeText=notice.hidden?'':onlineState.refreshWarning?`Could not refresh Online Library — showing ${saved} catalogue.`:`Showing ${saved} catalogue · Checking for updates…`;
    if(message.textContent!==noticeText)message.textContent=noticeText;
    find('[data-online-retry]').hidden=!onlineState.refreshWarning;
    const {results,choices}=searchCatalog(waiting?[]:entries,{query:query.value,source:source.value,favorites:favorites.checked,tags:[...selected],sort:sort.value});
    sort.options[1].disabled=!query.value.trim();find('[data-clear]').hidden=!query.value;
    page=Math.min(page,Math.max(0,Math.ceil(results.length/PAGE_SIZE)-1));
    clearTimeout(countTimer);if(waiting)find('[data-count]').textContent=onlineStatus==='error'?'Online Library unavailable':'Loading Online filters…';else countTimer=setTimeout(()=>{const count=`${results.length} filters`;if(find('[data-count]').textContent!==count)find('[data-count]').textContent=count;},150);
    const selectedBox=find('[data-selected]');selectedBox.replaceChildren();for(const key of selected)selectedBox.append(browserButton(`${choices.find(item=>item[0]===key)?.[1]||key} ×`,()=>{selected.delete(key);page=0;refresh();find('[data-reset]').focus();}));
    const choiceBox=find('[data-choices]');choiceBox.replaceChildren();for(const [key,label] of choices.filter(item=>searchText(item[1]).includes(searchText(find('[data-tag-search]').value))).slice(0,50)){
      const wrapper=browserNode('label'),check=browserNode('input');check.type='checkbox';check.checked=selected.has(key);check.onchange=()=>{if(check.checked)selected.add(key);else selected.delete(key);page=0;refresh();[...choiceBox.querySelectorAll('input')].find(node=>node.value===key)?.focus();};check.value=key;wrapper.append(check,document.createTextNode(label));choiceBox.append(wrapper);
    }
    const list=find('.filter-results');list.replaceChildren();for(const entry of results.slice(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE))list.append(createResult(entry));
    if(!results.length){const empty=browserNode('li',null,'filter-library-empty');
      if(online){
        const message=onlineStatus==='error'?'Could not reach the Online Library. Your Built-in and My Filters are still available.':waiting?'Loading Online filters…':entries.some(entry=>entry.source==='online')?'No Online filters match this search.':'No Online filters are currently available.';
        empty.append(browserNode('p',message));if(onlineStatus==='error')empty.append(browserButton('Retry',()=>{loadOnline({retry:true});refresh();}));
      }else empty.append(browserNode('p',favorites.checked&&!entries.some(entry=>entry.favorite)?'No favorites yet. Star a filter to keep it here.':source.value==='custom'&&!entries.some(entry=>entry.source==='custom')?'Saved filters appear here. Import a filter, then save it to keep it.':'No filters match this search.'),browserButton('Show all filters',reset));
      list.append(empty);
    }
    list.setAttribute('aria-busy',String(waiting&&onlineStatus!=='error'));
    const pageCount=Math.max(1,Math.ceil(results.length/PAGE_SIZE)),pages=find('[data-pages]');pages.hidden=results.length<=PAGE_SIZE;find('[data-page]').textContent=`Page ${page+1} of ${pageCount}`;find('[data-prev]').disabled=page===0;find('[data-next]').disabled=(page+1)*PAGE_SIZE>=results.length;
    syncActions();
    observeThumbnails(list);const selectedRow=selectedKey?list.querySelector(`[data-entry-key="${CSS.escape(selectedKey)}"]`):null;if(selectedRow)enqueueThumbnail(selectedRow,100);
    if(focusKey){const same=[...list.querySelectorAll('button')].find(node=>node.dataset.entryKey===focusKey&&node.dataset.entryAction===focusAction),neighbors=[...list.querySelectorAll('[data-entry-action="favorite"]')];(same||neighbors[Math.min(Math.max(0,oldIndex),neighbors.length-1)]||list.querySelector('button')||find('[data-reset]')).focus();}
  }
  find('.filter-results').addEventListener('focusin',event=>enqueueThumbnail(event.target.closest('.filter-card'),80));
  query.oncompositionstart=()=>composing=true;query.oncompositionend=()=>{composing=false;page=0;refresh();};query.oninput=()=>{if(!composing){page=0;refresh();}};
  for(const field of [source,favorites,sort])field.onchange=()=>{page=0;refresh();};
  source.onchange=()=>{page=0;if(source.value==='online')loadOnline();refresh();};
  find('[data-online-retry]').onclick=()=>{loadOnline({retry:true});refresh();};
  find('[data-tag-search]').oninput=refresh;find('[data-clear]').onclick=()=>{query.value='';page=0;refresh();query.focus();};find('[data-reset]').onclick=reset;
  find('[data-prev]').onclick=()=>{page--;refresh();};find('[data-next]').onclick=()=>{page++;refresh();};
  launcher.onclick=async()=>{try{await begin();sessionEnding=false;sessionEpoch++;sessionOpen=true;selectedKey=null;pendingKey=null;previewErrorKey=null;previewing=false;find('[data-error]').textContent='';find('[data-preview-status]').textContent='Choose a filter to preview it on the canvas.';dialog.showModal();if(source.value==='online')loadOnline();refresh();query.focus();}catch(error){onError(error);}};
  return{invalidateSession:()=>{actionId++;sessionEpoch++;downloads.clear();sessionOpen=false;selectedKey=null;pendingKey=null;previewing=false;if(dialog.open)dialog.close('replaced');},refresh,refreshOnline:()=>{if(source.value==='online')refresh();},dialog,showError:message=>{find('[data-error]').textContent=message;}};
}


/* src/ui/dom.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */


function getDom(){
  const el={canvas:$('#displayCanvas'),stage:$('#canvasStage'),wrap:$('#canvasWrap'),drop:$('#dropOverlay'),renderOverlay:$('#renderOverlay'),progressFill:$('#progressFill'),progressPercent:$('#progressPercent'),progressRows:$('#progressRows'),controlsUsage:$('#controlsUsage'),authorControlsUsage:$('#authorControlsUsage'),controlsEmpty:$('#controlsEmpty'),formulaEditStatus:$('#formulaEditStatus'),renderBtn:$('#renderBtn'),imageInput:$('#imageInput'),filterInput:$('#filterInput'),preset:$('#presetSelect'),searchFilters:$('#browseFiltersBtn'),deletePreset:$('#deletePresetBtn'),rendererSelect:$('#rendererSelect'),rendererDiagnostics:$('#rendererDiagnostics'),rendererSummary:$('#rendererSummary'),rendererReason:$('#rendererReason'),description:$('#filterDescription'),activeFilterName:$('#activeFilterName'),activeFilterSource:$('#activeFilterSource'),activeFilterStatus:$('#activeFilterStatus'),activeFilterDescription:$('#activeFilterDescription'),activeFavorite:$('#activeFavoriteBtn'),formulas:[$('#formulaR'),$('#formulaG'),$('#formulaB'),$('#formulaA')],statusDot:$('#statusDot'),statusText:$('#statusText'),imageInfo:$('#imageInfo'),renderInfo:$('#renderInfo'),splitOverlay:$('#splitOverlay'),splitDivider:$('#splitDivider'),zoomLabel:$('#zoomLabel'),toast:$('#toast')};
  const ctx=el.canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D context is unavailable');
  return{el,ctx};
}


/* src/ui/canvas-view.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */



function createCanvasView({state,el,ctx}){
  let sourceCache=null,filteredCache=null,drawScheduled=false;
  let activePointer=null;
  const divider=el.splitDivider;
  function endSplitDrag(){
    if(activePointer===null)return;
    const pointer=activePointer;activePointer=null;
    divider.removeAttribute('data-dragging');
    if(divider.hasPointerCapture(pointer))divider.releasePointerCapture(pointer);
  }
  function syncDivider(){
    if(!divider)return;
    const visible=state.view==='split'&&Boolean(state.source);
    el.splitOverlay.hidden=!visible;
    if(!visible){endSplitDrag();return;}
    const image=el.canvas.getBoundingClientRect(),stage=el.stage.getBoundingClientRect();
    Object.assign(el.splitOverlay.style,{left:`${image.left-stage.left}px`,top:`${image.top-stage.top}px`,width:`${image.width}px`,height:`${image.height}px`});
    // Align with the existing integer-pixel comparison boundary.
    divider.style.left=`${Math.round(state.width*state.split/100)/state.width*100}%`;
    divider.setAttribute('aria-valuenow',String(state.split));
    divider.setAttribute('aria-valuetext',`${state.split}% Original, ${100-state.split}% Filtered`);
  }
  function setSplit(value){state.split=clamp(value,0,100);syncDivider();requestDraw();}
  function moveSplit(event){
    const image=el.canvas.getBoundingClientRect();
    if(image.width>0)setSplit(Math.round((event.clientX-image.left)/image.width*100));
  }
  if(divider){
    divider.addEventListener('pointerdown',event=>{
      if(state.view!=='split'||!state.source||activePointer!==null||event.button!==0||event.isPrimary===false)return;
      event.preventDefault();divider.focus({preventScroll:true});
      divider.setPointerCapture(event.pointerId);activePointer=event.pointerId;
      divider.setAttribute('data-dragging','');moveSplit(event);
    });
    divider.addEventListener('pointermove',event=>{if(event.pointerId===activePointer)moveSplit(event);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])divider.addEventListener(type,event=>{if(event.pointerId===activePointer)endSplitDrag();});
    divider.addEventListener('keydown',event=>{
      if(state.view!=='split'||!state.source)return;
      const step=event.shiftKey?5:1;
      const value=event.key==='ArrowLeft'?state.split-step:event.key==='ArrowRight'?state.split+step:event.key==='Home'?0:event.key==='End'?100:null;
      if(value!==null){event.preventDefault();setSplit(value);}
    });
    const observer=new ResizeObserver(()=>{endSplitDrag();if(state.zoom==='fit')fitCanvas();else syncDivider();});
    observer.observe(el.stage);observer.observe(el.canvas);
  }
  function cachedImageData(pixels,cache){if(!cache||cache.pixels!==pixels||cache.width!==state.width||cache.height!==state.height)cache={pixels,width:state.width,height:state.height,imageData:imageDataFromPixels(pixels,state.width,state.height)};return cache}
  function invalidatePixels(){endSplitDrag();sourceCache=filteredCache=null}
  function drawView(){syncDivider();if(!state.source)return;ctx.clearRect(0,0,state.width,state.height);if(state.view==='original'||!state.filtered){sourceCache=cachedImageData(state.source,sourceCache);ctx.putImageData(sourceCache.imageData,0,0)}else if(state.view==='filtered'){filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(filteredCache.imageData,0,0)}else{const cut=Math.round(state.width*state.split/100);sourceCache=cachedImageData(state.source,sourceCache);filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(sourceCache.imageData,0,0,0,0,cut,state.height);ctx.putImageData(filteredCache.imageData,0,0,cut,0,state.width-cut,state.height);}}
  function requestDraw(){if(drawScheduled)return;drawScheduled=true;requestAnimationFrame(()=>{drawScheduled=false;drawView()})}
  function fitCanvas(){if(!state.width)return;const rect=el.stage.getBoundingClientRect();state.zoomLevel=Math.min(Math.max(100,rect.width-48)/state.width,Math.max(100,rect.height-48)/state.height,1);state.zoom='fit';applyZoom();}
  function applyZoom(){endSplitDrag();el.wrap.style.width=`${Math.round(state.width*state.zoomLevel)}px`;el.wrap.style.height=`${Math.round(state.height*state.zoomLevel)}px`;el.canvas.style.width=el.canvas.style.height='100%';el.zoomLabel.textContent=state.zoom==='fit'?'Fit':`${Math.round(state.zoomLevel*100)}%`;syncDivider();}
  function zoom(factor){state.zoom='manual';state.zoomLevel=clamp(state.zoomLevel*factor,.1,4);applyZoom();}
  return{drawView,requestDraw,invalidatePixels,fitCanvas,applyZoom,zoom};
}


/* src/ui/controls.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */



const AUTHORING_PRESETS=Object.freeze({
  generic:{widget:'slider',displayMin:0,displayMax:255,step:1,format:'number',unit:''},
  percentage:{widget:'slider',displayMin:0,displayMax:100,step:1,format:'number',unit:'%'},
  angle:{widget:'slider',displayMin:0,displayMax:360,step:1,format:'number',unit:'°'},
  seed:{widget:'seed',displayMin:1,displayMax:9999,step:1,format:'integer',unit:''}
});

function append(parent,tag,className='',text=''){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;parent.appendChild(node);return node}
function numericEditorUI(entry){return{widget:entry.ui.widget,displayMin:Number(entry.ui.displayMin),displayMax:Number(entry.ui.displayMax),step:Number(entry.ui.step),format:entry.ui.format,unit:entry.ui.unit}}

function createControlsController({state,el,scheduleRender,applyInteractionLocks,compileCurrentProgram}){
  const grid=$('#sliderGrid'),dialog=$('#editControlsDialog'),editorList=$('#controlEditorList'),editorError=$('#controlEditorError'),mappingPanel=$('#controlMappingFeedback'),preview=$('#controlEditorPreview');
  const fields={label:$('#controlEditorLabel'),widget:$('#controlEditorWidget'),displayMin:$('#controlEditorMin'),displayMax:$('#controlEditorMax'),step:$('#controlEditorStep'),format:$('#controlEditorFormat'),unit:$('#controlEditorUnit')};
  let draft=null,selectedIndex=0;

  function controlName(index){return String(state.labels[index]||`Control ${index+1}`)}
  function accessibleName(index){return `${controlName(index)}, control ${index}`}
  function displayValue(index){return rawToDisplay(state.controls[index],state.controlUIs[index])}
  function updateCanonical(index,value){state.controls[index]=displayToRaw(value,state.controlUIs[index])}
  function addReadout(row,index,ui,value){const readout=append(row,'output','control-readout');readout.textContent=formatControlValue(value,ui);if(ui.unit)append(readout,'span','control-unit',` ${ui.unit}`);readout.setAttribute('aria-live','off');readout.setAttribute('aria-label',`${accessibleName(index)} value`);return readout}
  function buildRuntimeControl(definition){
    const index=definition.index,ui=normalizeControlUI(state.controlUIs[index]),value=displayValue(index),row=append(grid,'div','slider-row');row.dataset.controlIndex=String(index);
    append(row,'span','slider-index',String(index));
    append(row,'span','control-label',controlName(index));
    const widget=append(row,'div',`control-widget control-widget-${ui.widget}`),name=accessibleName(index);let readout;
    if(ui.widget==='slider'){
      const input=append(widget,'input','slider-range');input.type='range';input.min=String(ui.displayMin);input.max=String(ui.displayMax);input.step=String(ui.step);input.value=String(value);input.setAttribute('aria-label',name);readout=addReadout(row,index,ui,value);
      input.oninput=()=>{updateCanonical(index,input.value);const shown=rawToDisplay(state.controls[index],ui);readout.firstChild.textContent=formatControlValue(shown,ui);};input.onchange=()=>scheduleRender();
    }else if(ui.widget==='number'||ui.widget==='seed'){
      const input=append(widget,'input','slider-value');input.type='number';input.min=String(ui.displayMin);input.max=String(ui.displayMax);input.step=String(ui.step);input.value=formatControlValue(value,ui);input.setAttribute('aria-label',name);readout=addReadout(row,index,ui,value);readout.classList.add('unit-only');readout.firstChild.textContent='';
      const commit=()=>{if(input.value==='')return;updateCanonical(index,input.value);const shown=rawToDisplay(state.controls[index],ui);input.value=formatControlValue(shown,ui);readout.firstChild.textContent='';};input.oninput=()=>{if(input.value!=='')updateCanonical(index,input.value);};input.onchange=()=>{commit();scheduleRender();};
      if(ui.widget==='seed'){
        const randomize=append(widget,'button','seed-randomize','↻');randomize.type='button';randomize.setAttribute('aria-label',`Generate new ${controlName(index)} value`);randomize.onclick=()=>{const seed=randomSeedDisplay(ui);updateCanonical(index,seed);input.value=formatControlValue(seed,ui);scheduleRender();};
      }
    }else{
      const input=append(widget,'input','toggle-input');input.type='checkbox';input.setAttribute('role','switch');input.checked=normalizeToggleRaw(state.controls[index])===255;input.setAttribute('aria-label',name);input.setAttribute('aria-checked',String(input.checked));readout=addReadout(row,index,ui,input.checked?1:0);readout.textContent=input.checked?'On':'Off';
      input.onchange=()=>{state.controls[index]=input.checked?255:0;input.setAttribute('aria-checked',String(input.checked));readout.textContent=input.checked?'On':'Off';scheduleRender();};
    }
    const usage=append(row,'span','control-usage-status visually-hidden',state.usedControls[index]?'Used':'Unused');usage.setAttribute('aria-live','off');
  }
  function buildSliders(){grid.replaceChildren();const active=CONTROL_DEFINITIONS.filter(definition=>state.usedControls[definition.index]);for(const definition of active)buildRuntimeControl(definition);el.controlsEmpty.hidden=active.length>0;applyInteractionLocks();}
  function syncSliders(){buildSliders()}
  function updateControlUsage(program){const next=program?.metadata?.controlMask?[...program.metadata.controlMask]:Array(CONTROL_COUNT).fill(true),changed=next.some((used,index)=>used!==state.usedControls[index]);state.usedControls=next;const count=state.usedControls.filter(Boolean).length,label=count?`${count} active`:'No controls used';el.controlsUsage.textContent=label;el.authorControlsUsage.textContent=label;if(changed)buildSliders();else{grid.querySelectorAll('.control-usage-status').forEach(status=>{const index=Number(status.closest('.slider-row')?.dataset.controlIndex);status.textContent=state.usedControls[index]?'Used':'Unused';});applyInteractionLocks();}if(dialog.open)renderEditorList();}
  function refreshControlUsage(){try{updateControlUsage(compileCurrentProgram())}catch{updateControlUsage(null)}}

  function draftEntry(index){return draft[index]}
  function captureEditorFields(){
    if(!draft)return;const entry=draftEntry(selectedIndex);entry.label=fields.label.value;entry.ui={widget:fields.widget.value,displayMin:fields.displayMin.value,displayMax:fields.displayMax.value,step:fields.step.value,format:fields.format.value,unit:fields.unit.value};
  }
  function loadEditorFields(){
    const entry=draftEntry(selectedIndex);fields.label.value=entry.label;fields.widget.value=entry.ui.widget;fields.displayMin.value=entry.ui.displayMin;fields.displayMax.value=entry.ui.displayMax;fields.step.value=entry.ui.step;fields.format.value=entry.ui.format;fields.unit.value=entry.ui.unit;updateEditorFieldState();renderMappingFeedback();renderPreview();
  }
  function updateEditorFieldState(){const toggle=fields.widget.value==='toggle',seed=fields.widget.value==='seed';if(seed)fields.format.value='integer';fields.displayMin.disabled=toggle;fields.displayMax.disabled=toggle;fields.step.disabled=toggle;fields.format.disabled=toggle||seed;fields.unit.disabled=false;}
  function renderEditorList(){
    if(!draft)return;editorList.replaceChildren();draft.forEach((entry,index)=>{const button=append(editorList,'button','control-editor-item');button.type='button';button.classList.toggle('active',index===selectedIndex);append(button,'span','control-editor-index',String(index));append(button,'span','control-editor-name',String(entry.label||`Control ${index+1}`));append(button,'span',state.usedControls[index]?'control-editor-used':'control-editor-unused',state.usedControls[index]?'Used':'Unused');button.setAttribute('aria-current',index===selectedIndex?'true':'false');button.onclick=()=>{captureEditorFields();selectedIndex=index;renderEditorList();loadEditorFields();};});
  }
  function currentMapping(){try{return compileCurrentProgram()?.metadata?.controlMappings?.[selectedIndex]??null}catch{return null}}
  function renderMappingFeedback(){
    mappingPanel.replaceChildren();append(mappingPanel,'strong','','Formula mapping');const mapping=currentMapping();
    if(mapping?.type==='conflict'){append(mappingPanel,'p','mapping-warning','Multiple or dynamic formula mappings detected. Automatic display-range suggestion is unavailable.');return}
    if(mapping?.type!=='val'){append(mappingPanel,'p','mapping-neutral','No simple val() mapping detected.');return}
    append(mappingPanel,'code','',`val(${selectedIndex}, ${mapping.min}, ${mapping.max})`);append(mappingPanel,'p','mapping-suggestion',`Suggested display range: ${mapping.min} → ${mapping.max}`);
    const ui=numericEditorUI(draftEntry(selectedIndex)),validSuggestion=mapping.max>mapping.min,matches=validSuggestion&&Number.isFinite(ui.displayMin)&&Number.isFinite(ui.displayMax)&&Math.abs(ui.displayMin-mapping.min)<1e-9&&Math.abs(ui.displayMax-mapping.max)<1e-9;
    if(!validSuggestion){append(mappingPanel,'p','mapping-warning','This reversed or empty mapping cannot be used as an increasing UI display range.');return}
    append(mappingPanel,'p',matches?'mapping-match':'mapping-warning',matches?'✓ Matches formula mapping':'⚠ Display range differs from formula mapping');
    const use=append(mappingPanel,'button','use-mapping-button','Use suggested range');use.type='button';use.disabled=matches;use.onclick=()=>{fields.displayMin.value=String(mapping.min);fields.displayMax.value=String(mapping.max);const range=mapping.max-mapping.min;if(!(Number(fields.step.value)>0&&Number(fields.step.value)<=range))fields.step.value='1';captureEditorFields();renderMappingFeedback();renderPreview();};
  }
  function renderPreview(){
    preview.replaceChildren();const entry=draftEntry(selectedIndex),ui=normalizeControlUI(numericEditorUI(entry)),value=rawToDisplay(state.controls[selectedIndex],ui);append(preview,'span','control-preview-label',String(entry.label||`Control ${selectedIndex+1}`));
    if(ui.widget==='toggle'){const input=append(preview,'input');input.type='checkbox';input.setAttribute('role','switch');input.checked=normalizeToggleRaw(state.controls[selectedIndex])===255;input.disabled=true;append(preview,'span','control-preview-value',input.checked?'On':'Off');return}
    const input=append(preview,'input');input.type=ui.widget==='slider'?'range':'number';input.min=String(ui.displayMin);input.max=String(ui.displayMax);input.step=String(ui.step);input.value=String(value);input.disabled=true;append(preview,'span','control-preview-value',`${formatControlValue(value,ui)}${ui.unit?` ${ui.unit}`:''}`);
  }
  function openEditor(index=0){
    draft=CONTROL_DEFINITIONS.map((definition,controlIndex)=>({label:controlName(controlIndex),ui:cloneControlUI(state.controlUIs[controlIndex])}));selectedIndex=index;editorError.textContent='';$('#controlAuthoringPreset').value='';renderEditorList();loadEditorFields();dialog.showModal();fields.label.focus();
  }
  function closeEditor(){draft=null;dialog.close('cancel')}
  function commitEditor(){
    captureEditorFields();try{
      const labels=[],uis=[];draft.forEach((entry,index)=>{const label=String(entry.label).trim();if(label.length>80)throw new Error(`Control ${index} label exceeds 80 characters`);labels.push(label||`Control ${index+1}`);uis.push(validateControlUI(numericEditorUI(entry)));});
      let valuesChanged=false;const values=state.controls.map((raw,index)=>{if(uis[index].widget!=='toggle')return raw;const normalized=normalizeToggleRaw(raw);if(normalized!==raw)valuesChanged=true;return normalized;});
      state.labels=labels;state.controlUIs=uis;state.controls=values;draft=null;dialog.close('done');syncSliders();if(valuesChanged)scheduleRender();
    }catch(error){editorError.textContent=error.message;}
  }
  Object.values(fields).forEach(field=>field.addEventListener('input',()=>{captureEditorFields();editorError.textContent='';updateEditorFieldState();renderEditorList();renderMappingFeedback();renderPreview();}));
  $('#controlAuthoringPreset').onchange=event=>{const preset=AUTHORING_PRESETS[event.target.value];if(!preset)return;draftEntry(selectedIndex).ui=cloneControlUI(preset);loadEditorFields();event.target.value='';};
  $('#editControlsBtn').onclick=()=>openEditor(0);$('#closeControlEditor').onclick=closeEditor;$('#cancelControlEditor').onclick=closeEditor;$('#doneControlEditor').onclick=commitEditor;
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
  return{buildSliders,syncSliders,updateControlUsage,refreshControlUsage,openEditor};
}


/* src/app/filter-fab-app.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */






















async function importLatestFilterFile(file,{state,cancelRender,applyFilter,beforeApply=async()=>true}){
  if(!file)return null;
  const loadId=++state.filterLoadId;
  try{
    if(Number.isFinite(Number(file.size))&&Number(file.size)>FILTER_FILE_MAX_BYTES)throw new Error(`Filter file exceeds the ${FILTER_FILE_MAX_BYTES/1024} KiB limit`);
    const text=await file.text();
    if(loadId!==state.filterLoadId)return null;
    const result=detectFilterFormat(text,file.name);
    if(state.isRendering){await cancelRender();if(loadId!==state.filterLoadId)return null;}
    if(!await beforeApply(result.data)||loadId!==state.filterLoadId)return null;
    applyFilter(result.data);
    return result;
  }catch(error){if(loadId!==state.filterLoadId)return null;throw error;}
}

function validateFilterForPersistence(filter,onError=()=>{}){try{return validateNativeFilter(filter);}catch(error){onError(error);return null;}}

function filterRenderSignature(filter){return JSON.stringify([filter.mathMode,filter.formulas,filter.controls.map(control=>typeof control==='number'?control:control.value)]);}

async function routeImageFileWithMetadata(file,{extractMetadata=extractFilterFabMetadata,validateFilter=validateNativeFilter,chooseAction,openImage,importFilter}){
  const png=String(file?.type||'').toLowerCase()==='image/png'||/\.png$/i.test(String(file?.name||''));
  if(!png)return{action:'open',opened:await openImage(file)};
  let envelope;
  try{envelope=await extractMetadata(file);}catch(error){
    const unsupported=error instanceof PngMetadataError&&error.code==='unsupported',action=await chooseAction({kind:unsupported?'unsupported':'invalid',title:unsupported?'Newer Filter FabJS metadata':'Invalid Filter FabJS metadata',detail:unsupported?'This PNG contains Filter FabJS metadata created by a newer format.':'This image contains invalid Filter FabJS metadata.',choices:[['open','Open Image Only'],['cancel','Cancel']]});
    if(action==='open')return{action,opened:await openImage(file),metadataError:error};return{action:'cancel',metadataError:error};
  }
  if(!envelope)return{action:'open',opened:await openImage(file)};
  let filter;
  try{filter=validateFilter(envelope.document);}catch(error){
    const action=await chooseAction({kind:'invalid',title:'Invalid Filter FabJS metadata',detail:'This image contains invalid Filter FabJS metadata.',choices:[['open','Open Image Only'],['cancel','Cancel']]});
    if(action==='open')return{action,opened:await openImage(file),metadataError:error};return{action:'cancel',metadataError:error};
  }
  const attribution=filter.author?`\nby ${filter.author}`:'',action=await chooseAction({kind:'valid',title:'Filter FabJS filter found',detail:`This PNG contains an embedded Filter FabJS filter: ${filter.name}${attribution}. Apply Embedded Filter keeps your current source image and loads this filter. Open Image Only opens the PNG without applying its filter.`,choices:[['import','Apply Embedded Filter'],['open','Open Image Only'],['cancel','Cancel']]});
  if(action==='import'){await importFilter(filter);return{action,filter};}
  if(action==='open')return{action,opened:await openImage(file),filter};
  return{action:'cancel',filter};
}

function applyPresetSafely(definition,selection,{applyFilter,updatePresetDeleteState,onError}){
  updatePresetDeleteState();
  try{applyFilter(definition,selection);return true;}catch(error){updatePresetDeleteState();onError(error);return false;}
}

function initializeImagePreview(data,width,height,{state,canvasView,canvas}){
  canvasView.invalidatePixels();state.width=width;state.height=height;state.source=data instanceof Uint8ClampedArray?data:new Uint8ClampedArray(data);state.filtered=state.source;canvas.width=width;canvas.height=height;canvasView.fitCanvas();canvasView.drawView();
}

const CUSTOM_PRESET_ID_PATTERN=/^[A-Za-z0-9_-]{1,80}$/;
function createCustomPresetId(){try{const uuid=globalThis.crypto?.randomUUID?.();if(uuid)return`preset-${uuid}`}catch{}return`preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)||'0'}`}
function isValidCustomPresetId(value){return typeof value==='string'&&CUSTOM_PRESET_ID_PATTERN.test(value)}
function allocateCustomPresetId(used,idFactory){for(let attempt=0;attempt<100;attempt++){const id=idFactory();if(isValidCustomPresetId(id)&&!used.has(id))return id}throw new Error('Could not create a unique custom preset ID')}
function normalizeCustomPresetList(value,idFactory=createCustomPresetId){
  if(!Array.isArray(value))return{presets:[],storageList:[],migrated:false};
  const presets=[],storageList=[],used=new Set();let migrated=false;
  value.forEach(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.name!=='string'){storageList.push(item);return}
    let id=item.id;if(!isValidCustomPresetId(id)||used.has(id)){id=allocateCustomPresetId(used,idFactory);migrated=true}
    const preset=id===item.id?item:{...item,id};used.add(id);presets.push(preset);storageList.push(preset);
  });
  return{presets,storageList,migrated};
}
function findCustomPresetById(list,id){return Array.isArray(list)?list.find(preset=>preset.id===id)||null:null}
function upsertCustomPreset(list,filter,name,idFactory=createCustomPresetId){
  const next=[...list],index=next.findIndex(item=>item.name.toLowerCase()===name.toLowerCase()),used=new Set(next.map(item=>item.id)),id=index>=0?next[index].id:allocateCustomPresetId(used,idFactory),preset={...filter,name,id};if(index>=0)next[index]=preset;else next.push(preset);return{list:next,preset};
}

// Catalogue hydration is lazy; package reuse has a separate page-session lifetime.
function createOnlineLibrarySession({manifestUrl=DEFAULT_ONLINE_LIBRARY_MANIFEST_URL,fetchImpl=globalThis.fetch,storage,preference,onChange=()=>{},timeoutMs}={}){
  let status='idle',manifest=null,error=null,promise=null,requestId=0,controller=null,entries=null,hydrated=false,provenance=null,refreshing=false,refreshWarning=null;
  const packages=createOnlinePackageCache({manifestUrl,fetchImpl});
  const getState=()=>({status,error,provenance,refreshing,refreshWarning});
  const getEntries=()=>entries??(entries=(manifest?.filters||[]).map(metadata=>onlineCatalogEntry(metadata,preference(`online:${metadata.id}`))));
  function load({retry=false}={}){
    if(promise)return promise;
    if(!retry&&(status==='ready'||status==='error'))return Promise.resolve();
    if(!hydrated){
      hydrated=true;const saved=readOnlineLibraryCache({storage,manifestUrl});
      if(saved){manifest=saved;entries=null;status='ready';provenance='saved';}
    }
    const id=++requestId;controller=new AbortController();status=manifest?'ready':'loading';refreshing=Boolean(manifest);error=null;refreshWarning=null;
    promise=fetchOnlineLibraryManifest(manifestUrl,{fetchImpl,signal:controller.signal,...(timeoutMs===undefined?{}:{timeoutMs})}).then(result=>{
      if(id!==requestId)return;
      if(manifest&&result.manifest.libraryVersion<manifest.libraryVersion){console.warn('Ignored older Online catalogue libraryVersion');throw new Error('Online catalogue libraryVersion is older than the retained catalogue');}
      manifest=result.manifest;entries=null;status='ready';provenance='network';
      packages.prune(getEntries());writeOnlineLibraryCache({storage,manifestUrl,manifest});
    }).catch(failure=>{
      if(id!==requestId)return;
      if(manifest){status='ready';refreshWarning=failure;}else{error=failure;status='error';}
    }).finally(()=>{
      if(id!==requestId)return;promise=null;controller=null;refreshing=false;onChange();
    });
    onChange();return promise;
  }
  return{getState,load,getEntries,
    invalidate:()=>{entries=null;},resolvePreview:entry=>resolveOnlineLibraryAssetUrl(manifestUrl,entry.remote.preview.url),
    fetchPackage:(entry,signal)=>packages.resolve(entry,{signal}),
    dispose:()=>{requestId++;controller?.abort();controller=null;promise=null;manifest=null;entries=null;status='idle';error=null;hydrated=false;provenance=null;refreshing=false;refreshWarning=null;packages.clear();}};
}

function initFilterFabApp({onlineManifestUrl=DEFAULT_ONLINE_LIBRARY_MANIFEST_URL,onlineFetchImpl=globalThis.fetch,onlineStorage=()=>globalThis.localStorage}={}){
  const {el,ctx}=getDom();
  const state={source:null,filtered:null,width:0,height:0,view:'filtered',workspaceMode:'explore',split:50,zoom:'fit',zoomLevel:1,controls:defaultControlValues(),labels:defaultControlLabels(),controlUIs:defaultControlUIs(),renderId:0,imageLoadId:0,filterLoadId:0,rendererManager:null,rendererPreference:storageGet('ffw-renderer','auto'),lastProgram:null,lastProgramKey:null,lastSuccessfulRenderSignature:null,lastWGSL:null,lastGpuAnalysis:null,lastRendererDiagnostics:null,isRendering:false,usedControls:Array(CONTROL_COUNT).fill(false),legacyMath:false,hasPendingFormulaChanges:false,focusSnapshot:null};
  const canvasView=createCanvasView({state,el,ctx});
  let controlsController,browser,catalogCache=null,librarySession=null;
  const onlineLibrary=createOnlineLibrarySession({manifestUrl:onlineManifestUrl,fetchImpl:onlineFetchImpl,storage:onlineStorage,preference,onChange:()=>browser?.refreshOnline()});
  const activeDocument={key:null,id:undefined,tags:[],baseline:null,recordBaseline:null,imported:false,importSource:null};

  const rendererFactories={
    cpu:()=>new CpuRenderer(workerProgram),
    webgpu:()=>new WebGpuRenderer({onCompile:({wgsl,analysis})=>{state.lastWGSL=wgsl;state.lastGpuAnalysis=analysis;}})
  };
  state.rendererManager=new RendererManager(rendererFactories);
  const thumbnailService=new FilterThumbnailService({rendererManager:new RendererManager({cpu:()=>new CpuRenderer(workerProgram),webgpu:()=>new WebGpuRenderer()}),getPreference:()=>state.rendererPreference});

  function setStatus(text,kind='good'){if(el.statusText.textContent!==text)el.statusText.textContent=text;el.statusDot.className='status-dot'+(kind==='busy'?' busy':kind==='pending'?' pending':kind==='error'?' error':'');}
  function toast(text){el.toast.textContent=text;el.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.toast.classList.remove('show'),1800);}
  const interactiveNodes=()=>Array.from(document.querySelectorAll('button,input,select,textarea'));
  function updatePresetDeleteState(){const custom=activeDocument.key?.startsWith('custom:');el.deletePreset.disabled=state.isRendering||!custom;el.deletePreset.title=custom?'Delete current saved filter':'Load a saved custom filter to delete';}
  function applyInteractionLocks(){interactiveNodes().forEach(node=>{if(librarySession&&node.closest('.filter-browser'))return;node.disabled=state.isRendering;});$$('.slider-row',$('#sliderGrid')).forEach(row=>{const index=Number(row.dataset.controlIndex),unused=!state.usedControls[index];row.classList.toggle('control-unused',unused);row.setAttribute('aria-disabled',String(state.isRendering||unused));row.title=unused?'Unused — not referenced by any channel formula':'';$$('button,input,select',row).forEach(node=>{node.disabled=state.isRendering||unused;});});updatePresetDeleteState();}
  function captureFocus(){const node=document.activeElement;if(!(node instanceof Element)||node===document.body||!node.matches('button,input,select,textarea'))return null;const snapshot={node};if(typeof node.selectionStart==='number'){snapshot.start=node.selectionStart;snapshot.end=node.selectionEnd;snapshot.direction=node.selectionDirection;}return snapshot;}
  function restoreFocus(snapshot){if(!snapshot?.node?.isConnected||snapshot.node.disabled)return;requestAnimationFrame(()=>{if(!snapshot.node.isConnected||snapshot.node.disabled)return;snapshot.node.focus({preventScroll:true});if(typeof snapshot.start==='number'&&typeof snapshot.node.setSelectionRange==='function')snapshot.node.setSelectionRange(snapshot.start,snapshot.end,snapshot.direction||'none');});}
  function setFormulaEditStatus(kind,text){el.renderBtn.classList.toggle('primary',kind==='pending');el.formulaEditStatus.dataset.state=kind;if(el.formulaEditStatus.textContent!==text)el.formulaEditStatus.textContent=text;}
  function setRendererDiagnosticsState(kind,text,title=''){el.rendererDiagnostics.dataset.state=kind;el.rendererDiagnostics.textContent=text;el.rendererDiagnostics.title=title;el.rendererReason.textContent=title;el.rendererSummary.dataset.state=kind;syncRendererSummary();}
  function syncRendererSummary(){const kind=el.rendererSummary.dataset.state,compact=kind==='gpu-eligible'?'GPU · Ready':kind==='cpu-fallback'?'CPU · Compatibility mode':kind==='cpu-selected'?'CPU · Selected':'Renderer · Checking',text=kind==='error'?'Preview unavailable':state.isRendering?'Rendering…':state.hasPendingFormulaChanges?'Preview out of date':compact;if(el.rendererSummary.textContent!==text)el.rendererSummary.textContent=text;el.rendererSummary.title=text;}
  function updateRendererDiagnostics(program,{rendererId=null,fallbackReason='',runtimeFallback=false}={}){
    const base=state.rendererManager.diagnose(program,state.rendererPreference),actualRenderer=rendererId||base.rendererId,reason=fallbackReason||base.gpuReason,mode=actualRenderer==='cpu'&&state.rendererPreference!=='cpu'&&reason?'cpu-fallback':base.mode,diagnostic={...base,rendererId:actualRenderer,mode,gpuReason:reason,runtimeFallback:Boolean(runtimeFallback)};
    const label=mode==='gpu-eligible'?'GPU eligible':mode==='cpu-fallback'?'CPU fallback':diagnostic.gpuEligible?'CPU selected · GPU eligible':diagnostic.gpuCompatible?'CPU selected · GPU unavailable':'CPU selected · GPU incompatible',passLabel=diagnostic.passes===1?'pass':'passes';
    setRendererDiagnosticsState(mode,`${label} · IR v${program.irVersion} · ${diagnostic.operationCount} ops · ${diagnostic.passes} ${passLabel}`,reason||'Current formula is compatible with the single-pass WebGPU renderer.');state.lastGpuAnalysis=diagnostic.analysis;state.lastRendererDiagnostics=diagnostic;return diagnostic;
  }
  function clearRendererDiagnostics(text,title){state.lastRendererDiagnostics=null;setRendererDiagnosticsState('error',text,title);}
  function markFormulaPending(field=null){state.hasPendingFormulaChanges=true;if(field)field.classList.add('edited');setFormulaEditStatus('pending','Preview out of date');setStatus('Preview out of date · update in Author','pending');state.lastRendererDiagnostics=null;setRendererDiagnosticsState('pending','Rechecking GPU eligibility…','Formula changes have not been validated yet.');}
  function markPreviewCurrent(){state.hasPendingFormulaChanges=false;el.formulas.forEach(field=>{field.classList.remove('edited');const icon=$('.formula-state',field.closest('.formula'));icon.textContent='✓';icon.classList.remove('pending');});setFormulaEditStatus('current','Preview ready');el.renderBtn.classList.remove('primary');}
  function setProgress(pct,row,total){const safePct=clamp(Number.isFinite(Number(pct))?Number(pct):0,0,100),safeTotal=Math.max(0,Math.trunc(Number(total)||0)),safeRow=clamp(Math.trunc(Number(row)||0),0,safeTotal||0);el.progressFill.style.width=`${safePct}%`;el.progressFill.parentElement?.setAttribute('aria-valuenow',String(Math.round(safePct)));el.progressPercent.textContent=`${Math.round(safePct)}%`;el.progressRows.textContent=safeTotal?`${safeRow} / ${safeTotal} rows`:'Preparing…';}
  function setUILocked(locked,pct=0,row=0,total=0){const wasRendering=state.isRendering,nextRendering=Boolean(locked);if(nextRendering&&!wasRendering)state.focusSnapshot=captureFocus();state.isRendering=nextRendering;document.body.classList.toggle('ui-locked',state.isRendering);document.body.setAttribute('aria-busy',String(state.isRendering));applyInteractionLocks();el.renderOverlay.classList.toggle('show',state.isRendering);el.renderOverlay.setAttribute('aria-hidden',String(!state.isRendering));if(state.isRendering)setProgress(pct,row,total);else if(wasRendering){const snapshot=state.focusSnapshot;state.focusSnapshot=null;restoreFocus(snapshot);}syncRendererSummary();}
  function initializeRendererSource(){if(!state.source||!state.width||!state.height)return Promise.resolve();return state.rendererManager.setSource(state.source,state.width,state.height);}
  async function cancelRender({silent=false}={}){if(!state.isRendering)return false;const cancelledId=++state.renderId;try{await state.rendererManager?.cancelActive();}catch(error){console.error('Renderer cancellation failed',error);}if(cancelledId!==state.renderId)return true;setUILocked(false);setProgress(0,0,state.height||0);if(!silent){setStatus('Render cancelled');el.renderInfo.textContent=`${state.rendererManager?.active?.label||'Renderer'} · cancelled`;toast('Rendering cancelled');}return true;}

  function currentProgramKey(){return JSON.stringify([state.legacyMath,...el.formulas.map(field=>field.value)])}
  function compileCurrentProgram(){const key=currentProgramKey();if(state.lastProgram&&state.lastProgramKey===key)return state.lastProgram;const astList=el.formulas.map(field=>new Parser(field.value).parse());return compileFilterProgram(astList,{legacyMath:state.legacyMath});}
  const scheduleRender=debounce(()=>{if(!state.hasPendingFormulaChanges)render();},110);
  const scheduleFormulaValidation=debounce(validatePendingFormulas,220);
  controlsController=createControlsController({state,el,scheduleRender,applyInteractionLocks,compileCurrentProgram});

  function library(){return readLibrary(localStorage,normalizeCustomPresetList);}
  function organizationError(error){browser?.showError(error.message||'Browser storage is unavailable');setStatus(error.message||'Browser storage is unavailable','error');toast(error.message||'Browser storage is unavailable');}
  function customList(){try{return library().presets;}catch(error){organizationError(error);return[];}}
  function preference(key){try{return readEntryPreference(localStorage,key);}catch(error){organizationError(error);return{version:1,favorite:false,tags:[]};}}
  function catalog(){if(catalogCache)return catalogCache;return catalogCache=[...presets.map(item=>catalogEntry(item,'builtin',preference(`builtin:${item.id}`))),...customList().map(item=>catalogEntry(item,'custom',preference(`custom:${item.id}`)))];}
  function effectiveTags(){return activeDocument.key?.startsWith('builtin:')?[...new Map([...activeDocument.tags,...preference(activeDocument.key).tags].map(tag=>[tagKey(tag),tag])).values()]:activeDocument.tags;}
  function documentSnapshot(){return portableContent({...currentFilter(),tags:activeDocument.tags});}
  function importedStatus(){return activeDocument.importSource==='online'?'Imported from Online · Not saved':activeDocument.importSource==='png'?'Imported from PNG · Not saved':'Imported · not saved';}
  function isDirty(){return activeDocument.imported||!activeDocument.key||documentSnapshot()!==activeDocument.baseline;}
  function updateActiveFilterSummary(status){
    const previewEntry=librarySession?.candidateEntry,name=$('#filterName').value.trim()||'Untitled Filter',key=previewEntry?.key||activeDocument.key,source=previewEntry?(previewEntry.source==='online'?'Online preview':previewEntry.source==='builtin'?'Built-in preview':'My Filter preview'):key?.startsWith('builtin:')?'Built-in':key?.startsWith('custom:')?'My Filter':'Unsaved',description=el.description.value.trim();
    el.activeFilterName.textContent=name;el.activeFilterSource.textContent=source;el.activeFilterStatus.textContent=status;el.activeFilterDescription.textContent=description||'No description provided.';
    if(!key||previewEntry){el.activeFavorite.hidden=Boolean(previewEntry)||!key;el.activeFavorite.setAttribute('aria-pressed','false');return;}
    const favorite=preference(key).favorite;el.activeFavorite.hidden=false;el.activeFavorite.setAttribute('aria-pressed',String(favorite));el.activeFavorite.textContent=favorite?'★ Favorited':'☆ Favorite';el.activeFavorite.setAttribute('aria-label',`${favorite?'Remove':'Add'} ${name} ${favorite?'from':'to'} favorites`);
  }
  function updateDocumentHeader({forceSelection=false}={}){
    const name=$('#filterName').value.trim()||'Untitled Filter';
    const requestedSelection=el.preset.value;
    let draft=el.preset.querySelector('[data-draft]');
    if(!activeDocument.key){if(!draft){draft=document.createElement('option');draft.value='';draft.disabled=true;draft.dataset.draft='true';el.preset.prepend(draft);}draft.textContent=`${name} · ${activeDocument.imported?importedStatus():'Not saved'}`;}else draft?.remove();
    const requestedOption=requestedSelection&&Array.from(el.preset.options).some(option=>option.value===requestedSelection);
    if(forceSelection||!requestedOption||requestedSelection===activeDocument.key)el.preset.value=activeDocument.key||'';
    el.preset.title=name;$('#savePresetBtn').textContent=activeDocument.key?.startsWith('custom:')?'Update Filter':'Save Filter';
    const previewing=Boolean(librarySession?.candidateEntry),status=previewing?'Preview · not applied':activeDocument.imported?importedStatus():!activeDocument.key?'Not saved':isDirty()?'Unsaved changes':'Saved';$('#savedDocumentStatus').textContent=status;updateActiveFilterSummary(status);updatePresetDeleteState();
  }
  function populatePresets(){
    catalogCache=null;el.preset.replaceChildren();
    const entries=catalog();
    for(const [label,accept] of [['Built-in',entry=>entry.source==='builtin'&&!entry.document.benchmark],['Performance benchmarks',entry=>entry.source==='builtin'&&entry.document.benchmark],['My Filters',entry=>entry.source==='custom']]){
      const group=document.createElement('optgroup');group.label=label;
      for(const entry of entries.filter(accept).sort((a,b)=>a.name.localeCompare(b.name)||a.key.localeCompare(b.key))){const option=document.createElement('option');option.value=entry.key;option.textContent=entry.name;group.append(option);}
      if(group.children.length)el.preset.append(group);
    }
    browser?.refresh();updateDocumentHeader({forceSelection:true});
  }
  function refreshTags(){
    const focusedTag=$('#tagChips').contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;
    const builtIn=activeDocument.key?.startsWith('builtin:'),tags=builtIn?preference(activeDocument.key).tags:activeDocument.tags;
    $('#includedTags').textContent=builtIn?`Included tags: ${activeDocument.tags.join(', ')||'None'}`:'';$('#tagHelp').textContent=builtIn?'Saved in this browser. Included tags cannot be removed.':'Up to 20 tags, 32 characters each. Spaces and punctuation are allowed.';
    const chips=$('#tagChips');chips.replaceChildren();for(const tag of tags){const button=document.createElement('button');button.textContent=`${tag} ×`;button.setAttribute('aria-label',`Remove tag ${tag}`);button.onclick=()=>{commitTags(tags.filter(item=>tagKey(item)!==tagKey(tag)));$('#newTag').focus();};chips.append(button);}
    if(focusedTag)([...chips.children].find(node=>node.getAttribute('aria-label')===focusedTag)||$('#newTag')).focus();
    const suggestions=$('#tagSuggestions');suggestions.replaceChildren();const all=[...new Set(catalog().flatMap(entry=>entry.tags))].filter(tag=>!tags.some(item=>tagKey(item)===tagKey(tag))).filter(tag=>tag.toLowerCase().includes($('#newTag').value.toLowerCase())).slice(0,50);for(const tag of all){const option=document.createElement('option');option.value=tag;suggestions.append(option);}
  }
  function commitTags(tags){try{const normalized=normalizeTags(tags);if(activeDocument.key?.startsWith('builtin:')){normalizeTags([...new Map([...activeDocument.tags,...normalized].map(tag=>[tagKey(tag),tag])).values()]);writeEntryPreference(localStorage,activeDocument.key,{tags:normalized});}else activeDocument.tags=normalized;$('#tagError').textContent='';catalogCache=null;refreshTags();populatePresets();return true;}catch(error){$('#tagError').textContent=error.message;return false;}}
  function resolveCatalogDefinition(entry){return entry.source==='builtin'?presets.find(item=>`builtin:${item.id}`===entry.key):findCustomPresetById(library().presets,entry.document.id);}
  async function loadCatalogEntry(entry,focusTarget=el.searchFilters){
    const definition=resolveCatalogDefinition(entry);
    if(!definition)throw new Error('This filter was deleted in another tab.');
    prepareFilter(definition);
    applyFilter(definition,entry.key);if(state.isRendering)state.focusSnapshot={node:focusTarget};return true;
  }
  function currentFilter(){return{format:'filter-fab-js',version:2,...(activeDocument.id?{id:activeDocument.id}:{}),tags:effectiveTags(),mathMode:state.legacyMath?'legacy':'float',name:$('#filterName').value.trim().slice(0,120)||'Untitled Filter',description:el.description.value.trim().slice(0,FILTER_DESCRIPTION_MAX_LENGTH),author:$('#filterAuthor').value.trim().slice(0,120),formulas:el.formulas.map(field=>field.value.trim()),controls:state.controls.map((value,index)=>({label:String(state.labels[index]??'').slice(0,80)||`Control ${index+1}`,value,ui:cloneControlUI(state.controlUIs[index])}))};}
  function prepareFilter(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Filter definition must be an object');
    const inputAsts=getValidatedFormulaAsts(input),definition=inputAsts?input:input.format==='filter-fab-js'?validateNativeFilter(input):input,mathMode=definition.mathMode??'float';
    if(!['float','legacy'].includes(mathMode))throw new Error('Filter mathMode must be “float” or “legacy”');
    const legacyMath=mathMode==='legacy',formulas=definition.formulas||definition.f;
    if(!Array.isArray(formulas)||formulas.length!==4||formulas.some(formula=>typeof formula!=='string'||!formula.trim()))throw new Error('Filter definition must contain exactly four formulas');
    const normalizedFormulas=formulas.map(formula=>formula.trim()),astList=inputAsts||getValidatedFormulaAsts(definition)||normalizedFormulas.map(formula=>new Parser(formula).parse()),program=compileFilterProgram(astList,{legacyMath});
    let rawValues,rawLabels,rawUIs;
    if(definition.controls!==undefined){
      if(!Array.isArray(definition.controls)||definition.controls.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} controls`);
      rawValues=definition.controls.map((control,index)=>{if(typeof control==='number')return control;if(!control||typeof control!=='object'||Array.isArray(control))throw new Error(`Control ${index+1} is malformed`);return control.value});
      rawLabels=definition.controls.map((control,index)=>typeof control==='number'?`Control ${index+1}`:control.label);
      rawUIs=definition.controls.map(control=>typeof control==='number'?undefined:control.ui);
    }else{
      rawValues=definition.values??[];rawLabels=definition.labels??[];
      rawUIs=definition.controlUIs??definition.uis??[];
      if(!Array.isArray(rawValues)||!Array.isArray(rawLabels)||rawValues.length>CONTROL_COUNT||rawLabels.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} controls`);
      if(!Array.isArray(rawUIs)||rawUIs.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} control presentations`);
    }
    const controlUIs=CONTROL_DEFINITIONS.map((definition,index)=>normalizeControlUI(rawUIs[index]));
    const controls=CONTROL_DEFINITIONS.map((definition,index)=>{const value=rawValues[index]??definition.defaultValue;if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Control ${index+1} must be a finite number`);const canonical=clamp(value,0,255);return controlUIs[index].widget==='toggle'?normalizeToggleRaw(canonical):canonical});
    const labels=CONTROL_DEFINITIONS.map((definition,index)=>{const value=rawLabels[index]??definition.defaultLabel;if(typeof value!=='string')throw new Error(`Control ${index+1} label must be a string`);const label=value.trim();if(label.length>80)throw new Error(`Control ${index+1} label exceeds 80 characters`);return label||definition.defaultLabel});
    if(definition.name!==undefined&&typeof definition.name!=='string')throw new Error('Filter name must be a string');if(definition.description!==undefined&&typeof definition.description!=='string')throw new Error('Filter description must be a string');if(definition.author!==undefined&&typeof definition.author!=='string')throw new Error('Filter author must be a string');
    const name=String(definition.name??'').trim()||'Untitled Filter',description=String(definition.description??'').trim(),author=String(definition.author??'').trim();if(name.length>120||author.length>120)throw new Error('Filter name and author are limited to 120 characters');if(description.length>FILTER_DESCRIPTION_MAX_LENGTH)throw new Error(`Filter description exceeds ${FILTER_DESCRIPTION_MAX_LENGTH} characters`);
    const tags=normalizeTags(definition.tags),id=definition.format==='filter-factory-afs'?undefined:validatePortableId(definition.id);
    return{tags,id,legacyMath,formulas:normalizedFormulas,controls,labels,controlUIs,name,description,author,program};
  }
  function requestLibraryThumbnail(entry,callback,priority=0){
    if(entry.source==='online')return;
    try{
      const definition=resolveCatalogDefinition(entry);if(!definition)throw new Error('This filter was deleted in another tab.');const prepared=prepareFilter(definition),signature=filterRenderSignature({mathMode:prepared.legacyMath?'legacy':'float',formulas:prepared.formulas,controls:prepared.controls});
      return thumbnailService.request({entryKey:entry.key,signature,program:prepared.program,controls:prepared.controls,legacyMath:prepared.legacyMath},callback,{priority});
    }catch(error){callback({state:'failed',error});return{cached:false};}
  }
  function applyPreparedPresentation(next){
    state.legacyMath=next.legacyMath;el.formulas.forEach((field,index)=>field.value=next.formulas[index]);state.controls=[...next.controls];state.labels=[...next.labels];state.controlUIs=next.controlUIs.map(cloneControlUI);state.lastProgram=next.program;state.lastProgramKey=currentProgramKey();$('#filterName').value=next.name;el.description.value=next.description;$('#filterAuthor').value=next.author;controlsController.updateControlUsage(next.program);controlsController.syncSliders();
  }
  function commitActiveDocument(next,definition,selection,{importSource=selection?null:'file'}={}){
    activeDocument.key=selection||null;activeDocument.id=selection?.startsWith('builtin:')?undefined:next.id;activeDocument.tags=[...next.tags];activeDocument.imported=!selection;activeDocument.importSource=selection?null:importSource;activeDocument.recordBaseline=selection?.startsWith('custom:')?JSON.stringify(definition):null;activeDocument.baseline=documentSnapshot();
  }
  function applyFilter(definition,selection,{importSource=selection?null:'file'}={}){
    const next=prepareFilter(definition);invalidateLibraryForReplacement();applyPreparedPresentation(next);commitActiveDocument(next,definition,selection,{importSource});refreshTags();updateDocumentHeader({forceSelection:true});markFormulaPending();render();
  }

  function captureLibraryWorkingState(){
    return{
      activeDocument:{...activeDocument,tags:[...activeDocument.tags]},
      presentation:{
        legacyMath:state.legacyMath,controls:[...state.controls],labels:[...state.labels],controlUIs:state.controlUIs.map(cloneControlUI),lastProgram:state.lastProgram,lastProgramKey:state.lastProgramKey,lastSuccessfulRenderSignature:state.lastSuccessfulRenderSignature,lastWGSL:state.lastWGSL,lastGpuAnalysis:state.lastGpuAnalysis,lastRendererDiagnostics:state.lastRendererDiagnostics,filtered:state.filtered,usedControls:[...state.usedControls],hasPendingFormulaChanges:state.hasPendingFormulaChanges,
        name:$('#filterName').value,description:el.description.value,author:$('#filterAuthor').value,
        formulas:el.formulas.map(field=>{const box=field.closest('.formula'),icon=$('.formula-state',box),error=$('.formula-error',box);return{value:field.value,className:field.className,invalid:field.getAttribute('aria-invalid'),iconClassName:icon.className,iconText:icon.textContent,errorClassName:error.className,errorText:error.textContent};})
      },
      ui:{formulaState:el.formulaEditStatus.dataset.state,formulaText:el.formulaEditStatus.textContent,statusClass:el.statusDot.className,statusText:el.statusText.textContent,renderInfo:el.renderInfo.textContent,rendererDiagnosticsState:el.rendererDiagnostics.dataset.state,rendererDiagnosticsText:el.rendererDiagnostics.textContent,rendererDiagnosticsTitle:el.rendererDiagnostics.title,rendererSummaryState:el.rendererSummary.dataset.state,rendererSummaryText:el.rendererSummary.textContent,rendererSummaryTitle:el.rendererSummary.title}
    };
  }
  function restoreLibraryWorkingState(snapshot){
    const saved=snapshot.presentation;Object.assign(activeDocument,snapshot.activeDocument);activeDocument.tags=[...snapshot.activeDocument.tags];
    state.legacyMath=saved.legacyMath;state.controls=[...saved.controls];state.labels=[...saved.labels];state.controlUIs=saved.controlUIs.map(cloneControlUI);state.lastProgram=saved.lastProgram;state.lastProgramKey=saved.lastProgramKey;state.lastSuccessfulRenderSignature=saved.lastSuccessfulRenderSignature;state.lastWGSL=saved.lastWGSL;state.lastGpuAnalysis=saved.lastGpuAnalysis;state.lastRendererDiagnostics=saved.lastRendererDiagnostics;state.filtered=saved.filtered;state.usedControls=[...saved.usedControls];state.hasPendingFormulaChanges=saved.hasPendingFormulaChanges;
    $('#filterName').value=saved.name;el.description.value=saved.description;$('#filterAuthor').value=saved.author;
    saved.formulas.forEach((formula,index)=>{const field=el.formulas[index],box=field.closest('.formula'),icon=$('.formula-state',box),error=$('.formula-error',box);field.value=formula.value;field.className=formula.className;if(formula.invalid===null)field.removeAttribute('aria-invalid');else field.setAttribute('aria-invalid',formula.invalid);icon.className=formula.iconClassName;icon.textContent=formula.iconText;error.className=formula.errorClassName;error.textContent=formula.errorText;});
    controlsController.syncSliders();refreshTags();updateDocumentHeader({forceSelection:true});
    el.renderBtn.classList.toggle('primary',snapshot.ui.formulaState==='pending');el.formulaEditStatus.dataset.state=snapshot.ui.formulaState;el.formulaEditStatus.textContent=snapshot.ui.formulaText;el.statusDot.className=snapshot.ui.statusClass;el.statusText.textContent=snapshot.ui.statusText;el.renderInfo.textContent=snapshot.ui.renderInfo;el.rendererDiagnostics.dataset.state=snapshot.ui.rendererDiagnosticsState;el.rendererDiagnostics.textContent=snapshot.ui.rendererDiagnosticsText;el.rendererDiagnostics.title=snapshot.ui.rendererDiagnosticsTitle;el.rendererReason.textContent=snapshot.ui.rendererDiagnosticsTitle;el.rendererSummary.dataset.state=snapshot.ui.rendererSummaryState;el.rendererSummary.textContent=snapshot.ui.rendererSummaryText;el.rendererSummary.title=snapshot.ui.rendererSummaryTitle;canvasView.drawView();
  }
  async function beginLibrarySession(){
    if(librarySession)return true;
    if(state.isRendering)throw new Error('Wait for the current render to finish before opening the library.');
    librarySession={originalWorkingDocument:captureLibraryWorkingState(),candidateEntry:null,candidateDefinition:null,candidatePrepared:null,candidateRendered:false,requestId:0,packageController:null,rollback:null,stopping:null,downloads:new Map()};thumbnailService.open();return true;
  }
  async function previewLibraryEntry(entry){
    if(entry.source==='online')return false;
    return previewLibraryCandidate(entry);
  }
  // A superseded render rolls back to its last completed candidate before another
  // request can present anything. The original session snapshot is never replaced.
  function stopLibraryCandidate(session){
    if(session.stopping)return session.stopping;
    if(!session.rollback)return Promise.resolve();
    const rollback=session.rollback;
    session.stopping=(async()=>{
      if(state.isRendering)await cancelRender({silent:true});
      if(librarySession===session&&session.rollback===rollback){Object.assign(session,rollback.candidate);session.rollback=null;restoreLibraryWorkingState(rollback.working);}
    })().finally(()=>{session.stopping=null;});
    return session.stopping;
  }
  async function previewLibraryCandidate(entry,onPhase=()=>{}){
    const session=librarySession;if(!session)throw new Error('The Filter Library session is no longer open.');
    const requestId=++session.requestId,isCurrent=()=>librarySession===session&&requestId===session.requestId;
    session.packageController?.abort();session.packageController=null;
    const stopped=stopLibraryCandidate(session);
    let definition,prepared;
    try{
      if(entry.source==='online'){
        const controller=new AbortController();session.packageController=controller;onPhase('loading');
        const resolved=await onlineLibrary.fetchPackage(entry,controller.signal);if(!isCurrent())return false;
        definition=resolved.document;
      }else definition=resolveCatalogDefinition(entry);
      if(!definition)throw new Error('This filter was deleted in another tab.');
      prepared=prepareFilter(definition);
      await stopped;if(!isCurrent())return false;
    }catch(error){await stopped;if(!isCurrent())return false;throw error;}
    finally{if(isCurrent())session.packageController=null;}
    const rollback={working:captureLibraryWorkingState(),candidate:{candidateEntry:session.candidateEntry,candidateDefinition:session.candidateDefinition,candidatePrepared:session.candidatePrepared,candidateRendered:session.candidateRendered}};
    session.rollback=rollback;onPhase('rendering');
    applyPreparedPresentation(prepared);session.candidateEntry=entry;session.candidateDefinition=definition;session.candidatePrepared=prepared;session.candidateRendered=false;markFormulaPending();updateDocumentHeader({forceSelection:true});
    const rendered=await render();
    if(!isCurrent())return false;
    if(!rendered){Object.assign(session,rollback.candidate);session.rollback=null;restoreLibraryWorkingState(rollback.working);throw new Error('The candidate could not be rendered. Your previous preview was restored.');}
    session.rollback=null;session.candidateRendered=true;updateDocumentHeader({forceSelection:true});return true;
  }
  function abortLibraryPackages(session){session.packageController?.abort();for(const controller of session.downloads.values())controller.abort();session.downloads.clear();}
  function invalidateLibraryForReplacement(){
    const session=librarySession;if(!session)return;
    session.requestId++;abortLibraryPackages(session);librarySession=null;
    state.renderId++;state.rendererManager?.cancelActive().catch(error=>console.warn('Candidate cancellation failed',error));setUILocked(false);
    thumbnailService.close().catch(error=>console.warn('Thumbnail cancellation failed',error));
    restoreLibraryWorkingState(session.originalWorkingDocument);browser?.invalidateSession();
  }
  async function downloadLibraryPackage(entry){
    const session=librarySession;if(!session||session.downloads.has(entry.key))return false;
    const controller=new AbortController();session.downloads.set(entry.key,controller);
    try{
      const result=await onlineLibrary.fetchPackage(entry,controller.signal);
      if(librarySession!==session||controller.signal.aborted)return false;
      return downloadBlob(new Blob([result.bytes],{type:'image/png'}),onlinePackageFilename(result.document.id));
    }catch(error){if(librarySession!==session||controller.signal.aborted)return false;throw error;}
    finally{session.downloads.delete(entry.key);}
  }
  async function cancelLibrarySession(){
    const session=librarySession;if(!session)return true;const requestId=++session.requestId;abortLibraryPackages(session);
    await stopLibraryCandidate(session);
    await thumbnailService.close();
    if(state.isRendering)await cancelRender({silent:true});
    if(librarySession!==session||requestId!==session.requestId)return false;librarySession=null;restoreLibraryWorkingState(session.originalWorkingDocument);return true;
  }
  async function applyLibraryCandidate(){
    const session=librarySession;if(!session?.candidateEntry||!session.candidatePrepared||!session.candidateRendered)throw new Error('Choose a successfully rendered candidate first.');
    if(session.candidateEntry.source==='custom'){
      const current=resolveCatalogDefinition(session.candidateEntry);if(!current)throw new Error('This filter was deleted in another tab.');if(JSON.stringify(current)!==JSON.stringify(session.candidateDefinition))throw new Error('This filter changed in another tab. Preview the updated filter before applying it.');
    }
    const requestId=++session.requestId;abortLibraryPackages(session);await thumbnailService.close();if(librarySession!==session||requestId!==session.requestId)return false;librarySession=null;
    const online=session.candidateEntry.source==='online';commitActiveDocument(session.candidatePrepared,session.candidateDefinition,online?null:session.candidateEntry.key,{importSource:online?'online':null});refreshTags();updateDocumentHeader({forceSelection:true});toast(`${session.candidatePrepared.name} applied`);return true;
  }

  function compileAll({cache=true}={}){const key=currentProgramKey();if(cache&&state.lastProgram&&state.lastProgramKey===key){controlsController.updateControlUsage(state.lastProgram);updateRendererDiagnostics(state.lastProgram);return state.lastProgram}const astList=[];let ok=true;el.formulas.forEach(field=>{const box=field.closest('.formula'),icon=$('.formula-state',box),errorElement=$('.formula-error',box);try{astList.push(new Parser(field.value).parse());field.classList.remove('invalid');field.setAttribute('aria-invalid','false');icon.textContent=field.classList.contains('edited')?'•':'✓';icon.classList.remove('bad');icon.classList.toggle('pending',field.classList.contains('edited'));errorElement.textContent='';errorElement.classList.remove('show');}catch(error){ok=false;astList.push(null);field.classList.add('invalid');field.setAttribute('aria-invalid','true');icon.textContent='!';icon.classList.remove('pending');icon.classList.add('bad');errorElement.textContent=`${error.message} at character ${(error.pos??0)+1}`;errorElement.classList.add('show');}});if(!ok){controlsController.updateControlUsage(null);clearRendererDiagnostics('GPU diagnostics unavailable','Fix formula errors to inspect renderer eligibility.');return null;}try{const program=compileFilterProgram(astList,{legacyMath:state.legacyMath});if(cache){state.lastProgram=program;state.lastProgramKey=key}controlsController.updateControlUsage(program);updateRendererDiagnostics(program);return program;}catch(error){console.error('IR compilation failed',error);setStatus(`Compiler error: ${error.message}`,'error');controlsController.updateControlUsage(null);clearRendererDiagnostics('GPU diagnostics unavailable',error.message);return null;}}
  function showFormulaFailure(){const hasFieldError=el.formulas.some(field=>field.classList.contains('invalid'));setFormulaEditStatus('invalid',hasFieldError?'Fix formula errors':'Compiler error');clearRendererDiagnostics('GPU diagnostics unavailable',hasFieldError?'Fix formula errors to inspect renderer eligibility.':'The typed IR could not be compiled.');if(hasFieldError)setStatus('Fix formula errors before rendering','error');}
  function validatedCurrentFilter(){return validateFilterForPersistence(currentFilter(),error=>{console.error('Filter validation failed',error);compileAll();showFormulaFailure();setStatus(`Filter validation error: ${error.message}`,'error');toast(`Filter validation failed: ${error.message}`);});}
  function validatePendingFormulas(){if(!state.hasPendingFormulaChanges||state.isRendering)return;const program=compileAll({cache:false});if(program){setFormulaEditStatus('pending','Preview out of date · formula valid');setStatus('Formula valid · Update Preview in Author','pending');}else showFormulaFailure();}
  async function render({focusInvalid=false}={}){
    if(!state.source||state.isRendering)return false;
    thumbnailService.suspend();
    const program=compileAll();
    if(!program){
      showFormulaFailure();
      if(focusInvalid)el.formulas.find(field=>field.classList.contains('invalid'))?.focus();
      thumbnailService.resume();
      return false;
    }
    const id=++state.renderId,renderSignature=filterRenderSignature(currentFilter()),irLabel=`IR v${program.irVersion} · ${program.metadata.nodeCount} ops`;
    setUILocked(true,0,0,state.height||0);
    setStatus('Rendering…','busy');
    el.renderInfo.textContent=`${irLabel} · selecting renderer…`;
    let selection=null,runtimeFallback=false;
    try{
      const outcome=await state.rendererManager.renderWithFallback({id,program,preference:state.rendererPreference,controls:[...state.controls],legacyMath:state.legacyMath,isCurrent:()=>id===state.renderId,onSelection:(next,context)=>{
        if(id!==state.renderId)return;selection=next;runtimeFallback=context.runtimeFallback;updateRendererDiagnostics(program,{rendererId:next.renderer.id,fallbackReason:next.fallbackReason,runtimeFallback});const fallback=next.fallbackReason?' · CPU fallback':'';setStatus('Rendering…','busy');el.renderInfo.textContent=`${next.renderer.label}${fallback} · ${irLabel} · preparing…`;
      },onProgress:message=>{
        if(id!==state.renderId||!selection)return;const fallback=selection.fallbackReason?' · CPU fallback':'';setProgress(message.pct,message.row,message.total);el.renderInfo.textContent=`${selection.renderer.label}${fallback} · ${irLabel} · ${message.row} / ${message.total} rows`;
      }}),result=outcome.result;
      if(id!==state.renderId)return false;
      state.filtered=result.pixels;
      state.lastSuccessfulRenderSignature=renderSignature;
      canvasView.drawView();
      markPreviewCurrent();
      setStatus(outcome.fallbackReason?'Preview ready · CPU compatibility mode':'Preview ready');
      const reason=outcome.fallbackReason?` · ${outcome.fallbackReason}`:'';
      el.renderInfo.textContent=`${result.label} · ${irLabel} · ${result.ms.toFixed(0)} ms${reason}`;
      updateRendererDiagnostics(program,{rendererId:result.backend,fallbackReason:outcome.fallbackReason,runtimeFallback:outcome.runtimeFallback});
      return true;
    }catch(error){
      if(id!==state.renderId||error?.name==='RenderCancelledError')return false;
      console.error('Render failed',error);
      setStatus('Preview unavailable · see Technical diagnostics in Author','error');
      el.renderInfo.textContent=`${selection?.renderer?.label||'Renderer'} · ${irLabel} · error`;
      setRendererDiagnosticsState('error',`Renderer error · ${irLabel}`,error.message);
      return false;
    }finally{
      if(id===state.renderId)setUILocked(false);thumbnailService.resume();
    }
  }

  function initImage(data,width,height){state.renderId++;invalidateLibraryForReplacement();$('#openImageBtn').classList.remove('primary');state.lastSuccessfulRenderSignature=null;if(state.isRendering)setUILocked(false);initializeImagePreview(data,width,height,{state,canvasView,canvas:el.canvas});el.imageInfo.textContent=`${width} × ${height} px`;thumbnailService.setSource(state.source,width,height).catch(error=>console.warn('Thumbnail source initialization failed',error));initializeRendererSource().catch(error=>{console.error('Renderer initialization failed',error);setStatus('Preview unavailable · see Technical diagnostics in Author','error');});render();}
  function demoImage(){const width=960,height=640,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),background=context.createLinearGradient(0,0,width,height);background.addColorStop(0,'#08050d');background.addColorStop(.48,'#6c47b1');background.addColorStop(1,'#c429a3');context.fillStyle=background;context.fillRect(0,0,width,height);for(let i=0;i<18;i++){context.globalAlpha=.09;context.fillStyle=i%2?'#fff':'#07111f';context.beginPath();context.arc(90+i*58,90+(i%4)*130,60+(i%3)*35,0,Math.PI*2);context.fill();}context.globalAlpha=1;context.fillStyle='rgba(6,16,5,.82)';context.roundRect(84,94,792,452,36);context.fill();context.fillStyle='#f6efc4';context.font='700 62px system-ui';context.fillText('FILTER',132,245);context.fillStyle='#e1ec1a';context.fillText('FABJS',132,316);context.font='24px system-ui';context.fillStyle='#cdddb7';context.fillText('Open an image or experiment with this demo.',136,370);const gradient=context.createLinearGradient(136,0,790,0);gradient.addColorStop(0,'#e45a87');gradient.addColorStop(.5,'#9fd36a');gradient.addColorStop(1,'#38a9d4');context.fillStyle=gradient;context.fillRect(136,412,654,18);return context.getImageData(0,0,width,height);}
  async function loadImageFile(file,{successMessage='Image loaded',requestId=null}={}){if(!file||!String(file.type||'').startsWith('image/')){toast('Choose a valid image file');return false;}const loadId=requestId??++state.imageLoadId;let bitmap=null;setStatus('Loading image…','busy');try{bitmap=await createImageBitmap(file);if(loadId!==state.imageLoadId)return false;const maximum=1800,scale=Math.min(1,maximum/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas image loading is unavailable');context.drawImage(bitmap,0,0,width,height);const pixels=context.getImageData(0,0,width,height).data;if(loadId!==state.imageLoadId)return false;initImage(pixels,width,height);toast(scale<1?`${successMessage} · resized to 1800 px`:successMessage);return true;}catch(error){if(loadId!==state.imageLoadId)return false;setStatus('Could not load image','error');toast(error.message||'Could not load image');return false;}finally{bitmap?.close?.();}}
  async function openImageFile(file){
    if(!file)return false;const requestId=++state.imageLoadId;
    const result=await routeImageFileWithMetadata(file,{chooseAction:async({title,detail,choices})=>(await chooseFilterAction(title,choices,{detail})).action,openImage:image=>requestId===state.imageLoadId?loadImageFile(image,{requestId}):false,importFilter:async filter=>{if(requestId!==state.imageLoadId)return false;if(state.isRendering)await cancelRender();if(requestId!==state.imageLoadId)return false;applyFilter(filter,null,{importSource:'png'});toast('Filter imported from PNG');return true;}});
    return result.action!=='cancel';
  }

  function isEditableTarget(target){return target instanceof Element&&(target.matches('input,textarea,select,[contenteditable="true"]')||Boolean(target.closest('[contenteditable="true"]')));}
  async function copyImageToClipboard(){if(state.isRendering)return;const ClipboardItemCtor=globalThis.ClipboardItem;if(!navigator.clipboard?.write||!ClipboardItemCtor){toast('Image copy is unavailable in this browser');return;}setStatus('Encoding RGBA PNG…','busy');try{const expected=alphaStats(state.filtered),blob=await canvasBlob(renderedImageCanvas(state.filtered,state.width,state.height),'image/png');await verifyPngAlpha(blob,expected);setStatus('Writing image to clipboard…','busy');await writePngClipboard(blob);if(expected.hasAlpha){setStatus(`Ready · PNG alpha ${expected.min}–${expected.max}`);toast('RGBA PNG copied · alpha preserved');}else{setStatus('Ready · copied image is opaque');toast('PNG copied · output has no transparent pixels');}}catch(error){console.error('Clipboard copy failed',error);setStatus('Clipboard copy unavailable','error');toast(error?.name==='NotAllowedError'?'Clipboard permission was blocked by the browser':`Copy failed: ${error.message||'clipboard unavailable'}`);}}
  async function pasteImageFromClipboard(){if(state.isRendering)return;if(!navigator.clipboard?.read){toast('Clipboard reading is unavailable. Press Ctrl/⌘+V instead.');return;}setStatus('Reading clipboard…','busy');try{const items=await navigator.clipboard.read();for(const item of items){const types=Array.from(item.types||[]),type=['web image/png','image/png',...types.filter(value=>String(value).startsWith('image/'))].find(value=>types.includes(value));if(!type)continue;const raw=await item.getType(type),mime=String(type).replace(/^web\s+/,'');const blob=String(raw.type||'').startsWith('image/')?raw:new Blob([raw],{type:mime});await loadImageFile(blob,{successMessage:'Image pasted from clipboard'});return;}setStatus('Ready');toast('Clipboard does not contain an image');}catch(error){console.error('Clipboard paste failed',error);setStatus('Clipboard paste unavailable','error');toast(error?.name==='NotAllowedError'?'Clipboard permission was blocked. Press Ctrl/⌘+V instead.':`Paste failed: ${error.message||'clipboard unavailable'}`);}}

  function triggerDownload(href,name,revoke=false){try{const anchor=document.createElement('a');anchor.href=href;anchor.download=name;anchor.rel='noopener';anchor.style.display='none';document.body.appendChild(anchor);anchor.click();setTimeout(()=>{anchor.remove();if(revoke)URL.revokeObjectURL(href);},10000);toast(`Download started: ${name}`);return true;}catch(error){if(revoke)URL.revokeObjectURL(href);console.error('Download failed',error);toast(`Download failed: ${error.message||'browser blocked the file'}`);return false;}}
  function downloadBlob(blob,name){if(!(blob instanceof Blob)||!blob.size){toast('Nothing was generated to download');return false;}return triggerDownload(URL.createObjectURL(blob),name,true);}
  async function exportPNG(){if(!state.filtered||!state.width||!state.height){toast('Load and render an image before exporting');return;}const filter=validatedCurrentFilter();if(!filter)return;if(state.lastSuccessfulRenderSignature!==filterRenderSignature(filter)){setStatus('Render the current filter changes before exporting.','error');toast('Render the current filter changes before exporting.');return;}setStatus('Encoding PNG…','busy');try{const canvas=renderedImageCanvas(state.filtered,state.width,state.height),name=slug($('#filterName').value||'filtered-image')+'.png',encoded=await canvasBlob(canvas,'image/png'),envelope=createFilterFabPngEnvelope(filter,'2.9.1'),blob=await embedFilterFabMetadata(encoded,envelope);if(downloadBlob(blob,name))setStatus('Ready');}catch(error){console.error('PNG export failed',error);setStatus('PNG export failed','error');toast(`PNG export failed: ${error.message}`);}}
  function exportFilter(){const filter=validatedCurrentFilter();if(!filter)return;if(!activeDocument.id)activeDocument.id=createCustomPresetId();filter.id=activeDocument.id;const base=slug(filter.name);try{downloadBlob(new Blob([JSON.stringify(filter,null,2)+'\n'],{type:'application/json;charset=utf-8'}),base+'.json');}catch(error){console.error('Filter export failed',error);toast(`Filter export failed: ${error.message}`);}}
  async function deletePreset(){
    if(!activeDocument.key?.startsWith('custom:'))return;
    try{
      const id=activeDocument.id,dirty=isDirty(),{action}=await chooseFilterAction(`Delete “${$('#filterName').value}” from My Filters?`,dirty?[['keep','Delete and keep unsaved draft'],['cancel','Cancel']]:[['delete','Delete'],['cancel','Cancel']]);
      if(!['keep','delete'].includes(action))return;
      const {storageList}=library();localStorage.setItem('ffw-custom-presets',JSON.stringify(storageList.filter(item=>item?.id!==id)));
      try{localStorage.removeItem(PREFERENCE_PREFIX+`custom:${id}`);}catch(error){organizationError(error);}
      catalogCache=null;
      if(action==='keep'){activeDocument.key=null;activeDocument.id=undefined;activeDocument.imported=false;activeDocument.importSource=null;activeDocument.recordBaseline=null;refreshTags();}else applyFilter(presets.find(item=>item.id==='pass'),'builtin:pass');
      populatePresets();
    }catch(error){organizationError(error);}
  }
  async function importFilterFile(file){if(!file)return;try{const result=await importLatestFilterFile(file,{state,cancelRender,applyFilter});if(!result)return;toast(result.kind==='afs'?'AFS filter imported · CPU legacy mode':'Filter FabJS project imported');}catch(error){console.error('Filter import failed',error);toast(`Import failed: ${error.message}`);}finally{el.filterInput.value='';}}
  async function savePreset(){
    const filter=validatedCurrentFilter();if(!filter){await chooseFilterAction('Could not save filter',[['cancel','Keep editing']],{detail:el.statusText.textContent});return false;}
    try{
      let list=library().presets,targetId=activeDocument.key?.startsWith('custom:')?activeDocument.id:null,expected=activeDocument.recordBaseline;
      const duplicateName=list.some(item=>item.name.toLowerCase()===filter.name.toLowerCase()&&item.id!==targetId&&item.id!==filter.id);
      const choice=await chooseFilterAction('Save filter',targetId?[['update','Update Filter'],['copy','Save as New'],['cancel','Cancel']]:[['save','Save Filter'],['cancel','Cancel']],{name:duplicateName?`${filter.name.slice(0,113)} (copy)`:filter.name,detail:duplicateName?'Another filter has this name. A distinct name is suggested; same-name copies are allowed.':'Saved in this browser. Export also keeps a portable copy.'});
      if(choice.action==='cancel')return false;filter.name=choice.name;
      if(choice.action==='copy'){targetId=null;filter.id=createCustomPresetId();}
      else if(!targetId&&!filter.id)filter.id=createCustomPresetId();
      list=library().presets;
      const existing=findCustomPresetById(list,targetId||filter.id);
      if(targetId&&(!existing||JSON.stringify(existing)!==expected)){
        const conflict=await chooseFilterAction('This filter changed in another tab.',existing?[['update','Update existing with my draft'],['copy','Save as New'],['cancel','Cancel']]:[['copy','Save as New'],['cancel','Cancel']],{detail:existing?`Current saved filter: ${existing.name}. Updated: ${existing.updatedAt||'unknown'}. Updating replaces that saved content with your draft.`:'The saved record was deleted. Your draft is still here.'});
        if(conflict.action==='cancel')return false;
        if(conflict.action==='copy'){targetId=null;filter.id=createCustomPresetId();}else expected=JSON.stringify(existing);
      }else if(!targetId&&existing){
        let equal=false;try{equal=portableContent(validateNativeFilter(existing))===portableContent(filter);}catch{}
        const conflict=await chooseFilterAction(equal?'Already saved':'An existing filter has this ID.',equal?[['use','Use saved record'],['copy','Save as New'],['cancel','Cancel']]:[['update','Update existing'],['copy','Save as New'],['cancel','Cancel']]);
        if(conflict.action==='cancel')return false;
        if(conflict.action==='use'){adoptSaved(existing);return true;}
        if(conflict.action==='copy')filter.id=createCustomPresetId();else{targetId=existing.id;expected=JSON.stringify(existing);}
      }
      const record=writeLibraryRecord(localStorage,normalizeCustomPresetList,filter,{targetId,expected});adoptSaved(record);toast('Filter saved in this browser');return true;
    }catch(error){organizationError(error);await chooseFilterAction('Could not save filter',[['cancel','Keep editing']],{detail:error.message});return false;}
  }
  function adoptSaved(record){activeDocument.key=`custom:${record.id}`;activeDocument.id=record.id;activeDocument.tags=normalizeTags(record.tags);activeDocument.imported=false;activeDocument.importSource=null;activeDocument.recordBaseline=JSON.stringify(record);$('#filterName').value=record.name;activeDocument.baseline=documentSnapshot();refreshTags();populatePresets();}

  function wire(){
    const modeButtons=$$('#workspaceMode [role="tab"]'),modePanels=$$('[data-mode-panel]');
    function setWorkspaceMode(mode){if(!['explore','author'].includes(mode)||mode===state.workspaceMode)return;state.workspaceMode=mode;document.body.dataset.workspaceMode=mode;modeButtons.forEach(button=>{const selected=button.dataset.workspaceMode===mode;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});modePanels.forEach(panel=>panel.hidden=panel.dataset.modePanel!==mode);}
    modeButtons.forEach(button=>{button.onclick=()=>setWorkspaceMode(button.dataset.workspaceMode);button.onkeydown=event=>{const index=modeButtons.indexOf(button),offset=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0,target=event.key==='Home'?0:event.key==='End'?modeButtons.length-1:offset?(index+offset+modeButtons.length)%modeButtons.length:-1;if(target<0)return;event.preventDefault();setWorkspaceMode(modeButtons[target].dataset.workspaceMode);modeButtons[target].focus();};});
    el.rendererSelect.value=['auto','webgpu','cpu'].includes(state.rendererPreference)?state.rendererPreference:'auto';
    el.rendererSelect.onchange=()=>{state.rendererPreference=el.rendererSelect.value;storageSet('ffw-renderer',state.rendererPreference);if(!state.hasPendingFormulaChanges)render();else validatePendingFormulas();};
    $('#openImageBtn').onclick=()=>el.imageInput.click();
    el.imageInput.onchange=async()=>{await openImageFile(el.imageInput.files[0]);el.imageInput.value='';};
    $('#pasteImageBtn').onclick=pasteImageFromClipboard;
    $('#copyImageBtn').onclick=copyImageToClipboard;
    $('#importBtn').onclick=()=>el.filterInput.click();
    el.filterInput.onchange=()=>importFilterFile(el.filterInput.files[0]);
    $('#exportFilterBtn').onclick=exportFilter;
    $('#exportImageBtn').onclick=exportPNG;
    $('#savePresetBtn').onclick=savePreset;
    el.deletePreset.onclick=deletePreset;
    el.renderBtn.onclick=()=>render({focusInvalid:true});
    const resetFilter=()=>applyFilter(presets.find(preset=>preset.id==='pass'),'builtin:pass');$('#resetBtn').onclick=resetFilter;$('#exploreResetBtn').onclick=resetFilter;
    el.activeFavorite.onclick=()=>{if(!activeDocument.key)return;try{const current=preference(activeDocument.key);writeEntryPreference(localStorage,activeDocument.key,{favorite:!current.favorite});catalogCache=null;browser?.refresh();updateDocumentHeader();}catch(error){organizationError(error);}};
    browser=createFilterBrowser({launcher:el.searchFilters,getEntries:()=>[...catalog(),...onlineLibrary.getEntries()],getOnlineState:onlineLibrary.getState,loadOnline:onlineLibrary.load,resolveOnlinePreviewUrl:onlineLibrary.resolvePreview,begin:beginLibrarySession,preview:previewLibraryEntry,previewOnline:previewLibraryCandidate,downloadOnline:downloadLibraryPackage,apply:applyLibraryCandidate,cancel:cancelLibrarySession,toggleFavorite:entry=>{writeEntryPreference(localStorage,entry.key,{favorite:!entry.favorite});catalogCache=null;onlineLibrary.invalidate();if(entry.key===activeDocument.key)updateDocumentHeader();},requestThumbnail:requestLibraryThumbnail,clearThumbnailRequests:()=>thumbnailService.clearRequests(),onError:organizationError});
    populatePresets();
    el.preset.onchange=async()=>{
      const key=el.preset.value;
      if(key===activeDocument.key)return;
      const entry=catalog().find(item=>item.key===key);if(!entry)return;
      try{await loadCatalogEntry(entry,el.preset);}catch(error){organizationError(error);}finally{updateDocumentHeader({forceSelection:true});}
    };
    const addTag=()=>{const tags=activeDocument.key?.startsWith('builtin:')?preference(activeDocument.key).tags:activeDocument.tags;if(commitTags([...tags,$('#newTag').value])){$('#newTag').value='';refreshTags();$('#newTag').focus();}};
    $('#addTagBtn').onclick=addTag;$('#newTag').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();addTag();}};$('#newTag').oninput=refreshTags;
    // The preset's native input event precedes change. Only its own change handler
    // may restore the selection, after capturing the requested ID.
    document.addEventListener('input',event=>{if(event.target!==el.preset&&event.target.closest('.sidebar'))queueMicrotask(updateDocumentHeader);});
    document.addEventListener('change',event=>{if(event.target!==el.preset&&event.target.closest('.sidebar'))queueMicrotask(updateDocumentHeader);});
    $('#editControlsDialog').addEventListener('close',updateDocumentHeader);
    el.formulas.forEach(field=>{
      field.oninput=()=>{
        const box=field.closest('.formula'),icon=$('.formula-state',box),errorElement=$('.formula-error',box);
        field.classList.remove('invalid');
        field.setAttribute('aria-invalid','false');
        icon.textContent='…';
        icon.classList.remove('bad');
        icon.classList.add('pending');
        errorElement.textContent='';
        errorElement.classList.remove('show');
        markFormulaPending(field);
        scheduleFormulaValidation();
      };
      field.onblur=validatePendingFormulas;
      field.onkeydown=event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();render({focusInvalid:true});}};
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&state.isRendering){event.preventDefault();event.stopPropagation();cancelRender();return;}if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='c'&&!state.isRendering&&!isEditableTarget(event.target)){event.preventDefault();copyImageToClipboard();}});
    document.addEventListener('paste',event=>{if(state.isRendering||isEditableTarget(event.target)||document.querySelector('dialog[open]'))return;const image=imageFromClipboardData(event.clipboardData);if(!image)return;event.preventDefault();loadImageFile(image,{successMessage:'Image pasted from clipboard'});});
    $$('#viewMode button').forEach(button=>button.onclick=()=>{$$('#viewMode button').forEach(item=>{item.classList.remove('active');item.setAttribute('aria-pressed',String(item===button));});button.classList.add('active');state.view=button.dataset.view;canvasView.drawView();});
    $('#zoomFit').onclick=canvasView.fitCanvas;
    $('#zoomIn').onclick=()=>canvasView.zoom(1.2);
    $('#zoomOut').onclick=()=>canvasView.zoom(1/1.2);
    window.onresize=debounce(()=>{if(state.zoom==='fit')canvasView.fitCanvas();},100);
    let dragDepth=0;
    const hasFiles=event=>Array.from(event.dataTransfer?.types||[]).includes('Files'),hideDrop=()=>{dragDepth=0;el.drop.classList.remove('show');};
    el.stage.addEventListener('dragenter',event=>{event.preventDefault();if(state.isRendering||!hasFiles(event))return;dragDepth++;el.drop.classList.add('show');});
    el.stage.addEventListener('dragover',event=>{event.preventDefault();if(state.isRendering||!hasFiles(event))return;if(event.dataTransfer)event.dataTransfer.dropEffect='copy';el.drop.classList.add('show');});
    el.stage.addEventListener('dragleave',event=>{event.preventDefault();if(state.isRendering)return;dragDepth=Math.max(0,dragDepth-1);if(dragDepth===0)el.drop.classList.remove('show');});
    el.stage.addEventListener('drop',event=>{event.preventDefault();hideDrop();if(state.isRendering)return;openImageFile(event.dataTransfer?.files?.[0]);});
    document.addEventListener('dragend',hideDrop);
    window.addEventListener('blur',hideDrop);
    $('#helpBtn').onclick=()=>$('#helpDialog').showModal();
    $('#closeHelp').onclick=()=>$('#helpDialog').close();
    window.addEventListener('storage',event=>{if(event.key===null||event.key==='ffw-custom-presets'||event.key.startsWith(PREFERENCE_PREFIX)){
      if(activeDocument.key?.startsWith('custom:')){try{const record=findCustomPresetById(library().presets,activeDocument.id);if(!record){activeDocument.key=null;activeDocument.id=undefined;activeDocument.imported=false;activeDocument.importSource=null;toast('Saved filter deleted in another tab. Save as new to keep this draft.');}else if(JSON.stringify(record)!==activeDocument.recordBaseline)toast('Saved filter changed in another tab. Update will require review.');}catch(error){organizationError(error);}}
      catalogCache=null;onlineLibrary.invalidate();refreshTags();populatePresets();
    }});
    window.addEventListener('beforeunload',()=>{if(librarySession)abortLibraryPackages(librarySession);onlineLibrary.dispose();thumbnailService.dispose();state.rendererManager?.dispose();});
  }

  window.FilterFabJS=Object.freeze({version:'2.9.1',irVersion:IR_VERSION,getLastProgram:()=>state.lastProgram?JSON.parse(JSON.stringify(state.lastProgram)):null,getLastWGSL:()=>state.lastWGSL,getWebGPUAnalysis:()=>state.lastGpuAnalysis?JSON.parse(JSON.stringify(state.lastGpuAnalysis)):null,getRendererDiagnostics:()=>state.lastRendererDiagnostics?JSON.parse(JSON.stringify(state.lastRendererDiagnostics)):null,getThumbnailDiagnostics:()=>thumbnailService.diagnostics(),getRendererPreference:()=>state.rendererPreference,getWorkspaceMode:()=>state.workspaceMode,getLibraryPreviewState:()=>({open:Boolean(librarySession),candidateKey:librarySession?.candidateEntry?.key||null,candidateRendered:Boolean(librarySession?.candidateRendered),activeKey:activeDocument.key,activeId:activeDocument.id,imported:activeDocument.imported,importSource:activeDocument.importSource,baseline:activeDocument.baseline,recordBaseline:activeDocument.recordBaseline})});
  controlsController.buildSliders();wire();const demo=demoImage();initImage(demo.data,demo.width,demo.height);applyFilter(presets.find(preset=>preset.id==='pass'),'builtin:pass');
  return{state,render,applyFilter,loadImageFile,openImageFile};
}


/* src/main.js */
/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

initFilterFabApp();

})();
