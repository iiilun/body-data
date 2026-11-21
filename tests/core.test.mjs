import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {aggregateCarbon,DataService} from '../dist/src/data.js';
import {weightedMean,sceneScores,inferScene,coverGeometry,pointToScreen} from '../dist/src/math.js';
import {demoPose} from '../dist/src/renderer.js';
import {languages} from '../dist/src/i18n.js';
import {colourMosaic,artworkGeometry,typeSystem,shelterPosition,contourForBand} from '../dist/src/visual-system.js';
const snapshot=JSON.parse(await readFile(new URL('../dist/assets/data.json',import.meta.url),'utf8'));

test('geographic carbon sum excludes overlapping aggregate rows and preserves missing coverage',()=>{
 const members=[{iso3:'AAA'},{iso3:'BBB'},{iso3:'CCC'}];
 const rows=[{countryiso3code:'WLD',value:999},{countryiso3code:'AAA',value:4,date:'2024'},{countryiso3code:'BBB',value:0,date:'2024'},{countryiso3code:'CCC',value:null,date:'2024'}];
 assert.deepEqual(aggregateCarbon(rows,members,'es'),{value:4,coverageCount:2,memberCount:3,year:2024});
 assert.equal(aggregateCarbon(rows,members,'en').value,999);
});
test('proportions require their denominators; missing values are not zero',()=>{
 assert.equal(weightedMean([{value:10,weight:100},{value:40,weight:300},{value:null,weight:900}]),32.5);
 assert.equal(weightedMean([{value:40,weight:0}]),null);
});
test('natural poses distinguish shade, open arms and a compact silhouette',()=>{
 for(const topic of ['shelter','hold','space'])assert.equal(inferScene(sceneScores(demoPose(0,topic))),topic);
 assert.equal(sceneScores([]),null);
});
test('camera projection mirrors once and preserves a centered composition',()=>{
 const g=coverGeometry(1440,900,4,3);
 assert.equal(pointToScreen({x:.5,y:.5},g).x,720);
 assert.ok(pointToScreen({x:.1,y:.5},g).x>pointToScreen({x:.9,y:.5},g).x);
});
test('all seven languages cover every interface and data label',()=>{
 const keys=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?keys(v).map(n=>k+'.'+n):[k]).sort();
 for(const dictionary of Object.values(languages))assert.deepEqual(keys(dictionary),keys(languages.en));
});
test('all 21 source snapshots retain provenance, years and missingness',()=>{
 for(const code of Object.keys(languages))for(const topic of ['shelter','hold','space']){
  const r=snapshot.scopes[code][topic];assert.match(r.sourceURL,/^https:\/\//);assert.ok(r.sourceName);
  if(r.value===null)assert.ok(r.countryDetails.length>0);else assert.ok(Number.isFinite(r.value));
  if(r.memberCount)assert.ok(r.coverageCount<=r.memberCount);
 }
 assert.equal(snapshot.scopes.zh.space.value,41.46);
 assert.match(snapshot.scopes.zh.space.unit,/mortgage/);
});
test('partial care observations remain individual countries with survey years',()=>{
 const service=new DataService();service.snapshot=snapshot;
 for(const code of ['es','fr','ar','ko']){
  assert.equal(service.raw(code,'hold').value,null);
  const m=service.metric(code,'hold',0);assert.ok(m.country);assert.ok(m.observation);assert.equal(m.year,m.observation.surveyYear);
 }
 assert.equal(service.metric('en','hold').short,'2.5×');
 assert.equal(service.metric('zh','space').label,'mortgage');
 assert.equal(service.metric('zh','shelter').label,'carbonGhg');
});
test('mosaic keeps the original RGB average and excludes background from boundary blocks',()=>{
 const rgba=new Uint8ClampedArray([200,40,20,255,100,80,40,255,0,255,0,255,0,255,0,255]);
 const cells=colourMosaic(rgba,2,2,{data:new Uint8Array([1,1,0,0]),width:2,height:2},1,1);
 assert.equal(cells.length,1);assert.deepEqual(cells[0].rgb,[150,60,30]);
 assert.equal(cells[0].color,'rgb(150,60,30)');
 assert.equal(colourMosaic(rgba,2,2,{data:new Uint8Array(4),width:2,height:2},1,1).length,0);
});
test('portrait blocks are square and all three scenes share one type scale',()=>{
 const g=artworkGeometry(1440,900);assert.equal(g.width/32,g.height/24);assert.ok(Number.isInteger(g.block));
 assert.equal(typeSystem(900).weight,300);assert.equal(typeSystem(900).size,135.9);
});
test('melting follows continuous columns downward while retaining the same horizontal location',()=>{
 const g=artworkGeometry(1440,900),p={x:.5,y:.25,gx:26};
 const first=shelterPosition(p,g,0),last=shelterPosition(p,g,1);
 assert.equal(first.x,last.x);assert.ok(last.y>first.y);assert.ok(last.height>=g.block);
});
test('numerical text clearance follows the visible silhouette rather than a rectangular wall',()=>{
 const cells=[{x:100,y:20},{x:200,y:20},{x:150,y:100}];
 assert.deepEqual(contourForBand(cells,10,30,20,10),{left:80,right:220});
 assert.deepEqual(contourForBand(cells,90,110,20,10),{left:130,right:170});
 assert.equal(contourForBand(cells,200,230,20),null);
});
