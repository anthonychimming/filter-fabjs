/**
 * Filter FabJS
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

export const DEFAULT_CONTROL_VALUE=128;
export const CONTROL_DEFINITIONS=Object.freeze(Array.from({length:10},(_,index)=>Object.freeze({index,defaultValue:DEFAULT_CONTROL_VALUE,defaultLabel:`Control ${index+1}`})));
export const CONTROL_COUNT=CONTROL_DEFINITIONS.length;
export const CONTROL_PAIR_COUNT=Math.floor(CONTROL_COUNT/2);
export const defaultControlValues=()=>CONTROL_DEFINITIONS.map(definition=>definition.defaultValue);
export const defaultControlLabels=()=>CONTROL_DEFINITIONS.map(definition=>definition.defaultLabel);
