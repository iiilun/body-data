import {clamp,lerp,hash} from './math.js?v=4';
export class RigidCare{
 constructor(Matter=globalThis.Matter){this.M=Matter;this.reset();}
 reset(){
  if(this.engine)this.M.Engine.clear(this.engine);
  this.engine=this.M.Engine.create({gravity:{x:0,y:1,scale:.001},positionIterations:8,velocityIterations:8,enableSleeping:false});
  this.colliders=new Map();this.bodies=[];this.serial=0;this.clock=0;this.accumulator=0;this.catches=0;this.time=0;this.smoothLoads=[0,0];
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
  if(this.clock>config.interval&&this.bodies.length<28&&config.cards?.length){
   this.clock=0;const card=config.cards[this.serial%config.cards.length],size=config.measure(card),side=this.serial%2;
   const candidates=segments.filter(s=>s.id.startsWith('forearm')&&s.side===side),arm=candidates[0];
   const x=clamp(arm?lerp(arm.a.x,arm.b.x,.5):config.width*(side?.72:.28),size.width/2+10,config.width-size.width/2-10);
   this.add(card,x,-size.height,size.width,size.height,(hash(this.serial+1)-.5)*.32);
  }
  this.accumulator+=Math.min(dt,.055);while(this.accumulator>=1/120){this.M.Engine.update(this.engine,1000/120);this.accumulator-=1/120;}
  for(const body of this.bodies)if(body.position.y>config.height+400||body.position.x<-500||body.position.x>config.width+500){this.M.Composite.remove(this.engine.world,body);}
  this.bodies=this.bodies.filter(b=>b.position.y<=config.height+400&&b.position.x>=-500&&b.position.x<=config.width+500);
  const count=[0,0];for(const b of this.bodies)if(b.plugin.caught&&Math.abs(b.velocity.y)<4)count[b.plugin.side??0]++;
  this.smoothLoads=this.smoothLoads.map((n,i)=>lerp(n,clamp(count[i]/10),1-Math.exp(-dt*1.8)));
 }
}
export class PixelMelt{
 constructor(){this.reset();}
 reset(){this.pixels=new Map();this.time=0;this.heat=0;this.previousHand=[];this.cooling=0;}
 update(dt,cells,hands,{width,height,block,progress}){
  this.time+=dt;
  const shade=hands.filter(h=>h.y<height*.47);let motion=0;
  for(const h of shade){const old=this.previousHand.find(p=>p.id===h.id);if(old)motion+=Math.min(1,Math.hypot(h.x-old.x,h.y-old.y)/Math.max(1,dt*width));}
  this.previousHand=hands.map(h=>({...h}));this.cooling=lerp(this.cooling,clamp(shade.length*.28+motion*.75),1-Math.exp(-dt*8));
  this.heat=clamp(this.heat+dt*(.028+.02*progress)*(1-this.cooling*.93));
  const seen=new Set();
  for(const cell of cells){seen.add(cell.id);let p=this.pixels.get(cell.id);if(!p){p={id:cell.id,dx:0,dy:0,vx:0,vy:0,free:false,damage:0,color:cell.color,lastX:cell.x,lastY:cell.y};this.pixels.set(cell.id,p)}
   const protectedBy=shade.some(h=>Math.abs(h.x-cell.x)<width*.16&&h.y<cell.y+block);
   p.damage+=dt*(protectedBy?.002:.022)*(1-this.cooling*.7)*(1.3-cell.y/height*.6);
   if(!p.free&&p.damage>.14+hash(cell.id*3)*.62&&progress>.08){p.free=true;p.x=cell.x;p.y=cell.y;p.vx=(hash(cell.id+1)-.5)*width*.12;p.vy=height*.02;}
   if(p.free){
    for(const h of hands){const d=Math.hypot(p.x-h.x,p.y-h.y);if(d<block*3){p.vx+=(p.x-h.x)/(d||1)*dt*height*.8;p.vy-=dt*height*.4;}}
    p.vy+=dt*height*.55;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*.35);
   }else{p.lastX=cell.x;p.lastY=cell.y;p.color=cell.color;}
  }
  for(const [id,p]of this.pixels)if(!seen.has(id)&&!p.free)this.pixels.delete(id);
  return this.pixels;
 }
}
