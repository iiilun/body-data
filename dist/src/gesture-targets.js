export const HAND_DWELL_SECONDS=3;

function bounds(target){
 const left=target.left??target.x,top=target.top??target.y;
 return {left,top,right:target.right??left+target.width,bottom:target.bottom??top+target.height};
}
function contains(hand,target){const b=bounds(target);return Number.isFinite(hand.x)&&Number.isFinite(hand.y)&&hand.x>=b.left&&hand.x<=b.right&&hand.y>=b.top&&hand.y<=b.bottom;}
const eligible=hand=>hand.id!=null&&!hand.fist&&!hand.pinch&&(hand.open??0)>.65&&hand.present!==false;

// Coordinates are CSS pixels. A single tracked palm owns each continuous dwell.
export class DwellTargets{
 constructor({seconds=HAND_DWELL_SECONDS}={}){this.seconds=seconds;this.reset();}
 reset(){this.active=null;this.latchedHands=new Map();this.lockedTargets=new Map();}
 cancel(){this.active=null;}
 update(dt,hands=[],targets=[]){
  const visible=targets.filter(t=>t.enabled!==false&&t.id!=null),byId=new Map(visible.map(t=>[t.id,t]));
  for(const [id,previous]of this.lockedTargets){const target=byId.get(id)||previous;if(!hands.some(h=>contains(h,target)))this.lockedTargets.delete(id);}
  for(const [id,target]of this.latchedHands){const hand=hands.find(h=>h.id===id);if(!hand||!contains(hand,target))this.latchedHands.delete(id);}
  const currentTarget=this.active&&byId.get(this.active.targetId),currentHand=this.active&&hands.find(h=>h.id===this.active.handId);
  let pair=currentTarget&&currentHand&&eligible(currentHand)&&contains(currentHand,currentTarget)?{target:currentTarget,hand:currentHand}:null;
  if(!pair){
   this.active=null;
   const ordered=visible.map((target,index)=>({target,index})).sort((a,b)=>(b.target.priority||0)-(a.target.priority||0)||a.index-b.index);
   for(const {target}of ordered){
    if(this.lockedTargets.has(target.id))continue;
    const hand=hands.find(hand=>eligible(hand)&&!this.latchedHands.has(hand.id)&&contains(hand,target));
    if(hand){pair={hand,target};break;}
   }
  }
  if(!pair)return {targetId:null,handId:null,progress:0,elapsed:0,selected:null,highlight:false,hand:null};
  const {target,hand}=pair;let selected=null;
  if(!this.active)this.active={targetId:target.id,handId:hand.id,elapsed:0,committed:false};
  else if(!this.active.committed&&Number.isFinite(dt)&&dt>0)this.active.elapsed+=Math.min(.1,dt);
  const progress=Math.min(1,this.active.elapsed/this.seconds);
  if(!this.active.committed&&this.active.elapsed+1e-8>=this.seconds){
   this.active.committed=true;selected=target.id;this.lockedTargets.set(target.id,target);this.latchedHands.set(hand.id,target);
  }
  return {targetId:target.id,handId:hand.id,progress,elapsed:this.active.elapsed,selected,highlight:true,hand};
 }
}
