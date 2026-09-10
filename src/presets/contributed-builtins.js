/**
 * Filter FabJS contributed built-in filters.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
export const contributedPresetDefinitions=[
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
    "id": "touchingrandomcapsules",
    "name": "Touching Random Capsules",
    "description": "Staggered capsule pattern with no vertical spacing. Every two-unit vertical block is either one tall capsule or two shorter touching capsules, chosen deterministically from Seed.",
    "author": "",
    "tags": [
      "Pattern",
      "Shapes",
      "Procedural"
    ],
    "controls": [
      {
        "label": "Column Spacing",
        "value": 130.33333333333331,
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
        "value": 223.125,
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
        "value": 175.95,
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
        "label": "Edge Softness",
        "value": 85,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 3,
          "step": 0.05,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Horizontal Phase",
        "value": 0,
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
        "value": 31.44778955791158,
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
        "value": 0,
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
      "lerp(c,255+((((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==0?val(8,0,3)<1?lerp(clamp(108+(0-108)*val(9,0,2),0,255),clamp(108+(157-108)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(108+(157-108)*val(9,0,2),0,255),clamp(108+(136-108)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(108+(136-108)*val(9,0,2),0,255),clamp(108+(0-108)*val(9,0,2),0,255),val(8,0,3)-2):((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==1?val(8,0,3)<1?lerp(clamp(153+(89-153)*val(9,0,2),0,255),clamp(153+(189-153)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(153+(189-153)*val(9,0,2),0,255),clamp(153+(139-153)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(153+(139-153)*val(9,0,2),0,255),clamp(153+(89-153)*val(9,0,2),0,255),val(8,0,3)-2):val(8,0,3)<1?lerp(clamp(192+(164-192)*val(9,0,2),0,255),clamp(192+(217-192)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(192+(217-192)*val(9,0,2),0,255),clamp(192+(137-192)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(192+(137-192)*val(9,0,2),0,255),clamp(192+(164-192)*val(9,0,2),0,255),val(8,0,3)-2))))-255)*line(repeat(x+val(4,0,200),val(0,110,200)),repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?0:val(2,200,400)):0)+(val(0,110,200)*val(1,80,96)/100)/2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?val(2,200,400):val(2,200,400)*2):val(2,200,400)*2)-(val(0,110,200)*val(1,80,96)/100)/2),(val(0,110,200)*val(1,80,96)/100),val(3,0,3)),ctl(7))",
      "lerp(c,255+((((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==0?val(8,0,3)<1?lerp(clamp(108+(157-108)*val(9,0,2),0,255),clamp(108+(136-108)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(108+(136-108)*val(9,0,2),0,255),clamp(108+(0-108)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(108+(0-108)*val(9,0,2),0,255),clamp(108+(157-108)*val(9,0,2),0,255),val(8,0,3)-2):((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==1?val(8,0,3)<1?lerp(clamp(153+(189-153)*val(9,0,2),0,255),clamp(153+(139-153)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(153+(139-153)*val(9,0,2),0,255),clamp(153+(89-153)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(153+(89-153)*val(9,0,2),0,255),clamp(153+(189-153)*val(9,0,2),0,255),val(8,0,3)-2):val(8,0,3)<1?lerp(clamp(192+(217-192)*val(9,0,2),0,255),clamp(192+(137-192)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(192+(137-192)*val(9,0,2),0,255),clamp(192+(164-192)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(192+(164-192)*val(9,0,2),0,255),clamp(192+(217-192)*val(9,0,2),0,255),val(8,0,3)-2))))-255)*line(repeat(x+val(4,0,200),val(0,110,200)),repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?0:val(2,200,400)):0)+(val(0,110,200)*val(1,80,96)/100)/2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?val(2,200,400):val(2,200,400)*2):val(2,200,400)*2)-(val(0,110,200)*val(1,80,96)/100)/2),(val(0,110,200)*val(1,80,96)/100),val(3,0,3)),ctl(7))",
      "lerp(c,255+((((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==0?val(8,0,3)<1?lerp(clamp(108+(136-108)*val(9,0,2),0,255),clamp(108+(0-108)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(108+(0-108)*val(9,0,2),0,255),clamp(108+(157-108)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(108+(157-108)*val(9,0,2),0,255),clamp(108+(136-108)*val(9,0,2),0,255),val(8,0,3)-2):((((floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2))*2)+(hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55&&repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)>=val(2,200,400)?1:0)+floor((x+val(4,0,200))/val(0,110,200)))%3)==1?val(8,0,3)<1?lerp(clamp(153+(139-153)*val(9,0,2),0,255),clamp(153+(89-153)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(153+(89-153)*val(9,0,2),0,255),clamp(153+(189-153)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(153+(189-153)*val(9,0,2),0,255),clamp(153+(139-153)*val(9,0,2),0,255),val(8,0,3)-2):val(8,0,3)<1?lerp(clamp(192+(137-192)*val(9,0,2),0,255),clamp(192+(164-192)*val(9,0,2),0,255),val(8,0,3)):val(8,0,3)<2?lerp(clamp(192+(164-192)*val(9,0,2),0,255),clamp(192+(217-192)*val(9,0,2),0,255),val(8,0,3)-1):lerp(clamp(192+(217-192)*val(9,0,2),0,255),clamp(192+(137-192)*val(9,0,2),0,255),val(8,0,3)-2))))-255)*line(repeat(x+val(4,0,200),val(0,110,200)),repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?0:val(2,200,400)):0)+(val(0,110,200)*val(1,80,96)/100)/2),val(0,110,200)/2,((hash2(floor((x+val(4,0,200))/val(0,110,200)),floor((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5)/(val(2,200,400)*2)),val(6,1,9999))<0.55?(repeat((y+val(5,0,800)+(floor((x+val(4,0,200))/val(0,110,200))%3)*val(2,200,400)*0.5),val(2,200,400)*2)<val(2,200,400)?val(2,200,400):val(2,200,400)*2):val(2,200,400)*2)-(val(0,110,200)*val(1,80,96)/100)/2),(val(0,110,200)*val(1,80,96)/100),val(3,0,3)),ctl(7))",
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
