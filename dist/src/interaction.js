import {clamp,lerp} from './math.js?v=5.6.1';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alpha=(cutoff,dt)=>1-Math.exp(-2*Math.PI*cutoff*dt);

export class AdaptivePoint{
  constructor(){this.value=null;this.velocity={x:0,y:0};this.raw=null;this.time=0;}
  update(point,time){
    if(!this.value){this.value={...point};this.raw={...point};this.time=time;return;}
    const dt=clamp((time-this.time)/1000,.008,.2),a=alpha(1.5,dt);
    const dx=(point.x-this.raw.x)/dt,dy=(point.y-this.raw.y)/dt;
    this.velocity.x=lerp(this.velocity.x,clamp(dx,-3,3),a);
    this.velocity.y=lerp(this.velocity.y,clamp(dy,-3,3),a);
    const cutoff=2.3+Math.hypot(this.velocity.x,this.velocity.y)*1.8,k=alpha(cutoff,dt);
    this.value={...point,x:lerp(this.value.x,point.x,k),y:lerp(this.value.y,point.y,k),...(Number.isFinite(point.z)?{z:lerp(this.value.z??point.z,point.z,k)}:{})};
    this.raw={...point};this.time=time;
  }
  get(now){
    if(!this.value)return null;
    const age=Math.max(0,now-this.time),lead=Math.min(age/1000,.055);
    return {...this.value,x:this.value.x+this.velocity.x*lead,y:this.value.y+this.velocity.y*lead,visibility:(this.value.visibility??1)*clamp(1-(age-180)/280)};
  }
}
export function palm(hand,gesture){
  const indices=[0,5,9,13,17];
  if(!hand?.[17])return null;
  const center=indices.reduce((p,i)=>({x:p.x+hand[i].x/indices.length,y:p.y+hand[i].y/indices.length}),{x:0,y:0});
  const span=Math.max(.015,distance(hand[0],hand[9]));
  const reach=[8,12,16,20].reduce((n,i)=>n+distance(hand[i],hand[0])/4,0)/span;
  const curled=[8,12,16,20].filter(i=>distance(hand[i],hand[0])<distance(hand[i-2],hand[0])*1.12).length;
  const confident=(gesture?.score||0)>.55,name=confident&&gesture.categoryName!=='None'?gesture.categoryName:'';
  return {...center,span,landmarks:hand.map(p=>({...p})),landmarkOrigin:{...center},open:name==='Open_Palm'?1:clamp((reach-1.15)/.95),fist:gesture?gesture.categoryName==='Closed_Fist'&&gesture.score>.55:curled>=3&&reach<1.65,gesture:name,visibility:1};
}
export class BodyTracker{
  constructor(){this.joints=Array.from({length:33},()=>new AdaptivePoint());this.handTracks=new Map();this.handJoints=new Map();this.lastBody=0;this.lastHandResult=0;this.visibleHands=new Set();}
  updateHands(hands,labels,time,gestures=[]){
    if(time<this.lastHandResult)return;this.lastHandResult=time;this.visibleHands=new Set();
    for(let i=0;i<(hands||[]).length;i++){
      const center=palm(hands[i],gestures[i]?.[0]);if(!center)continue;const id=labels?.[i]?.[0]?.categoryName||String(i);this.visibleHands.add(id);
      if(!this.handTracks.has(id)){this.handTracks.set(id,new AdaptivePoint());this.handJoints.set(id,Array.from({length:21},()=>new AdaptivePoint()));}const track=this.handTracks.get(id);if(time>track.time){track.update(center,time);hands[i].forEach((p,index)=>this.handJoints.get(id)[index].update(p,time));}
    }
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
  hands(now){return [...this.handTracks.entries()].filter(([id,track])=>this.visibleHands.has(id)&&now-track.time<180).map(([id,t])=>{const h=t.get(now),points=this.handJoints.get(id).map(p=>p.get(now)),centre=[0,5,9,13,17].reduce((p,i)=>({x:p.x+points[i].x/5,y:p.y+points[i].y/5}),{x:0,y:0}),dx=h.x-centre.x,dy=h.y-centre.y;return {...h,id,landmarks:points.map(p=>({...p,x:p.x+dx,y:p.y+dy}))};});}
}
