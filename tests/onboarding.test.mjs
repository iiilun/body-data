import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {maskContours,strokeContours} from '../dist/src/person-contour.js';
import {alignmentStyle,freshPersonMask,CameraAlignment} from '../dist/src/camera-alignment.js';
import {largestDarkSquare} from '../dist/src/vector-type.js';
import {humanPose,GUIDE_SECONDS} from '../dist/src/human-guide.js';
import {poseInstructions,alignmentTitles} from '../dist/src/onboarding-copy.js';
import {FACE_SCENES} from '../dist/src/controls.js';

test('a black aperture stays completely inside the existing dark pixels',()=>{
 const width=64,height=48,pixels=new Uint8ClampedArray(width*height*4).fill(255);for(let y=11;y<31;y++)for(let x=17;x<43;x++)for(let c=0;c<3;c++)pixels[(y*width+x)*4+c]=0;
 const r=largestDarkSquare(pixels,width,height);assert.ok(r.valid&&r.width>12);for(let y=Math.floor(r.y);y<Math.ceil(r.y+r.height);y++)for(let x=Math.floor(r.x);x<Math.ceil(r.x+r.width);x++)assert.equal(pixels[(y*width+x)*4],0);
 assert.equal(largestDarkSquare(new Uint8ClampedArray(16*16*4).fill(255),16,16).valid,false);
});
test('marching contours trace a real mask rather than a skeleton or a bounding box',()=>{
 const w=40,h=40,mask=new Uint8Array(w*h);for(let y=8;y<36;y++)for(let x=14;x<26;x++)mask[y*w+x]=1;for(let y=15;y<20;y++)for(let x=2;x<38;x++)mask[y*w+x]=1;
 const loops=maskContours(mask,w,h);assert.equal(loops.length,1);assert.ok(loops[0].length>50);const xs=loops[0].map(p=>p.x);assert.ok(Math.min(...xs)<.1&&Math.max(...xs)>.9);assert.ok(new Set(loops[0].map(p=>p.x)).size>4);
 const moved=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w-1;x++)moved[y*w+x+1]=mask[y*w+x];const next=maskContours(moved,w,h)[0];assert.ok(Math.abs(Math.min(...next.map(p=>p.x))-Math.min(...xs)-1/w)<1e-8);
});
test('official sample contour is nonempty, closed in image bounds and detailed enough for a person',async()=>{
 const m=JSON.parse(await readFile(new URL('../dist/assets/alignment-mask.json',import.meta.url),'utf8')),data=Uint8Array.from(Buffer.from(m.bytes,'base64')),loops=maskContours(data,m.width,m.height);assert.equal(data.length,m.width*m.height);assert.equal(m.pose.length,33);assert.ok(loops.length>0);assert.ok(Math.max(...loops.map(p=>p.length))>200);assert.ok(loops.flat().every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));
});
test('the live outline mirrors the same full-frame geometry as the raw camera',()=>{
 const calls=[],ctx={save(){},restore(){},beginPath(){},moveTo(x,y){calls.push({x,y});},quadraticCurveTo(x,y){calls.push({x,y});},closePath(){},stroke(){}};strokeContours(ctx,[[{x:.1,y:.1},{x:.2,y:.1},{x:.2,y:.2},{x:.1,y:.2}]],{x:-100,y:0,width:1200,height:700},{color:'#fff',width:3});assert.ok(calls.some(p=>p.x===980));assert.ok(calls.some(p=>p.x===860));
});
test('matching pose changes the silhouette outline from thin white to thick green',()=>{assert.deepEqual(alignmentStyle(false),{color:'#fff',width:2.8});assert.equal(alignmentStyle(true).color,'#35ef86');assert.ok(alignmentStyle(true).width>alignmentStyle(false).width*2);});
test('stale, absent or future masks cannot start the live countdown',()=>{const mask={data:new Uint8Array([1]),width:1,height:1,timestamp:100};assert.equal(freshPersonMask(mask,799),true);assert.equal(freshPersonMask(mask,800),false);assert.equal(freshPersonMask(mask,99),false);assert.equal(freshPersonMask(null,500),false);});
test('raw camera still draws its background even before a person is detected',()=>{
 const calls=[],ctx={save(){},restore(){},fillRect(){},translate(){},scale(){},drawImage(...v){calls.push(v);}};CameraAlignment.prototype.draw.call({preview:null,contours:[]},ctx,{demo:false,video:{readyState:2},g:{x:-100,y:0,width:1280,height:720},width:1080,height:720,present:false,pose:[],mask:null});assert.equal(calls.length,1);assert.equal(calls[0][3],1280);assert.equal(ctx.filter,'grayscale(1) brightness(.76) contrast(1.04)');
});
test('all six demonstrations have plausible connected arm proportions and clear prescribed motions',()=>{
 assert.equal(GUIDE_SECONDS,6);for(const scene of FACE_SCENES){const p=humanPose(scene,0);for(const side of ['left','right']){const a=p[side+'Shoulder'],b=p[side+'Elbow'],c=p[side+'Wrist'];const upper=Math.hypot(a.x-b.x,a.y-b.y),fore=Math.hypot(b.x-c.x,b.y-c.y);assert.ok(upper>90&&upper<145,scene);assert.ok(fore>75&&fore<150,scene);}}
 const shade=humanPose('shelter');assert.ok(shade.leftWrist.y<shade.head.y&&shade.rightWrist.y<shade.head.y);const hold=humanPose('hold');assert.ok(Math.abs(hold.leftWrist.y-hold.leftShoulder.y)<20);assert.ok(Math.abs(hold.rightWrist.x-hold.leftWrist.x)>550);
});
test('each language explains the six physical poses and the new camera-alignment page',()=>{for(const lang of ['en','zh','es','fr','ja','ko','ar']){assert.ok(alignmentTitles[lang]);for(const scene of FACE_SCENES)assert.ok(poseInstructions[lang][scene].length>5);}});

test('bent HOLD elbows and a one-handed shelter do not pass the physical pose gate',async()=>{
 const {framePose,poseMatch}=await import('../dist/src/controls.js');const hold=framePose('hold');hold[13]={x:.1,y:.7,visibility:1};assert.equal(poseMatch('hold',hold).ready,false);const shade=framePose('shelter');shade[16].y=.7;assert.equal(poseMatch('shelter',shade).ready,false);
 assert.equal(freshPersonMask({data:new Uint8Array([0,0]),width:2,height:1,timestamp:100},200),false);
});
