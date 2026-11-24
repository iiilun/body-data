import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneTransition,cubeCoverScale,projectedCubeHull,viewportCovered,cubeRasterDetail} from '../dist/src/scene-transition.js';
import {menuCopy} from '../dist/src/menu-view.js';

const viewport={width:1280,height:720,size:371.2};
test('scene entry expands the cube, holds complete black, then reveals the briefing before completing once',()=>{
 const transition=new SceneTransition();transition.start('hold',viewport);
 assert.deepEqual(transition.update(0),{phase:'expand',zoom:1,shade:0,briefScale:1.45,done:false});
 let frame=transition.update(transition.durations.expand);assert.equal(frame.phase,'black');assert.equal(frame.shade,1);assert.equal(frame.done,false);
 frame=transition.update(.19);assert.equal(frame.phase,'black');assert.equal(frame.shade,1);
 frame=transition.update(.02);assert.equal(frame.phase,'reveal');assert.ok(frame.briefScale>1.4);assert.equal(frame.done,false);
 frame=transition.update(transition.durations.reveal+.01);assert.equal(frame.phase,'done');assert.equal(frame.shade,0);assert.equal(frame.briefScale,1);assert.equal(frame.done,true);
 assert.equal(transition.update(1),null);
});
test('cube zoom and black opacity progress smoothly without reversing or jumping at the blackout',()=>{
 const transition=new SceneTransition();transition.start('space',viewport);let previous=transition.update(0);
 for(let i=0;i<Math.round(transition.durations.expand*60);i++){
  const frame=transition.update(1/60);assert.ok(frame.zoom>=previous.zoom);assert.ok(frame.shade>=previous.shade);assert.ok(frame.shade-previous.shade<.12);previous=frame;
 }
 assert.ok(Math.abs(previous.zoom-transition.cover)<1e-8);assert.ok(Math.abs(previous.shade-1)<1e-8);
});
test('incoming briefing shrinks to fit and becomes fully visible while its transition remains active',()=>{
 const transition=new SceneTransition();transition.start('thirst',viewport);transition.update(transition.durations.expand+transition.durations.black);let previous=transition.update(0),readable=false;
 for(let i=0;i<Math.ceil(transition.durations.reveal*60);i++){
  const frame=transition.update(1/60);assert.ok(frame.briefScale<=previous.briefScale);assert.ok(frame.shade<=previous.shade);
  if(frame.shade===0&&!frame.done)readable=true;previous=frame;
 }
 assert.ok(readable);assert.ok(Math.abs(previous.briefScale-1)<1e-8);
});
test('return cancels a pending transition and a second selection cannot replace an active one',()=>{
 const transition=new SceneTransition();transition.start('hold',viewport);transition.update(.9);assert.equal(transition.start('space',viewport),false);
 transition.cancel();assert.equal(transition.update(10),null);assert.equal(transition.start('space',viewport),true);assert.equal(transition.update(0).zoom,1);
});
test('resize recalculates full-screen coverage while keeping the transition at its current phase',()=>{
 const transition=new SceneTransition();transition.start('shelter',viewport);transition.update(.4);transition.resize(390,844,210);
 const frame=transition.update(0);assert.equal(frame.phase,'expand');assert.ok(frame.zoom>1);transition.update(transition.durations.expand-.4);
 assert.equal(transition.update(0).zoom,transition.cover);
});
test('reduced motion retains a real black handoff and reaches the same final reading size',()=>{
 const transition=new SceneTransition({reducedMotion:true});transition.start('vacant',viewport);
 assert.equal(transition.update(.16).phase,'black');assert.equal(transition.update(.1).phase,'reveal');
 const frame=transition.update(.21);assert.equal(frame.done,true);assert.equal(frame.briefScale,1);assert.equal(frame.shade,0);
});
test('all seven menu prompts match the three-second selection duration',()=>{
 for(const [lang,copy]of Object.entries(menuCopy))for(const key of ['dwell','preview'])assert.ok(copy[key].includes(lang==='ar'?'٣':'3'),lang+' '+key);
});

test('black cannot begin until the rotated cube actually covers all four screen corners',()=>{
 for(const [width,height,size]of [[1280,720,371.2],[390,844,210],[1920,1080,420],[3840,1080,420]]){
  for(const [pitch,yaw]of [[-18,-28],[0,0],[-90,0],[90,0],[0,180],[0,90],[63,217],[-147,352]]){
   const orientation={pitch,yaw,roll:-7},hull=projectedCubeHull(size,orientation),transition=new SceneTransition();
   transition.start('space',{width,height,size,...orientation});let coveredBeforeFade=false;
   for(let i=0;i<120;i++){
    const frame=transition.update(transition.durations.expand/120);
    if(frame.shade===0&&viewportCovered(width,height,hull,frame.zoom))coveredBeforeFade=true;
    if(frame.shade>0)assert.ok(viewportCovered(width,height,hull,frame.zoom),`${width} × ${height}, ${pitch}/${yaw}`);
   }
   assert.ok(coveredBeforeFade);assert.ok(transition.cover>cubeCoverScale(width,height,size,orientation)*3);
  }
 }
});
test('raster detail raises glyph resolution in stable steps instead of stretching the original texture',()=>{
 assert.deepEqual([1,1.9,2.1,3.9,4.1,7.9].map(cubeRasterDetail),[2,2,4,4,8,8]);
 for(let zoom=1;zoom<=8;zoom+=.01)assert.ok(cubeRasterDetail(zoom)>=zoom);
 assert.equal(cubeRasterDetail(32),8); // Bound offscreen GPU layer allocation.
});
