import {clamp,lerp,hash,smoothstep} from './math.js?v=5.6.4';
export const FOG_RETURN_DELAY=5;
export const FOG_RETURN_RATE=.14;

export function figureDepth(pose,height){
 const span=Math.max(.12,Math.hypot((pose[11]?.x??.35)-(pose[12]?.x??.65),(pose[11]?.y??.4)-(pose[12]?.y??.4)));
 return {blur:clamp(height*.0135*.32/span,7,27),opacity:clamp(.42+span*.65,.5,.72)};
}
export function glassContact(hand,pose){
 const a=pose[11],b=pose[12],span=a&&b?Math.max(.12,Math.hypot(a.x-b.x,a.y-b.y)):.3;
 const wrist=hand.landmarks?.[0]||hand,near=[pose[15],pose[16]].filter(Boolean).sort((p,q)=>Math.hypot(p.x-wrist.x,p.y-wrist.y)-Math.hypot(q.x-wrist.x,q.y-wrist.y))[0];
 const shoulderZ=((a?.z??0)+(b?.z??0))/2,forward=clamp((shoulderZ-(near?.z??shoulderZ)-.025)/.32),size=clamp(((hand.span||span*.2)/span-.12)/.2);
 const absolute=smoothstep(.022,.09,hand.span||.05);
 return clamp((.24+size*.58+forward*.4)*lerp(.35,1,absolute));
}
export function pointOnSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));return {x:a.x+dx*t,y:a.y+dy*t,t};}
export function mergeDrops(a,b){const va=a.r**3,vb=b.r**3,total=va+vb;return {...a,x:(a.x*va+b.x*vb)/total,y:(a.y*va+b.y*vb)/total,vx:(a.vx*va+b.vx*vb)/total,vy:(a.vy*va+b.vy*vb)/total,r:Math.cbrt(total)};}

