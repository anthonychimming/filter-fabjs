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
