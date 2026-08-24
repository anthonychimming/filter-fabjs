/**
 * Filter FabJS
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { CONTROL_COUNT } from '../core/controls.js';

export const WEBGPU_CONTROL_SLOT_COUNT=Math.ceil(CONTROL_COUNT/4)*4;
export const WEBGPU_PARAMS_HEADER_BYTES=16;
export const WEBGPU_PARAMS_BYTES=WEBGPU_PARAMS_HEADER_BYTES+WEBGPU_CONTROL_SLOT_COUNT*4;
