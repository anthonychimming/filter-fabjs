/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { $ } from '../core/utils.js';
export function getDom(){
  const el={canvas:$('#displayCanvas'),stage:$('#canvasStage'),wrap:$('#canvasWrap'),drop:$('#dropOverlay'),renderOverlay:$('#renderOverlay'),progressFill:$('#progressFill'),progressPercent:$('#progressPercent'),progressRows:$('#progressRows'),controlsUsage:$('#controlsUsage'),authorControlsUsage:$('#authorControlsUsage'),controlsEmpty:$('#controlsEmpty'),formulaEditStatus:$('#formulaEditStatus'),renderBtn:$('#renderBtn'),imageInput:$('#imageInput'),filterInput:$('#filterInput'),preset:$('#presetSelect'),searchFilters:$('#browseFiltersBtn'),deletePreset:$('#deletePresetBtn'),rendererSelect:$('#rendererSelect'),rendererDiagnostics:$('#rendererDiagnostics'),rendererSummary:$('#rendererSummary'),rendererReason:$('#rendererReason'),description:$('#filterDescription'),activeFilterName:$('#activeFilterName'),activeFilterSource:$('#activeFilterSource'),activeFilterStatus:$('#activeFilterStatus'),activeFilterDescription:$('#activeFilterDescription'),activeFavorite:$('#activeFavoriteBtn'),formulas:[$('#formulaR'),$('#formulaG'),$('#formulaB'),$('#formulaA')],statusDot:$('#statusDot'),statusText:$('#statusText'),imageInfo:$('#imageInfo'),renderInfo:$('#renderInfo'),split:$('#splitRange'),splitControl:$('#splitControl'),zoomLabel:$('#zoomLabel'),toast:$('#toast')};
  const ctx=el.canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D context is unavailable');
  return{el,ctx};
}
