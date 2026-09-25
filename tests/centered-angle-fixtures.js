export const centeredAngleSizes=[[31,23],[33,25],[17,17],[32,24],[1,1],[1,23],[31,1]];
const inputs=[
  ['cx','cy',(cx,cy)=>[cx,cy]],
  ['cx+0','cy',(cx,cy)=>[cx+0,cy]],
  ['cx','cy+0',(cx,cy)=>[cx,cy+0]],
  ['cx*1','cy',(cx,cy)=>[cx*1,cy]],
  ['cx','cy*1',(cx,cy)=>[cx,cy*1]],
  ['cx*2','cy',(cx,cy)=>[cx*2,cy]],
  ['cx','cy/2',(cx,cy)=>[cx,cy/2]],
  ['+cx','+cy',(cx,cy)=>[+cx,+cy]],
  ['-cx','cy',(cx,cy)=>[-cx,cy]],
  ['cx','-cy',(cx,cy)=>[cx,-cy]],
  ['-cx','-cy',(cx,cy)=>[-cx,-cy]],
  // Offset encoding observes these tiny nonzero angles without crossing the
  // existing repeat() f32 wrap boundary. The ordinary fixtures retain repeat.
  ['cx+0.000000001','cy',(cx,cy)=>[cx+1e-9,cy],'offset'],
  ['cx-0.000000001','cy',(cx,cy)=>[cx-1e-9,cy],'offset'],
  ['cx','cy+0.000000001',(cx,cy)=>[cx,cy+1e-9],'offset'],
  ['cx','cy-0.000000001',(cx,cy)=>[cx,cy-1e-9],'offset'],
  ['x?cx:1','cy',(cx,cy,x)=>[x?cx:1,cy]]
];
export const centeredAngleFixtures=['angle','c2d'].flatMap(alias=>inputs.map(([x,y,values,encoding='repeat'])=>({formula:`${alias}(${x},${y})`,values,encoding})));
export function centeredAnglePoints(width,height){
  const x=Math.floor((width-1)/2),y=Math.floor((height-1)/2);
  return [...new Set([[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1],[x+1,y+1],[0,y],[width-1,y],[x,0],[x,height-1],[0,0],[width-1,height-1]]
    .filter(([px,py])=>px>=0&&px<width&&py>=0&&py<height).map(p=>p.join(',')))].map(p=>p.split(',').map(Number));
}
