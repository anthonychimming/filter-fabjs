/**
 * Filter FabJS pass-two built-in filters.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
export const pass2PresetDefinitions=[
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
