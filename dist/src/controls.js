import {clamp,lerp} from './math.js?v=4';
export const FACE_SCENES=['shelter','space','hold','thirst','offline','vacant'];
const normals=[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,-1,0],[0,1,0]];
const radians=d=>d*Math.PI/180;
export function facingFace(pitch,yaw){
 const x=radians(pitch),y=radians(yaw);
 const depth=normals.map(([a,b,c])=>Math.sin(x)*b+Math.cos(x)*(-Math.sin(y)*a+Math.cos(y)*c));
 return depth.indexOf(Math.max(...depth));
}
export class GestureCube{
 constructor(){this.pitch=-16;this.yaw=-28;this.targetX=-16;this.targetY=-28;this.anchor=null;this.armed=false;this.closed=0;this.cooldown=0;this.face=0;}
 reset(){this.anchor=null;this.closed=0;this.armed=false;this.cooldown=.7;}
 update(dt,hands){
  this.cooldown=Math.max(0,this.cooldown-dt);let selected=null;
  const hand=hands.find(h=>this.anchor?.id===h.id)||hands[0];
  if(hand){
   if(hand.open>.55&&!hand.fist){
    this.armed=true;this.closed=0;
    if(this.anchor&&this.anchor.id===hand.id){this.targetY+=(hand.x-this.anchor.x)*250;this.targetX+=(hand.y-this.anchor.y)*240;}
    this.anchor={x:hand.x,y:hand.y,id:hand.id};
   }else{
    this.anchor=null;
    if(hand.fist&&this.armed&&this.cooldown<=0){this.closed+=dt;if(this.closed>=.38){selected=FACE_SCENES[this.face];this.armed=false;this.closed=0;this.cooldown=1;}}
    else this.closed=Math.max(0,this.closed-dt*3);
   }
  }else{this.anchor=null;this.closed=0;}
  this.targetX=clamp(this.targetX,-270,270);
  this.pitch=lerp(this.pitch,this.targetX,1-Math.exp(-dt*13));this.yaw=lerp(this.yaw,this.targetY,1-Math.exp(-dt*13));
  this.face=facingFace(this.pitch,this.yaw);
  return {pitch:this.pitch,yaw:this.yaw,face:this.face,selected,progress:clamp(this.closed/.38)};
 }
}
export function framePose(scene){
 const p=Array.from({length:33},()=>({x:.5,y:.8,visibility:1}));
 p[0]={x:.5,y:.23,visibility:1};p[11]={x:.36,y:.42,visibility:1};p[12]={x:.64,y:.42,visibility:1};p[23]={x:.41,y:.94,visibility:1};p[24]={x:.59,y:.94,visibility:1};
 let a=[.23,.43],b=[.77,.43],c=[.1,.43],d=[.9,.43];
 if(scene==='shelter'){a=[.24,.26];c=[.43,.1];b=[.78,.61];d=[.77,.78];}
 if(scene==='thirst'){a=[.28,.66];b=[.72,.66];c=[.44,.6];d=[.56,.6];}
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
 else if(scene==='thirst')action=span<width*.85&&span>.03&&Math.abs(l.y-r.y)<.13&&(l.y+r.y)/2>sy+.08;
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
