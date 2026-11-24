import {clamp} from './math.js?v=5.5.0';

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

export function projectFacePoint(size,face,u,v,orientation={}){
 const a=(u-.5)*size,b=(v-.5)*size,h=size/2;
 const positions=[[a,b,h],[-a,b,-h],[h,b,-a],[-h,b,a],[a,-h,b],[a,h,-b]];
 let [x,y,z]=positions[face]||positions[0];const [rx,ry,rz]=[orientation.pitch??-18,orientation.yaw??-28,orientation.roll??-7].map(n=>n*Math.PI/180);
 const ax=x*Math.cos(ry)+z*Math.sin(ry),az=-x*Math.sin(ry)+z*Math.cos(ry),by=y*Math.cos(rx)-az*Math.sin(rx),bz=y*Math.sin(rx)+az*Math.cos(rx),perspective=1200/(1200-bz);
 return {x:(ax*Math.cos(rz)-by*Math.sin(rz))*perspective,y:(ax*Math.sin(rz)+by*Math.cos(rz))*perspective};
}
export function blackWindow(size,face,aperture,orientation){
 const {u,v,w,h}=aperture,centre=projectFacePoint(size,face,u+w/2,v+h/2,orientation);
 const points=[[u,v],[u+w,v],[u+w,v+h],[u,v+h]].map(([x,y])=>{const p=projectFacePoint(size,face,x,y,orientation);return {x:p.x-centre.x,y:p.y-centre.y};});
 if(cross(points[0],points[1],points[2])<0)points.reverse();return {centre,points};
}
export function windowCover(width,height,points){
 let low=1,high=2**24;for(let i=0;i<48;i++){const mid=(low+high)/2;if(viewportCovered(width,height,points,mid))high=mid;else low=mid;}return high*1.12;
}
export function rectanglePortal(rect,width,height){return {x:rect.x+rect.width/2-width/2,y:rect.y+rect.height/2-height/2,zoom:Math.max(width/rect.width,height/rect.height)*1.15};}

export class SceneTransition{
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.cancel();}
 get durations(){return this.reducedMotion?{expand:.22,black:.08,reveal:.25}:{expand:1.9,black:.22,reveal:1.5};}
 start(scene,{width,height,size,face=0,aperture={u:.47,v:.47,w:.06,h:.06},...orientation}){
  if(this.scene)return false;this.scene=scene;this.elapsed=0;this.orientation=orientation;this.face=face;this.aperture=aperture;this.reveal={x:0,y:0,zoom:30};this.resize(width,height,size);return true;
 }
 resize(width,height,size){
  this.size=size;const window=blackWindow(size,this.face,this.aperture,this.orientation);this.focus=window.centre;this.window=window.points;this.cover=windowCover(width,height,this.window);
 }
 setReveal(portal){this.reveal=portal;}
 cancel(){this.scene=null;this.elapsed=0;this.cover=1;this.reveal={x:0,y:0,zoom:30};}
 update(dt){
  if(!this.scene)return null;if(Number.isFinite(dt)&&dt>0)this.elapsed+=dt;
  const {expand,black,reveal}=this.durations,t=this.elapsed;
  if(t<expand){const p=clamp(t/expand),zoom=Math.exp(Math.log(this.cover)*smooth(p)),focus=smooth(p/ .72);return {phase:'expand',zoom,x:-this.focus.x*zoom*focus,y:-this.focus.y*zoom*focus,briefScale:this.reveal.zoom,briefX:-this.reveal.x*this.reveal.zoom,briefY:-this.reveal.y*this.reveal.zoom,done:false};}
  if(t<expand+black)return {phase:'black',zoom:this.cover,x:-this.focus.x*this.cover,y:-this.focus.y*this.cover,briefScale:this.reveal.zoom,briefX:-this.reveal.x*this.reveal.zoom,briefY:-this.reveal.y*this.reveal.zoom,done:false};
  const p=clamp((t-expand-black)/reveal),eased=smooth(p),zoom=Math.exp(Math.log(this.reveal.zoom)*(1-eased)),done=t>=expand+black+reveal;
  const frame={phase:done?'done':'reveal',zoom:this.cover,x:-this.focus.x*this.cover,y:-this.focus.y*this.cover,briefScale:zoom,briefX:-this.reveal.x*zoom*(1-eased),briefY:-this.reveal.y*zoom*(1-eased),done};
  if(done)this.scene=null;return frame;
 }
}
