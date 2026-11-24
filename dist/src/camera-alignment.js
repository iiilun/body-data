import {clamp} from './math.js?v=5.5.0';
import {artworkGeometry} from './visual-system.js?v=5.5.0';
import {maskContours,strokeContours} from './person-contour.js?v=5.5.0';
export const alignmentStyle=ready=>({color:ready?'#35ef86':'#fff',width:ready?7:2.8});
export function freshPersonMask(mask,now){return !!mask?.data&&mask.width>0&&mask.height>0&&Number.isFinite(mask.timestamp)&&now>=mask.timestamp&&now-mask.timestamp<700&&(mask.hasPerson??mask.data.some(v=>v>0));}
export class CameraAlignment{
 constructor(){
  this.preview=new Image();this.preview.src='./assets/alignment-preview.jpg';this.stamp=null;this.contours=[];
  fetch('./assets/alignment-mask.json?v=5.5.0').then(r=>r.ok?r.json():null).then(m=>{if(m)this.previewMask={...m,data:Uint8Array.from(atob(m.bytes),c=>c.charCodeAt(0))};}).catch(()=>{});
 }
 draw(ctx,c){
  const source=c.demo?this.preview:c.video,g=c.demo&&this.preview.naturalWidth?artworkGeometry(c.width,c.height,this.preview.naturalWidth/this.preview.naturalHeight):c.g;
  if(c.demo&&this.previewMask?.pose?.[0])g.y=Math.max(c.height-g.height,Math.min(0,c.height*.23-this.previewMask.pose[0].y*g.height));ctx.save();ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#111';ctx.fillRect(0,0,c.width,c.height);
  if(source&&(c.demo?source.complete&&source.naturalWidth>0:source.readyState>=2)){
   ctx.save();ctx.filter='grayscale(1) brightness(.76) contrast(1.04)';ctx.translate(g.x+g.width,g.y);ctx.scale(-1,1);ctx.drawImage(source,0,0,g.width,g.height);ctx.restore();
  }
  const mask=c.demo?this.previewMask:c.mask;
  if(mask?.data&&(c.demo||c.present)){
   const stamp=c.demo?'preview':mask.timestamp;
   if(stamp!==this.stamp){this.stamp=stamp;this.contours=maskContours(mask.data,mask.width,mask.height).sort((a,b)=>area(b)-area(a)).slice(0,1);}
   const a=c.pose?.[11],b=c.pose?.[12],origin=mask.origin;
   const offsetX=!c.demo&&origin&&a&&b?clamp((a.x+b.x)/2-origin.x,-.05,.05):0,offsetY=!c.demo&&origin&&a&&b?clamp((a.y+b.y)/2-origin.y,-.05,.05):0;
   strokeContours(ctx,this.contours,g,{...alignmentStyle(!!c.alignment?.ready),offsetX,offsetY});
  }
  ctx.restore();
 }
}
function area(points){let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a.x*b.y-b.x*a.y;}return Math.abs(sum);}
