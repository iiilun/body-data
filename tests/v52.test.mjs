import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureCube,FACE_SCENES} from '../dist/src/controls.js';
import {faceTypography,menuCopy} from '../dist/src/menu-view.js';
import {DataFlow,SilhouetteType,backgroundType} from '../dist/src/spatial-type.js';
import {thermalRgb,thermalColor,heatSample} from '../dist/src/heat.js';
import {shadeAt,shelterOccluders} from '../dist/src/scene-models.js';
import {PixelMelt} from '../dist/src/rigid-physics.js';
import {Renderer} from '../dist/src/renderer.js';
const palm={id:'r',x:.5,y:.43,open:1,fist:false},fist={...palm,open:0,fist:true};
function steps(cube,hand,face,n){let state,selected=[];for(let i=0;i<n;i++){state=cube.update(1/60,hand?[hand]:[],face);if(state.selected)selected.push(state.selected);}return {...state,selected};}

test('unattended cube completes a continuous 360-degree turn and exposes top and bottom',()=>{
 const cube=new GestureCube(),yaw=cube.yaw,faces=new Set();for(let i=0;i<72*60;i++)faces.add(cube.update(1/60,[]).face);
 assert.ok(Math.abs(cube.yaw-yaw-360)<1e-8);assert.deepEqual([...faces].sort(),[0,1,2,3,4,5]);
});
test('a fist rotates both axes and opening the hand preserves the dragged orientation',()=>{
 const cube=new GestureCube();cube.update(1/60,[fist],0);steps(cube,{...fist,x:.7,y:.55},-1,80);
 assert.ok(Math.abs(cube.yaw-32)<.001);assert.ok(Math.abs(cube.pitch+46.8)<.001);
 const old={yaw:cube.yaw,pitch:cube.pitch};steps(cube,{...palm,x:.7,y:.55},0,120);assert.equal(cube.yaw,old.yaw);assert.equal(cube.pitch,old.pitch);
 steps(cube,palm,0,100);assert.equal(cube.yaw,old.yaw);assert.equal(cube.pitch,old.pitch);
});
test('regripping at a new hand position never resets or jumps the dragged orientation',()=>{
 const cube=new GestureCube();cube.update(.02,[fist],0);steps(cube,{...fist,x:.7},-1,80);steps(cube,null,-1,1);
 const yaw=cube.yaw;cube.update(.02,[{...fist,id:'new',x:.1}],-1);assert.ok(Math.abs(cube.yaw-yaw)<.001);steps(cube,{...fist,id:'new',x:.2},-1,80);assert.ok(Math.abs(cube.yaw-(yaw+30))<.001);
});
test('rotating to viewport edges never selects a face and auto rotation resumes without snapping back',()=>{
 const cube=new GestureCube();cube.update(.02,[fist],2);const s=steps(cube,{...fist,x:1,y:0},2,400);assert.equal(s.selected.length,0);assert.equal(s.progress,0);assert.ok(cube.yaw>100&&cube.pitch>80);
 const yaw=cube.yaw,pitch=cube.pitch;cube.update(1/60,[]);assert.ok(cube.yaw>yaw&&cube.yaw-yaw<.1);assert.ok(Math.abs(cube.pitch-pitch)<.2);
});
test('an open palm highlights the actual face immediately, freezes rotation, and commits once after four seconds',()=>{
 const cube=new GestureCube(),yaw=cube.yaw;const first=cube.update(1/60,[palm],4);assert.equal(first.highlight,true);assert.equal(first.face,4);
 let s=steps(cube,palm,4,239);assert.equal(s.selected.length,0);assert.ok(s.progress>.99&&s.progress<1);assert.equal(cube.yaw,yaw);
 s=steps(cube,palm,4,120);assert.deepEqual(s.selected,[FACE_SCENES[4]]);assert.equal(s.progress,1);
});
test('switching faces, leaving the face, a fist, and tracking loss reset the full dwell',()=>{
 for(const interruption of ['face','off','fist','lost','hand']){
  const cube=new GestureCube();steps(cube,palm,0,180);
  const s=cube.update(1/60,interruption==='lost'?[]:[interruption==='fist'?fist:interruption==='hand'?{...palm,id:'other'}:palm],interruption==='face'?2:interruption==='off'?-1:0);
  assert.equal(s.progress,0,interruption);assert.equal(s.selected,null);assert.equal(steps(cube,palm,0,180).selected.length,0);
 }
});
test('large hand motion restarts dwell while small tracking jitter preserves it',()=>{
 const cube=new GestureCube();steps(cube,palm,0,120);const before=cube.dwell.elapsed;cube.update(1/60,[{...palm,x:.51}],0);assert.ok(cube.dwell.elapsed>before);
 assert.equal(cube.update(1/60,[{...palm,x:.58}],0).progress,0);
});
test('all seven face layouts repeat titles beyond both edges instead of shrinking short titles',()=>{
 for(const [lang,name]of Object.entries({en:'SHELTER',zh:'遮蔽',es:'REFUGIO',fr:'ABRI',ja:'住まい',ko:'피난처',ar:'مأوى'})){
  const size=360,measure=(text,font)=>[...text].length*font*.6,layout=faceTypography(name,size,measure);
  assert.equal(layout.font,size*.215);assert.ok(layout.rows*layout.lineHeight>size);assert.ok(measure(layout.text,layout.font)>size);assert.ok(layout.text.split(name).length>=3);assert.ok(menuCopy[lang].dwell);assert.equal(layout.text.replaceAll(name,''),'');
 }
});
test('all six background renderers share SPACE font, row count and tight tracking',()=>{
 const cards=[{value:'1.16B',label:'PEOPLE IN SLUMS',scope:'WORLD',year:2024}],{font,row}=backgroundType(720),flow=new DataFlow(),space=new SilhouetteType(),measure=s=>s.length*font*.5;
 flow.build(1280,620,font,cards,measure);space.build(1280,620,font,row,cards,measure);assert.equal(flow.lanes.length,space.rows.length);assert.ok(flow.lanes.length>25);
 assert.equal(flow.lanes[1].y-flow.lanes[0].y,row);assert.ok(flow.lanes[0].items[1].x<flow.lanes[0].items[0].width);
 for(const scene of FACE_SCENES.filter(s=>s!=='space')){
  let seen;const context={font:'',measureText:()=>({width:8})};Renderer.prototype.flowFacts.call({ctx:context,type(){context.font=`300 ${font}px Helvetica`;},flow:{draw(_ctx,options){seen=options;}}},{height:720,width:1280,cards,elapsed:2,footerHeight:100,scene});assert.equal(seen.font,font,scene);
 }
});
test('thermal colours remain valid and do not mutate original mosaic colour samples',()=>{
 const rgb=[128,99,70],original=[...rgb],cold=thermalRgb(rgb,0),hot=thermalRgb(rgb,1);assert.deepEqual(rgb,original);assert.notDeepEqual(cold,hot);
 for(const c of [[0,0,0],[255,255,255],rgb])for(const heat of [0,.5,1])assert.ok(thermalRgb(c,heat).every(n=>Number.isInteger(n)&&n>=0&&n<=255));assert.match(thermalColor(rgb,.5),/^rgb\(/);
});
test('heat is continuous in time, restricted to red light, and immediately clears in a hand shadow',()=>{
 const options={width:1000,height:700,depth:500},lit=heatSample(300,300,4,options),next=heatSample(300,300,4.01,options);
 assert.ok(lit.amount>0);assert.ok(Math.abs(next.dx-lit.dx)<.5);const unlit=heatSample(300,600,4,options);assert.equal(unlit.amount,0);assert.equal(unlit.dx,0);assert.equal(unlit.scale,1);
 const shaded=heatSample(300,300,4,{...options,occluders:[{x:300,y:100}]});assert.equal(shaded.amount,0);assert.equal(shaded.dx,0);assert.equal(shaded.dy,0);assert.equal(shaded.scale,1);
 assert.deepEqual(heatSample(300,300,4,options),lit);
});
test('raised arm segments cast the same shadow field for text and persistent melt damage',()=>{
 const pose=Array.from({length:33},()=>({x:500,y:600,visibility:0}));pose[11]={x:350,y:300,visibility:1};pose[13]={x:250,y:190,visibility:1};pose[15]={x:400,y:90,visibility:1};
 const occluders=shelterOccluders(pose,[],700),options={width:1000,height:700,depth:600,occluders};assert.equal(occluders.length,2);
 const cell={id:1,x:300,y:450,color:'#123',rgb:[20,30,40]},shade=shadeAt(cell,occluders,1000,700);assert.equal(shade,1);assert.equal(heatSample(cell.x,cell.y,4,options).amount,0);
 const bare=new PixelMelt(),protectedMelt=new PixelMelt();for(let n=0;n<300;n++){bare.update(1/60,[cell],[],{...options,occluders:[],progress:.3,block:30});protectedMelt.update(1/60,[cell],[],{...options,progress:.3,block:30});}
 assert.ok(protectedMelt.pixels.get(1).damage<bare.pixels.get(1).damage*.1);
});
