import test from 'node:test';
import assert from 'node:assert/strict';
import {humanOutline,paintHuman} from '../dist/src/human-guide.js';
const scenes=['shelter','hold','space','thirst','offline','vacant'];

test('each guide draws three smooth closed outlines, without filled hands or separate body parts',()=>{
 const calls={starts:0,closes:0,strokes:0,curves:0},ctx={save(){},restore(){},translate(){},scale(){},beginPath(){calls.starts++;},moveTo(){},bezierCurveTo(){calls.curves++;},closePath(){calls.closes++;},stroke(){calls.strokes++;}};
 paintHuman(ctx,'hold',0,{color:'#111'});assert.equal(calls.starts,3);assert.equal(calls.closes,3);assert.equal(calls.strokes,3);assert.ok(calls.curves>150);assert.equal(ctx.strokeStyle,'#111');assert.equal(ctx.lineJoin,'round');assert.ok(ctx.lineWidth>4&&ctx.lineWidth<5);
});

test('every articulated outline stays finite and changes continuously across the whole demonstration',()=>{
 for(const scene of scenes)for(const time of [0,1,3,5.9]){
  const a=humanOutline(scene,time),b=humanOutline(scene,time+.016);assert.equal(a.length,b.length);assert.ok(a.length>60);assert.ok(a.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.ok(a.every((p,i)=>Math.hypot(p.x-b[i].x,p.y-b[i].y)<1),scene);
 }
});

test('the three impressions retain the same silhouette and generous separation at head and feet',()=>{
 const outlines=[0,1,2].map(i=>humanOutline('hold',0,i));assert.equal(new Set(outlines.map(p=>p.length)).size,1);
 for(let i=1;i<outlines.length;i++)for(let j=0;j<outlines[0].length;j++){const d=Math.hypot(outlines[i][j].x-outlines[i-1][j].x,outlines[i][j].y-outlines[i-1][j].y);assert.ok(d>8&&d<20);}
 const p=outlines[1];assert.ok(Math.min(...p.map(v=>v.x))<-340);assert.ok(Math.max(...p.map(v=>v.x))>340);assert.ok(Math.max(...p.map(v=>v.y))>775);
});
