import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneTransition,cubeCoverScale} from '../dist/src/scene-transition.js';
import {menuCopy} from '../dist/src/menu-view.js';

const viewport={width:1280,height:720,size:371.2};
test('scene entry expands the cube, holds complete black, then reveals the briefing before completing once',()=>{
 const transition=new SceneTransition();transition.start('hold',viewport);
 assert.deepEqual(transition.update(0),{phase:'expand',zoom:1,shade:0,briefScale:1.45,done:false});
 let frame=transition.update(1.15);assert.equal(frame.phase,'black');assert.equal(frame.shade,1);assert.equal(frame.done,false);
 frame=transition.update(.19);assert.equal(frame.phase,'black');assert.equal(frame.shade,1);
 frame=transition.update(.02);assert.equal(frame.phase,'reveal');assert.ok(frame.briefScale>1.4);assert.equal(frame.done,false);
 frame=transition.update(1.2);assert.equal(frame.phase,'done');assert.equal(frame.shade,0);assert.equal(frame.briefScale,1);assert.equal(frame.done,true);
 assert.equal(transition.update(1),null);
});
test('cube zoom and black opacity progress smoothly without reversing or jumping at the blackout',()=>{
 const transition=new SceneTransition();transition.start('space',viewport);let previous=transition.update(0);
 for(let i=0;i<69;i++){
  const frame=transition.update(1/60);assert.ok(frame.zoom>=previous.zoom);assert.ok(frame.shade>=previous.shade);assert.ok(frame.shade-previous.shade<.08);previous=frame;
 }
 assert.ok(Math.abs(previous.zoom-cubeCoverScale(1280,720,371.2))<1e-8);assert.ok(Math.abs(previous.shade-1)<1e-8);
});
test('incoming briefing shrinks to fit and becomes fully visible while its transition remains active',()=>{
 const transition=new SceneTransition();transition.start('thirst',viewport);transition.update(1.35);let previous=transition.update(0),readable=false;
 for(let i=0;i<72;i++){
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
 const frame=transition.update(0);assert.equal(frame.phase,'expand');assert.ok(frame.zoom>1);transition.update(.75);
 assert.equal(transition.update(0).zoom,cubeCoverScale(390,844,210));
});
test('reduced motion retains a real black handoff and reaches the same final reading size',()=>{
 const transition=new SceneTransition({reducedMotion:true});transition.start('vacant',viewport);
 assert.equal(transition.update(.16).phase,'black');assert.equal(transition.update(.08).phase,'reveal');
 const frame=transition.update(.21);assert.equal(frame.done,true);assert.equal(frame.briefScale,1);assert.equal(frame.shade,0);
});
test('all seven menu prompts match the three-second selection duration',()=>{
 for(const [lang,copy]of Object.entries(menuCopy))for(const key of ['dwell','preview'])assert.ok(copy[key].includes(lang==='ar'?'٣':'3'),lang+' '+key);
});
