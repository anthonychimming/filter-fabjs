/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
const unionMasks=terms=>terms.reduce((left,right)=>`max(${left},${right})`);
const richControl=(label,value,widget,displayMin,displayMax,step=1,format='number',unit='')=>({label,value,ui:{widget,displayMin,displayMax,step,format,unit}});
const unusedControl=index=>richControl(`Control ${index+1}`,128,'slider',0,255);
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
  analyticshapesampler:'Demonstrates the analytic line, circle, ring, rotated-box, triangle, and grid masks with adjustable geometry, colour, and source mixing.',
  analoggrain:'Adds deterministic monochrome grain to simulate a lightly textured analog image. Adjust Amount for intensity and Seed for a different grain pattern.',
  brightcontrast:'Adjusts image brightness and contrast while preserving colour relationships and alpha.',
  cellular:'Blends the source with deterministic Worley-cell edges. Smaller cells create finer structures; Seed changes the cellular layout.',
  channelglitch:'Offsets RGB channels by deterministic horizontal bands to create a colour-split glitch. Adjust band height, displacement, seed, and source mix.',
  chromasolar:'Solarizes each colour channel around a shared threshold with adjustable channel separation.',
  digitalglitch:'Displaces RGB channels in deterministic rectangular blocks. Block dimensions, displacement, and seed control the glitch structure.',
  directionalecho:'Blends two directional source samples with the original image to create a repeated motion echo.',
  duotone:'Maps source luminance between editable shadow and highlight colours for a two-colour treatment.',
  fractalclouds:'Blends the image with deterministic multi-octave fractal noise. Adjust scale, seed, and mix to create cloud-like texture.',
  sierpinskifractal:'Generates a recursive triangular Sierpiński mask with adjustable depth, scale, edge softness, colours, and source mix.',
  halftone:'Converts luminance into a repeating field of soft halftone dots with adjustable cell size, dot size, and softness.',
  mandelbrotatlas:'Renders a bounded Mandelbrot escape-time field with adjustable framing, iterations, palette accents, and source mix. It also serves as the fractal compute benchmark.',
  layerednoisebenchmark:'Exercises bounded FBM, turbulence, and ridged noise in separate colour channels for repeatable CPU/WebGPU performance and parity comparisons.',
  mirrorx:'Mirrors the source image horizontally while preserving all four channels.',
  midnighttartan:'Builds a dark tartan textile from layered grid masks, pinstripes, rotated thread hatching, and adjustable source mixing.',
  mosaic:'Samples the centre of repeating rectangular blocks to produce a pixelated mosaic.',
  noisedisplace:'Displaces source-image coordinates with two deterministic value-noise fields. Adjust scale, strength, and seed to vary the distortion.',
  poster:'Reduces each RGB channel to a controlled number of tonal levels while preserving alpha.',
  rgbshift:'Offsets the red, green, and blue channels independently in two dimensions for chromatic misregistration effects.',
  saturation:'Adjusts colour saturation around perceptual luminance, from grayscale through exaggerated colour.',
  sharpen:'Blends a fixed 3×3 sharpening convolution with the source image.',
  softfocus:'Blends four diagonal bilinear samples with the original image to produce an adjustable soft-focus glow.',
  swirl:'Rotates source sampling progressively around the image centre to create a radial swirl.',
  thresholddither:'Applies a checker-pattern offset before luminance thresholding to create a two-tone ordered dither.',
  vignettepro:'Darkens the image progressively toward the edges with adjustable strength and radius.',
  warpedsdfbloom:'Combines, subtracts, outlines, and noise-warps signed-distance shapes. It also serves as the SDF composition benchmark.',
  warmcool:'Applies opposing warm and cool colour shifts along a diagonal image gradient.'
};

