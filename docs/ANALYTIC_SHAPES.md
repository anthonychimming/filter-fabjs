# Analytic Shapes and Signed-Distance Fields

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
| `sierpinski(x,y,cx,cy,size,depth,feather)` | Equilateral Sierpiński gasket. `depth` is clamped to `0–10`; barycentric child folding keeps every finite depth coherent and GPU-compatible. `feather` applies to the outer boundary and internal holes. |

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

## Signed-distance composition

For reusable boolean geometry and smooth joins, Phase 3.5C exposes signed-distance versions of the core line, circle, and rotated-box primitives. These return distances in pixels: negative inside, zero at the boundary, and positive outside.

| Function | Meaning |
| --- | --- |
| `sdfLine(x,y,ax,ay,bx,by,width)` | Signed distance to a stroked line segment. |
| `sdfCircle(x,y,cx,cy,radius)` | Signed distance to a circle. |
| `sdfBox(x,y,cx,cy,width,height,rotation)` | Signed distance to a rotated rectangle. |
| `sdfUnion(a,b)` | Exact union. |
| `sdfIntersect(a,b)` | Exact intersection. |
| `sdfSubtract(a,b)` | Remove `b` from `a`. |
| `sdfSmoothUnion(a,b,radius)` | Polynomial smooth union; `0` radius is an exact union. |
| `sdfFill(distance[,feather])` | Convert a field to a filled mask. |
| `sdfOutline(distance,width[,feather])` | Convert the field boundary to a centred outline mask. |

Negative dimensions, radii, widths, smoothing radii, and feather values are treated as absolute values. Fill and outline feathering defaults to zero and extends outward. Existing mask primitives retain their established signatures and behavior.

```text
sdfFill(
  sdfSubtract(
    sdfSmoothUnion(
      sdfCircle(x,y,X/2,Y/2,80),
      sdfBox(x,y,X/2,Y/2,120,70,128),
      16
    ),
    sdfCircle(x,y,X/2,Y/2,28)
  ),
  1
)*255
```

Domain warping remains ordinary coordinate composition. For example, pass noise-offset `x` and `y` expressions into an SDF primitive before composing the field. The built-in **Warped SDF Bloom** demonstrates this without adding loops, mutable state, intermediate textures, or another execution model.

The built-in **Analytic Shape Sampler** presents the six mask primitives as a clean reference sheet. **Sierpiński Fractal** uses `sierpinski()` for genuine repeated structure. **Midnight Tartan** layers repeated `grid()` masks, checker modulation, and rotated coordinates to produce adjustable bands, pinstripes, and diagonal weave. **Warped SDF Bloom** demonstrates composited distance fields with deterministic coordinate warping. All four remain stateless and GPU-compatible.
