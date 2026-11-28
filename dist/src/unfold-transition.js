import {clamp,lerp} from './math.js?v=5.10.1';
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
const wrap=angle=>((angle+180)%360+360)%360-180;
const near=(from,to)=>to+360*Math.round((from-to)/360);
export function netScale(width,height,size){return Math.min(.74,width/(3.65*size),height/(4.7*size));}
export function previewSize(width,height,size){return width>=height?{width:size,height:size*height/width}:{width:size*width/height,height:size};}
export function approachDepth(width,height,size,scale,perspective=1200){const magnification=Math.max(width,height)/size;return perspective+size/2-perspective*scale/magnification;}

export class UnfoldTransition{
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.cancel();}
 get durations(){return this.reducedMotion?{lid:.14,spread:.2,settle:.08,advance:.22}:{lid:.85,spread:1.65,settle:.25,advance:1.2};}
 start(scene,{width,height,size,pitch=-18,yaw=-28,roll=-7}){
  if(this.scene)return false;this.scene=scene;this.elapsed=0;this.origin={pitch:wrap(pitch),yaw:wrap(yaw),roll:wrap(roll)};this.resize(width,height,size);return true;
 }
 resize(width,height,size){this.width=width;this.height=height;this.size=size;this.scale=netScale(width,height,size);this.depth=approachDepth(width,height,size,this.scale);}
 cancel(){this.scene=null;this.elapsed=0;}
 update(dt){
  if(!this.scene)return null;if(Number.isFinite(dt)&&dt>0)this.elapsed+=dt;
  const d=this.durations,t=this.elapsed,open=ease(t/d.lid),spreadTime=t-d.lid;
  const stagger=(delay)=>ease((spreadTime/d.spread-delay)/(1-delay));
  const unfolding=ease(Math.max(0,spreadTime)/d.spread),scale=lerp(1,this.scale,ease(t/(d.lid+d.spread))),settled=t>=d.lid+d.spread;
  const progress=clamp((t-d.lid-d.spread-d.settle)/d.advance),flight=ease(progress),done=progress===1;
  const stagePitch=near(this.origin.pitch,-15),stageYaw=near(this.origin.yaw,18),stageRoll=near(this.origin.roll,-4);
  const frame={phase:t<d.lid?'lid':!settled?'spread':progress===0?'settle':done?'done':'advance',
   lid:-90*(1-open),left:90*(1-stagger(0)),right:-90*(1-stagger(.15)),bottom:90*(1-stagger(.3)),top:-90*(1-stagger(.45)),
   pitch:lerp(lerp(this.origin.pitch,stagePitch,open),near(stagePitch,0),flight),yaw:lerp(lerp(this.origin.yaw,stageYaw,open),near(stageYaw,0),flight),roll:lerp(lerp(this.origin.roll,stageRoll,open),near(stageRoll,0),flight),
   scale,y:this.size*.5*scale*unfolding*(1-flight),depth:0,edge:1-flight,progress,done};
  if(progress>0){
   // Dolly the connected net as one piece until its central reading image fills the screen.
   const start=scale*1200/(1200+this.size/2),target=Math.max(this.width,this.height)/this.size,magnification=Math.exp(lerp(Math.log(start),Math.log(target),flight));
   frame.depth=1200+this.size/2-1200*scale/magnification;
  }
  if(done)this.scene=null;return frame;
 }
}
