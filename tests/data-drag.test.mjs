import test from 'node:test';
import assert from 'node:assert/strict';
import {DataDrag} from '../dist/src/data-drag.js';
const box={left:100,top:100,right:500,bottom:600,scrollTop:300,maxScroll:1000};
const hand=(y=300,id='left',pinch=true,x=250)=>({id,x,y,pinch});
test('pinching establishes a stationary grab and the page follows vertical movement',()=>{
 const drag=new DataDrag();assert.equal(drag.update(.016,[hand()],box).scrollTop,300);
 let r=drag.update(.016,[hand(250)],box);assert.equal(r.scrollTop,350);assert.equal(r.dragging,true);
 r=drag.update(.016,[hand(330)],{...box,scrollTop:r.scrollTop});assert.equal(r.scrollTop,270);assert.deepEqual(r.cursor,{x:250,y:330});
});
test('a grab can start only inside the content, but continues outside after acquisition',()=>{
 const drag=new DataDrag();assert.equal(drag.update(.016,[hand(90)],box).dragging,false);assert.equal(drag.update(.016,[hand(300,'left',true,80)],box).dragging,false);
 drag.update(.016,[hand()],box);const r=drag.update(.016,[hand(50,'left',true,700)],box);assert.equal(r.dragging,true);assert.equal(r.scrollTop,550);
});
test('releasing stops immediately without inertia or a later return to the old grab point',()=>{
 const drag=new DataDrag();drag.update(.016,[hand()],box);let r=drag.update(.016,[hand(200)],box);assert.equal(r.scrollTop,400);
 r=drag.update(.016,[hand(50,'left',false)],{...box,scrollTop:400});assert.equal(r.dragging,false);assert.equal(r.scrollTop,400);
 assert.equal(drag.update(1,[hand(300,'left',false)],{...box,scrollTop:400}).scrollTop,400);
 assert.equal(drag.update(.016,[hand(500)],{...box,scrollTop:400}).scrollTop,400);
});
test('scroll boundaries clamp without accumulating distance that must be unwound',()=>{
 const drag=new DataDrag();drag.update(.016,[hand()],{...box,scrollTop:990});let r=drag.update(.016,[hand(200)],{...box,scrollTop:990});assert.equal(r.scrollTop,1000);
 r=drag.update(.016,[hand(210)],{...box,scrollTop:r.scrollTop});assert.equal(r.scrollTop,990);
 const top=new DataDrag();top.update(.016,[hand()],{...box,scrollTop:10});assert.equal(top.update(.016,[hand(400)],{...box,scrollTop:10}).scrollTop,0);assert.equal(top.update(.016,[hand(390)],{...box,scrollTop:0}).scrollTop,10);
});
test('tracking loss and replacement hands cannot inherit the original drag origin',()=>{
 const drag=new DataDrag();drag.update(.016,[hand()],box);assert.equal(drag.update(.016,[],box).dragging,false);
 assert.equal(drag.update(.016,[hand(500)],box).scrollTop,300);
 let r=drag.update(.016,[hand(150,'right')],box);assert.equal(r.dragging,false);assert.equal(r.scrollTop,300);
 r=drag.update(.016,[hand(150,'right')],box);assert.equal(r.handId,'right');assert.equal(r.scrollTop,300);
});
test('a second pinching hand does not steal an active drag',()=>{
 const drag=new DataDrag();drag.update(.016,[hand()],box);const r=drag.update(.016,[hand(550,'right'),hand(280)],box);assert.equal(r.handId,'left');assert.equal(r.scrollTop,320);
});
test('resetting on close clears the origin and opening again starts without movement',()=>{
 const drag=new DataDrag();drag.update(.016,[hand()],box);drag.reset();assert.equal(drag.update(.016,[hand(550)],box).scrollTop,300);
 assert.equal(drag.update(.016,[hand(500)],box).scrollTop,350);
});
test('small tracking jitter is ignored and inactive frame deltas rebase without moving the page',()=>{
 const drag=new DataDrag();drag.update(.016,[hand()],box);assert.equal(drag.update(.016,[hand(300.6)],box).scrollTop,300);
 assert.equal(drag.update(0,[hand(450)],box).scrollTop,300);assert.equal(drag.update(.016,[hand(440)],box).scrollTop,310);
 assert.equal(drag.update(.016,[{...hand(),present:false}],box).dragging,false);
});
