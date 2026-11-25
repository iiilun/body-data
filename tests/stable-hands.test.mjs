import test from 'node:test';
import assert from 'node:assert/strict';
import {BodyTracker,StableHandGesture} from '../dist/src/interaction.js';
import {GestureCube} from '../dist/src/controls.js';
import {previewHand} from '../dist/src/glass-model.js';
const label=name=>[{categoryName:name,score:.95}],gesture=name=>[{categoryName:name,score:.95}];
const points=(x,y=.45)=>previewHand(x,y,.05).landmarks;
const sample=(mode='open',pinchRatio=.9)=>({x:.5,y:.5,open:mode==='open'?1:0,fist:mode==='fist',gesture:mode==='open'?'Open_Palm':mode==='fist'?'Closed_Fist':'None',pinchRatio});

test('hand identity remains attached to position across reordered results and transient handedness flips',()=>{
 const tracker=new BodyTracker();
 tracker.updateHands([points(.25),points(.75)],[label('Left'),label('Right')],100,[gesture('Open_Palm'),gesture('Closed_Fist')]);
 const initial=tracker.hands(100),left=initial.find(h=>h.x<.5),right=initial.find(h=>h.x>.5);
 tracker.updateHands([points(.76),points(.26)],[label('Left'),label('Right')],140,[gesture('Closed_Fist'),gesture('Open_Palm')]);
 const next=tracker.hands(140);assert.equal(next.find(h=>h.x>.5).id,right.id);assert.equal(next.find(h=>h.x<.5).id,left.id);assert.equal(next.find(h=>h.x>.5).handedness,'Right');assert.equal(next.length,2);
});
test('duplicate handedness labels retain two independent hands rather than overwriting a map entry',()=>{
 const tracker=new BodyTracker();tracker.updateHands([points(.2),points(.8)],[label('Right'),label('Right')],100,[gesture('Open_Palm'),gesture('Closed_Fist')]);
 const hands=tracker.hands(100);assert.equal(hands.length,2);assert.notEqual(hands[0].id,hands[1].id);assert.equal(hands.filter(h=>h.fist).length,1);
});
test('nearby hands keep identity despite flipped labels, and motion prediction follows a crossing',()=>{
 const tracker=new BodyTracker();tracker.updateHands([points(.48),points(.52)],[label('Left'),label('Right')],100,[gesture('Open_Palm'),gesture('Open_Palm')]);
 const right=tracker.hands(100).find(h=>h.handedness==='Right').id;
 tracker.updateHands([points(.48),points(.52)],[label('Right'),label('Left')],140,[gesture('Open_Palm'),gesture('Open_Palm')]);assert.ok(tracker.handMeta.get(right).center.x>.5);
 const crossing=new BodyTracker();crossing.updateHands([points(.44),points(.56)],[label('Left'),label('Right')],100);const id=crossing.hands(100).find(h=>h.handedness==='Right').id;
 crossing.updateHands([points(.48),points(.52)],[label('Left'),label('Right')],140);crossing.updateHands([points(.52),points(.48)],[label('Left'),label('Right')],180);assert.ok(crossing.handMeta.get(id).center.x<.5);
});
test('single-frame open/fist ambiguity does not flash modes, sustained changes remain responsive',()=>{
 const state=new StableHandGesture();assert.equal(state.update(sample('open'),100).open,1);
 assert.equal(state.update(sample('fist'),133).fist,false);assert.equal(state.update(sample('open'),166).open,1);
 assert.equal(state.update(sample('fist'),200).fist,false);assert.equal(state.update(sample('fist'),266).fist,false);assert.equal(state.update(sample('fist'),300).fist,true);
 assert.equal(state.update(sample('neutral'),333).fist,true);assert.equal(state.update(sample('fist'),366).fist,true);
 assert.equal(state.update(sample('open'),400).fist,true);assert.equal(state.update(sample('open'),500).open,1);
});
test('pinch can start from a natural near-contact and ignores a brief tracking gap',()=>{
 const state=new StableHandGesture();state.update(sample('open',.9),100);
 assert.equal(state.update(sample('open',.38),133).pinch,false);assert.equal(state.update(sample('open',.38),183).pinch,true);assert.equal(state.update(sample('open',.55),216).pinch,true);assert.equal(state.update(sample('open',.8),249).pinch,true);assert.equal(state.update(sample('open',.8),315).pinch,false);
});
test('right hand is preferred initially, but the current owner survives a second hand and array order changes',()=>{
 const cube=new GestureCube(),right={id:'R',handedness:'Right',x:.5,y:.5,fist:true,open:0},left={id:'L',handedness:'Left',x:.2,y:.2,open:1,fist:false};
 assert.equal(cube.controlHand([left,right]),right);cube.update(.016,[left,right],0);const start=cube.yaw;
 for(let i=0;i<40;i++)cube.update(.016,[left,{...right,x:.6}],0);assert.equal(cube.handId,'R');assert.ok(cube.yaw>start+15&&cube.yaw<start+25);
 const angle=cube.yaw;cube.update(.04,[left],0);assert.equal(cube.handId,'R');assert.equal(cube.controlHand([left]),null);assert.equal(cube.yaw,angle);
 cube.update(.04,[{...right,x:.8},left],0);assert.equal(cube.handId,'R');assert.ok(Math.abs(cube.yaw-angle)<.001);
});
test('a different hand takes over only after a real loss, reanchors without an angle jump, and still rotates',()=>{
 const cube=new GestureCube(),left={id:'Left',x:.4,y:.4,open:0,fist:true},right={id:'Right',x:.5,y:.5,open:0,fist:true};
 cube.update(.02,[right],0);for(let i=0;i<30;i++)cube.update(.02,[{...right,x:.6}],0);const before=cube.yaw;
 for(let i=0;i<4;i++){cube.update(.04,[left],0);assert.equal(cube.handId,'Right');assert.equal(cube.yaw,before);}cube.update(.04,[left],0);assert.equal(cube.handId,'Left');assert.ok(Math.abs(cube.yaw-before)<.001);
 for(let i=0;i<30;i++)cube.update(.02,[{...left,x:.5}],0);assert.ok(cube.yaw>before+15);
});
test('a pinch never becomes an open-palm face selection while the open gesture is retained',()=>{
 const cube=new GestureCube(),hand={id:'Right',x:.5,y:.5,open:1,fist:false,pinch:true};for(let i=0;i<300;i++){const result=cube.update(1/60,[hand],0);assert.equal(result.highlight,false);assert.equal(result.progress,0);assert.equal(result.selected,null);}
});
test('retained hand positions freeze through an inference dropout and reanchor on return',()=>{
 const cube=new GestureCube(),hand={id:'Right',x:.5,y:.5,open:0,fist:true,observed:true};cube.update(.016,[hand],0);for(let i=0;i<40;i++)cube.update(.016,[{...hand,x:.6}],0);const before=cube.yaw;
 for(let i=0;i<7;i++)cube.update(.016,[{...hand,x:.6,observed:false}],0);assert.equal(cube.yaw,before);cube.update(.016,[{...hand,x:.8}],0);assert.equal(cube.yaw,before);
 const palm={...hand,open:1,fist:false,x:.5};cube.update(.016,[palm],0);for(let i=0;i<40;i++)cube.update(.016,[palm],0);const progress=cube.dwell.elapsed;for(let i=0;i<7;i++)cube.update(.016,[{...palm,observed:false}],0);assert.equal(cube.dwell.elapsed,progress);assert.equal(cube.highlight,true);
});
