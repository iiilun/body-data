import test from 'node:test';
import assert from 'node:assert/strict';
import {TemporalSilhouette} from '../dist/src/temporal-silhouette.js';
import {maskContours,smoothClosedContour} from '../dist/src/person-contour.js';
import {blendedAlignmentStyle} from '../dist/src/camera-alignment.js';
function circle(cx=32,noise=0){const data=new Uint8Array(64*64);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const d=Math.hypot(x-cx,y-32);data[y*64+x]=d<14+(noise&&((y%4<2)?noise:-noise))?1:0;}return {data,width:64,height:64,origin:{x:cx/64,y:.5}};}
const difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
const centroid=(a,w)=>{let total=0,x=0;for(let i=0;i<a.length;i++){total+=a[i];x+=a[i]*(i%w);}return x/total/w;};
test('spatial and temporal filtering reduce alternate-frame edge noise',()=>{
 const filter=new TemporalSilhouette();filter.setMask(circle(),0);let previous=filter.field.slice(),rawPrevious=circle().data,rawMotion=0,filteredMotion=0;
 for(let i=1;i<30;i++){const now=i/30,m=circle(32,i%2?1:-1);filter.setMask(m,now);filter.step(1/30,now);rawMotion+=difference(m.data,rawPrevious);filteredMotion+=difference(filter.field,previous);previous=filter.field.slice();rawPrevious=m.data;}
 assert.ok(filteredMotion<rawMotion*.25,`${filteredMotion}/${rawMotion}`);
});
test('body translation compensation follows substantial movement without a long outline trail',()=>{
 const filter=new TemporalSilhouette();filter.setMask(circle(),0);const before=centroid(filter.field,64);filter.setMask(circle(36),.033);filter.step(1/60,.033);assert.ok(centroid(filter.field,64)-before>.055);
});
test('a brief empty segmentation frame does not blink the outline off, and actual loss expires',()=>{
 const filter=new TemporalSilhouette();filter.setMask(circle(),1);assert.equal(filter.setMask({data:new Uint8Array(64*64),width:64,height:64},1.05),false);assert.equal(filter.visibility(1.15),1);assert.equal(filter.visibility(1.5),0);filter.setMask(circle(42),2);assert.ok(Math.abs(centroid(filter.field,64)-42/64)<.01);
});
test('static previews remain visible without repeatedly regenerating their geometry',()=>{
 const filter=new TemporalSilhouette();filter.setMask(circle(),0);filter.dirty=false;for(let i=1;i<180;i++){filter.keepAlive(i/60);assert.equal(filter.step(1/60,i/60),false);}assert.equal(filter.visibility(3),1);
});
test('fractional mask values produce sub-pixel contour positions rather than binary stair steps',()=>{
 const w=40,h=40,mask=new Float32Array(w*h).fill(.1);for(let y=8;y<36;y++)for(let x=14;x<26;x++)mask[y*w+x]=.7;const p=maskContours(mask,w,h)[0];assert.ok(p?.length>20);assert.ok(Math.abs(Math.min(...p.map(p=>p.x))-(14+1/6)/40)<1e-5);
});
test('readiness styling can blend continuously between the two bold stroke widths',()=>{let previous=0;for(let n=0;n<=10;n++){const s=blendedAlignmentStyle(n/10);assert.ok(s.width>=previous&&s.width>=12&&s.width<=20);previous=s.width;}assert.equal(blendedAlignmentStyle(0).color,'rgb(255,255,255)');assert.equal(blendedAlignmentStyle(1).color,'rgb(53,239,134)');});
test('screen-space smoothing removes small edge ripples while keeping the overall body size',()=>{const points=Array.from({length:120},(_,i)=>{const a=i/120*Math.PI*2,r=100+(i%2?2:-2);return {x:Math.cos(a)*r,y:Math.sin(a)*r};}),smooth=smoothClosedContour(points),radii=smooth.map(p=>Math.hypot(p.x,p.y)),mean=radii.reduce((a,b)=>a+b,0)/radii.length;assert.ok(Math.max(...radii)-Math.min(...radii)<1);assert.ok(mean>98&&mean<101);});
