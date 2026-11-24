import {clamp} from './math.js?v=5.4.2';

const smooth=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function projectedCubeHull(size,{pitch=-18,yaw=-28,roll=-7}={}){
 const [rx,ry,rz]=[pitch,yaw,roll].map(n=>n*Math.PI/180),points=[];
 for(const x of [-size/2,size/2])for(const y of [-size/2,size/2])for(const z of [-size/2,size/2]){
  const a=x*Math.cos(ry)+z*Math.sin(ry),b=-x*Math.sin(ry)+z*Math.cos(ry);
  const c=y*Math.cos(rx)-b*Math.sin(rx),depth=y*Math.sin(rx)+b*Math.cos(rx),p=1200/(1200-depth);
  points.push({x:(a*Math.cos(rz)-c*Math.sin(rz))*p,y:(a*Math.sin(rz)+c*Math.cos(rz))*p});
 }
 points.sort((a,b)=>a.x-b.x||a.y-b.y);const lower=[],upper=[];
 for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of [...points].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
export function viewportCovered(width,height,hull,zoom){
 return [-1,1].every(x=>[-1,1].every(y=>{
  const point={x:x*width/(2*zoom),y:y*height/(2*zoom)};
  return hull.every((a,i)=>cross(a,hull[(i+1)%hull.length],point)>=-1e-7);
 }));
}
// Solve actual projected corner coverage, then keep a small margin for antialiased edges.
export function cubeCoverScale(width,height,size,orientation){
 const hull=projectedCubeHull(Math.max(1,size),orientation);let low=1,high=256;
 for(let i=0;i<32;i++){const mid=(low+high)/2;if(viewportCovered(width,height,hull,mid))high=mid;else low=mid;}
 return high*1.04;
}
// Repaint vector glyphs at these resolution steps; the compositor only moves between them.
export const cubeRasterDetail=zoom=>Math.min(8,Math.max(2,2**Math.ceil(Math.log2(Math.max(1,zoom)))));

export class SceneTransition{
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.cancel();}
 get durations(){return this.reducedMotion?{expand:.16,black:.1,reveal:.2}:{expand:1.65,black:.2,reveal:1.3};}
 start(scene,{width,height,size,...orientation}){
  if(this.scene)return false;
  this.scene=scene;this.elapsed=0;this.orientation=orientation;this.resize(width,height,size);return true;
 }
 resize(width,height,size){this.size=size;this.minimumCover=cubeCoverScale(width,height,size,this.orientation);this.cover=Math.max(this.minimumCover*4,Math.hypot(width,height)*4.2/Math.max(1,size));}
 cancel(){this.scene=null;this.elapsed=0;this.cover=1;}
 update(dt){
  if(!this.scene)return null;
  if(Number.isFinite(dt)&&dt>0)this.elapsed+=dt;
  const {expand,black,reveal}=this.durations,t=this.elapsed;
  if(t<expand){
   const p=clamp(t/expand),zoom=Math.exp(Math.log(this.cover)*smooth(p)),fadeStart=Math.max(this.minimumCover*1.35,this.cover*.38);
   return {phase:'expand',zoom,shade:smooth(Math.log(zoom/fadeStart)/Math.log(this.cover*.985/fadeStart)),briefScale:1.45,done:false};
  }
  if(t<expand+black)return {phase:'black',zoom:this.cover,shade:1,briefScale:1.45,done:false};
  const p=clamp((t-expand-black)/reveal),eased=smooth(p),done=t>=expand+black+reveal;
  const frame={phase:done?'done':'reveal',zoom:this.cover,shade:1-smooth(p/.82),briefScale:1.45-.45*eased,done};
  if(done)this.scene=null;return frame;
 }
}
