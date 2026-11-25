import {clamp} from './math.js?v=5.6.3';
import {artworkGeometry} from './visual-system.js?v=5.6.3';
import {TemporalSilhouette} from './temporal-silhouette.js?v=5.6.3';
import {maskContours,strokeContours} from './person-contour.js?v=5.6.3';
export const alignmentStyle=ready=>({color:ready?'#35ef86':'#fff',width:ready?20:12});
export const blendedAlignmentStyle=blend=>({color:`rgb(${Math.round(255-202*blend)},${Math.round(255-16*blend)},${Math.round(255-121*blend)})`,width:12+8*blend});
export function freshPersonMask(mask,now){return !!mask?.data&&mask.width>0&&mask.height>0&&Number.isFinite(mask.timestamp)&&now>=mask.timestamp&&now-mask.timestamp<700&&(mask.hasPerson??mask.data.some(v=>v>0));}
export class CameraAlignment{
 constructor(){
  this.preview=new Image();this.preview.src='./assets/alignment-preview.jpg';this.reset();
  fetch('./assets/alignment-mask.json?v=5.6.3').then(r=>r.ok?r.json():null).then(m=>{if(m)this.previewMask={...m,data:Uint8Array.from(atob(m.bytes),c=>c.charCodeAt(0))};}).catch(()=>{});
 }
 reset(){this.stamp=null;this.contours=[];this.silhouette=new TemporalSilhouette();this.readyMix=0;this.offsetX=0;this.offsetY=0;this.lastTrace=-Infinity;}
 draw(ctx,c){
  const source=c.demo?this.preview:c.video,g=c.demo&&this.preview.naturalWidth?artworkGeometry(c.width,c.height,this.preview.naturalWidth/this.preview.naturalHeight):c.g;
  if(c.demo&&this.previewMask?.pose?.[0])g.y=Math.max(c.height-g.height,Math.min(0,c.height*.23-this.previewMask.pose[0].y*g.height));ctx.save();ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#111';ctx.fillRect(0,0,c.width,c.height);
  if(source&&(c.demo?source.complete&&source.naturalWidth>0:source.readyState>=2)){
   ctx.save();ctx.filter='none';ctx.translate(g.x+g.width,g.y);ctx.scale(-1,1);ctx.drawImage(source,0,0,g.width,g.height);ctx.restore();
  }
  // Desaturate the camera itself; Canvas filters are not applied consistently by every browser.
  ctx.save();ctx.filter='none';ctx.globalCompositeOperation='saturation';ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);
  ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(0,0,c.width,c.height);ctx.restore();
  this.silhouette??=new TemporalSilhouette();this.readyMix??=0;this.offsetX??=0;this.offsetY??=0;this.lastTrace??=-Infinity;
  const mask=c.demo?this.previewMask:c.mask,now=(c.now??(Number.isFinite(c.time)?c.time*1000:0))/1000,dt=c.dt??1/60;
  if(mask?.data&&(c.demo||Number.isFinite(mask.timestamp)&&now*1000-mask.timestamp<700)){
   const stamp=c.demo?'preview':mask.timestamp;if(stamp!==this.stamp){this.stamp=stamp;this.silhouette.setMask(mask,now);}
   if(c.demo)this.silhouette.keepAlive(now);
  }
  if(this.silhouette.step(dt,now)&&(now-this.lastTrace>=1/30||!this.contours.length)){
   this.contours=maskContours(this.silhouette.field,this.silhouette.width,this.silhouette.height).sort((a,b)=>area(b)-area(a)).slice(0,1);this.lastTrace=now;this.silhouette.dirty=false;
  }
  const a=c.pose?.[11],b=c.pose?.[12],origin=mask?.origin,follow=1-Math.exp(-dt*14);
  const targetX=!c.demo&&origin&&a&&b?clamp((a.x+b.x)/2-origin.x,-.05,.05):0,targetY=!c.demo&&origin&&a&&b?clamp((a.y+b.y)/2-origin.y,-.05,.05):0;
  this.offsetX+=(targetX-this.offsetX)*follow;this.offsetY+=(targetY-this.offsetY)*follow;
  this.readyMix+=((c.alignment?.ready?1:0)-this.readyMix)*(1-Math.exp(-dt/.12));
  const visibility=this.silhouette.visibility(now);if(visibility>0){ctx.globalAlpha=visibility;strokeContours(ctx,this.contours,g,{...blendedAlignmentStyle(this.readyMix),offsetX:this.offsetX,offsetY:this.offsetY});}
  ctx.restore();
 }
}
function area(points){let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a.x*b.y-b.x*a.y;}return Math.abs(sum);}
