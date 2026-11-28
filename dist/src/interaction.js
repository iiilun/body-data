import {clamp,lerp} from './math.js?v=5.10.0';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alpha=(cutoff,dt)=>1-Math.exp(-2*Math.PI*cutoff*dt);

export class AdaptivePoint{
  constructor({cutoff=2.3,beta=1.8,lead=.055}={}){this.cutoff=cutoff;this.beta=beta;this.lead=lead;this.value=null;this.velocity={x:0,y:0};this.raw=null;this.time=0;}
  update(point,time){
    if(!this.value){this.value={...point};this.raw={...point};this.time=time;return;}
    const dt=clamp((time-this.time)/1000,.008,.2),a=alpha(1.5,dt);
    const dx=(point.x-this.raw.x)/dt,dy=(point.y-this.raw.y)/dt;
    this.velocity.x=lerp(this.velocity.x,clamp(dx,-3,3),a);
    this.velocity.y=lerp(this.velocity.y,clamp(dy,-3,3),a);
    const cutoff=this.cutoff+Math.hypot(this.velocity.x,this.velocity.y)*this.beta,k=alpha(cutoff,dt);
    this.value={...point,x:lerp(this.value.x,point.x,k),y:lerp(this.value.y,point.y,k),...(Number.isFinite(point.z)?{z:lerp(this.value.z??point.z,point.z,k)}:{})};
    this.raw={...point};this.time=time;
  }
  get(now){
    if(!this.value)return null;
    const age=Math.max(0,now-this.time),lead=Math.min(age/1000,this.lead);
    return {...this.value,x:this.value.x+this.velocity.x*lead,y:this.value.y+this.velocity.y*lead,visibility:(this.value.visibility??1)*clamp(1-(age-180)/280)};
  }
}
export function palm(hand,gesture){
  const indices=[0,5,9,13,17];
  if(!hand?.[17])return null;
  const center=indices.reduce((p,i)=>({x:p.x+hand[i].x/indices.length,y:p.y+hand[i].y/indices.length}),{x:0,y:0});
  // Palm width remains useful when the wrist-to-middle-finger axis is foreshortened.
  const span=Math.max(.015,distance(hand[0],hand[9]),distance(hand[5],hand[17])*.95);
  const pinchRatio=distance(hand[4],hand[8])/span;
  const reach=[8,12,16,20].reduce((n,i)=>n+distance(hand[i],hand[0])/4,0)/span;
  const curled=[8,12,16,20].filter(i=>distance(hand[i],hand[0])<distance(hand[i-2],hand[0])*1.12).length;
  const confident=(gesture?.score||0)>.60,name=confident&&gesture.categoryName!=='None'?gesture.categoryName:'';
  return {...center,span,pinchRatio,pinch:pinchRatio<.42,landmarks:hand.map(p=>({...p})),landmarkOrigin:{...center},open:name==='Open_Palm'?1:clamp((reach-1.15)/.95),fist:gesture?name==='Closed_Fist':curled>=3&&reach<1.65,gesture:name,visibility:1};
}
export class StableHandGesture{
 constructor(){this.mode=null;this.candidate=null;this.since=0;this.pinch=false;this.pinchCandidate=null;this.pinchSince=0;this.time=0;}
 update(hand,time){
  if(time-this.time>220){this.mode=null;this.candidate=null;this.pinch=false;this.pinchCandidate=null;}
  const mode=hand.fist?'fist':hand.open>.72&&(!hand.gesture||hand.gesture==='Open_Palm')?'open':'neutral';
  if(this.mode===null){this.mode=mode;this.candidate=null;}
  else if(mode===this.mode)this.candidate=null;
  else{if(this.candidate!==mode){this.candidate=mode;this.since=time;}if(time-this.since>=(mode==='neutral'?150:95)){this.mode=mode;this.candidate=null;}}
  const pinching=hand.pinchRatio<(this.pinch?.62:.42);
  if(pinching===this.pinch)this.pinchCandidate=null;
  else{if(this.pinchCandidate!==pinching){this.pinchCandidate=pinching;this.pinchSince=time;}if((!this.time&&hand.pinchRatio<.27)||time-this.pinchSince>=(pinching?45:60)){this.pinch=pinching;this.pinchCandidate=null;}}
  this.time=time;
  return {...hand,open:this.mode==='open'?1:0,fist:this.mode==='fist',pinch:this.pinch,gestureState:this.mode};
 }
}
function associateHands(detections,tracks,time){
 const options=detections.map(d=>[...tracks].flatMap(([id,meta])=>{
  if(time-meta.time>240)return [];const lead=Math.min(.08,Math.max(0,(time-meta.time)/1000)),predicted={x:meta.center.x+(meta.vx||0)*lead,y:meta.center.y+(meta.vy||0)*lead},gap=distance(d.center,predicted);
  return gap<.30?[{id,cost:gap+(d.label&&meta.handedness&&d.label!==meta.handedness?.008:0)}]:[];
 }));
 let best=Infinity,result=new Map();
 const visit=(index,used,matched,cost)=>{
  if(cost>=best)return;if(index===detections.length){best=cost;result=new Map(matched);return;}
  for(const option of options[index])if(!used.has(option.id)){used.add(option.id);matched.set(detections[index].index,option.id);visit(index+1,used,matched,cost+option.cost);matched.delete(detections[index].index);used.delete(option.id);}
  visit(index+1,used,matched,cost+.34);
 };
 visit(0,new Set(),new Map(),0);return result;
}
export class BodyTracker{
  constructor(){this.joints=Array.from({length:33},()=>new AdaptivePoint());this.handTracks=new Map();this.handJoints=new Map();this.handMeta=new Map();this.nextHand=1;this.lastBody=0;this.lastHandResult=0;this.visibleHands=new Set();}
  updateHands(hands,labels,time,gestures=[]){
    if(time<=this.lastHandResult)return;this.lastHandResult=time;this.visibleHands=new Set();
    const detections=(hands||[]).map((points,i)=>({points,center:palm(points,gestures[i]?.[0]),label:labels?.[i]?.[0]?.categoryName||'',index:i})).filter(d=>d.center);
    const matched=associateHands(detections,this.handMeta,time);
    for(const d of detections){
      let id=matched.get(d.index),meta=id&&this.handMeta.get(id);
      if(!meta){id=d.label&&!this.handTracks.has(d.label)?d.label:'hand-'+this.nextHand++;meta={handedness:d.label,gesture:new StableHandGesture()};this.handMeta.set(id,meta);this.handTracks.set(id,new AdaptivePoint({cutoff:1.8,beta:1.25,lead:.018}));this.handJoints.set(id,Array.from({length:21},()=>new AdaptivePoint({lead:.018})));}
      if(meta.center&&time>meta.time){const seconds=(time-meta.time)/1000;meta.vx=lerp(meta.vx||0,clamp((d.center.x-meta.center.x)/seconds,-2,2),.6);meta.vy=lerp(meta.vy||0,clamp((d.center.y-meta.center.y)/seconds,-2,2),.6);}
      if(!meta.handedness&&d.label)meta.handedness=d.label;meta.center=d.center;meta.time=time;this.visibleHands.add(id);
      const center=meta.gesture.update(d.center,time);center.handedness=meta.handedness;const track=this.handTracks.get(id);track.update(center,time);d.points.forEach((p,index)=>this.handJoints.get(id)[index].update(p,time));
    }
    for(const [id,meta]of this.handMeta)if(time-meta.time>1500){this.handMeta.delete(id);this.handTracks.delete(id);this.handJoints.delete(id);}
  }
  update(points,hands,labels,time,handTime=time,gestures=[]){
    this.updateHands(hands,labels,handTime,gestures);
    const refined=(points||[]).map(p=>({...p}));
    for(const hand of hands||[]){
      let nearest=null,d=.25;
      for(const index of [15,16])if(refined[index]){const next=distance(refined[index],hand[0]);if(next<d){d=next;nearest=index;}}
      if(nearest!==null&&time-handTime<110)refined[nearest]={...refined[nearest],x:hand[0].x,y:hand[0].y,visibility:Math.max(.9,refined[nearest].visibility||0)};
    }
    refined.forEach((p,i)=>{if((p.visibility??1)>.25)this.joints[i]?.update(p,time);});
    if(refined[11]?.visibility>.35&&refined[12]?.visibility>.35)this.lastBody=time;
  }
  pose(now){return this.joints.map(j=>j.get(now)||{x:.5,y:.7,visibility:0});}
  hands(now){return [...this.handTracks.entries()].filter(([,track])=>now-track.time<150).map(([id,t])=>{const h=t.get(now),points=this.handJoints.get(id).map(p=>p.get(now)),centre=[0,5,9,13,17].reduce((p,i)=>({x:p.x+points[i].x/5,y:p.y+points[i].y/5}),{x:0,y:0}),dx=h.x-centre.x,dy=h.y-centre.y;return {...h,id,pinch:this.visibleHands.has(id)&&h.pinch,observed:this.visibleHands.has(id),landmarks:points.map(p=>({...p,x:p.x+dx,y:p.y+dy}))};});}
}
