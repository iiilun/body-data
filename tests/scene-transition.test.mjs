import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneTransition,blackWindow,viewportCovered,rectanglePortal,cubeRasterDetail} from '../dist/src/scene-transition.js';
import {menuCopy} from '../dist/src/menu-view.js';
const viewport={width:1280,height:720,size:371.2,face:0,aperture:{u:.3,v:.4,w:.035,h:.028},pitch:-18,yaw:-28,roll:-7};
test('entry travels into actual unprinted cube space, with no opacity or black-shade frame',()=>{
 const t=new SceneTransition();t.start('hold',viewport);const first=t.update(0);assert.equal(first.zoom,1);assert.ok(Math.abs(first.x)<1e-8);assert.ok(Math.abs(first.y)<1e-8);
 for(let i=0;i<120;i++){const frame=t.update(t.durations.expand/120);assert.equal('shade' in frame,false);assert.equal('opacity' in frame,false);}
 const frame=t.update(.001);assert.equal(frame.phase,'black');assert.ok(frame.zoom>50);assert.ok(Math.abs(frame.x)>1||Math.abs(frame.y)>1);
});
test('the selected black rectangle itself covers every corner for all six projected cube faces',()=>{
 const faces=[[0,-18,-28],[1,0,180],[2,0,-90],[3,0,90],[4,-90,0],[5,90,0],[2,-25,-55]];
 for(const [width,height,size]of [[1280,720,371.2],[390,844,210],[1920,1080,420]])for(const [face,pitch,yaw]of faces){
  const options={...viewport,width,height,size,face,pitch,yaw},t=new SceneTransition();t.start('space',options);const frame=t.update(t.durations.expand);
  const window=blackWindow(size,face,options.aperture,options);assert.ok(viewportCovered(width,height,window.points,frame.zoom));
  assert.ok(Math.abs(frame.x+window.centre.x*frame.zoom)<1e-6);assert.ok(Math.abs(frame.y+window.centre.y*frame.zoom)<1e-6);
 }
});
test('incoming briefing zooms out of a real black area and finishes at exact reading size',()=>{
 const t=new SceneTransition();t.start('thirst',viewport);t.setReveal(rectanglePortal({x:70,y:260,width:9,height:9},1280,720));
 t.update(t.durations.expand+t.durations.black);let frame=t.update(0);assert.equal(frame.phase,'reveal');assert.ok(frame.briefScale>100);assert.equal('shade' in frame,false);
 frame=t.update(t.durations.reveal+.01);assert.equal(frame.done,true);assert.equal(frame.briefScale,1);assert.equal(frame.briefX,0);assert.equal(frame.briefY,0);assert.equal(t.update(1),null);
});
test('return cancels the pending portal and repeated selection cannot replace its target',()=>{
 const t=new SceneTransition();t.start('hold',viewport);t.update(.9);assert.equal(t.start('space',viewport),false);t.cancel();assert.equal(t.update(10),null);assert.equal(t.start('space',viewport),true);assert.equal(t.update(0).zoom,1);
});
test('resizing recomputes coverage of the same black rectangle',()=>{
 const t=new SceneTransition();t.start('shelter',viewport);t.update(.4);t.resize(390,844,210);assert.equal(t.update(0).phase,'expand');const f=t.update(t.durations.expand-.4+.001);assert.ok(viewportCovered(390,844,t.window,f.zoom));
});
test('reduced motion preserves real portal coverage and final position',()=>{
 const t=new SceneTransition({reducedMotion:true});t.start('vacant',viewport);assert.equal(t.update(t.durations.expand).phase,'black');t.update(t.durations.black);const f=t.update(t.durations.reveal+.01);assert.equal(f.done,true);assert.equal(f.briefScale,1);
});
test('all seven menu prompts retain three-second selection',()=>{for(const [lang,copy]of Object.entries(menuCopy))for(const key of ['dwell','preview'])assert.ok(copy[key].includes(lang==='ar'?'٣':'3'));});
test('native vector type resolution increases without unbounded GPU allocation',()=>{assert.deepEqual([1,1.9,2.1,3.9,4.1,7.9].map(cubeRasterDetail),[2,2,4,4,8,8]);assert.equal(cubeRasterDetail(320),8);});
