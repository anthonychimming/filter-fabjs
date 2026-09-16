/** Conservative float-mode bounds for CPU budgeting, not IR capability metadata. */
export function numericBounds(node,depth=0){
  if(!node||depth>128)return null;
  const bounds=child=>numericBounds(child,depth+1);
  const range=(lo,hi)=>Number.isNaN(lo)||Number.isNaN(hi)?null:{lo,hi};
  if(node.op==='const')return Number.isFinite(node.value)?range(node.value,node.value):null;
  if(node.op==='unary'){
    const a=bounds(node.input);if(!a)return null;
    if(node.operator==='+')return a;
    if(node.operator==='-')return range(-a.hi,-a.lo);
  }
  if(node.op==='select'){
    const a=bounds(node.whenTrue),b=bounds(node.whenFalse);
    return a&&b?range(Math.min(a.lo,b.lo),Math.max(a.hi,b.hi)):null;
  }
  if(node.op!=='call'||!Array.isArray(node.args))return null;
  const args=node.args;
  if(node.fn==='ctl')return range(0,255);
  if(node.fn==='val'){
    const a=bounds(args[1]),b=bounds(args[2]);
    if(!a||!b||a.lo!==a.hi||b.lo!==b.hi)return null;
    // Match the evaluator's operation order, including endpoint roundoff.
    const delta=b.hi-a.lo,end=255*delta/255+a.lo;
    if(!Number.isFinite(delta)||!Number.isFinite(end))return null;
    return range(Math.min(a.lo,end),Math.max(a.lo,end));
  }
  // Unknown values can include NaN. NaN propagates through these calls and
  // becomes one iteration in the worker; the finite/infinite cases bound work.
  const unknown={lo:-Infinity,hi:Infinity};
  const a=bounds(args[0])||unknown,b=bounds(args[1])||unknown;
  if(node.fn==='min')return range(Math.min(a.lo,b.lo),Math.min(a.hi,b.hi));
  if(node.fn==='max')return range(Math.max(a.lo,b.lo),Math.max(a.hi,b.hi));
  if(node.fn==='clamp'){
    const c=bounds(args[2])||unknown;
    // CPU clamp is max(lower,min(upper,value)), even for reversed bounds.
    return range(Math.max(b.lo,Math.min(c.lo,a.lo)),Math.max(b.hi,Math.min(c.hi,a.hi)));
  }
  return null;
}
