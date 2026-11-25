import {clamp} from './math.js?v=5.8.0';

export function factText(card){return `${String(card.value).replace(/\s/g,'\u00a0')} ${card.fieldLabel||card.label} · ${card.scope} ${card.yearText||card.year}`;}
export const BACKGROUND_TRACKING=-.055;
export function backgroundType(height){const font=clamp(height*.032,20,31);return {font,row:font*.98,tracking:BACKGROUND_TRACKING};}
function textUnits(text){return /[\u0600-\u06ff]/.test(text)?text.match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]/gu):[...text];}
function blockedRanges(cells,top,bottom,block,width,padding){
 const rows=cells.filter(c=>c.y+block*.5>top&&c.y-block*.5<bottom).map(c=>[clamp(c.x-block*.5-padding,0,width),clamp(c.x+block*.5+padding,0,width)]).sort((a,b)=>a[0]-b[0]);
 const merged=[];for(const r of rows){if(r[1]<=r[0])continue;const last=merged.at(-1);if(last&&r[0]<=last[1]+3)last[1]=Math.max(last[1],r[1]);else merged.push(r);}return merged;
}
export class SilhouetteType{
 constructor(){this.items=[];this.rows=[];this.key='';this.time=0;}
 build(width,height,font,row,cards,measure){
  const key=[width,height,font,cards.map(factText).join('|')].join(':');if(key===this.key)return;
  this.key=key;this.items=[];this.rows=[];this.width=width;this.height=height;this.font=font;this.row=row;this.time=0;if(!cards.length)return;
  // Each lane keeps its own ordered sentence. Reflow never reassigns glyphs to another row.
  for(let y=12,line=0;y<height-38;y+=row,line++){
   const ordered=cards.map((_,i)=>cards[(i+line*3)%cards.length]);
   const text=ordered.map(factText).join(' / ')+' / ';
   const units=textUnits(text);
   const lane={items:[],y,index:line,drift:0};let x=-width*.55,index=0;
   while(x<width*1.7){const char=units[index++%units.length],advance=Math.max(font*.2,measure(char));const glyph={char,width:advance,baseX:x,x,y,drawX:x,drawY:y,vx:0,vy:0,active:true,alpha:1};lane.items.push(glyph);this.items.push(glyph);x+=advance+font*BACKGROUND_TRACKING;}
   for(let n=0;n<lane.items.length;n++){const g=lane.items[n],previous=lane.items[n-1];if(/[≈0-9٠-٩]/.test(g.char[0])&&(!previous||/\s/.test(previous.char))){let word='';for(let j=n;j<lane.items.length;j++){const char=lane.items[j].char;if(/\s/.test(char)&&char!=='\u00a0')break;word+=char;}g.atomicWidth=measure(word);}}
   lane.period=x+width*.55;this.rows.push(lane);
  }
 }
 update(dt,cells,block,width,hands,progress){
  dt=Math.min(dt,.04);this.time+=dt;
  for(const lane of this.rows){
   lane.drift+=dt*(7+lane.index%4*2)*(lane.index%2?-1:1);
   const blockers=[...cells,...hands.map(h=>({x:h.x,y:h.y}))];
   const ranges=blockedRanges(blockers,lane.y,lane.y+this.font*.94,block,width,9+progress*5+this.font*.30);
   const removed=ranges.reduce((n,[a,b])=>n+b-a,0);
   const ordered=lane.items.map(g=>{let raw=g.baseX+lane.drift;while(raw<-width*.6)raw+=lane.period;while(raw>width*1.7)raw-=lane.period;return {g,raw};}).sort((a,b)=>a.raw-b.raw);
   let cursor=(ordered[0]?.raw||0)-removed*.5,previous=null;
   for(const {g,raw}of ordered){
    for(const [a,b]of ranges)if(cursor+(g.atomicWidth||g.width)>a&&cursor<b)cursor=b;
    const target=cursor,targetY=lane.y+Math.sin(this.time*.55+lane.index*.8)*2.5;cursor+=g.width+this.font*BACKGROUND_TRACKING;
    if(Math.abs(g.x-target)>width*.9){g.x=target;g.vx=0;}
    const ax=(target-g.x)*72-g.vx*16,ay=(targetY-g.y)*55-g.vy*14;
    g.vx+=ax*dt;g.vy+=ay*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;
    g.drawX=Math.max(g.x,previous?previous.drawX+previous.width+this.font*BACKGROUND_TRACKING:-Infinity);g.drawY=g.y;g.active=true;previous=g;
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
