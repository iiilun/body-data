import test from 'node:test';
import assert from 'node:assert/strict';
import {DwellTargets,HAND_DWELL_SECONDS} from '../dist/src/gesture-targets.js';
const target={id:'language-en',left:100,top:100,right:200,bottom:200};
const palm=(id='left',x=150,y=150)=>({id,x,y,open:1,fist:false});
function hold(model,hands,seconds,targets=[target]){let result;for(let i=0;i<Math.round(seconds*100);i++)result=model.update(.01,hands,targets);return result;}
test('one open palm must continuously rest on a target for three seconds',()=>{const d=new DwellTargets();assert.equal(HAND_DWELL_SECONDS,3);d.update(0,[palm()],[target]);assert.equal(hold(d,[palm()],2.99).selected,null);assert.equal(d.update(.01,[palm()],[target]).selected,target.id);assert.equal(hold(d,[palm()],4).selected,null);});
test('leaving, closing the palm and losing tracking reset progress immediately',()=>{for(const interruption of [[],[palm('left',250,150)],[{...palm(),fist:true}],[{...palm(),open:.4}]]){const d=new DwellTargets();d.update(0,[palm()],[target]);hold(d,[palm()],2);assert.equal(d.update(.01,interruption,[target]).progress,0);assert.equal(d.update(.01,[palm()],[target]).progress,0);assert.equal(hold(d,[palm()],2).selected,null);}});
test('a replacement hand cannot inherit another hand’s accumulated time',()=>{const d=new DwellTargets();d.update(0,[palm()],[target]);hold(d,[palm()],2.5);assert.equal(d.update(.01,[palm('right')],[target]).progress,0);assert.equal(hold(d,[palm('right')],2.5).selected,null);});
test('the original hand and target retain ownership when a second hand arrives',()=>{const d=new DwellTargets(),other={id:'back',left:300,top:100,right:400,bottom:200};d.update(0,[palm()],[target,other]);hold(d,[palm()],1);const r=d.update(.01,[palm('right',350),palm()],[target,other]);assert.equal(r.targetId,target.id);assert.equal(r.handId,'left');assert.ok(r.progress>1/3);});
test('switching target resets the dwell rather than adding the previous elapsed time',()=>{const d=new DwellTargets(),next={id:'language-fr',left:200,top:100,right:300,bottom:200};d.update(0,[palm()],[target,next]);hold(d,[palm()],2.5,[target,next]);assert.equal(d.update(.01,[palm('left',250)],[target,next]).progress,0);assert.equal(hold(d,[palm('left',250)],2.5,[target,next]).selected,null);});
test('firing latches the hand until it leaves, including when a new control appears beneath it',()=>{const d=new DwellTargets();d.update(0,[palm()],[target]);assert.equal(hold(d,[palm()],3).selected,target.id);d.cancel();const replacement={...target,id:'sources-close'};assert.equal(hold(d,[palm()],4,[replacement]).selected,null);d.update(.01,[palm('left',300)],[replacement]);d.update(.01,[palm()],[replacement]);assert.equal(hold(d,[palm()],3,[replacement]).selected,replacement.id);});
test('another hand cannot retrigger a committed target while a hand still occupies it',()=>{const d=new DwellTargets();d.update(0,[palm()],[target]);hold(d,[palm()],3);d.cancel();assert.equal(hold(d,[palm('right')],4).selected,null);d.update(.01,[],[target]);d.update(.01,[palm('right')],[target]);assert.equal(hold(d,[palm('right')],3).selected,target.id);});
test('disabled and hidden targets cannot be selected and priority resolves overlaps',()=>{const d=new DwellTargets();assert.equal(d.update(0,[palm()],[{...target,enabled:false}]).targetId,null);const control={...target,id:'data',priority:100};assert.equal(d.update(0,[palm()],[target,control]).targetId,'data');assert.equal(d.update(.01,[palm()],[]).progress,0);});
test('a toolbar control takes priority over a language target under another uncommitted hand',()=>{const d=new DwellTargets(),control={id:'back',left:300,top:100,right:400,bottom:200,priority:100};assert.equal(d.update(0,[palm(),palm('right',350)],[target,control]).targetId,'back');});
test('a long render stall cannot turn unobserved time into an immediate selection',()=>{const d=new DwellTargets();d.update(0,[palm()],[target]);assert.ok(d.update(15,[palm()],[target]).progress<.04);assert.equal(d.update(NaN,[palm()],[target]).selected,null);});

test('a pinching hand cannot accidentally activate a three-second utility target',()=>{
 const dwell=new DwellTargets(),target={id:'back',left:0,top:0,right:100,bottom:100};
 for(let i=0;i<200;i++)assert.equal(dwell.update(.02,[{id:'left',x:50,y:50,open:1,pinch:true}],[target]).selected,null);
 assert.equal(dwell.active,null);
});
