import {clamp,lerp,pointToScreen,hash} from './math.js?v=4';
import {number} from './i18n.js?v=4';
import {colourMosaic,artworkGeometry,typeSystem,MOSAIC_COLUMNS,compressToRoom} from './visual-system.js?v=4';
import {RigidCare,PixelMelt} from './rigid-physics.js?v=4';
import {SilhouetteType} from './spatial-type.js?v=4';
import {framePose} from './controls.js?v=4';
const FONT='"Helvetica Neue",Helvetica,Arial,"Noto Sans TC","Noto Sans JP","Noto Sans KR","Noto Sans Arabic",sans-serif';
export function demoPose(time,scene='space'){
 const p=framePose(scene),sway=Math.sin(time*.24)*.012;
 for(const point of p)point.x=1-point.x+sway;
 if(scene==='space'){p[15].x=.72+sway;p[16].x=.28+sway;p[15].y=p[16].y=.72;}
 return p;
}
export class Renderer{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.sample=document.createElement('canvas');this.sc=this.sample.getContext('2d',{willReadFrequently:true});
  this.cells=[];this.placed=[];this.preview=null;this.lastSample=-1;this.physics=new RigidCare();this.melt=new PixelMelt();this.field=new SilhouetteType();this.resize();this.reset('');
  fetch('./assets/preview-person.json?v=4').then(r=>r.json()).then(p=>this.preview=p).catch(()=>{});
 }
 resize(){this.width=innerWidth;this.height=innerHeight;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*d);this.canvas.height=Math.round(this.height*d);this.ctx.setTransform(d,0,0,d,0,0);this.ctx.imageSmoothingEnabled=false;}
 reset(scene){this.scene=scene;this.physics.reset();this.melt.reset();this.field=new SilhouetteType();this.lastSample=-1;this.seeded=false;this.water=[];this.waterClock=0;this.waterSerial=0;this.history=[];this.relinked=new Map();this.rooms=new Map();}
 geometry(aspect=4/3){return artworkGeometry(this.width,this.height,aspect);}
 sampleBody(c){
  if(c.time-this.lastSample<1/30)return;this.lastSample=c.time;
  if(c.demo&&this.preview){this.cells=this.preview.cells;return;}
  if(!c.video||c.video.readyState<2||!c.mask?.data){this.cells=[];return;}
  const w=128,h=Math.round(w/c.aspect);if(this.sample.width!==w||this.sample.height!==h){this.sample.width=w;this.sample.height=h;}
  this.sc.clearRect(0,0,w,h);this.sc.drawImage(c.video,0,0,w,h);
  const head=c.pose?.[11]?.visibility>.3&&c.pose?.[12]?.visibility>.3?{x:(c.pose[11].x+c.pose[12].x)/2,y:(c.pose[11].y+c.pose[12].y)/2}:null,origin=c.mask.origin;
  const mask={...c.mask,offsetX:head&&origin?clamp(head.x-origin.x,-.06,.06):0,offsetY:head&&origin?clamp(head.y-origin.y,-.05,.05):0};
  this.cells=colourMosaic(this.sc.getImageData(0,0,w,h).data,w,h,mask,MOSAIC_COLUMNS,Math.round(MOSAIC_COLUMNS/c.aspect));
 }
 project(point,c){
  const p=pointToScreen(point,c.g);
  if(c.scene==='space'&&c.state==='active'){
   const centre=c.pose[11]&&c.pose[12]?pointToScreen({x:(c.pose[11].x+c.pose[12].x)/2,y:.5},c.g).x:c.width/2;
   p.x=compressToRoom(p,centre,c.width,c.progress).x;
  }
  if(c.scene==='hold'&&c.state==='active'){
   const a=c.pose[11],b=c.pose[12],left=Math.min(a?.x??.35,b?.x??.65),right=Math.max(a?.x??.35,b?.x??.65);
   const outside=point.x<left?(left-point.x)/.35:point.x>right?(point.x-right)/.35:0;
   p.y+=this.physics.loads()[point.x>.5?0:1]*c.height*.07*clamp(outside);
  }
  return p;
 }
 body(c,alpha=1,cells=this.placed){
  const ctx=this.ctx,b=c.g.block;ctx.save();ctx.globalAlpha=alpha;
  for(const cell of cells){ctx.fillStyle=cell.color;ctx.fillRect(cell.x-b/2,cell.y-b/2,b+.7,b+.7)}ctx.restore();
 }
 type(c,size=c.type.size){this.ctx.font=`300 ${size}px ${FONT}`;this.ctx.textAlign='left';this.ctx.textBaseline='top';this.ctx.direction='ltr';}
 number(text,x,y,c,color='#fff',align='left'){this.ctx.save();this.type(c);this.ctx.fillStyle=color;this.ctx.textAlign=align;this.ctx.fillText(text,x,y);this.ctx.restore();}
 wrap(text,width,font=16){const ctx=this.ctx;ctx.font=`400 ${font}px ${FONT}`;const units=/[\u2e80-\u9fff\u3040-\u30ff]/.test(text)?[...text]:text.split(/\s+/),join=units.length&&units[0]?.length===1?'':' ';let line='',lines=[];for(const word of units){const trial=line?line+join+word:word;if(ctx.measureText(trial).width>width&&line){lines.push(line);line=word}else line=trial;}if(line)lines.push(line);return lines;}
 cardSize(card,c){this.type(c);const width=Math.min(c.width*.44,Math.max(170,this.ctx.measureText(card.value).width+18,c.width*.19));const lines=this.wrap(card.label,width-12,16);return {width,height:c.type.size*.98+Math.min(3,lines.length)*20+32};}
 drawCard(card,x,y,c,{angle=0,center=false,color='#fff',width}={}){
  const size=this.cardSize(card,c),w=width||size.width,ctx=this.ctx;ctx.save();ctx.translate(x,y);ctx.rotate(angle);if(center)ctx.translate(-w/2,-size.height/2);
  this.number(card.value,0,-5,c,color);ctx.fillStyle=color;ctx.font=`400 16px ${FONT}`;ctx.textBaseline='top';ctx.direction=c.lang==='ar'?'rtl':'ltr';ctx.textAlign=c.lang==='ar'?'right':'left';
  const lines=this.wrap(card.label,w-8,16).slice(0,3);ctx.font=`400 16px ${FONT}`;lines.forEach((line,i)=>ctx.fillText(line,c.lang==='ar'?w:0,c.type.size*.98+i*20));
  ctx.font=`400 13px ${FONT}`;ctx.globalAlpha=.55;ctx.fillText(card.scope+' · '+card.year,c.lang==='ar'?w:0,c.type.size*.98+lines.length*20+5);ctx.restore();
 }
 supports(c){
  const out=[],pt=i=>this.project(c.pose[i],c);
  for(const [side,chain]of [[0,[11,13,15]],[1,[12,14,16]]])for(let j=0;j<2;j++)if(chain.slice(j,j+2).every(i=>c.pose[i]?.visibility>.3))out.push({id:(j?'forearm':'upperarm')+side,side,a:pt(chain[j]),b:pt(chain[j+1]),thickness:c.g.block*.9});
  if([11,12].every(i=>c.pose[i]?.visibility>.3)){
   const a=pt(11),b=pt(12),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const hipsVisible=[23,24].every(i=>c.pose[i]?.visibility>.3),l=hipsVisible?pt(23):null,r=hipsVisible?pt(24):null;
   const bottom=hipsVisible?{x:(l.x+r.x)/2,y:Math.min(c.height+80,(l.y+r.y)/2)}:{x:mid.x,y:c.height+c.g.block};
   out.push({id:'torso',side:0,a:mid,b:bottom,thickness:Math.max(Math.abs(a.x-b.x),c.width*.13)});
  }
  return out;
 }
 hold(c){
  const segments=this.supports(c),config={width:c.width,height:c.height,interval:1.65,cards:c.cards,measure:card=>this.cardSize(card,c)};
  if(c.demo&&c.dt===0&&c.elapsed>0&&!this.seeded){this.seeded=true;for(let t=0;t<c.elapsed;t+=1/60)this.physics.update(1/60,segments,config);}
  this.physics.update(c.dt,segments,config);this.body(c);
  for(const b of this.physics.bodies)this.drawCard(b.plugin.card,b.position.x,b.position.y,c,{angle:b.angle,center:true,color:'#000',width:b.plugin.width});
 }
 shelter(c){
  const hands=c.hands.map(h=>({...this.project(h,c),id:h.id}));
  if(c.demo&&c.dt===0&&c.elapsed>0&&!this.seeded){this.seeded=true;for(let t=0;t<c.elapsed;t+=1/30)this.melt.update(1/30,this.placed,hands,{...c,block:c.g.block});}
  const pixels=this.melt.update(c.dt,this.placed,hands,{...c,block:c.g.block});
  const depth=c.height*(.25+c.progress*1.15-this.melt.cooling*.22),ctx=this.ctx,light=ctx.createLinearGradient(0,0,0,Math.max(100,depth));
  light.addColorStop(0,'#ff2c10');light.addColorStop(.38,'#a81506');light.addColorStop(1,'#000');ctx.fillStyle=light;ctx.fillRect(0,0,c.width,c.height);
  for(const hand of hands.filter(h=>h.y<c.height*.5)){const shade=ctx.createRadialGradient(hand.x,hand.y+c.height*.25,0,hand.x,hand.y+c.height*.25,c.width*.28);shade.addColorStop(0,'#0008');shade.addColorStop(1,'#0000');ctx.fillStyle=shade;ctx.fillRect(0,0,c.width,c.height);}
  const b=c.g.block;
  for(const cell of this.placed){const p=pixels.get(cell.id);if(p?.free)continue;ctx.fillStyle=cell.color;ctx.fillRect(cell.x-b/2,cell.y-b/2,b+.5,b+.5);}
  for(const p of pixels.values())if(p.free&&p.y<c.height+b){ctx.fillStyle=p.color;ctx.fillRect(p.x-b/2,p.y-b/2,b,b);}
  this.number('≈ '+number((c.metric?.rate||0)*c.elapsed,c.lang,1),28,c.height-c.type.size-90,c);
 }
 space(c){
  const ctx=this.ctx;this.type(c,c.type.size*.82);const size=c.type.size*.82;
  this.field.build(c.width,c.height,size,size*1.28,c.cards,s=>ctx.measureText(s).width);
  const hands=c.hands.map(h=>this.project(h,c));
  this.field.update(c.dt>0?c.dt:(c.demo?1/60:0),this.placed,c.g.block,c.width,hands,c.progress);
  this.body(c);ctx.fillStyle='#fff';this.type(c,size);
  for(const g of this.field.items)if(g.active){ctx.globalAlpha=g.alpha;ctx.fillText(g.char,g.drawX,g.drawY)}ctx.globalAlpha=1;
 }
 thirst(c){
  const ctx=this.ctx,hands=c.hands.map(h=>this.project(h,c));this.body(c,.9);this.waterClock+=c.dt;
  if(c.demo&&c.dt===0&&!this.seeded){this.seeded=true;for(let n=0;n<150;n++)this.water.push({x:c.width*(.5+(hash(n)-.5)*.2),y:hash(n+7)*c.height,vx:0,vy:0,life:hash(n+9)*6});}
  const supply=Math.sin(c.elapsed*.48)>-.2;
  if(supply)while(this.waterClock>.015&&this.water.length<500){this.waterClock-=.015;const n=this.waterSerial++;this.water.push({x:c.width*(.5+(hash(n)-.5)*.2),y:-15,vx:(hash(n+7)-.5)*30,vy:40,life:0});}
  if(!supply)this.waterClock=0;
  const a=hands[0],b=hands[1],cup=a&&b&&Math.abs(a.y-b.y)<100&&Math.abs(a.x-b.x)<c.width*.4;
  for(const p of this.water){p.vy+=c.dt*c.height*.48;p.x+=p.vx*c.dt;p.y+=p.vy*c.dt;p.life+=c.dt;
   if(cup&&p.x>Math.min(a.x,b.x)-25&&p.x<Math.max(a.x,b.x)+25&&p.y>Math.max(a.y,b.y)-8&&p.y<Math.max(a.y,b.y)+45){p.y=Math.max(a.y,b.y)-9;p.vy=-p.vy*.18;p.vx+=(p.x-(a.x+b.x)/2)*c.dt*1.1;}
   for(const hand of hands){const d=Math.hypot(p.x-hand.x,p.y-hand.y);if(d<32){p.vx+=(p.x-hand.x)/(d||1)*c.dt*350;p.vy-=c.dt*100;}}
   ctx.fillStyle=p.life>3?'#1b58ff':'#71acff';ctx.fillRect(p.x,p.y,9,9);
  }
  this.water=this.water.filter(p=>p.y<c.height+20&&p.life<12);
  const card=c.cards[Math.floor(c.elapsed/7)%Math.max(1,c.cards.length)];if(card)this.drawCard(card,28,90,c,{color:'#77abff',width:c.width*.48});
 }
 offline(c){
  if(c.dt>0){this.history.push({time:c.time,cells:this.placed.map(p=>({...p}))});while(this.history.length>150)this.history.shift();}
  const ctx=this.ctx,b=c.g.block,hands=c.hands.map(h=>this.project(h,c));
  for(let group=0;group<72;group++){
   const col=group%9,row=Math.floor(group/9),x=c.g.x+col*c.g.block*4,y=c.g.y+row*c.g.block*3;
   if(hands.some(h=>h.x>x-50&&h.x<x+c.g.block*4+50&&h.y>y-50&&h.y<y+c.g.block*3+50))this.relinked.set(group,c.time);
   const fresh=c.time-(this.relinked.get(group)||-100)<1.1,phase=hash(group*13);
   if(!fresh&&phase<.28)continue;
   const lag=fresh?0:.3+phase*2.2,old=this.history.find(f=>f.time>=c.time-lag)||this.history[0];
   const cells=fresh?this.placed:old?.cells||this.placed;
   for(const cell of cells)if(Math.floor(cell.gx/4)+Math.floor(cell.gy/3)*9===group){ctx.fillStyle=cell.color;ctx.fillRect(cell.x-b/2,cell.y-b/2,b+.5,b+.5);}
  }
  const card=c.cards[Math.floor(c.elapsed/7)%Math.max(1,c.cards.length)];if(card)this.drawCard(card,28,88,c,{width:c.width*.45});
 }
 vacant(c){
  this.body(c);const ctx=this.ctx,count=Math.min(6,c.cards.length),cols=Math.min(count,c.width>1000?3:2),rows=Math.ceil(count/Math.max(1,cols)),gap=26,pad=28,roomW=(c.width-pad*2-gap*(cols-1))/cols,roomH=(c.height-210-gap)/rows;
  const hands=c.hands.map(h=>this.project(h,c));
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const index=row*cols+col,x=pad+col*(roomW+gap),y=90+row*(roomH+gap),card=c.cards[index];if(!card)continue;
   const inside=hands.filter(h=>h.x>x&&h.x<x+roomW&&h.y>y&&h.y<y+roomH);const openness=lerp(this.rooms.get(index)||0,inside.length>=2?1:inside.length===1?.32:0,1-Math.exp(-c.dt*1.5));this.rooms.set(index,openness);
   ctx.fillStyle=`rgba(255,255,255,${.98-openness*.92})`;ctx.fillRect(x,y,roomW,roomH);
   const cc={...c,type:{...c.type,size:Math.min(c.type.size,roomW*.27)}};this.drawCard(card,x+16,y+20,cc,{color:'#000',width:roomW-32});
  }
 }
 alignment(c){
  this.body(c,.7);const p=framePose(c.scene),ctx=this.ctx,color=c.alignment?.ready?'#63bf8b':c.scene==='hold'?'#111':'#fff',at=i=>({x:p[i].x*c.width,y:p[i].y*c.height});
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=.9;
  const head=at(0);ctx.beginPath();ctx.ellipse(head.x,head.y,c.height*.065,c.height*.085,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();[11,12,24,23,11].forEach((i,j)=>{const v=at(i);j?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y)});ctx.stroke();
  for(const chain of [[11,13,15],[12,14,16]]){
   ctx.beginPath();chain.forEach((i,j)=>{const v=at(i);j?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y)});ctx.stroke();
   for(const i of chain){const v=at(i);ctx.beginPath();ctx.arc(v.x,v.y,13,0,Math.PI*2);ctx.stroke();}
  }
  ctx.restore();
 }
 render(input){
  const aspect=input.demo?4/3:input.video?.videoWidth/input.video?.videoHeight||16/9;
  const c={...input,aspect,width:this.width,height:this.height,g:this.geometry(aspect),type:typeSystem(this.height,this.width)};
  this.ctx.fillStyle=c.scene==='hold'&&['active','briefing','align','result'].includes(c.state)?'#fff':'#000';this.ctx.fillRect(0,0,c.width,c.height);
  if(['idle','error'].includes(c.state)||!c.present&&!c.demo)return;
  this.sampleBody(c);this.placed=this.cells.map(cell=>({...cell,...this.project(cell,c)}));
  if(['loading','scanning'].includes(c.state)){this.body(c,.12);return;}
  if(c.state==='briefing'||c.state==='result')return;
  if(c.state==='align'){this.alignment(c);return;}
  if(c.state==='active')this[c.scene]?.(c);
 }
}
