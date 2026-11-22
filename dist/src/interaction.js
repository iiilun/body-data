import {clamp,lerp} from './math.js?v=5.0.0';
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
    this.value={...point,x:lerp(this.value.x,point.x,k),y:lerp(this.value.y,point.y,k)};
    this.raw={...point};this.time=time;
  }
  get(now){
    if(!this.value)return null;
    const age=Math.max(0,now-this.time),lead=Math.min(age/1000,.055);
    return {...this.value,x:this.value.x+this.velocity.x*lead,y:this.value.y+this.velocity.y*lead,visibility:(this.value.visibility??1)*clamp(1-(age-180)/280)};
  }
}
export function palm(hand){
  const indices=[0,5,9,13,17];
  if(!hand?.[17])return null;
  const center=indices.reduce((p,i)=>({x:p.x+hand[i].x/indices.length,y:p.y+hand[i].y/indices.length}),{x:0,y:0});
  const span=Math.max(.015,distance(hand[0],hand[9]));
  const reach=[8,12,16,20].reduce((n,i)=>n+distance(hand[i],hand[0])/4,0)/span;
  const curled=[8,12,16,20].filter(i=>distance(hand[i],hand[0])<distance(hand[i-2],hand[0])*1.12).length;
  return {...center,open:clamp((reach-1.15)/.95),fist:curled>=3&&reach<1.55,visibility:1};
}
export class BodyTracker{
  constructor(){this.joints=Array.from({length:33},()=>new AdaptivePoint());this.handTracks=new Map();this.lastBody=0;}
  update(points,hands,labels,time,handTime=time){
    const refined=(points||[]).map(p=>({...p}));
    for(let i=0;i<(hands||[]).length;i++){
      const hand=hands[i],center=palm(hand);if(!center)continue;
      const id=labels?.[i]?.[0]?.categoryName||String(i);
      if(!this.handTracks.has(id))this.handTracks.set(id,new AdaptivePoint());
      const handTrack=this.handTracks.get(id);
      if(handTime>handTrack.time)handTrack.update(center,handTime);
      let nearest=null,d=.25;
      for(const index of [15,16])if(refined[index]){const next=distance(refined[index],hand[0]);if(next<d){d=next;nearest=index;}}
      if(nearest!==null&&time-handTime<110)refined[nearest]={...refined[nearest],x:hand[0].x,y:hand[0].y,visibility:Math.max(.9,refined[nearest].visibility||0)};
    }
    refined.forEach((p,i)=>{if((p.visibility??1)>.25)this.joints[i]?.update(p,time);});
    if(refined[11]?.visibility>.35&&refined[12]?.visibility>.35)this.lastBody=time;
  }
  pose(now){return this.joints.map(j=>j.get(now)||{x:.5,y:.7,visibility:0});}
  hands(now){return [...this.handTracks.entries()].filter(([,track])=>now-track.time<280).map(([id,t])=>({...t.get(now),id}));}
}
