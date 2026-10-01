/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { contributedPresetDefinitions } from './contributed-builtins.js';
import { pass2PresetDefinitions } from './pass2-builtins.js';
import { pass3PresetDefinitions } from './pass3-builtins.js';

const BUILTIN_AUTHOR='Anthony Chimming';

const richControl=(label,value,widget,displayMin,displayMax,step=1,format='number',unit='')=>({label,value,ui:{widget,displayMin,displayMax,step,format,unit}});
const sierpinskiMask=`sierpinski(x,y,X/2,Y/2,min(X,Y)*val(1,0.5,0.96),val(0,2,9),val(2,0,2.5))`;
const sierpinskiShade=`(0.76+linearGrad(x,y,0,Y*0.15,0,Y*0.85)*0.24)`;
const sierpinskiFormulas=[
  `lerp(r,ctl(6)+(ctl(3)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  `lerp(g,ctl(6)+(ctl(4)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  `lerp(b,ctl(6)+(ctl(5)-ctl(6))*${sierpinskiMask}*${sierpinskiShade},ctl(7))`,
  'a'
];
const presetDescriptions={
  pass:'Returns the source image unchanged. Use it as a neutral starting point for a new filter.',
  invert:'Inverts the red, green, and blue channels while preserving the source alpha channel.',
  amberfilm:'Applies a warm amber film grade with adjustable strength and warmth. It works especially well on portraits and high-contrast scenes.',
  analoggrain:'Adds deterministic monochrome grain to simulate a lightly textured analog image. Adjust Amount for intensity and Seed for a different grain pattern.',
  brightcontrast:'Adjusts image brightness and contrast while preserving colour relationships and alpha.',
  chromasolar:'Solarizes each colour channel around a shared threshold with adjustable channel separation.',
  fractalclouds:'Blends the image with deterministic multi-octave fractal noise. Adjust scale, seed, and mix to create cloud-like texture.',
  sierpinskifractal:'Generates a recursive triangular Sierpiński mask with adjustable depth, scale, edge softness, colours, and source mix.',
  mosaic:'Samples the centre of repeating rectangular blocks to produce a pixelated mosaic.',
  poster:'Reduces each RGB channel to a controlled number of tonal levels while preserving alpha.',
  rgbshift:'Offsets the red, green, and blue channels independently in two dimensions for chromatic misregistration effects.',
  saturation:'Adjusts colour saturation around perceptual luminance, from grayscale through exaggerated colour.',
  sharpen:'Blends a fixed 3×3 sharpening convolution with the source image.',
  softfocus:'Blends four diagonal bilinear samples with the original image to produce an adjustable soft-focus glow.',
  swirl:'Rotates source sampling progressively around the image centre to create a radial swirl.',
  vignettepro:'Darkens the image progressively toward the edges with adjustable strength and radius.',
  warmcool:'Applies opposing warm and cool colour shifts along a diagonal image gradient.'
};

const presetDefinitions=[
{id:'pass',name:'Pass Through',controls:[],f:['r','g','b','a']},
{id:'invert',name:'Invert',controls:[],f:['255-r','255-g','255-b','a']},
{id:'amberfilm',name:'Amber Film',controls:[richControl('Strength',115,'slider',0,100,1,'number','%'),richControl('Warmth',140,'slider',0,100,1,'number','%')],f:['lerp(r,clamp(i+val(1,10,65),0,255),ctl(0))','lerp(g,clamp(i+val(1,-10,20),0,255),ctl(0))','lerp(b,clamp(i-val(1,15,80),0,255),ctl(0))','a']},
{id:'analoggrain',name:'Analog Grain',controls:[richControl('Amount',52,'slider',0,90,1,'number','levels'),richControl('Seed',91,'seed',1,9999,1,'integer')],f:Array(3).fill('clamp(c+(hash2(x,y,val(1,1,9999))-0.5)*val(0,0,90),0,255)').concat('a')},
{id:'brightcontrast',name:'Brightness / Contrast',controls:[richControl('Brightness',128,'slider',-128,128,1,'number','levels'),richControl('Contrast',85,'slider',0,300,1,'number','%')],f:Array(3).fill('clamp(((c-128)*val(1,0,300))/100+128+val(0,-128,128),0,255)').concat('a')},
{id:'chromasolar',name:'Chromatic Solarize',controls:[richControl('Threshold',128,'slider',0,255,1,'integer'),richControl('Channel Spread',64,'slider',-72,72,1,'number','levels')],f:['r>=clamp(ctl(0)+val(1,-72,72),0,255)?255-r:r','g>=ctl(0)?255-g:g','b>=clamp(ctl(0)-val(1,-72,72),0,255)?255-b:b','a']},
{id:'fractalclouds',name:'Fractal Clouds',controls:[richControl('Scale',58,'slider',12,180,1,'integer','px'),richControl('Seed',135,'seed',1,9999,1,'integer'),richControl('Blend',190,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,fbm(x,y,val(0,12,180),5,2,0.5,val(1,1,9999))*255,ctl(2))').concat('a')},
{id:'sierpinskifractal',name:'Sierpiński Fractal',controls:[richControl('Recursion Depth',174,'number',2,9,1,'integer'),richControl('Fractal Scale',208,'slider',0.5,0.96,0.01),richControl('Edge Softness',32,'slider',0,2.5,0.1,'number','px'),richControl('Foreground R',238,'number',0,255,1,'integer'),richControl('Foreground G',232,'number',0,255,1,'integer'),richControl('Foreground B',214,'number',0,255,1,'integer'),richControl('Background',8,'number',0,255,1,'integer'),richControl('Effect Mix',255,'slider',0,100,1,'number','%')],f:sierpinskiFormulas},
{id:'mosaic',name:'Mosaic',controls:[richControl('Block Width',35,'slider',2,64,1,'integer','px'),richControl('Block Height',35,'slider',2,64,1,'integer','px')],f:Array(4).fill('srcLinear(floor(x/val(0,2,64))*val(0,2,64)+val(0,2,64)/2,floor(y/val(1,2,64))*val(1,2,64)+val(1,2,64)/2,z)')},
{id:'poster',name:'Posterize',controls:[richControl('Levels',72,'slider',2,16,1,'integer')],f:Array(3).fill('round(c*(val(0,2,16)-1)/255)*255/(val(0,2,16)-1)').concat('a')},
{id:'rgbshift',name:'RGB Shift',controls:[richControl('Red X',136,'number',-128,127,1,'number','px'),richControl('Red Y',128,'number',-128,127,1,'number','px'),richControl('Green X',120,'number',-128,127,1,'number','px'),richControl('Green Y',128,'number',-128,127,1,'number','px'),richControl('Blue X',128,'number',-128,127,1,'number','px'),richControl('Blue Y',136,'number',-128,127,1,'number','px')],f:['srcLinear(x+ctl(0)-128,y+ctl(1)-128,0)','srcLinear(x+ctl(2)-128,y+ctl(3)-128,1)','srcLinear(x+ctl(4)-128,y+ctl(5)-128,2)','a']},
{id:'saturation',name:'Saturation',controls:[richControl('Saturation',85,'slider',0,300,1,'number','%')],f:Array(3).fill('clamp(i+((c-i)*val(0,0,300))/100,0,255)').concat('a')},
{id:'sharpen',name:'Sharpen',controls:[richControl('Amount',128,'slider',0,200,1,'number','%')],f:Array(3).fill('clamp(c+((cnv(0,-1,0,-1,5,-1,0,-1,0,1)-c)*val(0,0,200))/100,0,255)').concat('a')},
{id:'softfocus',name:'Soft Focus',controls:[richControl('Radius',75,'slider',1,14,0.5,'number','px'),richControl('Blend',175,'slider',0,100,1,'number','%')],f:Array(3).fill('lerp(c,(c+srcLinear(x-val(0,1,14),y-val(0,1,14),z)+srcLinear(x+val(0,1,14),y-val(0,1,14),z)+srcLinear(x-val(0,1,14),y+val(0,1,14),z)+srcLinear(x+val(0,1,14),y+val(0,1,14),z))/5,ctl(1))').concat('a')},
{id:'swirl',name:'Swirl',controls:[richControl('Twist',165,'slider',-91.4,91.4,0.1,'number','°')],f:['rad(d+((M-m)*val(0,-260,260))/max(1,M),m,0)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,1)','rad(d+((M-m)*val(0,-260,260))/max(1,M),m,2)','a']},
{id:'vignettepro',name:'Vignette Pro',controls:[richControl('Strength',160,'slider',0,100,1,'number','%'),richControl('Radius',105,'slider',0,100,1,'number','%')],f:Array(3).fill('clamp(c*(1-smoothstep(val(1,0,M),M,m)*val(0,0,100)/100),0,255)').concat('a')},
{id:'warmcool',name:'Warm–Cool Gradient',controls:[richControl('Warm Strength',120,'slider',0,100,1,'number','%'),richControl('Cool Strength',120,'slider',0,100,1,'number','%')],f:['clamp(r+linearGrad(x,y,0,0,X,Y)*val(0,0,70)-val(1,0,30),0,255)','g','clamp(b+(1-linearGrad(x,y,0,0,X,Y))*val(1,0,70)-val(0,0,30),0,255)','a']}
];

const presetTags={"pass": ["Utility"], "invert": ["Color", "Negative"], "amberfilm": ["Retro", "Warm", "Portrait"], "analoggrain": ["Noise", "Retro"], "brightcontrast": ["Tone"], "chromasolar": ["Color", "Retro"], "fractalclouds": ["Noise", "Procedural"], "sierpinskifractal": ["Fractal", "Shapes"], "mosaic": ["Pixelate"], "poster": ["Color", "Print"], "rgbshift": ["Color", "Distortion"], "saturation": ["Color"], "sharpen": ["Detail"], "softfocus": ["Blur", "Portrait"], "swirl": ["Distortion"], "vignettepro": ["Tone", "Portrait"], "warmcool": ["Color", "Gradient"]};

export const presets=[
  ...presetDefinitions.map(preset=>({...preset,tags:[...(presetTags[preset.id]||[]),...(preset.benchmark?['Benchmark']:[])],description:presetDescriptions[preset.id],author:BUILTIN_AUTHOR})),
  ...contributedPresetDefinitions.map(preset=>({...preset,author:BUILTIN_AUTHOR,tags:[...preset.tags],controls:preset.controls.map(control=>({...control,ui:{...control.ui}})),f:[...preset.f]})),
  ...pass2PresetDefinitions.map(preset=>({...preset,author:BUILTIN_AUTHOR,tags:[...preset.tags],controls:preset.controls.map(control=>({...control,ui:{...control.ui}})),f:[...preset.f]})),
  ...pass3PresetDefinitions.map(preset=>({...preset,tags:[...preset.tags],controls:preset.controls.map(control=>({...control,ui:{...control.ui}})),f:[...preset.f]}))
];
