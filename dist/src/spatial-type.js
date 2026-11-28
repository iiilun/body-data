import {clamp} from './math.js?v=5.10.1';

export function factText(card){return `${String(card.value).replace(/\s/g,'\u00a0')} ${card.fieldLabel||card.label} · ${card.scope} ${card.yearText||card.year}`;}
export const BACKGROUND_TRACKING=-.055;
export function backgroundType(height){const font=clamp(height*.032,20,31);return {font,row:font*.98,tracking:BACKGROUND_TRACKING};}
export function spaceType(height){const font=clamp(height*.017,12,18);return {font,row:font*.98,tracking:BACKGROUND_TRACKING};}
function textUnits(text){return /[\u0600-\u06ff]/.test(text)?text.match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]/gu):[...text];}
function blockedRanges(cells,top,bottom,block,width,padding){
 const rows=cells.filter(c=>c.y+block*.5>top&&c.y-block*.5<bottom).map(c=>[clamp(c.x-block*.5-padding,0,width),clamp(c.x+block*.5+padding,0,width)]).sort((a,b)=>a[0]-b[0]);
 const merged=[];for(const r of rows){if(r[1]<=r[0])continue;const last=merged.at(-1);if(last&&r[0]<=last[1]+3)last[1]=Math.max(last[1],r[1]);else merged.push(r);}return merged;
}
// SPACE keeps material positions independent of the current obstacle topology.
// Moving a body changes a displacement target, never a visible glyph position.
function mergeRanges(ranges){
 const merged=[];
 for(const range of ranges.sort((a,b)=>a[0]-b[0])){const last=merged.at(-1);if(last&&range[0]<=last[1]+.5)last[1]=Math.max(last[1],range[1]);else merged.push(range.slice());}
 return merged;
}
function displacedX(raw,span,ranges,removed){
 let x=raw-removed*.5;
 for(const [a,b]of ranges)if(x+span>a)x+=b-a;
 return x;
}
export class SilhouetteType{
 constructor(){this.items=[];this.rows=[];this.key='';this.time=0;}
 build(width,height,font,row,cards,measure){
  const key=[width,height,font,cards.map(factText).join('|')].join(':');if(key===this.key)return;
  this.key=key;this.items=[];this.rows=[];this.width=width;this.height=height;this.font=font;this.row=row;this.time=0;if(!cards.length)return;
  for(let y=12,line=0;y<height-38;y+=row,line++){
   const ordered=cards.map((_,i)=>cards[(i+line*3)%cards.length]);
   const units=textUnits(ordered.map(factText).join(' / ')+' / ');
   const lane={items:[],clusters:[],y,drawY:y,vy:0,index:line,drift:0,ranges:[]};let x=-width*.8,index=0;
   while(x<width*1.8){const char=units[index++%units.length],advance=Math.max(font*.2,measure(char));const glyph={char,width:advance,baseX:x,x,y,drawX:x,drawY:y,vx:0,vy:0,active:true,alpha:1,wrapped:false};lane.items.push(glyph);this.items.push(glyph);x+=advance+font*BACKGROUND_TRACKING;}
   // A figure such as 1.16B or 41.46% moves as one small group; descriptive
   // letters remain fine-grained, so an entire fact never jumps as one block.
   for(let n=0;n<lane.items.length;){
    let end=n+1;const g=lane.items[n],previous=lane.items[n-1];
    if(/[≈0-9٠-٩]/.test(g.char[0])&&(!previous||/\s/.test(previous.char))){while(end<lane.items.length&&(!/\s/.test(lane.items[end].char)||lane.items[end].char==='\u00a0'))end++;g.atomicWidth=measure(lane.items.slice(n,end).map(v=>v.char).join(''));}
    const members=lane.items.slice(n,end),last=members.at(-1),span=Math.max(last.baseX+last.width-g.baseX,g.atomicWidth||0);
    lane.clusters.push({items:members,baseX:g.baseX,width:span,cycle:0,offset:0,targetOffset:0,velocity:0});n=end;
   }
   lane.period=x+width*.8;this.rows.push(lane);
  }
 }
 update(dt,cells,block,width,hands,progress){
  dt=Number.isFinite(dt)?clamp(dt,0,.1):0;this.time+=dt;
  const blockers=[...cells,...hands.map(h=>({x:h.x,y:h.y}))],edgeBlend=1-Math.exp(-dt/.26),releaseBlend=1-Math.exp(-dt/.48);
  const omega=6.2,decay=Math.exp(-omega*dt),maxSpeed=clamp(width*.28,160,360),margin=Math.max(this.font*6,width*.10),targetAttack=1-Math.exp(-dt/.22),targetRelease=1-Math.exp(-dt/.40);
  for(const lane of this.rows){
   lane.drift+=dt*(9+lane.index%4*2)*(lane.index%2?-1:1);
   const next=blockedRanges(blockers,lane.y,lane.y+this.font*.94,block,width,10+progress*5+this.font*.28),unused=new Set(lane.ranges);
   const ranges=next.map(([a,b])=>{
    const centre=(a+b)/2;let match=null,distance=Infinity;
    for(const candidate of unused){const d=Math.abs((candidate[0]+candidate[1])/2-centre);if(d<distance&&d<Math.max(block*4,(b-a)*.9)){distance=d;match=candidate;}}
    if(match)unused.delete(match);const from=match||[centre,centre];return [from[0]+(a-from[0])*edgeBlend,from[1]+(b-from[1])*edgeBlend];
   });
   for(const [a,b]of unused){const centre=(a+b)/2,left=a+(centre-a)*releaseBlend,right=b+(centre-b)*releaseBlend;if(right-left>.5)ranges.push([left,right]);}
   lane.ranges=mergeRanges(ranges);const removed=lane.ranges.reduce((n,[a,b])=>n+b-a,0);
   const targetY=lane.y+Math.sin(this.time*.42+lane.index*.26)*1.7,yError=lane.drawY-targetY,yC=lane.vy+omega*yError;
   lane.drawY=targetY+(yError+yC*dt)*decay;lane.vy=(lane.vy-omega*yC*dt)*decay;
   let recycled=false;
   for(const cluster of lane.clusters){
    let raw=cluster.baseX+lane.drift+cluster.cycle*lane.period,physical=raw+cluster.offset;cluster.wrapped=false;
    // Recycling is allowed only when both source and destination are safely
    // outside the view. A body or a merging range cannot trigger a teleport.
    if(raw>width*1.8&&physical>width+margin&&physical-lane.period+cluster.width<-margin){cluster.cycle--;raw-=lane.period;cluster.wrapped=true;}
    else if(raw+cluster.width<-width*.8&&physical+cluster.width<-margin&&physical+lane.period>width+margin){cluster.cycle++;raw+=lane.period;cluster.wrapped=true;}
    cluster.raw=raw;recycled ||=cluster.wrapped;
   }
   if(recycled)lane.clusters.sort((a,b)=>a.raw-b.raw);
   let previousEnd=-Infinity;
   for(const cluster of lane.clusters){
    const raw=cluster.raw;let target=Math.max(displacedX(raw,cluster.width,lane.ranges,removed),previousEnd+this.font*BACKGROUND_TRACKING);
    for(const [a,b]of lane.ranges)if(target+cluster.width>a&&target<b)target=b;
    previousEnd=target+cluster.width;
    const desired=target-raw,soften=Math.abs(desired)<Math.abs(cluster.targetOffset)?targetRelease:targetAttack;
    cluster.targetOffset+=(desired-cluster.targetOffset)*soften;
    const error=cluster.offset-cluster.targetOffset,c=cluster.velocity+omega*error,nextOffset=cluster.targetOffset+(error+c*dt)*decay,nextVelocity=(cluster.velocity-omega*c*dt)*decay;
    const distance=nextOffset-cluster.offset,movement=clamp(distance,-maxSpeed*dt,maxSpeed*dt);
    cluster.offset+=movement;cluster.velocity=Math.abs(movement-distance)>1e-7&&dt>0?movement/dt:clamp(nextVelocity,-maxSpeed,maxSpeed);
    for(const g of cluster.items){g.x=raw+(g.baseX-cluster.baseX)+cluster.offset;g.y=lane.drawY;g.drawX=g.x;g.drawY=g.y;g.vx=cluster.velocity;g.vy=lane.vy;g.wrapped=cluster.wrapped;}
   }
  }
 }
}

