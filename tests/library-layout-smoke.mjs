import assert from 'node:assert/strict';
import {libraryPresentation} from '../src/ui/library-layout.js';
for(const [width,height,expected] of [[778,492,'side'],[768,700,'side'],[740,460,'side'],[739,800,'sheet'],[778,459,'sheet'],[1440,300,'sheet'],[390,740,'sheet'],[320,460,'sheet']]){
  const {mode,drawer}=libraryPresentation(width,height);assert.equal(mode,expected,`${width} × ${height}`);if(mode==='side'){assert.ok(width-drawer-12>=360);assert.ok(drawer>=344&&drawer<=378);}
}
console.log('Library measured width/height eligibility and bounded drawer width passed.');
