import test from 'node:test';
import assert from 'node:assert/strict';
import {framePose} from '../dist/src/controls.js';
import {BodyTracker} from '../dist/src/interaction.js';
import {faceAtPoint,menuPointer} from '../dist/src/menu-view.js';
import {WaterCatch,WATER_CAPACITY,careSag} from '../dist/src/scene-models.js';
import {SilhouetteType} from '../dist/src/spatial-type.js';
import {artworkGeometry} from '../dist/src/visual-system.js';
const h={id:'right',x:.5,y:.45,open:1,fist:false};
test('CSS hit-testing returns the face actually under the cursor rather than the front normal',()=>{const doc={elementFromPoint:()=>({closest:()=>({dataset:{face:'4'}})})};assert.equal(faceAtPoint(400,300,doc),4);assert.equal(faceAtPoint(400,300,{elementFromPoint:()=>null}),-1);});
test('an ML closed-fist classification is available before a body frame and does not wait for position smoothing',()=>{const tracker=new BodyTracker(),hand=Array.from({length:21},(_,i)=>({x:.5+i*.001,y:.5}));tracker.updateHands([hand],[[{categoryName:'Right'}]],100,[[{categoryName:'Closed_Fist',score:.95}]]);assert.equal(tracker.hands(110)[0].fist,true);assert.equal(tracker.lastBody,0);tracker.updateHands([],[],120,[]);assert.equal(tracker.hands(121).length,0);});
test('menu pointer covers viewport edges and shares the camera mirror transform',()=>{const g=artworkGeometry(1280,720,16/9);assert.equal(menuPointer({...h,x:.5,y:.43},g,1280,720).x,.5);assert.ok(menuPointer({...h,x:.8},g,1280,720).x<.2);});
test('maximum arm load moves the wrist by more than one third of the viewport without lowering the shoulder',()=>{const p=framePose('hold');assert.ok(careSag(p[15],p,[1,1],900)>300);assert.equal(careSag(p[11],p,[1,1],900),0);assert.ok(careSag(p[13],p,[1,1],900)>100);});
test('a stationary bucket cannot fill in the first ten seconds and retains a real blue fraction',()=>{const water=new WaterCatch(),hands=[{x:400,y:300},{x:600,y:300}];for(let i=0;i<600;i++)water.update(1/60,hands,{width:1000,height:700});assert.equal(water.capacity,WATER_CAPACITY);assert.ok(water.level<WATER_CAPACITY*.5);assert.ok(water.blueCaught>water.ochreCaught);});
test('bucket collection conserves both colours through tilt and detects a full bucket',()=>{const water=new WaterCatch(),hands=[{x:400,y:300},{x:600,y:300}],o={width:1000,height:700};water.update(.016,hands,o);water.retainedBlue=29.85;water.blueCaught=29.85;water.level=29.85;water.drops=[{x:500,y:307,vx:0,vy:180,unsafe:true,litres:.15}];water.update(1/30,hands,o);assert.equal(water.full,true);assert.ok(Math.abs(water.blueCaught+water.ochreCaught-water.level)<1e-8);for(let i=0;i<300;i++)water.update(1/60,[{x:400,y:200},{x:600,y:500}],o);assert.ok(Math.abs(water.retainedBlue+water.retainedOchre-water.level)<1e-8);assert.ok(Math.abs(water.safeDelivered+water.retainedBlue-water.blueCaught)<1e-8);});
test('crowded typography retains all sentence glyphs with deliberately tight tracking',()=>{const f=new SilhouetteType();f.build(1280,640,24,24,[{value:'1.16B',label:'PEOPLE IN SLUMS',scope:'WORLD',year:2024}],s=>s.length*12);assert.ok(f.rows.length>=25);const a=f.items[0],b=f.items[1];assert.ok(b.baseX-a.baseX<a.width);});

test('explicit non-fist classifier results cannot turn a curled thumb-up into a selection',()=>{const tracker=new BodyTracker(),hand=Array.from({length:21},()=>({x:.5,y:.5}));tracker.updateHands([hand],[],100,[[{categoryName:'Thumb_Up',score:.49}]]);assert.equal(tracker.hands(110)[0].fist,false);});
