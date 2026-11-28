import test from 'node:test';
import assert from 'node:assert/strict';
import {FullscreenControl} from '../dist/src/fullscreen-control.js';
import {GestureToolbar,toolHandBounds} from '../dist/src/gesture-toolbar.js';

test('camera dwell offers an actionable click instead of silently requesting restricted fullscreen',async()=>{
 let requests=0;const control=new FullscreenControl({documentElement:{requestFullscreen(){requests++;}}},{userActivation:{isActive:false}});
 assert.equal(await control.toggle({gesture:true}),false);assert.equal(control.status,'needs-activation');assert.equal(requests,0);
 const result=control.toggle();assert.equal(requests,1);assert.equal(await result,true);assert.equal(control.status,'idle');
});
test('rejected and unavailable fullscreen remain recoverable and report their actual state',async()=>{
 const doc={documentElement:{requestFullscreen(){return Promise.reject(Error('denied'));}}},control=new FullscreenControl(doc,{});
 assert.equal(await control.toggle(),false);assert.equal(control.status,'blocked');assert.equal(control.pending,false);
 doc.documentElement.requestFullscreen=undefined;assert.equal(await control.toggle(),false);assert.equal(control.status,'unsupported');
 doc.documentElement.webkitRequestFullscreen=()=>{};assert.equal(await control.toggle(),true);
});
test('gesture may exit fullscreen without a new click and repeated requests cannot race',async()=>{
 let complete,calls=0;const doc={fullscreenElement:{},exitFullscreen(){calls++;return new Promise(resolve=>complete=resolve);}},control=new FullscreenControl(doc,{userActivation:{isActive:false}});
 const first=control.toggle({gesture:true});assert.equal(calls,1);assert.equal(await control.toggle(),false);complete();assert.equal(await first,true);
});
test('small utility cubes have spacious hand targets clipped to the display',()=>{
 assert.deepEqual(toolHandBounds({left:12,top:8,right:92,bottom:88},1280,720),{left:0,top:0,right:124,bottom:120});
 assert.deepEqual(toolHandBounds({left:1188,top:632,right:1268,bottom:712},1280,720),{left:1156,top:600,right:1280,bottom:720});
});
test('fullscreen remains visible and clickable but never captures a hand or pauses the page',()=>{
 const button={hidden:false,disabled:false,getClientRects:()=>[{}],getBoundingClientRect:()=>({left:100,top:100,right:180,bottom:180})};
 const toolbar={root:{querySelector:()=>null,defaultView:{innerWidth:1280,innerHeight:720}},nodes:new Map([['fullscreen',{button,kind:'fullscreen'}],['back',{button,kind:'back'}],['sources-toggle',{button,kind:'data'}]])};
 const targets=GestureToolbar.prototype.getTargets.call(toolbar);assert.deepEqual(targets.map(t=>t.id),['back','sources-toggle']);assert.equal(button.hidden,false);
});
