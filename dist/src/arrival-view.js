import {ArrivalSequence,LANGUAGE_CUBES,languageLayout,floatingCube,mergeCube,ease} from './arrival.js?v=5.4.2';
import {faceTypography} from './menu-view.js?v=5.4.2';
import {DataFlow} from './spatial-type.js?v=5.4.2';

const sides=['front','back','right','left','top','bottom'];
const fontStack='"Helvetica Neue",Helvetica,Arial,sans-serif';
export class ArrivalView{
 constructor(root,{onSelect,titles}){
  this.root=root;this.canvas=root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
  this.sequence=new ArrivalSequence({reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  this.flow=new DataFlow();this.layer=document.createElement('canvas');this.layerCtx=this.layer.getContext('2d');
  this.onSelect=onSelect;this.titles=titles;this.time=0;this.loaded=false;this.frames=[];this.nodes=[];
  const constellation=root.querySelector('.language-constellation');
  for(const [i,language]of LANGUAGE_CUBES.entries()){
   const button=document.createElement('button');button.className='language-island';button.type='button';button.lang=language.id==='zh'?'zh-Hant':language.id;
   button.setAttribute('aria-label',language.name);button.dataset.language=language.id;button.disabled=true;
   const scene=document.createElement('span');scene.className='language-scene';scene.setAttribute('aria-hidden','true');
   const cube=document.createElement('span');cube.className='language-cube';
   for(const side of sides){const face=document.createElement('span');face.className='language-face '+side;const type=document.createElement('span');face.append(type);cube.append(face);}
   scene.append(cube);const label=document.createElement('span');label.className='language-name';label.textContent=language.name;
   button.append(scene,label);const node={button,cube,scene,label,language};this.nodes.push(node);constellation.append(button);
   button.addEventListener('click',()=>this.choose(i));
  }
  this.resize();
 }
 resize(){
  this.width=innerWidth;this.height=innerHeight;this.ratio=Math.min(devicePixelRatio||1,2);
  this.canvas.width=Math.round(this.width*this.ratio);this.canvas.height=Math.round(this.height*this.ratio);
  this.layer.width=this.canvas.width;this.layer.height=this.canvas.height;this.layout=languageLayout(this.width,this.height);
  this.flow.key='';this.flow.atlases.clear();
  for(const [i,node]of this.nodes.entries())this.fit(node,[node.language.name],this.layout[i].size);
  if(this.sequence.phase==='merging'){
   // Continue the same transaction using positions in the resized coordinate space.
   const sx=this.width/(this.previousWidth||this.width),sy=this.height/(this.previousHeight||this.height);
   this.origins=this.origins.map(p=>({...p,x:p.x*sx,y:p.y*sy}));if(this.changed)this.fitSelected();
  }
  this.previousWidth=this.width;this.previousHeight=this.height;
 }
 load(cards){this.cards=cards;this.loaded=true;this.sequence.reset();}
 reset({languagesOnly=true}={}){
  this.sequence.reset({languagesOnly});this.time=0;this.origins=null;this.changed=false;this.root.dataset.phase=this.sequence.phase;
  for(const [i,node]of this.nodes.entries()){
   node.button.dataset.chosen='false';node.button.tabIndex=languagesOnly?0:-1;
   this.fit(node,[node.language.name],this.layout[i].size);node.button.lang=node.language.id==='zh'?'zh-Hant':node.language.id;
  }
 }
 fit(node,names,size){
  const font=names.some(s=>/[\u0600-\u06ff]/.test(s))?'"Noto Sans Arabic",Arial,sans-serif':fontStack;
  for(const [i,face]of [...node.cube.children].entries()){
   const name=names[i%names.length],layout=faceTypography(name,size,(s,px)=>{this.ctx.font=`700 ${px}px ${font}`;return this.ctx.measureText(s).width;});
   const type=face.firstElementChild;type.replaceChildren();type.style.fontSize=layout.font+'px';type.style.lineHeight=layout.lineHeight+'px';
   type.style.fontFamily=font;type.dir=/[\u0600-\u06ff]/.test(name)?'rtl':'ltr';
   for(let row=0;row<layout.rows;row++){const b=document.createElement('b');b.textContent=layout.text;type.append(b);}
  }
 }
 fitSelected(){if(this.selectedIndex!=null)this.fit(this.nodes[this.selectedIndex],this.titles(),this.layout[this.selectedIndex].size);}
 choose(index){
  const node=this.nodes[index];if(!this.loaded||!this.sequence.select(node.language.id))return;
  this.selectedIndex=index;this.origins=this.frames.map(p=>({...p}));this.changed=false;
  for(const n of this.nodes){n.button.disabled=true;n.button.tabIndex=-1;n.button.dataset.chosen=String(n===node);}
  node.button.blur();this.onSelect(node.language.id);
 }
 paintData(){
  const ctx=this.ctx,w=this.width,h=this.height,sequence=this.sequence;
  ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
  if(!this.cards?.length||!['data','opening'].includes(sequence.phase))return;
  const p=sequence.phase==='data'?0:sequence.phase==='opening'?sequence.progress:1;
  // Each row parts at a slightly different point, like a typographic curtain.
  const font=Math.max(30,Math.min(68,h*.068)),layer=this.layerCtx;
  layer.setTransform(this.ratio,0,0,this.ratio,0,0);layer.clearRect(0,0,w,h);layer.font=`300 ${font}px ${fontStack}`;
  this.flow.draw(layer,{width:w,height:h+font*2,font,cards:this.cards,time:this.time,alpha:1,speed:this.sequence.reducedMotion?0:31});
  const row=font*.98,mergeFade=sequence.phase==='merging'?1-ease(sequence.progress/.5):1;
  ctx.globalAlpha=mergeFade;
  for(let y=0,index=0;y<h;y+=row,index++){
   const stagger=(index%5)*.035,spread=ease((p-stagger)/(1-stagger));
   const split=w*(.47+Math.sin(index*1.77)*.045),offset=spread*(w*.62+index%3*24);
   ctx.drawImage(this.layer,0,y*this.ratio,split*this.ratio,row*this.ratio,-offset,y,split,row);
   ctx.drawImage(this.layer,split*this.ratio,y*this.ratio,(w-split)*this.ratio,row*this.ratio,split+offset,y,w-split,row);
  }
  ctx.globalAlpha=1;
 }
 tick(dt){
  this.time+=dt;
  const completed=this.loaded?this.sequence.advance(dt):null,phase=this.sequence.phase,p=this.sequence.progress;
  this.root.dataset.phase=phase;
  const reveal=phase==='data'?0:phase==='opening'?ease((p-.26)/.74):1;
  if(phase==='merging'&&p>.58&&!this.changed){this.changed=true;this.fitSelected();this.nodes[this.selectedIndex].button.lang=document.documentElement.lang;}
  this.frames=this.layout.map((base,i)=>{
   const node=this.nodes[i],floating=floatingCube(base,i,this.time,this.sequence.reducedMotion);
   const frame=phase==='merging'||phase==='ready'?mergeCube(this.origins[i],this.origins[this.selectedIndex],i,this.selectedIndex,phase==='ready'?1:p,this.width,this.height):{...floating,opacity:reveal};
   const scale=frame.size/base.size;
   node.button.style.left=frame.x+'px';node.button.style.top=frame.y+'px';node.button.style.width=base.size*1.65+'px';node.button.style.height=base.size*1.75+'px';node.button.style.setProperty('--caption-offset',base.size*.92+'px');
   node.scene.style.setProperty('--language-size',base.size+'px');node.scene.style.perspective=1200/scale+'px';node.scene.style.transform=`translate(-50%,-50%) scale(${scale})`;
   node.cube.style.transform=`rotateZ(${frame.roll}deg) rotateX(${frame.pitch}deg) rotateY(${frame.yaw}deg)`;
   node.button.style.opacity=frame.opacity;node.button.style.zIndex=phase==='merging'&&i===this.selectedIndex?'3':'1';
   node.label.style.opacity=phase==='merging'?1-ease(p/.24):1;node.button.disabled=phase!=='languages';node.button.tabIndex=phase==='languages'?0:-1;
   return frame;
  });
  this.paintData();return completed;
 }
}
