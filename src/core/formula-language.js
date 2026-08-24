/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
export const ARITY={src:3,rad:3,ctl:1,val:3,map:2,min:2,max:2,abs:1,add:3,sub:3,dif:2,rnd:2,mix:4,scl:5,sqr:1,sqrt:1,sin:1,cos:1,tan:1,r2x:2,r2y:2,c2d:2,c2m:2,radius:2,angle:2,get:1,put:2,cnv:10,rst:1,pow:2,src0:3,src1:3,rad0:3,rad1:3,cnv0:10,cnv1:10,clamp:3,lerp:3,step:2,smoothstep:3,floor:1,ceil:1,round:1,fract:1,sign:1,bias:2,gain:2,hash2:3,valueNoise:4,perlin:4,worleyF1:4,worleyF2:4,fbm:7,turbulence:5,ridged:5,periodicNoise:5,mandelbrot:3,julia:5,wrap:2,mirror:2,repeat:2,mirrorRepeat:2,gradient3:4,gradient4:5,srcWrap:3,srcMirror:3,srcLinear:3,linearGrad:6,radialGrad:5,angularGrad:5,checker:4,brick:6,line:8,circle:6,ring:7,box:8,triangle:9,grid:6,sierpinski:7,multiply:[2,3],screen:[2,3],overlay:[2,3],softLight:[2,3],difference:[2,3]};
export const VARS=new Set(('r g b a c i u v x y nx ny cx cy z p d m X Y Z P D M R G B A C I U V t rmax gmax bmax amax cmax imax umax vmax dmax mmax pmax xmax ymax zmax rmin gmin bmin amin cmin imin umin vmin dmin mmin pmin xmin ymin zmin r0 g0 b0 a0 c0 i0 u0 v0 d0 m0 r1 g1 b1 a1 c1 i1 u1 v1 d1 m1 tmin tmax total').split(' '));
export const FORMULA_LIMITS=Object.freeze({maxLength:8192,maxTokens:4096,maxNodes:4096,maxDepth:128});
export const MAX_FRACTAL_ITERATIONS=256;

export class FormulaError extends Error{constructor(message,pos=0){super(message);this.name='FormulaError';this.pos=pos}}

export class Tokenizer{
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

export class Parser{
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