// A persistent moisture field; interpolated hand sweeps leave continuous, feathered tracks.
export class Condensation{
 constructor(){this.reset();}
 reset(){this.width=0;this.height=0;this.cols=128;this.rows=0;this.fog=null;this.touched=null;this.previous=new Map();this.drops=[];this.time=0;this.serial=0;this.spawn=0;this.clear=0;this.best=0;this.distance=0;}
 resize(width,height){
  if(this.width===width&&this.height===height)return;
  const old=this.fog,oldTouched=this.touched,oldRows=this.rows,oldWidth=this.width||width,oldHeight=this.height||height;
  this.width=width;this.height=height;this.rows=Math.max(24,Math.round(this.cols*height/width));this.fog=new Float32Array(this.cols*this.rows);this.touched=new Float32Array(this.fog.length);
  for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){const i=y*this.cols+x,j=Math.min(oldRows-1,Math.floor(y*oldRows/this.rows))*this.cols+x;this.fog[i]=old?old[j]:1;this.touched[i]=oldTouched?oldTouched[j]:-100;}
  if(!old){const count=Math.round(clamp(width*height/1550,220,850));for(let i=0;i<count;i++)this.addDrop(true);}
  else for(const d of this.drops){d.x*=width/oldWidth;d.y*=height/oldHeight;d.oldY=d.y;}
  this.previous.clear();
 }
 addDrop(initial=false){const id=this.serial++,seed=id+71,r=.55+Math.pow(hash(seed*7),2.7)*4.4;this.drops.push({id,x:hash(seed*3)*this.width,y:initial?hash(seed*5)*this.height:-r*2,r,vx:0,vy:r>3.4?5+hash(seed+1)*13:0,oldY:0});}
 stamp(x,y,rx,ry,strength){
  const x0=Math.max(0,Math.floor((x-rx)/this.width*this.cols)),x1=Math.min(this.cols-1,Math.ceil((x+rx)/this.width*this.cols)),y0=Math.max(0,Math.floor((y-ry)/this.height*this.rows)),y1=Math.min(this.rows-1,Math.ceil((y+ry)/this.height*this.rows));
  for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){
   const d=Math.hypot(((gx+.5)*this.width/this.cols-x)/rx,((gy+.5)*this.height/this.rows-y)/ry);if(d>=1)continue;
   const i=gy*this.cols+gx,weight=1-smoothstep(.68,1,d);this.fog[i]*=1-strength*weight;this.touched[i]=this.time;
  }
 }
 update(dt,hands,{width,height}){
  this.resize(width,height);dt=clamp(dt,0,.055);this.time+=dt;
  for(let i=0;i<this.fog.length;i++)if(this.time-this.touched[i]>FOG_RETURN_DELAY)this.fog[i]+= (1-this.fog[i])*(1-Math.exp(-dt*FOG_RETURN_RATE));
  const strokes=[],seen=new Set();
  for(const hand of hands){
   seen.add(hand.id);const previous=this.previous.get(hand.id),contact=hand.contact??1,active=!hand.fist&&(hand.open??1)>.55&&contact>.27;
   const radius=clamp(hand.radius||width*.038,22,width*.07),old=active&&previous?.active&&Math.hypot(hand.x-previous.x,hand.y-previous.y)<width*.4?previous:hand;
   if(active&&dt>0){
    const distance=Math.hypot(hand.x-old.x,hand.y-old.y),steps=Math.max(1,Math.ceil(distance/(radius*.26))),strength=clamp(contact*.97);
    this.distance+=distance;
    for(let n=0;n<=steps;n++){
     const t=n/steps,x=lerp(old.x,hand.x,t),y=lerp(old.y,hand.y,t);this.stamp(x,y,radius,radius*.92,strength);
     for(const index of [4,8,12,16,20]){const tip=hand.landmarks?.[index];if(tip)this.stamp(tip.x+ x-hand.x,tip.y+y-hand.y,radius*.23,radius*.29,strength*.8);}
    }
    strokes.push({a:old,b:hand,radius,dx:hand.x-old.x,dy:hand.y-old.y});
   }
   this.previous.set(hand.id,{x:hand.x,y:hand.y,active});
  }
  for(const id of this.previous.keys())if(!seen.has(id))this.previous.delete(id);
  for(const drop of this.drops){
   drop.oldY=drop.y;
   for(const s of strokes){const p=pointOnSegment(drop,s.a,s.b),dx=drop.x-p.x,dy=drop.y-p.y,d=Math.hypot(dx,dy);if(d<s.radius+drop.r){const length=Math.hypot(s.dx,s.dy),nx=d>.5?dx/d:length>.5?-s.dy/length:Math.sin(drop.id)*.6,ny=d>.5?dy/d:length>.5?s.dx/length:.8;drop.x=p.x+nx*(s.radius+drop.r+1);drop.y=p.y+ny*(s.radius+drop.r+1);drop.vx+=s.dx*.18;drop.vy+=Math.max(0,s.dy)*.15+contactWeight(drop.r);}}
   if(drop.r>3.1||Math.abs(drop.vx)>1||drop.vy>1){drop.vy+=dt*(22+drop.r*11);drop.vx*=Math.exp(-dt*5);drop.vy*=Math.exp(-dt*1.6);drop.x+=dt*(drop.vx+Math.sin(this.time*.8+drop.id)*2);drop.y+=drop.vy*dt;}
  }
  this.coalesce();this.drops=this.drops.filter(d=>d.y<this.height+d.r*3&&d.x>-20&&d.x<this.width+20);
  this.spawn+=dt;while(this.spawn>.4&&this.drops.length<950){this.addDrop();this.spawn-=.4;}
  this.clear=this.fog.reduce((sum,f)=>sum+1-f,0)/this.fog.length;this.best=Math.max(this.best,this.clear);return this.summary();
 }
 coalesce(){
  const grid=new Map(),removed=new Set(),size=24;
  for(const d of this.drops){const gx=Math.floor(d.x/size),gy=Math.floor(d.y/size);let merged=false;
   for(let y=gy-1;y<=gy+1&&!merged;y++)for(let x=gx-1;x<=gx+1&&!merged;x++)for(const other of grid.get(x+':'+y)||[]){
    if(removed.has(other)||Math.hypot(d.x-other.x,d.y-other.y)>(d.r+other.r)*.68)continue;
    Object.assign(other,mergeDrops(other,d));removed.add(d);merged=true;break;
   }
   if(!merged){const key=gx+':'+gy;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(d);}
  }
  this.drops=this.drops.filter(d=>!removed.has(d));
 }
 summary(){return {clear:this.clear,best:this.best,distance:this.distance,droplets:this.drops.length};}
}
function contactWeight(radius){return radius>2.2?3:0;}

// Only the preview synthesizes landmarks. Camera mode always uses the tracked 21 points.
export function previewHand(x,y,size=.075,side=1){
 const coords=[[0,.6],[-.3,.3],[-.57,.07],[-.8,-.12],[-1,-.23],[-.4,-.06],[-.43,-.52],[-.46,-.83],[-.48,-1.08],[-.08,-.12],[-.06,-.62],[-.02,-.99],[0,-1.25],[.24,-.08],[.3,-.55],[.35,-.88],[.4,-1.1],[.52,.06],[.65,-.28],[.74,-.54],[.83,-.75]];
 const points=coords.map(([a,b])=>({x:x+a*size*side,y:y+b*size,z:0})),origin=[0,5,9,13,17].reduce((p,i)=>({x:p.x+points[i].x/5,y:p.y+points[i].y/5}),{x:0,y:0});
 return {x:origin.x,y:origin.y,span:Math.hypot(points[0].x-points[9].x,points[0].y-points[9].y),landmarks:points,open:1,fist:false,contact:1};
}
