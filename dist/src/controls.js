import {clamp,lerp} from './math.js?v=5.1.0';
export const FACE_SCENES=['shelter','space','hold','thirst','offline','vacant'];
const normals=[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,-1,0],[0,1,0]];
const radians=d=>d*Math.PI/180;
export function facingFace(pitch,yaw){
 const x=radians(pitch),y=radians(yaw);
 const depth=normals.map(([a,b,c])=>Math.sin(x)*b+Math.cos(x)*(-Math.sin(y)*a+Math.cos(y)*c));
 return depth.indexOf(Math.max(...depth));
}
// Short swipes turn once; actual face hit-testing is supplied by the view.
export class GestureCube{
 constructor(){this.pitch=-18;this.yaw=-28;this.targetX=-18;this.targetY=-28;this.face=0;this.reset();}
 reset(){this.samples=[];this.anchor=null;this.stroke=null;this.armed=false;this.closed=0;this.cooldown=0;this.highlight=false;this.hover=-1;this.hoverAge=1;this.latched=-1;this.time=0;this.handId=null;}
 update(dt,hands,hitFace=-1){
  this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.hoverAge+=dt;let selected=null;
  const hand=hands.find(h=>h.id===this.handId)||hands[0];
  if(!hand){this.samples=[];this.stroke=null;this.handId=null;this.armed=false;this.closed=0;this.highlight=false;this.hover=-1;this.hoverAge=1;}
  else{
   if(this.handId!==hand.id){this.samples=[];this.stroke=null;this.armed=false;this.closed=0;this.handId=hand.id;}
   if(!hand.fist){
    this.closed=0;this.latched=-1;this.armed=true;this.hover=Number.isInteger(hitFace)&&hitFace>=0&&hitFace<6?hitFace:-1;this.highlight=this.hover>=0;
    if(this.highlight){this.face=this.hover;this.hoverAge=0;}
    if(this.stroke){
     const d=this.stroke.axis==='x'?hand.x-this.stroke.x:hand.y-this.stroke.y;
     if(d*this.stroke.direction<.025){this.stroke=null;this.samples=[];}
    }else if(hand.open>.65&&(this.highlight||this.hoverAge<.18)){
     this.samples.push({x:hand.x,y:hand.y,t:this.time});while(this.samples.length>1&&this.time-this.samples[0].t>.2)this.samples.shift();
     const first=this.samples[0],dx=hand.x-first.x,dy=hand.y-first.y,span=Math.max(.035,this.time-first.t),axis=Math.abs(dx)>Math.abs(dy)?'x':'y',distance=axis==='x'?dx:dy;
     if(this.cooldown===0&&Math.abs(distance)>.055&&Math.abs(distance)/span>.28){
      const direction=Math.sign(distance);if(axis==='x')this.targetY+=direction*90;else this.targetX+=direction*90;
      this.stroke={x:first.x,y:first.y,axis,direction};this.samples=[];this.cooldown=.22;this.highlight=false;this.hover=-1;this.hoverAge=1;
     }
    }else this.samples=[];
   }else{
    // Keep the last open-palm target while the fingers close; closing changes the palm centre slightly.
    if(this.latched<0&&this.armed&&this.hoverAge<.2)this.latched=this.hover;
    this.highlight=this.latched>=0;
    if(this.highlight){this.face=this.latched;this.closed+=dt;if(this.closed>=.10){selected=FACE_SCENES[this.latched];this.armed=false;this.latched=-1;this.closed=0;this.hoverAge=1;this.highlight=false;}}
    else this.closed=0;
   }
  }
  const blend=1-Math.exp(-dt*19);this.pitch=lerp(this.pitch,this.targetX,blend);this.yaw=lerp(this.yaw,this.targetY,blend);
  if(!this.highlight)this.face=facingFace(this.pitch,this.yaw);
  return {pitch:this.pitch,yaw:this.yaw,face:this.face,selected,highlight:this.highlight,progress:clamp(this.closed/.10)};
 }
}

export function framePose(scene){
 const p=Array.from({length:33},()=>({x:.5,y:.8,visibility:1}));
 p[0]={x:.5,y:.23,visibility:1};p[11]={x:.36,y:.42,visibility:1};p[12]={x:.64,y:.42,visibility:1};p[23]={x:.41,y:.94,visibility:1};p[24]={x:.59,y:.94,visibility:1};
 let a=[.23,.43],b=[.77,.43],c=[.1,.43],d=[.9,.43];
 if(scene==='shelter'){a=[.24,.26];c=[.43,.1];b=[.78,.61];d=[.77,.78];}
 if(scene==='thirst'){a=[.28,.66];b=[.72,.66];c=[.37,.6];d=[.63,.6];}
 if(scene==='offline'){a=[.2,.48];b=[.8,.48];c=[.18,.23];d=[.82,.23];}
 if(scene==='vacant'){a=[.27,.5];b=[.74,.5];c=[.2,.42];d=[.84,.42];}
 [p[13],p[14],p[15],p[16]]=[a,b,c,d].map(([x,y])=>({x,y,visibility:1}));return p;
}
export function poseMatch(scene,pose){
 const joints=[0,11,12,13,14,15,16];
 if(joints.some(i=>!pose[i]||(pose[i].visibility??0)<.35))return {ready:false,score:0,joints:[]};
 const head=pose[0],a=pose[11],b=pose[12],l=pose[15],r=pose[16];
 const width=Math.abs(a.x-b.x),span=Math.abs(l.x-r.x),sy=(a.y+b.y)/2;
 const centred=Math.abs((a.x+b.x)/2-.5)<.17&&head.y>.04&&head.y<.42&&width>.1&&width<.55;
 const inView=[l,r].every(p=>p.x>.025&&p.x<.975&&p.y>.025&&p.y<.94);
 let action=false;
 if(scene==='shelter')action=Math.min(l.y,r.y)<head.y+.02;
 else if(scene==='thirst')action=span<width*1.7&&span>width*.4&&Math.abs(l.y-r.y)<.13&&(l.y+r.y)/2>sy+.08;
 else if(scene==='offline')action=l.y<sy&&r.y<sy&&span>width*1.3;
 else if(scene==='vacant')action=span>width*1.65&&Math.abs(l.y-r.y)<.2;
 else action=span>width*1.8&&[l,r].every(p=>Math.abs(p.y-sy)<.17);
 return {ready:centred&&inView&&action,score:(Number(centred)+Number(inView)+Number(action))/3,joints:joints.map(i=>({index:i,good:i<15?centred:inView&&action}))};
}
export class PoseGate{
 constructor(){this.reset();}
 reset(){this.elapsed=0;this.lost=0;this.done=false;}
 update(dt,match,present=true){
  if(this.done)return {ready:true,count:0,progress:1,done:true};
  if(present&&match.ready){this.lost=0;this.elapsed+=dt;}else{this.lost+=dt;if(this.lost>.22)this.elapsed=0;}
  this.done=this.elapsed>=3;
  return {ready:present&&match.ready,count:Math.max(1,3-Math.floor(this.elapsed)),progress:clamp(this.elapsed/3),done:this.done};
 }
}
