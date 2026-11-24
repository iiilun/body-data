import test from 'node:test';
import assert from 'node:assert/strict';
import {ArrivalSequence,LANGUAGE_CUBES,languageLayout,floatingCube,mergeCube,menuCubeSize} from '../dist/src/arrival.js';

test('entry reveals languages after the data wall and never advances without a selection',()=>{
 const sequence=new ArrivalSequence();assert.equal(sequence.phase,'data');assert.equal(sequence.select('zh'),false);
 assert.equal(sequence.advance(1.35),null);assert.equal(sequence.phase,'opening');assert.equal(sequence.select('zh'),false);
 sequence.advance(1.9);assert.equal(sequence.phase,'languages');assert.equal(sequence.advance(600),null);assert.equal(sequence.phase,'languages');
});
test('camera handoff is delivered only after the selected language has finished merging, once',()=>{
 for(const {id}of LANGUAGE_CUBES){
  const sequence=new ArrivalSequence();sequence.advance(4);assert.equal(sequence.select(id),true);assert.equal(sequence.select('en'),false);
  assert.equal(sequence.advance(2.64),null);assert.equal(sequence.phase,'merging');assert.equal(sequence.advance(.011),id);
  assert.equal(sequence.phase,'ready');assert.equal(sequence.advance(10),null);assert.equal(sequence.select('zh'),false);
 }
});
test('back cancels a pending handoff and allows a different language transaction',()=>{
 const sequence=new ArrivalSequence();sequence.advance(4);sequence.select('zh');sequence.advance(1.8);sequence.reset({languagesOnly:true});
 assert.equal(sequence.advance(20),null);assert.equal(sequence.phase,'languages');sequence.select('ja');assert.equal(sequence.advance(2.66),'ja');
});
test('invalid languages and inactive frame deltas cannot advance a handoff',()=>{
 const sequence=new ArrivalSequence();sequence.advance(4);assert.equal(sequence.select('xx'),false);sequence.select('fr');
 for(const dt of [0,-1,NaN,Infinity])assert.equal(sequence.advance(dt),null);assert.equal(sequence.elapsed,0);
});
test('reduced motion shortens the effect while preserving consent order and a deliberate choice',()=>{
 const sequence=new ArrivalSequence({reducedMotion:true});sequence.advance(.38);assert.equal(sequence.phase,'languages');
 assert.equal(sequence.advance(100),null);sequence.select('ar');assert.equal(sequence.advance(.44),null);assert.equal(sequence.advance(.02),'ar');
});
test('seven responsive cubes remain separated and inside the screen with room for labels',()=>{
 for(const [w,h]of [[1440,900],[1280,720],[1920,1080],[390,844],[768,1024],[844,390]]){
  const points=languageLayout(w,h);assert.equal(points.length,7);
  for(const [i,p]of points.entries()){
   // Include the projected 3D extent and the native language caption.
   assert.ok(p.x-p.size*.8>0&&p.x+p.size*.8<w,`${w} × ${h}, cube ${i} horizontally`);
   assert.ok(p.y-p.size*.8>0&&p.y+p.size*1.2<h,`${w} × ${h}, cube ${i} vertically`);
   for(const q of points.slice(i+1))assert.ok(Math.abs(p.x-q.x)>p.size*1.5||Math.abs(p.y-q.y)>p.size*2,`${w} × ${h}: cube overlap`);
  }
 }
});
test('every selected cube converges to the centred main menu with exactly matching size and orientation',()=>{
 for(const [w,h]of [[1440,900],[390,844]]){
  const points=languageLayout(w,h).map((p,i)=>floatingCube(p,i,5));
  for(let chosen=0;chosen<7;chosen++)for(let i=0;i<7;i++){
   const start=mergeCube(points[i],points[chosen],i,chosen,0,w,h);assert.equal(start.x,points[i].x);assert.equal(start.y,points[i].y);assert.equal(start.size,points[i].size);
   const end=mergeCube(points[i],points[chosen],i,chosen,1,w,h);assert.equal(end.x,w/2);assert.equal(end.y,h/2);
   if(i===chosen){assert.equal(end.size,menuCubeSize(w));assert.equal(end.pitch,-18);assert.equal(end.yaw,-28);assert.equal(end.roll,-7);assert.equal(end.opacity,1);}
   else assert.equal(end.opacity,0);
  }
 }
});
test('reduced motion keeps language cubes stable instead of floating',()=>{
 const base=languageLayout(1280,720)[0];assert.deepEqual(floatingCube(base,0,5,true),base);assert.notDeepEqual(floatingCube(base,0,5),base);
});
