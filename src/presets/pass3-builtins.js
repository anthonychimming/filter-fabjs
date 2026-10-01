/**
 * Filter FabJS pass-three built-in filters, preserved from the supplied native exports.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
export const pass3PresetDefinitions=[
  {
    "id": "warped-sdf-bloom-contour",
    "name": "Warped SDF Contour Vortex",
    "description": "A single-pass periodic polar-distance field with deterministic noise warping. Warp Strength and Warp Scale shape the deformation; Contour Spacing and Spiral Arms control topology; Band Balance adjusts the warm-violet proportion; Hue Shift rotates the palette impression; Seed generates repeatable variations; and Effect Mix blends the generated result with the source.",
    "author": "Anthony Chimming",
    "tags": [
      "Procedural",
      "Distortion",
      "Pattern",
      "Color"
    ],
    "controls": [
      {
        "label": "Warp Strength",
        "value": 157.25,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 60,
          "step": 0.5,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Contour Spacing",
        "value": 194.02173913043478,
        "ui": {
          "widget": "slider",
          "displayMin": 14,
          "displayMax": 60,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Spiral Arms",
        "value": 153,
        "ui": {
          "widget": "number",
          "displayMin": -5,
          "displayMax": 5,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Warp Scale",
        "value": 247.15384615384616,
        "ui": {
          "widget": "slider",
          "displayMin": 20,
          "displayMax": 150,
          "step": 1,
          "format": "number",
          "unit": "px"
        }
      },
      {
        "label": "Band Balance",
        "value": 10.200000000000001,
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
        "label": "Hue Shift",
        "value": 144.43359375,
        "ui": {
          "widget": "slider",
          "displayMin": -128,
          "displayMax": 128,
          "step": 1,
          "format": "number",
          "unit": "levels"
        }
      },
      {
        "label": "Seed",
        "value": 15.583616723344669,
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
      "lerp(r,clamp(gradient3(smoothstep(-0.24,0.24,sin(m/val(1,14,60)*1024+d*val(2,-5,5)+((valueNoise(x,y,val(3,20,150),val(6,1,9999))-0.5)*2+(valueNoise(x+317,y-211,val(3,20,150)*0.55,val(6,1,9999))-0.5)*0.7)*val(0,0,60)/val(1,14,60)*1024)/512+val(4,-0.35,0.35)),clamp(62+val(5,-128,128)*0.55,0,255),clamp(122+val(5,-128,128)*0.30,0,255),clamp(246-val(5,-128,128)*0.12,0,255)),0,255),ctl(7))",
      "lerp(g,clamp(gradient3(smoothstep(-0.24,0.24,sin(m/val(1,14,60)*1024+d*val(2,-5,5)+((valueNoise(x,y,val(3,20,150),val(6,1,9999))-0.5)*2+(valueNoise(x+317,y-211,val(3,20,150)*0.55,val(6,1,9999))-0.5)*0.7)*val(0,0,60)/val(1,14,60)*1024)/512+val(4,-0.35,0.35)),clamp(18-val(5,-128,128)*0.22,0,255),clamp(42+val(5,-128,128)*0.55,0,255),clamp(92+val(5,-128,128)*0.42,0,255)),0,255),ctl(7))",
      "lerp(b,clamp(gradient3(smoothstep(-0.24,0.24,sin(m/val(1,14,60)*1024+d*val(2,-5,5)+((valueNoise(x,y,val(3,20,150),val(6,1,9999))-0.5)*2+(valueNoise(x+317,y-211,val(3,20,150)*0.55,val(6,1,9999))-0.5)*0.7)*val(0,0,60)/val(1,14,60)*1024)/512+val(4,-0.35,0.35)),clamp(138-val(5,-128,128)*0.45,0,255),clamp(128-val(5,-128,128)*0.15,0,255),clamp(88+val(5,-128,128)*0.58,0,255)),0,255),ctl(7))",
      "a"
    ]
  },
  {
    "id": "kaleidoscope-mirror",
    "name": "Kaleidoscope Mirror",
    "description": "Folds the source into radial mirrored sectors around the image center. Segments sets the even wedge count, Rotation turns the fold, Radius / Zoom changes radial sampling scale, Mix blends with the original, Twist spirals the sectors progressively with radius, and Radial Offset shifts which concentric source region feeds the fold. Transparency follows the same mirrored geometry.",
    "author": "Anthony Chimming",
    "tags": [
      "Distortion",
      "Pattern",
      "Shapes"
    ],
    "controls": [
      {
        "label": "Segments",
        "value": 51,
        "ui": {
          "widget": "slider",
          "displayMin": 4,
          "displayMax": 24,
          "step": 2,
          "format": "integer",
          "unit": ""
        }
      },
      {
        "label": "Rotation",
        "value": 0,
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
        "label": "Radius / Zoom",
        "value": 63.75,
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
        "label": "Mix",
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
        "label": "Twist",
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
        "label": "Radial Offset",
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
      "lerp(c,rad(mirror(d+val(1,0,1024)+val(4,-512,512)*(m/M),1024/(round(val(0,4,24)/2)*2)),clamp(m/val(2,0.5,2.5)+val(5,-0.25,0.25)*min(X,Y),0,M),z),ctl(3))",
      "lerp(c,rad(mirror(d+val(1,0,1024)+val(4,-512,512)*(m/M),1024/(round(val(0,4,24)/2)*2)),clamp(m/val(2,0.5,2.5)+val(5,-0.25,0.25)*min(X,Y),0,M),z),ctl(3))",
      "lerp(c,rad(mirror(d+val(1,0,1024)+val(4,-512,512)*(m/M),1024/(round(val(0,4,24)/2)*2)),clamp(m/val(2,0.5,2.5)+val(5,-0.25,0.25)*min(X,Y),0,M),z),ctl(3))",
      "lerp(c,rad(mirror(d+val(1,0,1024)+val(4,-512,512)*(m/M),1024/(round(val(0,4,24)/2)*2)),clamp(m/val(2,0.5,2.5)+val(5,-0.25,0.25)*min(X,Y),0,M),z),ctl(3))"
    ]
  },
  {
    "id": "photoshop-hue-saturation-master",
    "name": "Photoshop-Style Hue/Saturation",
    "description": "Photoshop-style Master Hue/Saturation adjustment. Hue rotates color from -180° to +180°. Saturation ranges from full desaturation at -100 through the source saturation at 0 to maximum saturation at +100 while achromatic pixels remain neutral. Lightness fades the adjusted RGB result toward black for negative values and toward white for positive values, matching Photoshop's Master Lightness response more closely than a simple HSL-lightness replacement. Source alpha is preserved. Per-color ranges and Colorize are intentionally not included.",
    "author": "Anthony Chimming",
    "tags": [
      "Color",
      "Tone",
      "Utility"
    ],
    "controls": [
      {
        "label": "Hue",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -180,
          "displayMax": 180,
          "step": 1,
          "format": "integer",
          "unit": "°"
        }
      },
      {
        "label": "Saturation",
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
        "label": "Lightness",
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
      "clamp((255*(((max(r,max(g,b))+min(r,min(g,b)))/510)+((max(r,max(g,b))-min(r,min(g,b)))==0?0:((max(r,max(g,b))-min(r,min(g,b)))/(255-abs(max(r,max(g,b))+min(r,min(g,b))-255)))*(1-abs(val(1,-100,100))/100)+max(val(1,-100,100),0)/100)*min(((max(r,max(g,b))+min(r,min(g,b)))/510),1-((max(r,max(g,b))+min(r,min(g,b)))/510))*(2*clamp(abs(wrap(((max(r,max(g,b))-min(r,min(g,b)))==0?0:max(r,max(g,b))==r?wrap((g-b)/(max(r,max(g,b))-min(r,min(g,b))),6):max(r,max(g,b))==g?(b-r)/(max(r,max(g,b))-min(r,min(g,b)))+2:(r-g)/(max(r,max(g,b))-min(r,min(g,b)))+4)+val(0,-180,180)/60+(z==0?0:z==1?4:2),6)-3)-1,0,1)-1)))*(1-abs(val(2,-100,100))/100)+255*max(val(2,-100,100),0)/100,0,255)",
      "clamp((255*(((max(r,max(g,b))+min(r,min(g,b)))/510)+((max(r,max(g,b))-min(r,min(g,b)))==0?0:((max(r,max(g,b))-min(r,min(g,b)))/(255-abs(max(r,max(g,b))+min(r,min(g,b))-255)))*(1-abs(val(1,-100,100))/100)+max(val(1,-100,100),0)/100)*min(((max(r,max(g,b))+min(r,min(g,b)))/510),1-((max(r,max(g,b))+min(r,min(g,b)))/510))*(2*clamp(abs(wrap(((max(r,max(g,b))-min(r,min(g,b)))==0?0:max(r,max(g,b))==r?wrap((g-b)/(max(r,max(g,b))-min(r,min(g,b))),6):max(r,max(g,b))==g?(b-r)/(max(r,max(g,b))-min(r,min(g,b)))+2:(r-g)/(max(r,max(g,b))-min(r,min(g,b)))+4)+val(0,-180,180)/60+(z==0?0:z==1?4:2),6)-3)-1,0,1)-1)))*(1-abs(val(2,-100,100))/100)+255*max(val(2,-100,100),0)/100,0,255)",
      "clamp((255*(((max(r,max(g,b))+min(r,min(g,b)))/510)+((max(r,max(g,b))-min(r,min(g,b)))==0?0:((max(r,max(g,b))-min(r,min(g,b)))/(255-abs(max(r,max(g,b))+min(r,min(g,b))-255)))*(1-abs(val(1,-100,100))/100)+max(val(1,-100,100),0)/100)*min(((max(r,max(g,b))+min(r,min(g,b)))/510),1-((max(r,max(g,b))+min(r,min(g,b)))/510))*(2*clamp(abs(wrap(((max(r,max(g,b))-min(r,min(g,b)))==0?0:max(r,max(g,b))==r?wrap((g-b)/(max(r,max(g,b))-min(r,min(g,b))),6):max(r,max(g,b))==g?(b-r)/(max(r,max(g,b))-min(r,min(g,b)))+2:(r-g)/(max(r,max(g,b))-min(r,min(g,b)))+4)+val(0,-180,180)/60+(z==0?0:z==1?4:2),6)-3)-1,0,1)-1)))*(1-abs(val(2,-100,100))/100)+255*max(val(2,-100,100),0)/100,0,255)",
      "a"
    ]
  },
  {
    "id": "versatile-stripes",
    "name": "Versatile Stripes",
    "description": "Creates crisp repeating two-colour stripes with independent stripe and background colours. Stripe Width and Gap Width range from fine pinstripes to broad bands; Angle rotates the pattern from -180° to 180°, and Offset shifts the stripe phase in either direction. Designed for posters, packaging, textiles, retro graphics, and layout backgrounds.",
    "author": "Anthony Chimming",
    "tags": [
      "Pattern",
      "Shapes",
      "Procedural",
      "Print",
      "Retro"
    ],
    "controls": [
      {
        "label": "Stripe Width",
        "value": 29.5,
        "ui": {
          "widget": "slider",
          "displayMin": 2,
          "displayMax": 512,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Gap Width",
        "value": 30.380859375,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 512,
          "step": 1,
          "format": "integer",
          "unit": "px"
        }
      },
      {
        "label": "Angle",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -180,
          "displayMax": 180,
          "step": 1,
          "format": "integer",
          "unit": "°"
        }
      },
      {
        "label": "Offset",
        "value": 127.5,
        "ui": {
          "widget": "slider",
          "displayMin": -50,
          "displayMax": 50,
          "step": 1,
          "format": "integer",
          "unit": "%"
        }
      },
      {
        "label": "Stripe Red",
        "value": 255,
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
        "label": "Stripe Green",
        "value": 235,
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
        "label": "Stripe Blue",
        "value": 0,
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
        "label": "Background Red",
        "value": 254,
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
        "label": "Background Green",
        "value": 93,
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
        "label": "Background Blue",
        "value": 124,
        "ui": {
          "widget": "slider",
          "displayMin": 0,
          "displayMax": 255,
          "step": 1,
          "format": "integer",
          "unit": ""
        }
      }
    ],
    "f": [
      "ctl(7)+(ctl(4)-ctl(7))*(val(1,0,512)<=0?1:1-smoothstep(val(0,2,512)/2-0.5,val(0,2,512)/2+0.5,mirrorRepeat((((x-X/2)*cos(val(2,-180,180)*1024/360+256)+(y-Y/2)*sin(val(2,-180,180)*1024/360+256))/512-val(0,2,512)/2+(val(3,-50,50)*(val(0,2,512)+val(1,0,512))/100)),(val(0,2,512)+val(1,0,512))/2)))",
      "ctl(8)+(ctl(5)-ctl(8))*(val(1,0,512)<=0?1:1-smoothstep(val(0,2,512)/2-0.5,val(0,2,512)/2+0.5,mirrorRepeat((((x-X/2)*cos(val(2,-180,180)*1024/360+256)+(y-Y/2)*sin(val(2,-180,180)*1024/360+256))/512-val(0,2,512)/2+(val(3,-50,50)*(val(0,2,512)+val(1,0,512))/100)),(val(0,2,512)+val(1,0,512))/2)))",
      "ctl(9)+(ctl(6)-ctl(9))*(val(1,0,512)<=0?1:1-smoothstep(val(0,2,512)/2-0.5,val(0,2,512)/2+0.5,mirrorRepeat((((x-X/2)*cos(val(2,-180,180)*1024/360+256)+(y-Y/2)*sin(val(2,-180,180)*1024/360+256))/512-val(0,2,512)/2+(val(3,-50,50)*(val(0,2,512)+val(1,0,512))/100)),(val(0,2,512)+val(1,0,512))/2)))",
      "a"
    ]
  }
];
