// Deterministic regions shared by the optional hardware suite and CPU benchmark.
export const fractalWorkloads=[
  ['Mandelbrot early escape',n=>`mandelbrot(3+nx,ny,${n})`],
  ['Mandelbrot boundary',n=>`mandelbrot(-0.75+nx*0.02,0.09+ny*0.02,${n})`],
  ['Mandelbrot interior',n=>`mandelbrot(nx*0.1,ny*0.1,${n})`],
  ['Julia early escape',n=>`julia(3+nx,ny,-0.8,0.156,${n})`],
  ['Julia boundary',n=>`julia(0.29+nx*0.02,0.19+ny*0.02,-0.8,0.156,${n})`],
  ['Julia interior',n=>`julia(nx*0.1,ny*0.1,0,0,${n})`]
];
export const fractalParityFixtures=[256,384,512,9999].flatMap(n=>[
  [`Mandelbrot early / ${n}`,`mandelbrot(3,0,${n})*255`],
  [`Mandelbrot slow / ${n}`,`mandelbrot(-0.8,0.156,${n})*255`],
  [`Mandelbrot bounded / ${n}`,`mandelbrot(0,0,${n})*255`],
  [`Julia early / ${n}`,`julia(3,0,0,0,${n})*255`],
  [`Julia slow / ${n}`,`julia(0.3,0.2,-0.8,0.156,${n})*255`],
  [`Julia bounded / ${n}`,`julia(0,0,0,0,${n})*255`]
]);
export const conditionalFractalFixtures=[256,384,512].flatMap(n=>{
  const m=`mandelbrot(-0.75,0.1,${n})`,j=`julia(0.3,0.2,-0.8,0.156,${n})`;
  return[
    [`Conditional fractals / ${n}`,`(x<X/2?${m}:${j})*255`],
    [`Nested fractals / ${n}`,`(x<X/2?(y<Y/2?${m}:${j}):mandelbrot(0,0,${n}))*255`],
    [`Conditional argument / ${n}`,`gradient3(x<X/2?${m}:${j},0,128,255)`],
    [`Conditional short-circuit AND / ${n}`,`((x<X/2)&&(y<Y/2?${m}:${j}))*255`],
    [`Conditional short-circuit OR / ${n}`,`((x<X/2)||(y<Y/2?${m}:${j}))*255`],
    [`Conditional source channel / ${n}`,`c>128?${m}*255+z:${j}*255+p`]
  ];
});
export const conditionalFractalWorkloads=[
  ['Conditional bounded fractals',n=>`x<X/2?mandelbrot(0,0,${n}):julia(0,0,0,0,${n})`],
  ['Conditional early/bounded fractals',n=>`x<X/2?mandelbrot(3,0,${n}):julia(0,0,0,0,${n})`]
];
