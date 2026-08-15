/**
 * Filter FabJS
 * Chroma-variable contracts shared by the CPU and WebGPU renderers.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

const float=Object.freeze({uMin:-55,uMax:55,uSpan:110,vMin:-78,vMax:78,vSpan:156});
const legacy=Object.freeze({uMin:0,uMax:255,uSpan:255,vMin:0,vMax:255,vSpan:255});

export const CHROMA_MODELS=Object.freeze({float,legacy});