// Background facts use the same size and baseline. Movement changes, observations do not.
export class DataFlow{
 constructor(){this.key='';this.lanes=[];this.atlases=new Map();}
 build(width,height,font,cards,measure){
  const key=[width,height,font,cards.map(factText).join('|')].join(':');if(key===this.key)return;this.key=key;this.lanes=[];this.atlases.clear();if(!cards.length)return;
  const row=font*.98;
  for(let y=12,index=0;y<height-38;y+=row,index++){
   const ordered=cards.map((_,i)=>cards[(i+index*3)%cards.length]),rtl=ordered.some(card=>/[\u0600-\u06ff]/.test(factText(card))),units=rtl?ordered.map(card=>factText(card)+' / '):textUnits(ordered.map(factText).join(' / ')+' / ');
   const items=[];let x=0,n=0;
   while(x<width*2.25){const char=units[n++%units.length],advance=Math.max(font*.2,measure(char));items.push({char,x,width:advance});x+=advance+font*BACKGROUND_TRACKING;}
   this.lanes.push({y,index,items,period:x,rtl});
  }
 }
 atlas(ctx,font,color){
  const key=ctx.font+color;if(this.atlases.has(key))return this.atlases.get(key);
  const canvas=document.createElement('canvas'),scale=Math.min(2,ctx.getTransform().a||1),stride=Math.ceil(font*1.8);
  canvas.width=Math.ceil(Math.max(...this.lanes.map(l=>l.period))+font*2)*scale;canvas.height=stride*this.lanes.length*scale;
  const paint=canvas.getContext('2d');paint.scale(scale,scale);paint.font=ctx.font;paint.textBaseline='top';paint.fillStyle=color;paint.direction='ltr';
  for(const lane of this.lanes){paint.direction=lane.rtl?'rtl':'ltr';paint.textAlign=lane.rtl?'right':'left';for(const glyph of lane.items)paint.fillText(glyph.char,glyph.x+(lane.rtl?glyph.width:0),lane.index*stride);}
  const atlas={canvas,scale,stride};this.atlases.set(key,atlas);return atlas;
 }
 draw(ctx,{width,height,font,cards,time,color='#fff',alpha=.38,speed=22,clip}){
  ctx.save();if(clip){ctx.beginPath();ctx.rect(...clip);ctx.clip();}
  this.build(width,height,font,cards,s=>ctx.measureText(s).width);if(!this.lanes.length){ctx.restore();return;}
  const {canvas,scale,stride}=this.atlas(ctx,font,color);ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;
  for(const lane of this.lanes){const offset=((time*speed*(lane.index%2?-1:1)+lane.index*137)%lane.period+lane.period)%lane.period;for(const repeat of [-1,0,1]){const x=-offset+repeat*lane.period;if(x+lane.period>0&&x<width)ctx.drawImage(canvas,0,lane.index*stride*scale,lane.period*scale,stride*scale,x,lane.y+Math.sin(time*.6+lane.index)*2,lane.period,stride);}}
  ctx.restore();
 }
}
