export const angularGradientSizes=[[31,23],[32,24],[33,25],[17,17]];
export const angularGradientOffsets=[0,128,256,512,37,1,-128];
export const angularGradientDirections=[
  ...[0.5,1,10.5,11.5].flatMap(m=>[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,y])=>({dx:x*m,dy:y*m,kind:'exact'}))),
  ...[[11.5,-10.5],[10.5,-11.5],[0.5,1.5],[1.5,0.5],[2,3],[-3,2]].map(([dx,dy])=>({dx,dy,kind:'near'})),
  {dx:0,dy:0,kind:'origin'}
];
export const angularGradientCenters=[
  {name:'image midpoint',x:'X/2',y:'Y/2',values:(w,h)=>[w/2,h/2]},
  {name:'integer center',x:'floor(X/2)',y:'floor(Y/2)',values:(w,h)=>[Math.floor(w/2),Math.floor(h/2)]},
  {name:'control center',x:'ctl(0)/2',y:'ctl(1)/2',values:()=>[15.5,11.5]}
];
// Runtime controls keep input coordinates positive and exactly representable,
// including half-integers. All controls remain in the public 0..255 range.
export const angularGradientRayFormula='angularGrad(ctl(0)/2,ctl(1)/2,ctl(2)/2,ctl(3)/2,(ctl(4)-64)*4)';
export function angularGradientRayControls(dx,dy,center,offset){return [2*(center+dx),2*(center+dy),2*center,2*center,64+offset/4,0,0,0,0,0]}
export const angularGradientValue=(dx,dy,offset)=>{
  const turn=Math.atan2(dy,dx)/(2*Math.PI)+(Math.abs(offset)<=1?offset:offset/1024);
  return ((turn%1)+1)%1;
};
