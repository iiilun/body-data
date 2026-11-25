import {clamp,lerp,pointToScreen,hash} from './math.js?v=5.6.1';
import {number} from './i18n.js?v=5.6.1';
import {colourMosaic,artworkGeometry,typeSystem,MOSAIC_COLUMNS,compressToRoom} from './visual-system.js?v=5.6.1';
import {RigidCare,PixelMelt} from './rigid-physics.js?v=5.6.1';
import {SilhouetteType,DataFlow,backgroundType} from './spatial-type.js?v=5.6.1';
import {VacancyCity,materialKey,offlineTime,careSag,shelterOccluders} from './scene-models.js?v=5.6.1';
import {Condensation,glassContact} from './glass-model.js?v=5.6.1';
import {GlassSurface} from './glass-renderer.js?v=5.6.1';
import {HeatHaze,thermalColor,heatSample} from './heat.js?v=5.6.1';
import {framePose} from './controls.js?v=5.6.1';
import {sceneWords} from './scene-copy.js?v=5.6.1';
import {paintHuman} from './human-guide.js?v=5.6.1';
import {CameraAlignment} from './camera-alignment.js?v=5.6.1';
const FONT='"Helvetica Neue",Helvetica,Arial,"Noto Sans TC","Noto Sans JP","Noto Sans KR","Noto Sans Arabic",sans-serif';
export function demoPose(time,scene='space'){
 const p=framePose(scene),sway=Math.sin(time*.24)*.012;
 for(const point of p)point.x=1-point.x+sway;
 if(scene==='space'){p[15].x=.72+sway;p[16].x=.28+sway;p[15].y=p[16].y=.72;}return p;
}
export class Renderer{
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.sample=document.createElement('canvas');this.sc=this.sample.getContext('2d',{willReadFrequently:true});this.cameraAlignment=new CameraAlignment();
  this.cells=[];this.placed=[];this.preview=null;this.lastSample=-1;this.physics=new RigidCare();this.melt=new PixelMelt();this.field=new SilhouetteType();this.flow=new DataFlow();this.haze=new HeatHaze();this.glass=new Condensation();this.glassView=new GlassSurface();this.city=new VacancyCity();this.resize();this.reset('');
  fetch('./assets/preview-person.json?v=5.6.1').then(r=>r.json()).then(p=>this.preview=p).catch(()=>{});
 }
 resize(){this.width=innerWidth;this.height=innerHeight;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*d);this.canvas.height=Math.round(this.height*d);this.ctx.setTransform(d,0,0,d,0,0);this.ctx.imageSmoothingEnabled=false;this.outline=null;this.cardLayouts=new Map();}
 reset(scene){this.scene=scene;this.physics.reset();this.melt.reset();this.field=new SilhouetteType();this.flow=new DataFlow();this.glass.reset();this.city.reset();this.lastSample=-1;this.seeded=false;this.history=[];this.lastHistory=-1;this.outline=null;}
 geometry(aspect=4/3){return artworkGeometry(this.width,this.height,aspect);}
 sampleBody(c){
  if(c.time-this.lastSample<1/30)return;this.lastSample=c.time;
  if(c.demo&&this.preview){const original=this.preview.pose,dx=(c.pose[11].x+c.pose[12].x-original[11].x-original[12].x)/2,dy=(c.pose[11].y+c.pose[12].y-original[11].y-original[12].y)/2;this.cells=this.preview.cells.map(cell=>({...cell,x:cell.x+dx,y:cell.y+dy}));return;}
  if(!c.video||c.video.readyState<2||!c.mask?.data){this.cells=[];return;}
  const w=128,h=Math.round(w/c.aspect);if(this.sample.width!==w||this.sample.height!==h){this.sample.width=w;this.sample.height=h;}
  this.sc.drawImage(c.video,0,0,w,h);
  const centre=c.pose?.[11]?.visibility>.3&&c.pose?.[12]?.visibility>.3?{x:(c.pose[11].x+c.pose[12].x)/2,y:(c.pose[11].y+c.pose[12].y)/2}:null,origin=c.mask.origin;
  const mask={...c.mask,offsetX:centre&&origin?clamp(centre.x-origin.x,-.06,.06):0,offsetY:centre&&origin?clamp(centre.y-origin.y,-.05,.05):0};
  this.cells=colourMosaic(this.sc.getImageData(0,0,w,h).data,w,h,mask,MOSAIC_COLUMNS,Math.round(MOSAIC_COLUMNS/c.aspect));
 }
 project(point,c){
  const p=pointToScreen(point,c.g);
  if(c.scene==='space'&&c.state==='active'){
   const centre=c.pose[11]&&c.pose[12]?pointToScreen({x:(c.pose[11].x+c.pose[12].x)/2,y:.5},c.g).x:c.width/2;
   p.x=compressToRoom(p,centre,c.width,c.progress).x;
  }
  if(c.scene==='hold'&&c.state==='active')p.y+=c.height*.10+careSag(point,c.pose,this.physics.loads(),c.height);
  return p;
 }
 body(c,alpha=1,cells=this.placed){const ctx=this.ctx,b=c.g.block;ctx.save();ctx.globalAlpha=alpha;for(const cell of cells){ctx.fillStyle=cell.color;ctx.fillRect(cell.x-b/2,cell.y-b/2,b+.7,b+.7)}ctx.restore();}
 type(c,size=c.type.size){this.ctx.font=`300 ${size}px ${this.fontFamily||FONT}`;this.ctx.textAlign='left';this.ctx.textBaseline='top';this.ctx.direction='ltr';}
 number(text,x,y,c,color='#fff',align='left',size=c.type.size){this.ctx.save();this.type(c,size);this.ctx.fillStyle=color;this.ctx.textAlign=align;this.ctx.fillText(text,x,y);this.ctx.restore();}
 wrap(text,width,font=16){const ctx=this.ctx;ctx.font=`400 ${font}px ${this.fontFamily||FONT}`;const units=/[\u2e80-\u9fff\u3040-\u30ff]/.test(text)?[...text]:text.split(/\s+/),join=units.length&&units[0]?.length===1?'':' ';let line='',lines=[];for(const word of units){const trial=line?line+join+word:word;if(ctx.measureText(trial).width>width&&line){lines.push(line);line=word}else line=trial;}if(line)lines.push(line);return lines;}
 cardSize(card,c){
  const key=[card.id||card.label,card.value,c.lang,c.width,c.height,c.cardFont].join(':');const cached=this.cardLayouts?.get(key);if(cached)return cached;
  const size=c.cardFont||clamp(c.height*.043,27,42),labelFont=clamp(size*.34,12,15);this.type(c,size);
  const width=Math.min(c.width*.235,Math.max(130,this.ctx.measureText(card.value).width+16,c.width*.115)),lines=this.wrap(card.label,width-10,labelFont).slice(0,3);
  const layout={width,height:size+lines.length*(labelFont+2)+22,size,labelFont,lines};this.cardLayouts?.set(key,layout);return layout;
 }
 drawCard(card,x,y,c,{angle=0,center=false,color='#fff',width}={}){
  const size=this.cardSize(card,c),w=width||size.width,ctx=this.ctx;ctx.save();ctx.translate(x,y);ctx.rotate(angle);if(center)ctx.translate(-w/2,-size.height/2);
  this.number(card.value,0,-2,c,color,'left',size.size);ctx.fillStyle=color;ctx.textBaseline='top';ctx.direction=c.lang==='ar'?'rtl':'ltr';ctx.textAlign=c.lang==='ar'?'right':'left';
  const lines=size.lines;ctx.font=`400 ${size.labelFont}px ${this.fontFamily||FONT}`;lines.forEach((line,i)=>ctx.fillText(line,c.lang==='ar'?w:0,size.size+i*(size.labelFont+2)));
  ctx.font=`400 11px ${this.fontFamily||FONT}`;ctx.globalAlpha=.6;ctx.fillText(card.scope+' · '+(card.yearText||card.year),c.lang==='ar'?w:0,size.size+lines.length*(size.labelFont+2)+3);ctx.restore();
 }
 flowFacts(c,{context=this.ctx,...options}={}){const {font}=backgroundType(c.height);this.type(c,font);context.font=this.ctx.font;context.textAlign='left';context.textBaseline='top';context.direction='ltr';this.flow.draw(context,{width:c.width,height:c.height,font,cards:c.cards,time:c.elapsed,...options});}
 supports(c){
  const out=[],pt=i=>this.project(c.pose[i],c);
  for(const [side,chain]of [[0,[11,13,15]],[1,[12,14,16]]])for(let j=0;j<2;j++)if(chain.slice(j,j+2).every(i=>c.pose[i]?.visibility>.3))out.push({id:(j?'forearm':'upperarm')+side,side,a:pt(chain[j]),b:pt(chain[j+1]),thickness:c.g.block*1.05});
  if([11,12].every(i=>c.pose[i]?.visibility>.3)){
   const a=pt(11),b=pt(12),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const hipsVisible=[23,24].every(i=>c.pose[i]?.visibility>.3),l=hipsVisible?pt(23):null,r=hipsVisible?pt(24):null;
   const bottom=hipsVisible?{x:(l.x+r.x)/2,y:Math.min(c.height+80,(l.y+r.y)/2)}:{x:mid.x,y:c.height+c.g.block};
   out.push({id:'torso',side:0,a:mid,b:bottom,thickness:Math.max(Math.abs(a.x-b.x),c.width*.13)});
   out.push({id:'chest',side:0,a,b,thickness:c.g.block*1.15});
  }return out;
 }
 hold(c){
  const segments=this.supports(c),config={width:c.width,height:c.height,interval:lerp(.65,.38,c.progress),cards:c.cards,measure:card=>this.cardSize(card,c)};
  if(c.demo&&c.dt===0&&c.elapsed>0&&!this.seeded){this.seeded=true;for(let t=0;t<c.elapsed;t+=1/60)this.physics.update(1/60,this.supports(c),config);}
  this.physics.update(c.dt,segments,config);this.flowFacts(c,{color:'#000',alpha:.18,speed:15});this.body(c);
  for(const b of this.physics.bodies)this.drawCard(b.plugin.card,b.position.x,b.position.y,c,{angle:b.angle,center:true,color:'#000',width:b.plugin.width});
 }
 shelter(c){
  const hands=c.hands.map(h=>({...this.project(h,c),id:h.id})),pose=c.pose.map(p=>({...p,...this.project(p,c)})),occluders=shelterOccluders(pose,hands,c.height);
  if(c.demo&&c.dt===0&&c.elapsed>0&&!this.seeded){this.seeded=true;for(let t=0;t<c.elapsed;t+=1/30)this.melt.update(1/30,this.placed,hands,{...c,occluders,block:c.g.block,progress:t/45});}
  const pixels=this.melt.update(c.dt,this.placed,hands,{...c,occluders,block:c.g.block});
  const depth=c.height*(.35+c.progress*1.3-this.melt.cooling*.2),ctx=this.ctx,light=ctx.createLinearGradient(0,0,0,Math.max(100,depth));
  light.addColorStop(0,'#ff321a');light.addColorStop(.38,'#bd1709');light.addColorStop(1,'#000');ctx.fillStyle=light;ctx.fillRect(0,0,c.width,c.height);
  this.haze.draw(ctx,{width:c.width,height:c.height,viewportHeight:c.height,time:c.elapsed,depth,occluders,paint:context=>this.flowFacts(c,{context,alpha:.62,speed:48+78*c.progress})});
  const b=c.g.block;
  for(const cell of this.placed){const p=pixels.get(cell.material??cell.id);if(p?.free)continue;const heat=heatSample(cell.x,cell.y,c.elapsed,{width:c.width,height:c.height,depth,occluders}).amount;ctx.fillStyle=thermalColor(cell.rgb,heat);ctx.fillRect(cell.x-b/2,cell.y-b/2,b+.5,b+.5);}
  for(const p of pixels.values())if(p.free&&p.y<c.height+b){ctx.globalAlpha=clamp(1-(p.age-2)/3,.2,1);ctx.fillStyle=thermalColor(p.rgb,.85);ctx.fillRect(p.x-b/2,p.y-b/2,b,b);}ctx.globalAlpha=1;

 }
 space(c){
  const ctx=this.ctx,{font:size,row}=backgroundType(c.height);this.type(c,size);
  const previousItems=this.field.items;this.field.build(c.width,c.height,size,row,c.cards,s=>ctx.measureText(s).width);
  const hands=c.hands.map(h=>this.project(h,c));
  if(c.demo&&c.dt===0&&previousItems!==this.field.items){for(let n=0;n<120;n++)this.field.update(1/60,this.placed,c.g.block,c.width,hands,c.progress);}
  this.field.update(c.dt,this.placed,c.g.block,c.width,hands,c.progress);ctx.fillStyle='#eee';this.type(c,size);
  for(const g of this.field.items)if(g.x>-150&&g.x<c.width+150)ctx.fillText(g.char,g.drawX,g.drawY);this.body(c);
 }
 glassHands(c){return c.hands.map(h=>({...h,...pointToScreen(h,c.g),contact:h.contact??glassContact(h,c.pose),radius:clamp((h.span||.045)*c.g.width*.95,c.width*.025,c.width*.065),landmarks:h.landmarks?.map(p=>({...p,...pointToScreen(p,c.g)}))}));}
 thirst(c){
  const hands=this.glassHands(c);this.glass.update(c.dt,hands,{width:c.width,height:c.height});
  this.glassView.draw(this.ctx,c,this.glass,hands,context=>this.flowFacts(c,{context,color:'#202326',alpha:.83,speed:5}));
 }
 offline(c){
  const centre=this.project({x:(c.pose[11].x+c.pose[12].x)/2,y:(c.pose[11].y+c.pose[12].y)/2},c);
  if(c.dt>0&&c.elapsed-this.lastHistory>.04){this.history.push({time:c.elapsed,centre,cells:this.placed.map(p=>({...p}))});this.lastHistory=c.elapsed;while(this.history.length>45)this.history.shift();}
  const ctx=this.ctx,b=c.g.block,half=c.width/2,lag=offlineTime(c.elapsed),old=[...this.history].reverse().find(f=>f.time<=lag),previous=old?.cells||this.placed,dx=old?centre.x-old.centre.x:0,dy=old?centre.y-old.centre.y:0;
  this.flowFacts(c,{time:c.elapsed,alpha:.58,speed:32,clip:[0,0,half,c.height]});this.flowFacts(c,{time:lag,alpha:.44,color:'#ccc',speed:32,clip:[half,0,half,c.height]});
  ctx.save();ctx.beginPath();ctx.rect(0,0,half,c.height);ctx.clip();this.body(c);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(half,0,half,c.height);ctx.clip();
  for(const cell of previous){if(hash(cell.id*9)<.035)continue;const rgb=cell.rgb||[120,120,120],grey=clamp(Math.round((rgb[0]*.3+rgb[1]*.59+rgb[2]*.11)*.9),52,220);ctx.fillStyle=`rgb(${grey},${grey},${grey})`;ctx.fillRect(cell.x+dx-b/2,cell.y+dy-b/2,b+.6,b+.6);}ctx.restore();
  ctx.fillStyle='#000b';ctx.fillRect(0,0,c.width,62);const w=sceneWords[c.lang];this.number(w.connected,84,22,c,'#fff','left',22);this.number(w.disconnected,half+28,22,c,'#aaa','left',22);
 }

 vacant(c){
  const ctx=this.ctx,w=sceneWords[c.lang],reference=c.rules?.vacant?.cityReference,source=c.cards.find(card=>card.id===(reference?.sourceCard||'vacant-jp-total-2023')),percent=reference?.vacancyPercent||source?.companionPercent||13.8,ratio=source?{...source,value:number(percent,c.lang,1)+'%',label:w.vacancyRate}:null;
  this.city.build(c.width,c.height,percent);const shoulder=this.project({x:(c.pose[11].x+c.pose[12].x)/2,y:(c.pose[11].y+c.pose[12].y)/2},c),centre={x:shoulder.x,y:shoulder.y+c.height*.18};
  const hands=c.hands.map(h=>({...h,...this.project(h,c)}));this.city.update(c.dt,hands,centre,c.width,c.height);
  this.flowFacts(c,{alpha:.2,speed:14});this.body(c,.6);
  for(const t of this.city.tiles){if(!t.vacant){ctx.fillStyle='#ffffff1b';ctx.fillRect(t.x-this.city.tileW/2,t.y-this.city.tileH/2,this.city.tileW,this.city.tileH);ctx.strokeStyle='#ffffff15';ctx.lineWidth=1;ctx.strokeRect(t.x-this.city.tileW/2,t.y-this.city.tileH/2,this.city.tileW,this.city.tileH);continue;}
   const width=this.city.tileW,height=this.city.tileH;
   ctx.fillStyle=t.shared?(this.placed[(t.id*7)%Math.max(1,this.placed.length)]?.color||'#eee'):t.hover>.1?`rgba(255,255,255,${t.hover*.22})`:'#000';ctx.fillRect(t.x-width/2,t.y-height/2,width,height);
   ctx.strokeStyle=t.shared?'#fff':`rgba(255,255,255,${.6+t.hover*.4})`;ctx.lineWidth=t.hover>.3?2.5:1;ctx.strokeRect(t.x-width/2,t.y-height/2,width,height);
   if(!t.shared){ctx.strokeStyle='#fff5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(t.x-5,t.y);ctx.lineTo(t.x+5,t.y);ctx.moveTo(t.x,t.y-5);ctx.lineTo(t.x,t.y+5);ctx.stroke();}
  }
  ctx.fillStyle='#000c';ctx.fillRect(0,0,c.width,65);if(ratio)this.number(`${ratio.value}  ${ratio.label} · ${ratio.scope} ${ratio.yearText||ratio.year}`,84,28,c,'#fff','left',clamp(c.width*.018,18,25));

 }
 previewGrip(x,y,closed,pose){
  if(this.scene!=='vacant'||!this.city.tiles.length)return;
  const g=this.geometry(4/3),a=pointToScreen(pose[11],g),b=pointToScreen(pose[12],g),centre={x:(a.x+b.x)/2,y:(a.y+b.y)/2+this.height*.18};
  this.city.update(1/60,[{id:'preview0',x,y,fist:closed}],centre,this.width,this.height);
 }
 clearTransition(){this.ctx.fillStyle='#000';this.ctx.fillRect(0,0,this.width,this.height);}
 guide(c){
  const mobile=c.width<760,scale=mobile?Math.min(c.height*.56/850,c.width*.9/760):Math.min(c.height*.78/850,c.width*.57/760);
  paintHuman(this.ctx,c.scene,c.guideElapsed,{x:c.width*(mobile?.5:.69),y:c.height*(mobile?.13:.12),scale,color:['hold','thirst'].includes(c.scene)?'#111':'#fff'});
 }
 alignment(c){this.cameraAlignment.draw(this.ctx,c);}
 stats(scene,lang,metric,elapsed){const w=sceneWords[lang];
  if(scene==='shelter')return [{value:'≈ '+number((metric?.rate||0)*elapsed,lang,0)+' t CO₂',label:w.elapsedEmissions}];
  if(scene==='thirst')return [{value:number(this.glass.summary().clear*100,lang,0)+'%',label:w.glassCleared}];
  if(scene==='vacant')return [{value:number(this.city.reused,lang,0),label:w.reused}];return [];
 }
 result(scene,lang,rules,cards=[]){const w=sceneWords[lang];if(scene==='thirst'){const gap=cards.find(c=>c.id==='thirst-world-without-safe-2024');return [{value:number(this.glass.summary().best*100,lang,0)+'%',label:w.glassBest},{value:number(100-(rules?.thirst?.safelyManagedShare2024??74),lang,2)+'%',label:w.worldUnassured},...(gap?[{value:gap.value,label:gap.label+' · '+gap.scope+' '+gap.yearText}]:[])];}if(scene==='vacant')return [{value:number(this.city.reused,lang,0),label:w.reused},{value:'120',label:w.cityScenario}];return null;}
 fontsChanged(){this.cardLayouts?.clear();this.flow.key='';this.field.key='';}
 render(input){
  this.fontFamily=input.lang==='ar'?'"Noto Sans Arabic",Arial,sans-serif':FONT;
  const aspect=input.demo?4/3:input.video?.videoWidth/input.video?.videoHeight||16/9,c={...input,aspect,width:this.width,height:this.height,g:this.geometry(aspect),type:typeSystem(this.height,this.width)};
  this.ctx.fillStyle=['hold','thirst'].includes(c.scene)&&['active','briefing','guide','result'].includes(c.state)?c.scene==='thirst'?'#fafaf8':'#fff':'#000';this.ctx.fillRect(0,0,c.width,c.height);
  if(c.state==='guide'){this.guide(c);return;}if(c.state==='align'){this.alignment(c);return;}
  if(['idle','error','briefing','result'].includes(c.state)||!c.present&&!c.demo)return;
  if(c.scene==='thirst'&&['active','briefing','guide','result'].includes(c.state)){if(c.state==='active')this.thirst(c);else if(c.state==='align')this.alignment(c);return;}
  this.sampleBody(c);this.placed=this.cells.map(cell=>({...cell,...this.project(cell,c),material:materialKey(cell,c.pose)}));
  if(['loading','scanning'].includes(c.state)){this.body(c,.12);return;}if(c.state==='briefing'||c.state==='result')return;if(c.state==='align'){this.alignment(c);return;}if(c.state==='active')this[c.scene]?.(c);
 }
}
