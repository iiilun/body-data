import {clamp,lerp} from './math.js?v=4';
function freeIntervals(blocked,width){
 const ranges=blocked.map(([a,b])=>[clamp(a,0,width),clamp(b,0,width)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
 const merged=[];for(const range of ranges){const last=merged.at(-1);if(last&&range[0]<=last[1]+2)last[1]=Math.max(last[1],range[1]);else merged.push([...range]);}
 const free=[];let x=0;for(const [a,b]of merged){if(a-x>8)free.push([x,a]);x=b;}if(width-x>8)free.push([x,width]);return free;
}
export class SilhouetteType{
 constructor(){this.items=[];this.key='';}
 build(width,height,font,row,cards,measure){
  const key=[width,height,font,cards.map(c=>c.value+' '+c.label+' '+c.scope).join('|')].join(':');if(key===this.key)return;
  this.key=key;this.items=[];this.width=width;this.height=height;this.font=font;this.row=row;if(!cards.length)return;
  const text=cards.map(c=>c.value+' '+(c.fieldLabel||c.label).toUpperCase()+' · '+c.scope+' '+c.year).join(' / ').replace(/≈\s+/g,'≈\u00a0')+' / ';
  const isBreak=ch=>/\s/.test(ch)&&ch!=='\u00a0';
  const units=/[\u0600-\u06ff]/.test(text)?text.match(/[\p{L}\p{M}]+|./gu):[...text];
  let index=0;
  for(let y=8;y<height-75;y+=row)for(let x=0;x<width*1.5;){const char=units[index++%units.length],advance=Math.max(font*.17,measure(char));const previous=units[(index-2+units.length)%units.length];let wordWidth=0,word='';if(isBreak(previous)||index===1){for(let n=index-1;n<index-1+units.length;n++){const next=units[n%units.length];if(isBreak(next)&&n>=index)break;word+=next;wordWidth+=Math.max(font*.17,measure(next))+2;if(/[\u2e80-\u9fff]/.test(next))break;}}this.items.push({char,width:advance,wordWidth,atomic:/^[≈0-9\u0660-\u0669]/.test(word.trim()),x,y,active:false,alpha:0});x+=advance+2;}
 }
 update(dt,cells,block,width,hands,progress){
  const targets=[],margin=9+progress*12,height=this.font*.92;
  for(let y=8;y<this.height-75;y+=this.row){
   const blocked=cells.filter(c=>c.y+block/2>y&&c.y-block/2<y+height).map(c=>[c.x-block/2-margin,c.x+block/2+margin]);
   for(const h of hands)if(h.y+65>y&&h.y-65<y+height)blocked.push([h.x-80,h.x+80]);
   const intervals=freeIntervals(blocked,width).filter(([a,b])=>b-a>this.font*1.45);
   for(const [start,end]of intervals){let x=start;
    while(targets.length<this.items.length){const g=this.items[targets.length];if(g.wordWidth&&(g.atomic||g.wordWidth<=end-start)&&x+g.wordWidth>end)break;if(x+g.width>end)break;targets.push({x,y});x+=g.width+2;}
   }
  }
  const blend=1-Math.exp(-Math.min(dt,.05)*13);
  for(let i=0;i<this.items.length;i++){
   const g=this.items[i],target=targets[i];g.active=!!target;if(!target)continue;
   const distance=Math.hypot(g.x-target.x,g.y-target.y);g.x=lerp(g.x,target.x,blend);g.y=lerp(g.y,target.y,blend);
   g.drawX=target.x+clamp(g.x-target.x,-.8,.8);g.drawY=target.y+clamp(g.y-target.y,-.8,.8);
   g.alpha=lerp(g.alpha,distance>this.font?0.2:1,blend);
  }
 }
}
