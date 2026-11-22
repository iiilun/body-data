import {clamp,lerp,hash} from './math.js?v=5.0.0';

export function materialKey(cell,pose){
 if(!pose?.[11]||!pose?.[12])return cell.id;
 const a=pose[11],b=pose[12],span=Math.max(.12,Math.hypot(a.x-b.x,a.y-b.y));
 const nose=pose[0]||{x:(a.x+b.x)/2,y:a.y-span*.6};
 if(Math.hypot(cell.x-nose.x,cell.y-nose.y)<span*.45)return 'head:'+Math.round((cell.x-nose.x)/span*10)+':'+Math.round((cell.y-nose.y)/span*10);
 let nearest=null;
 for(const [start,end]of [[11,13],[13,15],[12,14],[14,16]]){
  const p=pose[start],q=pose[end];if(!p||!q||(p.visibility??0)<.3||(q.visibility??0)<.3)continue;
  const dx=q.x-p.x,dy=q.y-p.y,len=dx*dx+dy*dy,t=clamp(((cell.x-p.x)*dx+(cell.y-p.y)*dy)/(len||1)),x=p.x+dx*t,y=p.y+dy*t,d=Math.hypot(cell.x-x,cell.y-y);
  if(d<span*.24&&(!nearest||d<nearest.d))nearest={d,key:`arm${start}:${Math.round(t*8)}:${Math.sign(dx*(cell.y-y)-dy*(cell.x-x))}`};
 }
 if(nearest)return nearest.key;
 return 'body:'+Math.round((cell.x-(a.x+b.x)/2)/span*12)+':'+Math.round((cell.y-(a.y+b.y)/2)/span*12);
}
export function shadeAt(cell,hands,width,height){
 let shade=0;
 for(const hand of hands){if(hand.y>height*.5||hand.y>cell.y+20)continue;const radius=width*.19+Math.max(0,cell.y-hand.y)*.19;shade=Math.max(shade,clamp((radius-Math.abs(cell.x-hand.x))/(width*.055)));}
 return shade;
}
export class WaterCatch{
 constructor(){this.reset();}
 reset(){this.drops=[];this.serial=0;this.clock=0;this.level=0;this.uncertain=false;this.blueCaught=0;this.ochreCaught=0;this.safeDelivered=0;this.spilled=0;this.bucket=null;}
 update(dt,hands,{width,height,unsafeShare=.26}){
  dt=Math.min(dt,.055);this.clock+=dt;
  const sorted=[...hands].sort((a,b)=>a.x-b.x),a=sorted[0],b=sorted[1];
  if(a&&b){const target={x:(a.x+b.x)/2,y:(a.y+b.y)/2+12,width:clamp(Math.abs(a.x-b.x)+34,width*.11,width*.3),height:height*.16,angle:clamp(Math.atan2(b.y-a.y,b.x-a.x),-.85,.85),active:true};if(!this.bucket)this.bucket=target;else{for(const key of ['x','y','width','angle'])this.bucket[key]=lerp(this.bucket[key],target[key],1-Math.exp(-dt*16));this.bucket.height=target.height;this.bucket.active=true;}}
  else if(this.bucket)this.bucket.active=false;
  while(this.clock>1/34&&this.drops.length<700){this.clock-=1/34;const n=this.serial++;this.drops.push({x:hash(n*7+13)*width,y:-15,vx:(hash(n+4)-.5)*22,vy:height*(.15+hash(n+20)*.11),unsafe:hash(n*13+2)<unsafeShare,litres:.25});}
  const bucket=this.bucket,capacity=24;
  for(const p of this.drops){const oldY=p.y;p.vy+=dt*height*.38;p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(!bucket?.active||Math.abs(bucket.angle)>.62)continue;
   const cos=Math.cos(bucket.angle),sin=Math.sin(bucket.angle),dx=p.x-bucket.x,dy=p.y-bucket.y;
   const localX=dx*cos+dy*sin,localY=-dx*sin+dy*cos,previousY=-(p.x-bucket.x)*sin+(oldY-bucket.y)*cos;
   if(Math.abs(localX)<bucket.width*.5-3&&previousY<5&&localY>=-2&&localY<36&&this.level<capacity){p.caught=true;if(p.unsafe){this.uncertain=true;this.ochreCaught+=p.litres;}else this.blueCaught+=p.litres;this.level=Math.min(capacity,this.level+p.litres);}
  }
  this.drops=this.drops.filter(p=>!p.caught&&p.y<height+30);
  if(bucket?.active&&Math.abs(bucket.angle)>.62&&this.level>0){const poured=Math.min(this.level,dt*10);this.level-=poured;if(!this.uncertain)this.safeDelivered+=poured;else this.spilled+=poured;if(this.level<.01){this.level=0;this.uncertain=false;}}
  return this.summary();
 }
 summary(){return {blue:this.blueCaught,ochre:this.ochreCaught,safe:this.safeDelivered+(this.uncertain?0:this.level),uncertain:this.spilled+(this.uncertain?this.level:0),personDays:(this.safeDelivered+(this.uncertain?0:this.level))/15,level:this.level};}
}
export class VacancyCity{
 constructor(){this.reset();}
 reset(){this.tiles=[];this.held=new Map();this.reused=0;this.key='';this.previous=new Map();}
 build(width,height,percent){
  const key=[width,height,percent].join(':');if(this.key===key)return;this.reset();this.key=key;
  const cols=width>1100?20:width>700?15:10,rows=Math.ceil(120/cols),pad=width*.035,gap=8,top=height*.18,bottom=height*.15;
  this.tileW=(width-pad*2-gap*(cols-1))/cols;this.tileH=(height-top-bottom-gap*(rows-1))/rows;
  const empty=Math.round(120*percent/100),rank=Array.from({length:120},(_,i)=>i).sort((a,b)=>hash(a+31)-hash(b+31)),vacant=new Set(rank.slice(0,empty));
  for(let i=0;i<120;i++){const x=pad+i%cols*(this.tileW+gap)+this.tileW/2,y=top+Math.floor(i/cols)*(this.tileH+gap)+this.tileH/2;this.tiles.push({id:i,x,y,homeX:x,homeY:y,vx:0,vy:0,vacant:vacant.has(i),shared:false,hover:0});}
 }
 update(dt,hands,centre,width,height){
  dt=Math.min(dt,.05);const seen=new Set();
  for(const h of hands){seen.add(h.id);const previous=this.previous.get(h.id),held=this.held.get(h.id);
   if(h.fist&&held){held.targetX=h.x;held.targetY=h.y;}
   else if(h.fist&&!previous?.fist){const tile=this.tiles.filter(t=>t.vacant&&!t.shared&&![...this.held.values()].includes(t)).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];if(tile&&Math.abs(tile.x-h.x)<this.tileW&&Math.abs(tile.y-h.y)<this.tileH){this.held.set(h.id,tile);tile.targetX=h.x;tile.targetY=h.y;}}
   else if(!h.fist&&held){this.release(h.id,centre,width,height);}
   this.previous.set(h.id,{fist:!!h.fist});
  }
  for(const id of this.held.keys())if(!seen.has(id))this.release(id,null,width,height);
  for(const t of this.tiles){const held=[...this.held.values()].includes(t);if(!held){t.targetX=t.shared?t.homeX:t.homeX;t.targetY=t.homeY;}
   t.hover=lerp(t.hover,hands.some(h=>Math.abs(t.x-h.x)<this.tileW*.8&&Math.abs(t.y-h.y)<this.tileH*.8)?1:0,1-Math.exp(-dt*10));
   t.vx+=((t.targetX-t.x)*110-t.vx*19)*dt;t.vy+=((t.targetY-t.y)*110-t.vy*19)*dt;t.x+=t.vx*dt;t.y+=t.vy*dt;
  }
 }
 release(id,centre,width,height){
  const tile=this.held.get(id);if(!tile)return;
  if(centre&&Math.abs(tile.targetX-centre.x)<width*.2&&Math.abs(tile.targetY-centre.y)<height*.28){tile.shared=true;tile.homeX=centre.x+((this.reused%4)-1.5)*(this.tileW+5);tile.homeY=centre.y+Math.floor(this.reused/4)*(this.tileH*.6+5);this.reused++;}
  this.held.delete(id);this.previous.delete(id);
 }
}
export function offlineTime(time){return Math.max(0,Math.floor(time/1.4)*1.4-1.4);}
