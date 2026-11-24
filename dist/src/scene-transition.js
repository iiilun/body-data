import {clamp} from './math.js?v=5.4.1';

const smooth=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
// Scale the projected cube beyond the viewport diagonal, including edge-on orientations.
export const cubeCoverScale=(width,height,size)=>Math.max(2,Math.hypot(width,height)*2.4/Math.max(1,size));

export class SceneTransition{
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.cancel();}
 get durations(){return this.reducedMotion?{expand:.16,black:.08,reveal:.2}:{expand:1.15,black:.2,reveal:1.2};}
 start(scene,{width,height,size}){
  if(this.scene)return false;
  this.scene=scene;this.elapsed=0;this.cover=cubeCoverScale(width,height,size);return true;
 }
 resize(width,height,size){this.cover=cubeCoverScale(width,height,size);}
 cancel(){this.scene=null;this.elapsed=0;this.cover=1;}
 update(dt){
  if(!this.scene)return null;
  if(Number.isFinite(dt)&&dt>0)this.elapsed+=dt;
  const {expand,black,reveal}=this.durations,t=this.elapsed;
  if(t<expand){const p=clamp(t/expand);return {phase:'expand',zoom:Math.exp(Math.log(this.cover)*smooth(p)),shade:smooth((p-.54)/.46),briefScale:1.45,done:false};}
  if(t<expand+black)return {phase:'black',zoom:this.cover,shade:1,briefScale:1.45,done:false};
  const p=clamp((t-expand-black)/reveal),eased=smooth(p),done=t>=expand+black+reveal;
  const frame={phase:done?'done':'reveal',zoom:this.cover,shade:1-smooth(p/.82),briefScale:1.45-.45*eased,done};
  if(done)this.scene=null;return frame;
 }
}
