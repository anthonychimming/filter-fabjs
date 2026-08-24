/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
const unionMasks=terms=>terms.reduce((left,right)=>`max(${left},${right})`);
const samplerSize='min(X,Y)',samplerStroke='val(1,1,9)',samplerFeather='val(2,0,4)';
const samplerGrid=`grid(x,y,val(3,10,28),val(3,10,28),${samplerStroke}/3,${samplerFeather})*box(x,y,X*0.76,Y*0.68,${samplerSize}*0.18,${samplerSize}*0.16,0,${samplerFeather})`;
const samplerRedMask=unionMasks([
  `line(x,y,X*0.16,Y*0.42,X*0.34,Y*0.28,${samplerStroke},${samplerFeather})`,
  `circle(x,y,X*0.5,Y*0.35,${samplerSize}*0.075,${samplerFeather})`
]);
const samplerGreenMask=unionMasks([
  `ring(x,y,X*0.76,Y*0.35,${samplerSize}*0.075,${samplerStroke},${samplerFeather})`,
  `box(x,y,X*0.24,Y*0.68,${samplerSize}*0.16,${samplerSize}*0.12,val(0,-128,128),${samplerFeather})`
]);
const samplerBlueMask=unionMasks([
  `triangle(x,y,X*0.5,Y*0.57,X*0.41,Y*0.77,X*0.59,Y*0.77,${samplerFeather})`,
  samplerGrid
]);
const analyticShapeFormulas=[
  `lerp(r,8+(ctl(4)-8)*${samplerRedMask},ctl(7))`,
  `lerp(g,8+(ctl(5)-8)*${samplerGreenMask},ctl(7))`,
  `lerp(b,8+(ctl(6)-8)*${samplerBlueMask},ctl(7))`,
  'a'
];
const sierpinskiMask=`sierpinski(x,y,X/2,Y/2,min(X,Y)*val(1,0.5,0.96),val(0,2,9),val(2,0,2.5))`;
const sierpinskiShade=`(0.76+linearGrad(x,y,0,Y*0.15,0,Y*0.85)*0.24)`;
const sierpinskiFormulas=[
  `lerp(r,ctl(6)+(ctl(3)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  `lerp(g,ctl(6)+(ctl(4)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  `lerp(b,ctl(6)+(ctl(5)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  'a'
];
const tartanScale='val(0,54,132)',tartanBroad='val(1,8,34)',tartanThread='val(2,0.6,3.4)',tartanFeather='0.65';
const tartanPrimary=`grid(x,y,${tartanScale},${tartanScale},${tartanBroad},${tartanFeather})`;
const tartanSecondary=`grid(x+${tartanScale}*0.3,y+${tartanScale}*0.3,${tartanScale},${tartanScale},${tartanBroad}*0.42,${tartanFeather})`;
const tartanBands=`clamp(${tartanPrimary}+${tartanSecondary}*0.72,0,1.45)`;
const tartanPinstripes=unionMasks([
  `grid(x+${tartanScale}*0.07,y+${tartanScale}*0.07,${tartanScale},${tartanScale},${tartanThread},${tartanFeather})`,
  `grid(x-${tartanScale}*0.07,y-${tartanScale}*0.07,${tartanScale},${tartanScale},${tartanThread},${tartanFeather})`
]);
const tartanAngle='val(5,80,176)',tartanDiagonal=`x*r2x(${tartanAngle},1)+y*r2y(${tartanAngle},1)`;
const tartanWeave='val(3,3,10)',tartanHatch=`grid(${tartanDiagonal},512,${tartanWeave},1024,${tartanThread}*0.42,0.35)*(0.72+checker(x,y,${tartanWeave},${tartanWeave})*0.28)`;
const tartanStrength='ctl(4)/255',tartanTone='val(6,0.75,1.35)';
const tartanTarget=(base,band,pin)=>`clamp((${base}+${tartanStrength}*(${band}*${tartanBands}*(0.42+0.58*${tartanHatch})+${pin}*${tartanPinstripes}))*${tartanTone},0,255)`;
const tartanFormulas=[
  `lerp(r,${tartanTarget(6,18,12)},ctl(7))`,
  `lerp(g,${tartanTarget(18,43,26)},ctl(7))`,
  `lerp(b,${tartanTarget(35,74,45)},ctl(7))`,
  'a'
];
const mandelbrotX='cx*X/min(X,Y)*val(0,1,2)+val(1,-1.5,0.5)';
const mandelbrotY='cy*Y/min(X,Y)*val(0,1,2)+val(2,-1,1)';
const mandelbrotField=`sqrt(mandelbrot(${mandelbrotX},${mandelbrotY},val(3,24,192)))`;
const mandelbrotFormulas=[
  `lerp(r,gradient4(${mandelbrotField},4,ctl(4),242,ctl(6)),ctl(7))`,
  `lerp(g,gradient4(${mandelbrotField},8,40,190,ctl(6)),ctl(7))`,
  `lerp(b,gradient4(${mandelbrotField},32,ctl(5),110,ctl(6)),ctl(7))`,
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

export const presets=[
{id:'pass',name:'Pass Through',values:[128,128,128,128,128,128,128,128],labels:Array.from({length:8},(_,i)=>`Control ${i+1}`),f:['r','g','b','a']},
{id:'invert',name:'Invert',values:Array(8).fill(128),labels:Array.from({length:8},(_,i)=>`Control ${i+1}`),f:['255-r','255-g','255-b','a']},
{id:'amberfilm',name:'Amber Film',values:[115,140,128,128,128,128,128,128],labels:['Strength','Warmth','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:['lerp(r,clamp(i+val(1,10,65),0,255),ctl(0))','lerp(g,clamp(i+val(1,-10,20),0,255),ctl(0))','lerp(b,clamp(i-val(1,15,80),0,255),ctl(0))','a']},
{id:'analyticshapesampler',name:'Analytic Shape Sampler',values:[156,70,48,18,228,210,230,255],labels:['Box Rotation','Stroke Width','Edge Softness','Grid Size','Foreground R','Foreground G','Foreground B','Effect Mix'],f:analyticShapeFormulas},
{id:'analoggrain',name:'Analog Grain',values:[52,91,128,128,128,128,128,128],labels:['Amount','Seed','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('clamp(c+(hash2(x,y,val(1,1,9999))-0.5)*val(0,0,90),0,255)').concat('a')},
{id:'brightcontrast',name:'Brightness / Contrast',values:[128,85,128,128,128,128,128,128],labels:['Brightness','Contrast','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('clamp(((c-128)*val(1,0,300))/100+128+val(0,-128,128),0,255)').concat('a')},
{id:'cellular',name:'Cellular Edges',values:[54,91,190,128,128,128,128,128],labels:['Cell Size','Seed','Blend','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('lerp(c,clamp((worleyF2(x,y,val(0,8,120),val(1,1,9999))-worleyF1(x,y,val(0,8,120),val(1,1,9999)))*900,0,255),ctl(2))').concat('a')},
{id:'channelglitch',name:'Channel Split Glitch',values:[72,72,170,61,128,128,128,128],labels:['Shift','Band Height','Mix','Seed','Control 5','Control 6','Control 7','Control 8'],f:['lerp(r,srcWrap(x+(hash2(floor(y/val(1,4,48)),0,val(3,1,9999))-0.5)*val(0,0,54),y,0),ctl(2))','lerp(g,srcWrap(x+(hash2(floor(y/val(1,4,48)),1,val(3,1,9999))-0.5)*val(0,0,18),y,1),ctl(2))','lerp(b,srcWrap(x-(hash2(floor(y/val(1,4,48)),2,val(3,1,9999))-0.5)*val(0,0,54),y,2),ctl(2))','a']},
{id:'chromasolar',name:'Chromatic Solarize',values:[128,64,128,128,128,128,128,128],labels:['Threshold','Channel Spread','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:['r>=clamp(ctl(0)+val(1,-72,72),0,255)?255-r:r','g>=ctl(0)?255-g:g','b>=clamp(ctl(0)-val(1,-72,72),0,255)?255-b:b','a']},
{id:'digitalglitch',name:'Digital Block Glitch',values:[77,64,45,91,128,128,128,128],labels:['Displacement','Block Width','Block Height','Seed','Control 5','Control 6','Control 7','Control 8'],f:['srcWrap(x+(hash2(floor(x/val(1,8,96)),floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,100),y,0)','srcWrap(x+(hash2(floor(x/val(1,8,96))+11,floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,70),y,1)','srcWrap(x+(hash2(floor(x/val(1,8,96))+23,floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,100),y,2)','a']},
{id:'directionalecho',name:'Directional Echo',values:[88,32,150,128,128,128,128,128],labels:['Distance','Angle','Mix','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('lerp(c,(c+srcLinear(x-r2x(val(1,0,1024),val(0,0,26)),y-r2y(val(1,0,1024),val(0,0,26)),z)+srcLinear(x-r2x(val(1,0,1024),val(0,0,52)),y-r2y(val(1,0,1024),val(0,0,52)),z))/3,ctl(2))').concat('a')},
{id:'duotone',name:'Duotone',values:[25,35,75,235,205,150,128,128],labels:['Shadow R','Shadow G','Shadow B','Highlight R','Highlight G','Highlight B','Control 7','Control 8'],f:['scl(i,0,255,ctl(0),ctl(3))','scl(i,0,255,ctl(1),ctl(4))','scl(i,0,255,ctl(2),ctl(5))','a']},
{id:'fractalclouds',name:'Fractal Clouds',values:[58,135,190,128,128,128,128,128],labels:['Scale','Seed','Blend','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('lerp(c,fbm(x,y,val(0,12,180),5,2,0.5,val(1,1,9999))*255,ctl(2))').concat('a')},
{id:'sierpinskifractal',name:'Sierpiński Fractal',values:[174,208,32,238,232,214,8,255],labels:['Recursion Depth','Fractal Scale','Edge Softness','Foreground R','Foreground G','Foreground B','Background','Effect Mix'],f:sierpinskiFormulas},
{id:'halftone',name:'Halftone Dots',values:[72,150,34,128,128,128,128,128],labels:['Cell Size','Dot Size','Softness','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('(1-smoothstep((255-i)/255*val(1,1,14),(255-i)/255*val(1,1,14)+val(2,0,4),c2m(wrap(x,val(0,4,32))-val(0,4,32)/2,wrap(y,val(0,4,32))-val(0,4,32)/2)))*255').concat('a')},
{id:'mandelbrotatlas',name:'Mandelbrot Atlas',values:[128,96,128,128,190,220,8,255],labels:['Scale','Center X','Center Y','Iterations','Red Accent','Blue Accent','Interior','Effect Mix'],f:mandelbrotFormulas},
{id:'mirrorx',name:'Mirror Horizontal',values:Array(8).fill(128),labels:Array.from({length:8},(_,i)=>`Control ${i+1}`),f:['src(X-1-x,y,0)','src(X-1-x,y,1)','src(X-1-x,y,2)','src(X-1-x,y,3)']},
{id:'midnighttartan',name:'Midnight Tartan',values:[150,130,100,75,215,128,124,255],labels:['Sett Scale','Broad Stripe','Fine Thread','Weave Spacing','Pattern Strength','Weave Angle','Blue Tone','Effect Mix'],f:tartanFormulas},
{id:'mosaic',name:'Mosaic',values:[35,35,128,128,128,128,128,128],labels:['Block Width','Block Height','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(4).fill('srcLinear(floor(x/val(0,2,64))*val(0,2,64)+val(0,2,64)/2,floor(y/val(1,2,64))*val(1,2,64)+val(1,2,64)/2,z)')},
{id:'noisedisplace',name:'Noise Displacement',values:[52,90,91,128,128,128,128,128],labels:['Noise Scale','Strength','Seed','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('srcLinear(x+(valueNoise(x,y,val(0,8,120),val(2,1,9999))-0.5)*val(1,0,52),y+(valueNoise(x+431,y+719,val(0,8,120),val(2,1,9999))-0.5)*val(1,0,52),z)').concat('a')},
{id:'poster',name:'Posterize',values:[72,128,128,128,128,128,128,128],labels:['Levels','Control 2','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('floor(c/(256/val(0,2,16)))*(256/val(0,2,16))').concat('a')},
{id:'rgbshift',name:'RGB Shift',values:[136,128,120,128,128,136,128,120],labels:['Red X','Red Y','Green X','Green Y','Blue X','Blue Y','Spare','Spare'],f:['srcLinear(x+ctl(0)-128,y+ctl(1)-128,0)','srcLinear(x+ctl(2)-128,y+ctl(3)-128,1)','srcLinear(x+ctl(4)-128,y+ctl(5)-128,2)','a']},
{id:'saturation',name:'Saturation',values:[85,128,128,128,128,128,128,128],labels:['Saturation','Control 2','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('clamp(i+((c-i)*val(0,0,300))/100,0,255)').concat('a')},
{id:'sharpen',name:'Sharpen',values:[128,128,128,128,128,128,128,128],labels:['Amount','Control 2','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('clamp(c+((cnv(0,-1,0,-1,5,-1,0,-1,0,1)-c)*val(0,0,200))/100,0,255)').concat('a')},
{id:'softfocus',name:'Soft Focus',values:[75,175,128,128,128,128,128,128],labels:['Radius','Blend','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('lerp(c,(c+srcLinear(x-val(0,1,14),y-val(0,1,14),z)+srcLinear(x+val(0,1,14),y-val(0,1,14),z)+srcLinear(x-val(0,1,14),y+val(0,1,14),z)+srcLinear(x+val(0,1,14),y+val(0,1,14),z))/5,ctl(1))').concat('a')},
{id:'swirl',name:'Swirl',values:[165,128,128,128,128,128,128,128],labels:['Twist','Control 2','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:['rad(d+((M-m)*val(0,-260,260))/max(1,M),m,0)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,1)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,2)','a']},
{id:'thresholddither',name:'Threshold Dither',values:[128,60,80,128,128,128,128,128],labels:['Threshold','Pattern Size','Dither Amount','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('i+(checker(x,y,val(1,2,16),val(1,2,16))*2-1)*val(2,0,64)>=ctl(0)?255:0').concat('a')},
{id:'vignettepro',name:'Vignette Pro',values:[160,105,128,128,128,128,128,128],labels:['Strength','Radius','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:Array(3).fill('clamp(c*(1-smoothstep(val(1,0,M),M,m)*val(0,0,100)/100),0,255)').concat('a')},
{id:'warpedsdfbloom',name:'Warped SDF Bloom',values:[80,100,73,150,100,75,80,48,115,255],labels:['Warp Amount','Warp Scale','Seed','Shape Size','Smooth Union','Cutout Size','Outline Width','Edge Softness','Colour Shift','Effect Mix'],f:warpedSdfFormulas},
{id:'warmcool',name:'Warm–Cool Gradient',values:[120,120,128,128,128,128,128,128],labels:['Warm Strength','Cool Strength','Control 3','Control 4','Control 5','Control 6','Control 7','Control 8'],f:['clamp(r+linearGrad(x,y,0,0,X,Y)*val(0,0,70)-val(1,0,30),0,255)','g','clamp(b+(1-linearGrad(x,y,0,0,X,Y))*val(1,0,70)-val(0,0,30),0,255)','a']}
];
