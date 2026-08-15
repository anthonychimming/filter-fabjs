# Analytic Shape Masks

Filter FabJS analytic shapes are stateless functions that evaluate independently for each pixel. They return normalized masks from `0` outside the shape to `1` inside it, so they remain compatible with both the CPU Worker and WebGPU renderer.

All coordinates, dimensions, stroke widths, and feather values are measured in pixels. Negative dimensions and widths are treated as their absolute values. Feathering extends outward from the mathematical edge; `0` produces a hard edge.

## Functions

| Function | Meaning |
| --- | --- |
| `line(x,y,ax,ay,bx,by,width,feather)` | Line segment from A to B. `width` is the full stroke width. |
| `circle(x,y,cx,cy,radius,feather)` | Filled circle. |
| `ring(x,y,cx,cy,radius,width,feather)` | Circular outline centred on `radius`. |
| `box(x,y,cx,cy,width,height,rotation,feather)` | Filled rectangle. Rotation uses the existing Filter FabJS angle scale: `0–1024` is one full turn. |
| `triangle(x,y,ax,ay,bx,by,cx,cy,feather)` | Filled triangle defined by three vertices. A zero-area triangle returns `0`. |
| `grid(x,y,cellWidth,cellHeight,lineWidth,feather)` | Repeating horizontal and vertical grid lines. |
| `sierpinski(x,y,cx,cy,size,depth,feather)` | Equilateral Sierpiński gasket. `depth` is clamped to `0–10`; coordinate folding keeps it stateless and GPU-compatible. |

## Compositing masks

Multiply a mask by a channel value to draw it:

```text
circle(x,y,X/2,Y/2,80,1)*255
```

Use `max()` for a union, multiplication for an intersection, and subtraction with `clamp()` for a cutout:

```text
max(circle(x,y,X/2,Y/2,80,1),box(x,y,X/2,Y/2,120,60,128,1))*255
```

```text
clamp(circle(x,y,X/2,Y/2,80,1)-circle(x,y,X/2,Y/2,60,1),0,1)*255
```

The built-in **Analytic Shape Sampler** presents the six geometric primitives as a clean reference sheet. **Sierpiński Fractal** uses `sierpinski()` for genuine repeated structure. **Midnight Tartan** layers repeated `grid()` masks, checker modulation, and rotated coordinates to produce adjustable bands, pinstripes, and diagonal weave. All three remain stateless and GPU-compatible.
