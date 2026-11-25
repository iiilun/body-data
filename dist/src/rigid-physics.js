import {clamp,lerp,hash} from './math.js?v=5.6.1';
import {shadeAt} from './scene-models.js?v=5.6.1';
export class RigidCare{
 constructor(Matter=globalThis.Matter){this.M=Matter;this.reset();}
 reset(){
  if(this.engine)this.M.Engine.clear(this.engine);
  this.engine=this.M.Engine.create({gravity:{x:0,y:1,scale:.001},positionIterations:8,velocityIterations:8,enableSleeping:false});
  this.colliders=new Map();this.bodies=[];this.serial=0;this.clock=0;this.accumulator=0;this.catches=0;this.time=0;this.smoothLoads=[0,0];this.fatigue=[0,0];
  this.M.Events.on(this.engine,'collisionStart',e=>{for(const pair of e.pairs){const a=pair.bodyA.parent,b=pair.bodyB.parent;for(const [value,other]of [[a,b],[b,a]])if(value.plugin?.card&&other.plugin?.support){if(!value.plugin.caught){value.plugin.caught=true;this.catches++}value.plugin.side=other.plugin.side??0;}}});
 }
 loads(){return this.smoothLoads;}
 sync(segments){
  const {Bodies,Body,Composite}=this.M,live=new Set();
  for(const s of segments){
   const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,length=Math.max(12,Math.hypot(dx,dy)),thickness=s.thickness||30;
   const position={x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2},angle=Math.atan2(dy,dx);live.add(s.id);
   let record=this.colliders.get(s.id);
   if(!record){const body=Bodies.rectangle(position.x,position.y,length+thickness,thickness,{isStatic:true,angle,friction:.78,frictionStatic:1,restitution:.12,chamfer:{radius:Math.min(12,thickness*.4)},plugin:{support:true,side:s.side}});record={body,length:length+thickness,thickness,previous:position,angle};this.colliders.set(s.id,record);Composite.add(this.engine.world,body);}
   else{
    const ratio=(length+thickness)/record.length,tr=thickness/record.thickness;
    if(Math.abs(ratio-1)>.02||Math.abs(tr-1)>.02){const old=record.body.angle;Body.setAngle(record.body,0);Body.scale(record.body,ratio,tr);Body.setAngle(record.body,old);record.length=length+thickness;record.thickness=thickness;}
    Body.setPosition(record.body,position,true);Body.setAngle(record.body,angle,true);
    Body.setVelocity(record.body,{x:clamp(record.body.velocity.x,-9,9),y:clamp(record.body.velocity.y,-9,9)});Body.setAngularVelocity(record.body,clamp(record.body.angularVelocity,-.09,.09));
   }
  }
  for(const [id,record]of this.colliders)if(!live.has(id)){Composite.remove(this.engine.world,record.body);this.colliders.delete(id);}
 }
 add(card,x,y,width,height,angle=0){
  const {Bodies,Body,Composite}=this.M;
  const body=Bodies.rectangle(x,y,width,height,{angle,friction:.52,frictionStatic:.7,frictionAir:.008,restitution:.2,density:.0012,chamfer:{radius:4},plugin:{card,width,height,id:this.serial++,caught:false}});
  Body.setVelocity(body,{x:(hash(this.serial+4)-.5)*1.5,y:.4});Body.setAngularVelocity(body,(hash(this.serial+10)-.5)*.025);
  this.bodies.push(body);Composite.add(this.engine.world,body);return body;
 }
 update(dt,segments,config){
  if(dt<=0)return;this.sync(segments);this.clock+=dt;this.time+=dt;
  if(this.clock>config.interval&&this.bodies.length<80&&config.cards?.length){
   this.clock=0;const card=config.cards[this.serial%config.cards.length],size=config.measure(card),side=this.serial%2;
   const weightedSide=this.serial%7<5?0:1;
   const candidates=segments.filter(s=>s.id.startsWith('forearm')&&s.side===weightedSide),arm=candidates[0];
   const x=clamp(arm?lerp(arm.a.x,arm.b.x,.28+hash(this.serial)*.44):config.width*(side?.72:.28),size.width/2+10,config.width-size.width/2-10);
   this.add(card,x,-size.height,size.width,size.height,(hash(this.serial+1)-.5)*.32);
  }
  this.accumulator+=Math.min(dt,.055);while(this.accumulator>=1/120){this.M.Engine.update(this.engine,1000/120);this.accumulator-=1/120;}
  for(const body of this.bodies)if(body.position.y>config.height+400||body.position.x<-500||body.position.x>config.width+500){this.M.Composite.remove(this.engine.world,body);}
  this.bodies=this.bodies.filter(b=>b.position.y<=config.height+400&&b.position.x>=-500&&b.position.x<=config.width+500);
  const count=[0,0];for(const b of this.bodies)if(b.plugin.caught&&Math.abs(b.velocity.y)<5&&b.position.y<config.height)count[b.plugin.side??0]++;
  this.fatigue=this.fatigue.map((n,i)=>clamp(n+dt*(count[i]>0?count[i]*.0025:-.015),0,.35));
  this.smoothLoads=this.smoothLoads.map((n,i)=>lerp(n,clamp(count[i]/7+this.fatigue[i]),1-Math.exp(-dt*3.2)));
 }
}
export class PixelMelt{
 constructor(){this.reset();}
 reset(){this.pixels=new Map();this.time=0;this.heat=0;this.previousHand=[];this.cooling=0;}
 update(dt,cells,hands,{width,height,block,progress,occluders=hands}){
  this.time+=dt;
  const shade=hands.filter(h=>h.y<height*.47);let motion=0;
  for(const h of shade){const old=this.previousHand.find(p=>p.id===h.id);if(old)motion+=Math.min(1,Math.hypot(h.x-old.x,h.y-old.y)/Math.max(1,dt*width));}
  this.previousHand=hands.map(h=>({...h}));this.cooling=lerp(this.cooling,clamp(shade.length*.28+motion*.75),1-Math.exp(-dt*8));
  this.heat=clamp(this.heat+dt*(.024+.012*progress)*(1-this.cooling*.7));
  for(const cell of cells){const id=cell.material??cell.id;let p=this.pixels.get(id);const protection=shadeAt(cell,occluders,width,height);
   if(!p){p={id,free:false,damage:this.heat*(1-protection)*.65,color:cell.color,rgb:cell.rgb,seed:this.pixels.size};this.pixels.set(id,p);}
   if(!p.free){p.damage+=dt*(.018+.009*progress)*(1-protection*.98);p.color=cell.color;p.rgb=cell.rgb;
    if(p.damage>.12+hash(p.seed*3)*.75&&progress>.05){p.free=true;p.x=cell.x;p.y=cell.y;p.vx=(hash(p.seed+1)-.5)*width*.09;p.vy=-height*.025;p.age=0;}
   }
  }
  // Released pixels remain released even when their source material leaves the camera grid.
  for(const p of this.pixels.values())if(p.free){p.age+=dt;p.vy+=dt*height*.3;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*.25);}
  return this.pixels;
 }
}