const presetDefinitions=[
{id:'pass',name:'Pass Through',controls:[],f:['r','g','b','a']},
{id:'invert',name:'Invert',controls:[],f:['255-r','255-g','255-b','a']},
{id:'amberfilm',name:'Amber Film',controls:[richControl('Strength',115,'slider',0,100,1,'number','%'),richControl('Warmth',140,'slider',0,100,1,'number','%')],f:['lerp(r,clamp(i+val(1,10,65),0,255),ctl(0))','lerp(g,clamp(i+val(1,-10,20),0,255),ctl(0))','lerp(b,clamp(i-val(1,15,80),0,255),ctl(0))','a']},
{id:'analyticshapesampler',name:'Analytic Shape Sampler',controls:[richControl('Box Rotation',156,'slider',-45,45,1,'number','°'),richControl('Stroke Width',70,'slider',1,9,0.1,'number','px'),richControl('Edge Softness',48,'slider',0,4,0.1,'number','px'),richControl('Grid Size',18,'slider',10,28,1,'integer','px'),richControl('Foreground R',228,'number',0,255,1,'integer'),richControl('Foreground G',210,'number',0,255,1,'integer'),richControl('Foreground B',230,'number',0,255,1,'integer'),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:analyticShapeFormulas},
{id:'analoggrain',name:'Analog Grain',controls:[richControl('Amount',52,'slider',0,90,1,'number','levels'),richControl('Seed',91,'seed',1,9999,1,'integer')],f:Array(3).fill('clamp(c+(hash2(x,y,val(1,1,9999))-0.5)*val(0,0,90),0,255)').concat('a')},
{id:'brightcontrast',name:'Brightness / Contrast',controls:[richControl('Brightness',128,'slider',-128,128,1,'number','levels'),richControl('Contrast',85,'slider',0,300,1,'number','%')],f:Array(3).fill('clamp(((c-128)*val(1,0,300))/100+128+val(0,-128,128),0,255)').concat('a')},
{id:'cellular',name:'Cellular Edges',controls:[richControl('Cell Size',54,'slider',8,120,1,'integer','px'),richControl('Seed',91,'seed',1,9999,1,'integer'),richControl('Blend',190,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,clamp((worleyF2(x,y,val(0,8,120),val(1,1,9999))-worleyF1(x,y,val(0,8,120),val(1,1,9999)))*900,0,255),ctl(2))').concat('a')},
{id:'channelglitch',name:'Channel Split Glitch',controls:[richControl('Shift',72,'slider',0,54,1,'number','px'),richControl('Band Height',72,'slider',4,48,1,'integer','px'),richControl('Mix',170,'slider',0,100,1,'number','%'),richControl('Seed',61,'seed',1,9999,1,'integer')],f:['lerp(r,srcWrap(x+(hash2(floor(y/val(1,4,48)),0,val(3,1,9999))-0.5)*val(0,0,54),y,0),ctl(2))','lerp(g,srcWrap(x+(hash2(floor(y/val(1,4,48)),1,val(3,1,9999))-0.5)*val(0,0,18),y,1),ctl(2))','lerp(b,srcWrap(x-(hash2(floor(y/val(1,4,48)),2,val(3,1,9999))-0.5)*val(0,0,54),y,2),ctl(2))','a']},
{id:'chromasolar',name:'Chromatic Solarize',controls:[richControl('Threshold',128,'slider',0,255,1,'integer'),richControl('Channel Spread',64,'slider',-72,72,1,'number','levels')],f:['r>=clamp(ctl(0)+val(1,-72,72),0,255)?255-r:r','g>=ctl(0)?255-g:g','b>=clamp(ctl(0)-val(1,-72,72),0,255)?255-b:b','a']},
{id:'digitalglitch',name:'Digital Block Glitch',controls:[richControl('Displacement',77,'slider',0,100,1,'number','px'),richControl('Block Width',64,'slider',8,96,1,'integer','px'),richControl('Block Height',45,'slider',4,48,1,'integer','px'),richControl('Seed',91,'seed',1,9999,1,'integer')],f:['srcWrap(x+(hash2(floor(x/val(1,8,96)),floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,100),y,0)','srcWrap(x+(hash2(floor(x/val(1,8,96))+11,floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,70),y,1)','srcWrap(x+(hash2(floor(x/val(1,8,96))+23,floor(y/val(2,4,48)),val(3,1,9999))-0.5)*val(0,0,100),y,2)','a']},
{id:'directionalecho',name:'Directional Echo',controls:[richControl('Distance',88,'slider',0,52,1,'number','px'),richControl('Angle',32,'slider',0,360,1,'number','°'),richControl('Mix',150,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,(c+srcLinear(x-r2x(val(1,0,1024),val(0,0,26)),y-r2y(val(1,0,1024),val(0,0,26)),z)+srcLinear(x-r2x(val(1,0,1024),val(0,0,52)),y-r2y(val(1,0,1024),val(0,0,52)),z))/3,ctl(2))').concat('a')},
{id:'duotone',name:'Duotone',controls:[richControl('Shadow R',25,'number',0,255,1,'integer'),richControl('Shadow G',35,'number',0,255,1,'integer'),richControl('Shadow B',75,'number',0,255,1,'integer'),richControl('Highlight R',235,'number',0,255,1,'integer'),richControl('Highlight G',205,'number',0,255,1,'integer'),richControl('Highlight B',150,'number',0,255,1,'integer')],f:['scl(i,0,255,ctl(0),ctl(3))','scl(i,0,255,ctl(1),ctl(4))','scl(i,0,255,ctl(2),ctl(5))','a']},
{id:'fractalclouds',name:'Fractal Clouds',controls:[richControl('Scale',58,'slider',12,180,1,'integer','px'),richControl('Seed',135,'seed',1,9999,1,'integer'),richControl('Blend',190,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,fbm(x,y,val(0,12,180),5,2,0.5,val(1,1,9999))*255,ctl(2))').concat('a')},
{id:'sierpinskifractal',name:'Sierpiński Fractal',controls:[richControl('Recursion Depth',174,'number',2,9,1,'integer'),richControl('Fractal Scale',208,'slider',0.5,0.96,0.01),richControl('Edge Softness',32,'slider',0,2.5,0.1,'number','px'),richControl('Foreground R',238,'number',0,255,1,'integer'),richControl('Foreground G',232,'number',0,255,1,'integer'),richControl('Foreground B',214,'number',0,255,1,'integer'),richControl('Background',8,'number',0,255,1,'integer'),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:sierpinskiFormulas},
{id:'halftone',name:'Halftone Dots',controls:[richControl('Cell Size',72,'slider',4,32,1,'integer','px'),richControl('Dot Size',150,'slider',1,14,0.5,'number','px'),richControl('Softness',34,'slider',0,4,0.1,'number','px')],f:Array(3).fill('(1-smoothstep((255-i)/255*val(1,1,14),(255-i)/255*val(1,1,14)+val(2,0,4),c2m(wrap(x,val(0,4,32))-val(0,4,32)/2,wrap(y,val(0,4,32))-val(0,4,32)/2)))*255').concat('a')},
{id:'mandelbrotatlas',name:'Mandelbrot Atlas',benchmark:true,controls:[richControl('Scale',128,'slider',1,2,0.01),richControl('Center X',96,'number',-1.5,0.5,0.01),richControl('Center Y',128,'number',-1,1,0.01),richControl('Iterations',128,'slider',24,192,1,'integer'),richControl('Red Accent',190,'slider',0,255,1,'integer'),richControl('Blue Accent',220,'slider',0,255,1,'integer'),richControl('Interior',8,'number',0,255,1,'integer'),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:mandelbrotFormulas},
{id:'layerednoisebenchmark',name:'Layered Noise Benchmark',benchmark:true,controls:[richControl('Noise Scale',92,'slider',10,96,1,'integer','px'),richControl('Octaves',192,'slider',2,8,1,'integer'),richControl('Seed',73,'seed',1,9999,1,'integer'),richControl('Contrast',150,'slider',0.65,1.65,0.01,'number','×'),unusedControl(4),unusedControl(5),unusedControl(6),unusedControl(7),unusedControl(8),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:benchmarkNoiseFormulas},
{id:'mirrorx',name:'Mirror Horizontal',controls:[],f:['src(X-1-x,y,0)','src(X-1-x,y,1)','src(X-1-x,y,2)','src(X-1-x,y,3)']},
{id:'midnighttartan',name:'Midnight Tartan',controls:[richControl('Sett Scale',150,'slider',54,132,1,'integer','px'),richControl('Broad Stripe',130,'slider',8,34,1,'integer','px'),richControl('Fine Thread',100,'slider',0.6,3.4,0.1,'number','px'),richControl('Weave Spacing',75,'slider',3,10,0.1,'number','px'),richControl('Pattern Strength',215,'slider',0,100,1,'number','%'),richControl('Weave Angle',128,'slider',28,62,1,'number','°'),richControl('Blue Tone',124,'slider',0.75,1.35,0.01,'number','×'),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:tartanFormulas},
{id:'mosaic',name:'Mosaic',controls:[richControl('Block Width',35,'slider',2,64,1,'integer','px'),richControl('Block Height',35,'slider',2,64,1,'integer','px')],f:Array(4).fill('srcLinear(floor(x/val(0,2,64))*val(0,2,64)+val(0,2,64)/2,floor(y/val(1,2,64))*val(1,2,64)+val(1,2,64)/2,z)')},
{id:'noisedisplace',name:'Noise Displacement',controls:[richControl('Noise Scale',52,'slider',8,120,1,'integer','px'),richControl('Strength',90,'slider',0,52,1,'number','px'),richControl('Seed',91,'seed',1,9999,1,'integer')],f:Array(3).fill('srcLinear(x+(valueNoise(x,y,val(0,8,120),val(2,1,9999))-0.5)*val(1,0,52),y+(valueNoise(x+431,y+719,val(0,8,120),val(2,1,9999))-0.5)*val(1,0,52),z)').concat('a')},
{id:'poster',name:'Posterize',controls:[richControl('Levels',72,'slider',2,16,1,'integer')],f:Array(3).fill('round(c*(val(0,2,16)-1)/255)*255/(val(0,2,16)-1)').concat('a')},
{id:'rgbshift',name:'RGB Shift',controls:[richControl('Red X',136,'number',-128,127,1,'number','px'),richControl('Red Y',128,'number',-128,127,1,'number','px'),richControl('Green X',120,'number',-128,127,1,'number','px'),richControl('Green Y',128,'number',-128,127,1,'number','px'),richControl('Blue X',128,'number',-128,127,1,'number','px'),richControl('Blue Y',136,'number',-128,127,1,'number','px')],f:['srcLinear(x+ctl(0)-128,y+ctl(1)-128,0)','srcLinear(x+ctl(2)-128,y+ctl(3)-128,1)','srcLinear(x+ctl(4)-128,y+ctl(5)-128,2)','a']},
{id:'saturation',name:'Saturation',controls:[richControl('Saturation',85,'slider',0,300,1,'number','%')],f:Array(3).fill('clamp(i+((c-i)*val(0,0,300))/100,0,255)').concat('a')},
{id:'sharpen',name:'Sharpen',controls:[richControl('Amount',128,'slider',0,200,1,'number','%')],f:Array(3).fill('clamp(c+((cnv(0,-1,0,-1,5,-1,0,-1,0,1)-c)*val(0,0,200))/100,0,255)').concat('a')},
{id:'softfocus',name:'Soft Focus',controls:[richControl('Radius',75,'slider',1,14,0.5,'number','px'),richControl('Blend',175,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,(c+srcLinear(x-val(0,1,14),y-val(0,1,14),z)+srcLinear(x+val(0,1,14),y-val(0,1,14),z)+srcLinear(x-val(0,1,14),y+val(0,1,14),z)+srcLinear(x+val(0,1,14),y+val(0,1,14),z))/5,ctl(1))').concat('a')},
{id:'swirl',name:'Swirl',controls:[richControl('Twist',165,'slider',-91.4,91.4,0.1,'number','°')],f:['rad(d+((M-m)*val(0,-260,260))/max(1,M),m,0)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,1)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,2)','a']},
{id:'thresholddither',name:'Threshold Dither',controls:[richControl('Threshold',128,'slider',0,255,1,'integer'),richControl('Pattern Size',60,'slider',2,16,1,'integer','px'),richControl('Dither Amount',80,'slider',0,64,1,'number','levels')],f:Array(3).fill('i+(checker(x,y,val(1,2,16),val(1,2,16))*2-1)*val(2,0,64)>=ctl(0)?255:0').concat('a')},
{id:'vignettepro',name:'Vignette Pro',controls:[richControl('Strength',160,'slider',0,100,1,'number','%'),richControl('Radius',105,'slider',0,100,1,'number','%')],f:Array(3).fill('clamp(c*(1-smoothstep(val(1,0,M),M,m)*val(0,0,100)/100),0,255)').concat('a')},
{id:'warpedsdfbloom',name:'Warped SDF Bloom',benchmark:true,controls:[richControl('Warp Amount',80,'slider',0,30,0.1,'number','px'),richControl('Warp Scale',100,'slider',20,110,1,'number','px'),richControl('Seed',73,'seed',1,9999,1,'integer'),richControl('Shape Size',150,'slider',0.12,0.32,0.01),richControl('Smooth Union',100,'slider',0,28,0.5,'number','px'),richControl('Cutout Size',75,'slider',0.03,0.16,0.01),richControl('Outline Width',80,'slider',0.5,8,0.1,'number','px'),richControl('Edge Softness',48,'slider',0,3,0.1,'number','px'),richControl('Colour Shift',115,'slider',0,1,0.01),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:warpedSdfFormulas},
{id:'warmcool',name:'Warm–Cool Gradient',controls:[richControl('Warm Strength',120,'slider',0,100,1,'number','%'),richControl('Cool Strength',120,'slider',0,100,1,'number','%')],f:['clamp(r+linearGrad(x,y,0,0,X,Y)*val(0,0,70)-val(1,0,30),0,255)','g','clamp(b+(1-linearGrad(x,y,0,0,X,Y))*val(1,0,70)-val(0,0,30),0,255)','a']}
];

export const presets=presetDefinitions.map(preset=>({...preset,description:presetDescriptions[preset.id]}));
