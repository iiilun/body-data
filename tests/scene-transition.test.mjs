import test from 'node:test';
import assert from 'node:assert/strict';
import {UnfoldTransition,previewSize,netScale,approachDepth} from '../dist/src/unfold-transition.js';
import {menuCopy} from '../dist/src/menu-view.js';
const viewport={width:1280,height:720,size:371.2,pitch:-18,yaw:-28,roll:-7};
test('carton starts as a closed cube and opens its lid before its side walls',()=>{
 const t=new UnfoldTransition();t.start('hold',viewport);const f=t.update(0);assert.equal(f.lid,-90);assert.equal(f.left,90);assert.equal(f.right,-90);assert.equal(f.top,-90);assert.equal(f.bottom,90);assert.equal(f.scale,1);assert.equal(f.depth,0);
 const lid=t.update(t.durations.lid*.6);assert.ok(lid.lid>-90&&lid.lid<0);assert.equal(lid.left,90);assert.equal(lid.top,-90);assert.equal('zoom' in lid,false);assert.equal('shade' in lid,false);
});
test('hinged side walls unfold in a staggered sequence while the inside page remains central',()=>{
 const t=new UnfoldTransition();t.start('thirst',viewport);const f=t.update(t.durations.lid+t.durations.spread*.3);assert.equal(f.phase,'spread');assert.ok(Math.abs(f.lid)<1e-8);assert.ok(Math.abs(f.left)<Math.abs(f.right));assert.ok(Math.abs(f.right)<Math.abs(f.bottom));assert.equal(f.top,-90);assert.equal(f.depth,0);
 const flat=t.update(t.durations.spread*.7+.001);for(const side of ['left','right','top','bottom','lid'])assert.ok(Math.abs(flat[side])<1e-8);assert.equal(flat.phase,'settle');
});
test('the connected net advances with all folds flat after it has been exposed',()=>{
 const t=new UnfoldTransition();t.start('space',viewport);const d=t.durations;t.update(d.lid+d.spread+d.settle);const flight=t.update(d.advance*.5);assert.equal(flight.phase,'advance');assert.ok(flight.depth>0);for(const side of ['left','right','top','bottom','lid'])assert.ok(Math.abs(flight[side])<1e-8);assert.equal(flight.done,false);
});
test('contained page preview keeps its aspect and fills every viewport exactly at the final dolly depth',()=>{
 for(const [width,height,size]of [[1280,720,371.2],[1440,900,418],[390,844,210],[1920,1080,420],[844,390,245]]){
  const scale=netScale(width,height,size),depth=approachDepth(width,height,size,scale),magnification=scale*1200/(1200-(depth-size/2)),preview=previewSize(width,height,size);
  assert.ok(Math.abs(preview.width*magnification-width)<1e-7);assert.ok(Math.abs(preview.height*magnification-height)<1e-7);assert.ok(depth-size/2<1200);assert.ok(preview.width<=size&&preview.height<=size);
 }
});
test('unfolding finishes once, cancels cleanly and rejects a replacement selection while active',()=>{
 const t=new UnfoldTransition();t.start('hold',viewport);assert.equal(t.start('space',viewport),false);t.update(.5);t.cancel();assert.equal(t.update(20),null);t.start('space',viewport);const f=t.update(20);assert.equal(f.done,true);assert.equal(f.edge,0);assert.equal(t.update(1),null);
});
test('large dragged orientations choose nearby turns instead of spinning through multiple revolutions',()=>{
 for(const yaw of [-3850,-180,175,7200]){const t=new UnfoldTransition();t.start('offline',{...viewport,yaw});let previous=t.update(0),motion=0;for(let i=0;i<240;i++){const f=t.update(1/60);if(!f)break;assert.ok(Math.abs(f.yaw-previous.yaw)<12);motion+=Math.abs(f.yaw-previous.yaw);previous=f;}assert.ok(motion<210);}
});
test('resize and reduced motion reach the same full-screen reading endpoint',()=>{
 const t=new UnfoldTransition({reducedMotion:true});t.start('vacant',viewport);t.update(.1);t.resize(390,844,210);const f=t.update(2),m=f.scale*1200/(1200-(f.depth-105)),view=previewSize(390,844,210);assert.equal(f.done,true);assert.ok(Math.abs(m*view.width-390)<1e-7);assert.ok(Math.abs(m*view.height-844)<1e-7);
});
test('all seven menu prompts retain three-second selection',()=>{for(const [lang,c]of Object.entries(menuCopy))for(const key of ['dwell','preview'])assert.ok(c[key].includes(lang==='ar'?'٣':'3'));});
