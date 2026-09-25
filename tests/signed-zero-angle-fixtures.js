// Expected raw CPU values are explicit; hardware checks use an encoded angle
// and a nested consumer so byte clamping cannot hide semantic negative zero.
export const signedZeroAngleFixtures=[];
const add=(formula,expected)=>signedZeroAngleFixtures.push({formula,expected:typeof expected==='function'?expected:()=>expected});
const negative=v=>v<0||Object.is(v,-0);
for(const alias of ['c2d','angle']){
  for(const [x,y,value] of [
    ['0','0',0],['-0','0',512],['0','-0',-0],['-0','-0',-512],
    ['1','0',0],['-1','0',512],['1','-0',-0],['-1','-0',-512],
    ['0','1',256],['-0','1',256],['0','-1',-256],['-0','-1',-256],
    ['1','1',128],['-1','1',384],['1','-1',-128],['-1','-1',-384]
  ])add(`${alias}(${x},${y})`,value);
  for(const [zero,expected] of [
    ['0*-1',-0],['-1*0',-0],['0/-1',-0],['-0/1',-0],['-0*1',-0],
    ['-(-0)',0],['0+-0',0],['-0+0',0],['-0+-0',-0],['0-0',0],['-0-0',-0],['-0-(-0)',0],
    ['-0/0',0],['-1%-1',-0],['-0%0',0],['x-x',0],['-(x-x)',-0],
    ['(x-x)*-1',-0],['0*(x? -1:1)',x=>x?-0:0],['(x-x)/-1',-0],
    ['x?-0:0',x=>x?-0:0],['x?0:-0',x=>x?0:-0],
    ['(x?-0:0)+(x?-0:0)',x=>x?-0:0],['(x?-0:0)+0',0],['(x?-0:0)-0',x=>x?-0:0],
    ['ctl(0)',-0],['ctl(1)',0],['ctl(x?0:1)',x=>x?-0:0],['ctl(-1)',0],['ctl(100)',0],
    ['ctl(0)+ctl(1)',0],['ctl(0)-ctl(1)',-0],['ctl(0)+ctl(0)',-0],
    ['ctl(0)*-1',0],['ctl(1)/-1',-0],['-ctl(0)',0],['ctl(0)/ctl(1)',0],
    ['min(0,-0)',-0],['max(0,-0)',0],['min(x,-0)',-0],['abs(-0)',0],
    ['ceil(-0.25)',-0],['round(-0.25)',-0],['floor(-0)',-0],['sign(-0)',-0],
    ['sin(-0)',-0],['tan(-0)',-0],['r2y(-0,1)',-0],['r2x(512,0)',-0],
    ['add(-0,-0,0)',-0],['sub(-0,0,-0)',0],['clamp(-0,-0,0)',-0],
    ['val(0,-0,-0)',-0],['mix(-0,-0,1,2)',-0],['scl(0,0,1,-0,-1)',-0],
    ['lerp(-0,-1,0)',-0],['gradient3(0,-0,-1,1)',-0],['gradient4(0,-0,-1,1,2)',-0],
    ['sdfUnion(0,-0)',-0],['sdfIntersect(0,-0)',0],['sdfSubtract(-0,0)',-0],
    ['sdfSmoothUnion(-0,-0,0)',-0],['sdfSmoothUnion(-0,1,1)',0],
    ['cnv(0,0,0,0,0,0,0,0,0,-1)',-0],
    ['x?-0:mandelbrot(3,0,1)',x=>x?-0:0]
  ]){
    const value=x=>typeof expected==='function'?expected(x):expected;
    add(`${alias}((${zero}),0)`,x=>negative(value(x))?512:0);
    add(`${alias}(-1,(${zero}))`,x=>negative(value(x))?-512:512);
    add(`${alias}(1,(${zero}))`,x=>negative(value(x))?-0:0);
    add(`${alias}(${alias}(1,(${zero})),0)`,x=>negative(value(x))?512:0);
  }
}
export const signedZeroControls=[-0,0,43,87,129,171,213,65,107,149];
