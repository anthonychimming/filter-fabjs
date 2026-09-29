import { displayToRaw, normalizeControlUI, normalizeToggleRaw, randomSeedDisplay, rawToDisplay } from '../core/controls.js';

export const MUTATION_FACTORS=Object.freeze({Low:.08,Medium:.18,High:.35,Chaos:.70});
export const controlStatesEqual=(a,b)=>Boolean(a&&b&&a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<=1e-10));
export function createExploreSession(controls){
  return {defaults:[...controls],locks:{},strength:'Medium',undo:null,snapshots:{A:null,B:null,C:null,D:null},active:null};
}
export function exploreValues(controls,uis,used,session,mutate=false,random=Math.random){
  const factor=MUTATION_FACTORS[session.strength];
  return controls.map((raw,i)=>{
    if(!used[i]||session.locks[i])return raw;
    const ui=normalizeControlUI(uis[i]);
    if(ui.widget==='toggle')return mutate?(random()<factor?255-normalizeToggleRaw(raw):raw):(random()<.5?0:255);
    if(ui.widget==='seed'){
      let next=displayToRaw(randomSeedDisplay(ui,random),ui);
      if(mutate&&next===raw){
        for(const value of [rawToDisplay(raw,ui)+Math.max(1,ui.step),rawToDisplay(raw,ui)-Math.max(1,ui.step),ui.displayMin,ui.displayMax]){
          next=displayToRaw(value,ui);if(next!==raw)break;
        }
      }
      return next;
    }
    const span=ui.displayMax-ui.displayMin;
    return displayToRaw(mutate?rawToDisplay(raw,ui)+(random()*2-1)*span*factor:ui.displayMin+random()*span,ui);
  });
}
export function commitExploreValues(state,next,{undo=true}={}){
  state.explore.undo=undo?[...state.controls]:null;
  state.controls=[...next];
}
export function saveExploreSnapshot(state,slot){state.explore.snapshots[slot]=[...state.controls];state.explore.active=slot;}
