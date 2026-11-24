import {clamp,lerp} from './math.js?v=5.4.0';
import {shadeAt} from './scene-models.js?v=5.4.0';

const palette=[[8,10,42],[35,28,132],[109,17,167],[199,23,106],[245,66,33],[255,157,31],[255,231,114],[255,253,226]];
// RGB luminance drives an artistic false-colour palette, never measured temperature.
export function thermalRgb(rgb=[100,100,100],heat=0){
 const luma=(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255,t=clamp(.08+luma*.73+heat*.18)*(palette.length-1),i=Math.min(palette.length-2,Math.floor(t));
 return palette[i].map((v,c)=>Math.round(lerp(v,palette[i+1][c],t-i)));
}
export function thermalColor(rgb,heat){return `rgb(${thermalRgb(rgb,heat).join(',')})`;}
export function heatSample(x,y,time,{width,height,depth,occluders=[]}){
 const light=clamp((depth-y)/Math.max(80,depth*.44)),shade=shadeAt({x,y},occluders,width,height),amount=light*(1-shade);
 const wave=Math.sin(y*.037-time*2.2+Math.sin(x*.008+time*.6))* .65+Math.sin(y*.083+x*.013-time*3.1)*.35;
 return {amount,shade,dx:amount?wave*5.2*amount:0,dy:amount?Math.sin(x*.016+y*.024-time*1.8)*2.6*amount:0,scale:1+(.045+.035*Math.sin(y*.021-time*1.4))*amount};
}

function layer(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return {canvas,ctx:canvas.getContext('2d')};}
// One cached text layer, smooth strip displacement, then one blur/composite pass.
// The cold mask is rebuilt from this frame's arms: shade clears distortion immediately.
export class HeatHaze{
 constructor(){this.key='';}
 draw(ctx,{width,height,viewportHeight=height,time,depth,occluders,paint}){
  const scale=Math.min(1,1440/width),w=Math.ceil(width*scale),h=Math.ceil(height*scale),key=[w,h].join(':');
  if(this.key!==key){this.key=key;this.clean=layer(w,h);this.warp=layer(w,h);this.hot=layer(w,h);this.cold=layer(w,h);this.mask=layer(Math.ceil(w/20),Math.ceil(h/14));this.shadow=layer(this.mask.canvas.width,this.mask.canvas.height);}
  const options={width,height:viewportHeight,depth,occluders},clean=this.clean.ctx,warp=this.warp.ctx,mask=this.mask.ctx;
  clean.setTransform(scale,0,0,scale,0,0);clean.clearRect(0,0,width,height);paint(clean);
  warp.clearRect(0,0,w,h);warp.imageSmoothingEnabled=true;
  const tileW=72,tileH=7;
  for(let y=0;y<h;y+=tileH)for(let x=0;x<w;x+=tileW){
   const sample=heatSample((x+tileW/2)/scale,(y+tileH/2)/scale,time,options),sw=Math.min(tileW+.8,w-x),sh=Math.min(tileH+.5,h-y);
   warp.drawImage(this.clean.canvas,x,y,sw,sh,x+sample.dx*scale-(sample.scale-1)*sw/2,y+sample.dy*scale,sw*sample.scale,sh*sample.scale);
  }
  // A coarse smooth alpha field is sufficient; the large mosaic uses the same shadeAt.
  mask.clearRect(0,0,this.mask.canvas.width,this.mask.canvas.height);this.shadow.ctx.clearRect(0,0,this.mask.canvas.width,this.mask.canvas.height);
  for(let y=0;y<this.mask.canvas.height;y++)for(let x=0;x<this.mask.canvas.width;x++){
   const {amount,shade}=heatSample((x+.5)*width/this.mask.canvas.width,(y+.5)*height/this.mask.canvas.height,time,options);
   mask.fillStyle=`rgba(255,255,255,${amount})`;mask.fillRect(x,y,1,1);
   this.shadow.ctx.fillStyle=`rgba(0,0,0,${shade*.87})`;this.shadow.ctx.fillRect(x,y,1,1);
  }
  const hot=this.hot.ctx,cold=this.cold.ctx;
  for(const c of [hot,cold]){c.globalCompositeOperation='source-over';c.clearRect(0,0,w,h);c.imageSmoothingEnabled=true;}
  if('filter' in hot){hot.filter='blur(.75px)';hot.drawImage(this.warp.canvas,0,0);hot.filter='none';}
  else{hot.globalAlpha=.6;hot.drawImage(this.warp.canvas,-.6,0);hot.globalAlpha=.4;hot.drawImage(this.warp.canvas,.6,0);hot.globalAlpha=1;}
  hot.globalCompositeOperation='destination-in';hot.drawImage(this.mask.canvas,0,0,w,h);
  cold.drawImage(this.clean.canvas,0,0);cold.globalCompositeOperation='destination-out';cold.drawImage(this.mask.canvas,0,0,w,h);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(this.shadow.canvas,0,0,width,height);ctx.drawImage(this.cold.canvas,0,0,width,height);ctx.drawImage(this.hot.canvas,0,0,width,height);ctx.restore();
 }
}
