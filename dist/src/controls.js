import {clamp,lerp} from './math.js?v=5.10.1';
export const FACE_SCENES=['shelter','space','hold','thirst','offline','vacant'];
const normals=[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,-1,0],[0,1,0]];
const radians=d=>d*Math.PI/180;
export function facingFace(pitch,yaw){
 const x=radians(pitch),y=radians(yaw);
 const depth=normals.map(([a,b,c])=>Math.sin(x)*b+Math.cos(x)*(-Math.sin(y)*a+Math.cos(y)*c));
 return depth.indexOf(Math.max(...depth));
}
export const CUBE_DWELL_SECONDS=3;
export const CUBE_DRAG_GAIN={yaw:230,pitch:185};
const rightHand=hand=>/^right$/i.test(hand.handedness||hand.id||'')||hand.id==='r';
export function preferredControlHand(hands=[]){return hands.find(rightHand)||hands[0]||null;}
// A fist drags the orientation around a fixed centre; a resting open palm commits.
export class GestureCube{
 constructor(){this.reset();}
 reset(){this.pitch=-18;this.yaw=-28;this.targetPitch=-18;this.targetYaw=-28;this.face=0;this.spin=0;this.grab=null;this.dwell=null;this.committed=false;this.highlight=false;this.handId=null;this.ownerLost=0;this.idleElapsed=.35;}
 controlHand(hands=[]){return hands.find(h=>h.id===this.handId)||(this.handId!==null&&this.ownerLost<.18?null:preferredControlHand(hands));}
 update(dt,hands,hitFace=-1){
  let selected=null;
  let hand=this.controlHand(hands);
  if(!hand){this.ownerLost+=dt;this.grab=null;this.dwell=null;this.committed=false;if(this.ownerLost>=.18){this.handId=null;hand=preferredControlHand(hands);}}
  if(hand){this.ownerLost=0;if(hand.id!==this.handId){this.grab=null;this.dwell=null;this.committed=false;this.handId=hand.id;}}
  const observed=hand?.observed!==false;
  this.highlight=!!hand&&!hand.fist&&!hand.pinch&&hand.open>.65&&Number.isInteger(hitFace)&&hitFace>=0&&hitFace<6;
  if(hand&&!observed){this.grab=null;}
  else if(hand?.fist){
   this.dwell=null;this.committed=false;
   this.grab??={x:hand.x,y:hand.y,pitch:this.pitch,yaw:this.yaw};
   const travel=value=>Math.sign(value)*Math.max(0,Math.abs(value)-.004);
   this.targetYaw=this.grab.yaw+travel(clamp(hand.x)-this.grab.x)*CUBE_DRAG_GAIN.yaw;
   this.targetPitch=this.grab.pitch-travel(clamp(hand.y)-this.grab.y)*CUBE_DRAG_GAIN.pitch;
  }else{
   this.grab=null;
   if(this.highlight){
    this.face=hitFace;
    if(!this.dwell||this.dwell.face!==hitFace||Math.hypot(hand.x-this.dwell.x,hand.y-this.dwell.y)>.045){this.dwell={face:hitFace,x:hand.x,y:hand.y,elapsed:0};this.committed=false;}
    else this.dwell.elapsed+=dt;
    if(!this.committed&&this.dwell.elapsed+1e-8>=CUBE_DWELL_SECONDS){selected=FACE_SCENES[hitFace];this.committed=true;}
   }else{this.dwell=null;this.committed=false;}
  }
  if(!this.highlight&&!this.grab&&(hand?observed:this.handId===null)){this.idleElapsed+=dt;const travel=dt*(hand?1:clamp(this.idleElapsed/.35)),previous=this.spin;this.spin+=travel;const tilt=(Math.sin(this.spin*.09)-Math.sin(previous*.09))*72;this.targetYaw+=travel*5;this.targetPitch+=tilt;this.yaw+=travel*5;this.pitch+=tilt;}else this.idleElapsed=0;
  if(this.grab){const blend=1-Math.exp(-dt*12);this.pitch=lerp(this.pitch,this.targetPitch,blend);this.yaw=lerp(this.yaw,this.targetYaw,blend);}
  else{this.targetPitch=this.pitch;this.targetYaw=this.yaw;}
  if(!this.highlight)this.face=facingFace(this.pitch,this.yaw);
  return {pitch:this.pitch,yaw:this.yaw,dragging:!!this.grab,face:this.face,selected,highlight:this.highlight,progress:clamp((this.dwell?.elapsed||0)/CUBE_DWELL_SECONDS)};
 }
}

export function framePose(scene){
 const p=Array.from({length:33},()=>({x:.5,y:.8,visibility:1}));
 p[0]={x:.5,y:.23,visibility:1};p[11]={x:.36,y:.42,visibility:1};p[12]={x:.64,y:.42,visibility:1};p[23]={x:.41,y:.94,visibility:1};p[24]={x:.59,y:.94,visibility:1};
 let a=[.23,.43],b=[.77,.43],c=[.1,.43],d=[.9,.43];
 if(scene==='shelter'){a=[.24,.26];c=[.43,.1];b=[.76,.26];d=[.57,.1];}
 if(scene==='thirst'){a=[.23,.46];b=[.8,.63];c=[.29,.23];d=[.82,.48];}
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
 if(scene==='shelter')action=Math.max(l.y,r.y)<head.y+.03;
 else if(scene==='thirst')action=span>width*1.1&&Math.min(l.y,r.y)<sy+.06&&Math.max(l.y,r.y)<sy+.3;
 else if(scene==='offline')action=l.y<sy&&r.y<sy&&span>width*1.3;
 else if(scene==='vacant')action=span>width*1.65&&Math.abs(l.y-r.y)<.2;
 else action=span>width*1.8&&[l,r].every(p=>Math.abs(p.y-sy)<.17)&&[[11,13,15],[12,14,16]].every(([a,b,c])=>elbowAngle(pose[a],pose[b],pose[c])>145);
 return {ready:centred&&inView&&action,score:(Number(centred)+Number(inView)+Number(action))/3,joints:joints.map(i=>({index:i,good:i<15?centred:inView&&action}))};
}
export function elbowAngle(a,b,c){const ax=a.x-b.x,ay=a.y-b.y,cx=c.x-b.x,cy=c.y-b.y;return Math.acos(clamp((ax*cx+ay*cy)/Math.max(1e-8,Math.hypot(ax,ay)*Math.hypot(cx,cy)),-1,1))*180/Math.PI;}
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
