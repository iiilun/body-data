const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function sample(data,w,h,x,y){
 if(x<0||y<0||x>w-1||y>h-1)return 0;
 const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),a=x-x0,b=y-y0;
 return data[y0*w+x0]*(1-a)*(1-b)+data[y0*w+x1]*a*(1-b)+data[y1*w+x0]*(1-a)*b+data[y1*w+x1]*a*b;
}
export class TemporalSilhouette{
 constructor(){this.reset();}
 reset(){this.field=null;this.target=null;this.width=0;this.height=0;this.lastSeen=-Infinity;this.origin=null;this.dirty=false;}
 setMask(mask,now){
  if(!mask?.data||!mask.width||!mask.height||!(mask.hasPerson??mask.data.some(v=>v>0)))return false;
  const w=Math.min(320,mask.width),h=Math.max(2,Math.round(w*mask.height/mask.width)),fresh=!this.field||this.width!==w||this.height!==h||now-this.lastSeen>.45;
  if(fresh){this.width=w;this.height=h;this.field=new Float32Array(w*h);this.target=new Float32Array(w*h);this.temp=new Float32Array(w*h);this.shift=new Float32Array(w*h);}
  const sx=mask.width/w,sy=mask.height/h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)this.target[y*w+x]=sample(mask.data,mask.width,mask.height,(x+.5)*sx-.5,(y+.5)*sy-.5);
  const weights=[1,4,6,4,1];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-2;k<=2;k++)v+=this.target[y*w+clamp(x+k,0,w-1)]*weights[k+2];this.temp[y*w+x]=v/16;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-2;k<=2;k++)v+=this.temp[clamp(y+k,0,h-1)*w+x]*weights[k+2];this.target[y*w+x]=v/16;}
  if(fresh)this.field.set(this.target);
  else if(mask.origin&&this.origin){
   const dx=mask.origin.x-this.origin.x,dy=mask.origin.y-this.origin.y,distance=Math.hypot(dx,dy);
   if(distance>.18)this.field.set(this.target);
   else if(distance>.003){const t=clamp((distance-.003)/.022,0,1),gain=t*t*(3-2*t);for(let y=0;y<h;y++)for(let x=0;x<w;x++)this.shift[y*w+x]=sample(this.field,w,h,x-dx*w*gain,y-dy*h*gain);this.field.set(this.shift);}
  }
  this.origin=mask.origin?{...mask.origin}:null;this.lastSeen=now;this.dirty=true;return true;
 }
 keepAlive(now){if(this.field)this.lastSeen=now;}
 step(dt,now){
  if(!this.field||now-this.lastSeen>.45)return false;
  const alpha=1-Math.exp(-clamp(dt,0,.1)/.115);let changed=false;
  for(let i=0;i<this.field.length;i++){const difference=this.target[i]-this.field[i];if(Math.abs(difference)>.025){const delta=difference*alpha;this.field[i]+=delta;if(Math.abs(delta)>.0005)changed=true;}}
  this.dirty||=changed;return this.dirty;
 }
 visibility(now){return this.field?clamp(1-(now-this.lastSeen-.24)/.18,0,1):0;}
}
