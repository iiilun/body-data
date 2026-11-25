import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_DURATIONS,pageProgress,pageCountdown} from '../dist/src/page-timing.js';

test('each onboarding and result page fills its progress line exactly when its timer expires',()=>{
 for(const [page,duration]of Object.entries(PAGE_DURATIONS)){
  assert.equal(pageProgress(page,0),0);assert.equal(pageProgress(page,duration/2),.5);assert.equal(pageProgress(page,duration),1);assert.equal(pageProgress(page,duration+3),1);
  assert.equal(pageCountdown(page,0),duration);assert.equal(pageCountdown(page,duration-.01),1);assert.equal(pageCountdown(page,duration),0);
 }
 assert.equal(PAGE_DURATIONS.result,7);assert.equal(PAGE_DURATIONS.align,3);
 assert.deepEqual([0,1,2,3].map(t=>pageCountdown('align',t)),[3,2,1,0]);
});
test('reset or invalid clock readings cannot make a negative or overflowing progress line',()=>{
 for(const page of Object.keys(PAGE_DURATIONS)){
  assert.equal(pageProgress(page,-1),0);assert.equal(pageProgress(page,NaN),0);assert.equal(pageProgress(page,'invalid'),0);assert.equal(pageProgress(page,undefined),0);assert.equal(pageProgress(page,Infinity),1);
 }
 assert.equal(pageProgress('active',4),0);assert.equal(pageCountdown('active',4),0);
});
