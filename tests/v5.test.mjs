import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FACE_SCENES} from '../dist/src/controls.js';
import {Catalogue,words} from '../dist/src/catalogue.js';
import {sceneWords} from '../dist/src/scene-copy.js';
import {Renderer} from '../dist/src/renderer.js';
import {PixelMelt} from '../dist/src/rigid-physics.js';
import {WaterCatch,VacancyCity,materialKey,offlineTime} from '../dist/src/scene-models.js';
import {SilhouetteType} from '../dist/src/spatial-type.js';
const source=JSON.parse(await readFile(new URL('../dist/assets/global-facts.json',import.meta.url),'utf8'));

test('every scene offers 24 distinct sourced observations in every language with identical geography',()=>{
 const cat=new Catalogue();cat.global=source.cards;assert.equal(cat.global.length,144);assert.equal(new Set(cat.global.map(c=>c.id)).size,144);
 for(const scene of FACE_SCENES){const baseline=cat.cards(scene,'en');assert.equal(baseline.length,24,scene);assert.ok(baseline.some(c=>/UN|ILO|WMO|ITU|WHO|UNICEF/i.test(c.source))||scene==='vacant');
  for(const lang of Object.keys(words)){const cards=cat.cards(scene,lang);assert.deepEqual(cards.map(c=>[c.id,c.rawValue,c.scopeCode,c.year]),baseline.map(c=>[c.id,c.rawValue,c.scopeCode,c.year]));assert.equal(cat.primary(scene,lang).scope,lang==='en'?'WORLD':({zh:'全球',es:'MUNDO',fr:'MONDE',ja:'世界',ko:'전 세계',ar:'العالم'})[lang]);for(const c of cards){assert.ok(c.label);assert.match(c.url,/^https:\/\//);assert.ok(c.year);assert.ok(Number.isFinite(c.rawValue));assert.ok(c.scope);}}
 }
});
test('seven language translations cover every new action and do not fall back to the English fact labels',()=>{
 for(const lang of Object.keys(sceneWords))assert.deepEqual(Object.keys(sceneWords[lang]).sort(),Object.keys(sceneWords.en).sort());for(const c of source.cards){for(const lang of Object.keys(sceneWords))assert.ok(c.labels[lang]?.length>2,c.id+' '+lang);assert.notEqual(c.labels.zh,c.labels.en,c.id);}
});
test('formatting preserves decimal temperature units and locally scoped census definitions',()=>{
 const cat=new Catalogue();cat.global=source.cards;const warm=cat.cards('shelter','zh').find(c=>c.id==='shelter-world-warming-2025');assert.match(warm.value,/1.43.*°C/);assert.match(warm.label,/1850/);for(const c of cat.cards('vacant','zh').filter(c=>c.scopeLabels))assert.equal(c.scope,c.scopeLabels.zh);
});
test('human material identity follows a body translation instead of screen-grid positions',()=>{
 const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));p[0]={x:.5,y:.2};p[11]={x:.35,y:.4};p[12]={x:.65,y:.4};const cell={x:.48,y:.65,id:10};const key=materialKey(cell,p),moved=p.map(q=>({...q,x:q.x+.15,y:q.y+.07}));assert.equal(materialKey({...cell,x:cell.x+.15,y:cell.y+.07,id:55},moved),key);
});
test('melt scars survive leaving the frame, and already released pixels keep falling while unseen',()=>{
 const melt=new PixelMelt(),c={id:7,material:'forearm:4',x:200,y:200,color:'#abc'},options={width:800,height:600,block:30,progress:.9};for(let n=0;n<1800;n++)melt.update(1/60,[c],[],options);const pixel=melt.pixels.get(c.material);assert.equal(pixel.free,true);const oldY=pixel.y;melt.update(.05,[],[],options);assert.ok(pixel.y>oldY);melt.update(.05,[{...c,id:92,x:400}],[],options);assert.strictEqual(melt.pixels.get(c.material),pixel);assert.equal(pixel.free,true);
});
test('two overhead palms protect the complete torso footprint',()=>{
 const bare=new PixelMelt(),shade=new PixelMelt(),cells=Array.from({length:8},(_,i)=>({id:i,x:270+i*35,y:350,color:'#aaa'})),o={width:800,height:600,block:30,progress:.4},hands=[{id:'l',x:300,y:100},{id:'r',x:500,y:100}];for(let i=0;i<300;i++){bare.update(1/60,cells,[],o);shade.update(1/60,cells,hands,o);}for(const c of cells)assert.ok(shade.pixels.get(c.id).damage<bare.pixels.get(c.id).damage*.12);
});
test('a moving bucket catches both categories without relabelling the blue collection',()=>{
 const water=new WaterCatch(),o={width:1000,height:700},hands=[{x:400,y:300},{x:600,y:300}];water.update(1/60,hands,o);water.drops=[{x:500,y:307,vx:0,vy:180,unsafe:false,litres:.25}];water.update(1/30,hands,o);assert.equal(water.level,.25);assert.equal(water.summary().safe,.25);
 water.drops=[{x:500,y:307,vx:0,vy:180,unsafe:true,litres:.25}];water.update(1/30,hands,o);assert.equal(water.level,.5);assert.equal(water.summary().safe,.25);assert.equal(water.summary().uncertain,.25);assert.equal(water.retainedBlue,.25);assert.equal(water.retainedOchre,.25);
});
test('tilting drains the bucket and preserves safe versus unassured water volume',()=>{
 const water=new WaterCatch(),o={width:1000,height:700};water.level=10;water.retainedBlue=10;water.blueCaught=10;for(let i=0;i<300;i++)water.update(1/60,[{x:400,y:200},{x:600,y:500}],o);assert.equal(water.level,0);assert.ok(Math.abs(water.safeDelivered-10)<.001);assert.ok(Math.abs(water.summary().personDays-10/15)<.001);
});
test('rain covers the whole viewport and uses the sourced service share rather than a contamination claim',()=>{
 const water=new WaterCatch();for(let i=0;i<180;i++)water.update(1/60,[],{width:1200,height:900,unsafeShare:1-source.interactionRules.thirst.safelyManagedShare2024/100});assert.ok(water.drops.some(p=>p.x<100));assert.ok(water.drops.some(p=>p.x>1100));assert.ok(water.drops.some(p=>p.unsafe));assert.ok(water.drops.some(p=>!p.unsafe));assert.match(source.interactionRules.thirst.nonSafelyManagedMeaning,/not.*contaminated/);
});
test('city vacancy follows a census ratio and never invents an observed accessible-home share',()=>{
 const city=new VacancyCity();city.build(1200,800,13.8);assert.equal(city.tiles.length,120);assert.equal(city.tiles.filter(t=>t.vacant).length,17);assert.equal(source.interactionRules.vacant.accessibleShare,null);assert.equal(source.interactionRules.vacant.lockedShare,null);assert.equal(source.interactionRules.vacant.cityReference.vacancyPercent,13.8);
});
test('gripping and releasing reuses an outlined home without erasing its data-bearing city',()=>{
 const city=new VacancyCity();city.build(1200,800,13.8);const tile=city.tiles.find(t=>t.vacant),centre={x:600,y:440};city.update(1/60,[{id:'a',x:tile.x,y:tile.y,fist:true}],centre,1200,800);assert.equal(city.held.get('a'),tile);for(let i=0;i<80;i++)city.update(1/60,[{id:'a',...centre,fist:true}],centre,1200,800);city.update(1/60,[{id:'a',...centre,fist:false}],centre,1200,800);assert.equal(city.reused,1);assert.equal(tile.shared,true);assert.equal(city.tiles.length,120);
});
test('the disconnected side steps at five updates a second with less than half a second of delay',()=>{assert.equal(offlineTime(4.3),offlineTime(4.35));for(let n=1;n<200;n++){const time=n/10;assert.ok(time-offlineTime(time)<.421);assert.ok(time-offlineTime(time)>=Math.min(time,.219));}});
test('dense housing sentences keep their identity and remain visible while springing around movement',()=>{
 const f=new SilhouetteType();f.build(1400,900,26,43,source.cards.filter(c=>c.scene==='space').map(c=>({...c,value:String(c.value),label:c.labels.en})),s=>s.length*13);assert.ok(f.items.length>2000);const identity=f.items.map(g=>g.char).join('');for(let i=0;i<120;i++)f.update(1/60,[{x:700,y:440},{x:700,y:485}],45,1400,[],.4);const before=f.items.map(g=>({x:g.x,y:g.y}));f.update(1/60,[{x:730,y:440},{x:730,y:485}],45,1400,[],.4);assert.equal(f.items.map(g=>g.char).join(''),identity);assert.ok(f.items.every(g=>g.active&&g.alpha===1&&Number.isFinite(g.x)));assert.ok(f.items.every((g,i)=>Math.abs(g.x-before[i].x)<60));
});

test('water results distinguish the personal collection from the global service-access percentage',()=>{
 const water=new WaterCatch();water.level=15;water.blueCaught=15;water.retainedBlue=15;const result=Renderer.prototype.result.call({water},'thirst','en',source.interactionRules);assert.equal(result.length,4);assert.equal(result[2].value,'1');assert.equal(result[3].value,'26.33%');assert.match(result[3].label,/PEOPLE.*WORLD/);assert.doesNotMatch(result[3].label,/CONTAMINATED/);
});
