import {clamp,hash,pointToScreen} from './math.js?v=5.6.0';
import {figureDepth} from './glass-model.js?v=5.6.0';

function surface(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return {canvas,ctx:canvas.getContext('2d')};}
function roundedPolygon(ctx,points){ctx.beginPath();const first=points[0],last=points.at(-1);ctx.moveTo((last.x+first.x)/2,(last.y+first.y)/2);for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}ctx.closePath();ctx.fill();}
function fillHandMask(ctx,points,radius){
 if(points?.length!==21)return;ctx.fillStyle='#000';ctx.strokeStyle='#000';ctx.lineCap='round';ctx.lineJoin='round';
 roundedPolygon(ctx,[0,1,2,5,9,13,17].map(i=>points[i]));
 for(const chain of [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]])for(let j=0;j<3;j++){
  const a=points[chain[j]],b=points[chain[j+1]];ctx.lineWidth=radius*(chain[0]===1?.31:.26)*(1-j*.14);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
}
export class GlassSurface{
 constructor(){this.key='';this.mask=null;this.maskStamp=-1;this.sprites=new Map();this.texture=null;}
 resize(width,height){
  const scale=Math.min(1,1440/width),w=Math.ceil(width*scale),h=Math.ceil(height*scale),key=w+':'+h;
  if(this.key===key)return;this.key=key;this.scale=scale;this.back=surface(w,h);this.frost=surface(w,h);this.fogMask=surface(128,Math.max(24,Math.round(128*height/width)));
 }
 personMask(c,pose,hands){
  if(c.demo){
   this.previewMask??=surface(640,480);const ctx=this.previewMask.ctx;ctx.clearRect(0,0,640,480);ctx.save();ctx.scale(640/c.width,480/c.height);ctx.fillStyle='#000';ctx.strokeStyle='#000';ctx.lineCap='round';ctx.lineJoin='round';
   const head=pose[0],a=pose[11],b=pose[12],wa=c.width*.065;
   ctx.beginPath();ctx.ellipse(head.x,head.y+c.height*.018,c.height*.065,c.height*.092,-.06,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.moveTo(a.x,a.y-c.height*.025);ctx.quadraticCurveTo(a.x-wa*.45,a.y+c.height*.22,a.x-wa*.13,c.height+80);ctx.lineTo(b.x+wa*.13,c.height+80);ctx.quadraticCurveTo(b.x+wa*.45,b.y+c.height*.22,b.x,b.y-c.height*.025);ctx.quadraticCurveTo(head.x+c.height*.025,head.y+c.height*.085,head.x,head.y+c.height*.06);ctx.quadraticCurveTo(head.x-c.height*.025,head.y+c.height*.085,a.x,a.y-c.height*.025);ctx.fill();
   ctx.lineWidth=c.height*.066;for(const chain of [[11,13,15],[12,14,16]]){ctx.beginPath();for(let j=0;j<3;j++){const p=pose[chain[j]];j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.stroke();}
   for(const hand of hands)fillHandMask(ctx,hand.landmarks,hand.radius);
   ctx.restore();return {canvas:this.previewMask.canvas,screen:true};
  }
  const mask=c.mask;if(!mask?.data||!mask.width||!mask.height)return null;
  if(this.maskStamp!==mask.timestamp||!this.mask){
   if(this.mask?.canvas.width!==mask.width||this.mask?.canvas.height!==mask.height)this.mask=surface(mask.width,mask.height);
   const pixels=this.mask.ctx.createImageData(mask.width,mask.height);for(let i=0;i<mask.data.length;i++)pixels.data[i*4+3]=mask.data[i]?255:0;
   this.mask.ctx.putImageData(pixels,0,0);this.maskStamp=mask.timestamp;
  }
  return this.mask;
 }
 drawBody(ctx,c,hands){
  const pose=c.pose.map(p=>({...p,...pointToScreen(p,c.g)})),mask=this.personMask(c,pose,hands);if(!mask)return;
  const depth=figureDepth(c.pose,c.height),draw=()=>{
   if(mask.screen){ctx.drawImage(mask.canvas,0,0,c.width,c.height);return;}
   const origin=c.mask.origin,centre={x:(c.pose[11].x+c.pose[12].x)/2,y:(c.pose[11].y+c.pose[12].y)/2},dx=origin?clamp(centre.x-origin.x,-.06,.06):0,dy=origin?clamp(centre.y-origin.y,-.05,.05):0;
   ctx.save();ctx.translate(c.g.x+c.g.width,c.g.y);ctx.scale(-1,1);ctx.drawImage(mask.canvas,dx*c.g.width,dy*c.g.height,c.g.width,c.g.height);ctx.restore();
  };
  ctx.save();ctx.imageSmoothingEnabled=true;const scale=Math.abs(ctx.getTransform().a)||1;
  ctx.filter=`blur(${depth.blur*2.15*scale}px)`;ctx.globalAlpha=depth.opacity*.35;draw();
  ctx.filter=`blur(${depth.blur*scale}px)`;ctx.globalAlpha=depth.opacity*.86;draw();ctx.restore();
 }
 dropSprite(radius){
  const key=Math.round(clamp(radius,.5,10)*2);if(this.sprites.has(key))return this.sprites.get(key);
  const r=key/2,s=surface(Math.ceil(r*5+8),Math.ceil(r*5+8)),ctx=s.ctx,x=s.canvas.width/2,y=s.canvas.height/2;
  ctx.shadowColor='#1b24262b';ctx.shadowBlur=2;ctx.shadowOffsetY=1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#d8dcdf25';ctx.fill();ctx.shadowColor='transparent';
  const light=ctx.createRadialGradient(x-r*.3,y-r*.35,.1,x,y,r);light.addColorStop(0,'#ffffffd0');light.addColorStop(.45,'#ffffff12');light.addColorStop(.82,'#242c3130');light.addColorStop(1,'#fff9');ctx.fillStyle=light;ctx.fill();
  ctx.beginPath();ctx.arc(x-r*.15,y-r*.2,r*.57,3.55,5.2);ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(.5,r*.15);ctx.stroke();this.sprites.set(key,s.canvas);return s.canvas;
 }
 grain(){
  if(this.texture)return this.texture;const s=surface(96,96),p=s.ctx.createImageData(96,96);for(let i=0;i<96*96;i++){const value=hash(i+9)>.5?0:255;p.data[i*4]=p.data[i*4+1]=p.data[i*4+2]=value;p.data[i*4+3]=Math.round(hash(i*5+4)*10);}s.ctx.putImageData(p,0,0);this.texture=s.canvas;return this.texture;
 }
 draw(ctx,c,model,hands,paint){
  const height=c.height;this.resize(c.width,height);const scale=this.scale,back=this.back.ctx,frost=this.frost.ctx;
  back.setTransform(scale,0,0,scale,0,0);back.fillStyle='#fafaf8';back.fillRect(0,0,c.width,height);paint(back);this.drawBody(back,c,hands);
  frost.setTransform(1,0,0,1,0,0);frost.clearRect(0,0,this.frost.canvas.width,this.frost.canvas.height);frost.filter=`blur(${12*scale}px)`;frost.drawImage(this.back.canvas,0,0);frost.filter='none';frost.fillStyle='#fafaf8bb';frost.fillRect(0,0,this.frost.canvas.width,this.frost.canvas.height);
  const mask=this.fogMask.ctx,p=mask.createImageData(model.cols,model.rows);for(let i=0;i<model.fog.length;i++){p.data[i*4]=p.data[i*4+1]=p.data[i*4+2]=255;p.data[i*4+3]=Math.round(model.fog[i]*255);}mask.putImageData(p,0,0);
  frost.globalCompositeOperation='destination-in';frost.imageSmoothingEnabled=true;frost.drawImage(this.fogMask.canvas,0,0,this.frost.canvas.width,this.frost.canvas.height);frost.globalCompositeOperation='source-over';
  ctx.save();ctx.beginPath();ctx.rect(0,0,c.width,height);ctx.clip();ctx.imageSmoothingEnabled=true;ctx.drawImage(this.back.canvas,0,0,c.width,height);ctx.drawImage(this.frost.canvas,0,0,c.width,height);
  ctx.globalAlpha=.65;ctx.fillStyle=ctx.createPattern(this.grain(),'repeat');ctx.fillRect(0,0,c.width,height);ctx.globalAlpha=1;
  for(const d of model.drops){
   const stretch=clamp(1+d.vy/120,1,1.7),r=Math.min(12,d.r),sprite=this.dropSprite(r),w=sprite.width;
   if(d.vy>12){ctx.strokeStyle='#fff7';ctx.lineWidth=Math.max(.6,r*.2);ctx.beginPath();ctx.moveTo(d.x,d.y-Math.min(25,d.vy*.4));ctx.lineTo(d.x,d.y);ctx.stroke();}
   if(r>3.5){ctx.save();ctx.beginPath();ctx.ellipse(d.x,d.y,r*.9,r*stretch,0,0,Math.PI*2);ctx.clip();const sx=clamp((d.x-r-2)*scale,0,this.back.canvas.width-r*2*scale),sy=clamp((d.y-r-3)*scale,0,this.back.canvas.height-r*2*scale);ctx.drawImage(this.back.canvas,sx,sy,r*2*scale,r*2*scale,d.x-r,d.y-r*stretch,r*2,r*2*stretch);ctx.restore();}
   ctx.drawImage(sprite,d.x-w/2,d.y-w*stretch/2,w,w*stretch);
  }
  ctx.restore();
 }
}
