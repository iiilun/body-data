import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BodyTracker} from '../dist/src/interaction.js';
import {copy,experienceMetric,facts} from '../dist/src/experience.js';
import {DataService} from '../dist/src/data.js';
test('hand landmarks refine wrists and stale hand/pose data expires',()=>{
 const tracker=new BodyTracker(),points=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9}));points[15]={x:.8,y:.4,visibility:.5};points[16]={x:.2,y:.4,visibility:.5};
 const hand=Array.from({length:21},()=>({x:.82,y:.4}));
 tracker.update(points,[hand],[[{categoryName:'Left'}]],100,100);
 assert.ok(tracker.pose(100)[15].x>.81);assert.equal(tracker.hands(100).length,1);assert.equal(tracker.hands(500).length,0);assert.equal(tracker.pose(800)[15].visibility,0);
});
test('all seven languages cover the complete onboarding and action vocabulary',()=>{
 for(const lang of Object.keys(copy))assert.deepEqual(Object.keys(copy[lang]).sort(),Object.keys(copy.en).sort());
});
test('introductions identify groups and preserve the meaning of housing and care units',async()=>{
 const service=new DataService();service.snapshot=JSON.parse(await readFile(new URL('../dist/assets/data.json',import.meta.url),'utf8'));
 const world=experienceMetric(service.metric('en','hold'),'en','hold'),taiwan=experienceMetric(service.metric('zh','hold'),'zh','hold');
 assert.equal(facts(world,'en','hold').length,2);assert.equal(facts(taiwan,'zh','hold').length,1);
 const housing=experienceMetric(service.metric('ja','space'),'ja','space');assert.equal(housing.label,'housingShare');assert.equal(housing.rawValue,2);
 const mortgage=experienceMetric(service.metric('zh','space'),'zh','space');assert.equal(mortgage.label,'mortgage');assert.equal(mortgage.rawValue,41.46);
 const frozen=experienceMetric(service.metric('fr','hold',0),'fr','hold'),original=frozen.country;service.metric('fr','hold',14);assert.equal(frozen.country,original);
});
