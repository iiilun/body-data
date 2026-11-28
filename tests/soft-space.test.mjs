import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spaceType,backgroundType,SilhouetteType} from '../dist/src/spatial-type.js';
import {MOSAIC_COLUMNS,MOSAIC_ROWS,artworkGeometry} from '../dist/src/visual-system.js';

const cards=[{value:'1.16B',label:'PEOPLE IN SLUMS',scope:'WORLD',year:2024}];
const field=()=>{const f=new SilhouetteType(),{font,row}=spaceType(720);f.build(1280,720,font,row,cards,s=>s.length*font*.5);return f;};

test('SPACE uses finer text and more lanes while other topics retain their existing scale',()=>{
 for(const height of [600,720,1080])assert.ok(spaceType(height).font<backgroundType(height).font);
 assert.ok(spaceType(720).font<13);assert.equal(spaceType(2160).font,18);
 const f=field();assert.ok(f.rows.length>50);assert.equal(f.rows[1].y-f.rows[0].y,spaceType(720).row);
});
test('moving silhouette edges and glyphs ease without an immediate neighbour shove',()=>{
 const f=field(),block=30,body=[{x:640,y:350}];
 for(let i=0;i<180;i++)f.update(1/60,body,block,1280,[],.4);
 const lane=f.rows.find(l=>l.ranges.length),old=lane.ranges[0].slice(),before=f.items.map(g=>g.drawX);
 f.update(1/60,[{x:680,y:350}],block,1280,[],.4);
 assert.ok(lane.ranges[0][0]>old[0]&&lane.ranges[0][0]<old[0]+40);
 assert.ok(f.items.every((g,i)=>Math.abs(g.drawX-before[i])<12));
 assert.ok(f.items.every(g=>g.drawX===g.x&&g.active&&g.alpha===1));
});
test('preview and live geometry both use 48-column square mosaic cells',async()=>{
 const preview=JSON.parse(await readFile(new URL('../dist/assets/preview-person.json',import.meta.url),'utf8'));
 assert.equal(MOSAIC_COLUMNS,48);assert.equal(MOSAIC_ROWS,36);assert.equal(preview.columns,MOSAIC_COLUMNS);assert.equal(preview.rows,MOSAIC_ROWS);
 assert.ok(preview.cells.length>400);assert.equal(artworkGeometry(1440,900).block,30);
});


test('abrupt body changes, split/merged silhouettes and loss cannot teleport visible data',()=>{
 const f=field(),width=1280,dt=1/60,block=40;
 const poses=[[{x:640,y:350}],[{x:160,y:350},{x:1100,y:350}],[{x:550,y:350},{x:580,y:350}],[],[{x:1000,y:350}]];
 for(let step=0;step<240;step++){
  const before=f.items.map(g=>g.x);f.update(dt,poses[Math.floor(step/48)],block,width,[],.6);
  for(let i=0;i<f.items.length;i++){
   const g=f.items[i];if(g.wrapped){assert.ok(before[i]+g.width<0||before[i]>width);assert.ok(g.x+g.width<0||g.x>width);}
   else assert.ok(Math.abs(g.x-before[i])<6.3);
   assert.ok(g.active&&g.alpha===1&&Number.isFinite(g.x));
  }
 }
});

test('the material stream recycles only while fully offscreen and keeps figures intact',()=>{
 const f=new SilhouetteType(),width=320,{font,row}=spaceType(480);f.build(width,100,font,row,cards,s=>s.length*font*.5);
 let recycled=0;
 for(let frame=0;frame<1100;frame++){
  const before=f.items.map(g=>g.x);f.update(1/30,[{x:150+Math.sin(frame/100)*90,y:40}],30,width,[],.5);
  for(let i=0;i<f.items.length;i++)if(f.items[i].wrapped){recycled++;assert.ok(before[i]+f.items[i].width<0||before[i]>width);assert.ok(f.items[i].x+f.items[i].width<0||f.items[i].x>width);}
 }
 assert.ok(recycled>20);
 for(const lane of f.rows)for(const cluster of lane.clusters)for(const g of cluster.items)assert.ok(Math.abs((g.x-cluster.items[0].x)-(g.baseX-cluster.baseX))<1e-8);
});

test('the same body motion produces comparable fluid positions at 30, 60 and 120 frames per second',()=>{
 const run=fps=>{const f=field();for(let frame=0;frame<fps*3;frame++){const time=(frame+1)/fps;f.update(1/fps,[{x:640+Math.sin(time)*120,y:350}],40,1280,[],.5);}return f;};
 const slow=run(30),normal=run(60),fast=run(120);
 for(const other of [slow,fast]){
  const errors=normal.items.map((g,i)=>Math.abs(g.x-other.items[i].x)).filter((_,i)=>normal.items[i].x>0&&normal.items[i].x<1280);
  const rms=Math.sqrt(errors.reduce((n,x)=>n+x*x,0)/errors.length);assert.ok(rms<2,`frame-rate position error ${rms}`);
 }
});
