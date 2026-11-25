import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spaceType,backgroundType,SilhouetteType} from '../dist/src/spatial-type.js';
import {MOSAIC_COLUMNS,MOSAIC_ROWS,artworkGeometry} from '../dist/src/visual-system.js';

const cards=[{value:'1.16B',label:'PEOPLE IN SLUMS',scope:'WORLD',year:2024}];
const field=()=>{const f=new SilhouetteType(),{font,row}=spaceType(720);f.build(1280,720,font,row,cards,s=>s.length*font*.5);return f;};

test('SPACE uses finer text and more lanes while other topics retain their existing scale',()=>{
 for(const height of [600,720,1080])assert.ok(spaceType(height).font<backgroundType(height).font);
 const f=field();assert.ok(f.rows.length>40);assert.equal(f.rows[1].y-f.rows[0].y,spaceType(720).row);
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
