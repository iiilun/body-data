import {previewSize} from './unfold-transition.js?v=5.7.2';

export class UnfoldView{
 constructor(root){this.root=root;this.rig=root.querySelector('.unfold-rig');this.net=root.querySelector('.unfold-net');this.hinges={};}
 panel(face,svg,{core=false,axis='y'}={}){
  const panel=document.createElement('div');panel.className='unfold-panel'+(core?' unfold-core':'');panel.dataset.face=String(face);
  const inside=document.createElement('div');inside.className='unfold-surface unfold-inside';
  const outside=document.createElement('div');outside.className='unfold-surface unfold-outside';outside.style.transform=`rotate${axis.toUpperCase()}(180deg) translateZ(.35px)`;outside.append(svg.cloneNode(true));
  if(!core){const ghost=svg.cloneNode(true);ghost.classList.add('unfold-ghost');inside.append(ghost);}
  panel.append(inside,outside);return panel;
 }
 start({faces,bitmap,size,light=false,width,height}){
  this.net.replaceChildren();this.size=size;this.width=width;this.height=height;this.root.style.setProperty('--tile',size+'px');this.root.hidden=false;
  this.core=this.panel(1,faces[1],{core:true});const inside=this.core.firstElementChild;inside.style.background=light?'#fff':'#000';
  this.canvas=document.createElement('canvas');this.canvas.className='unfold-preview';this.setBitmap(bitmap);inside.append(this.canvas);this.net.append(this.core);
  for(const [name,face,axis]of [['left',3,'y'],['right',2,'y'],['top',4,'x'],['bottom',5,'x']]){
   const hinge=document.createElement('div');hinge.className='unfold-hinge';hinge.dataset.hinge=name;const panel=this.panel(face,faces[face],{axis});
   panel.style.transform=name==='left'?`translateX(${-size/2}px)`:name==='right'?`translateX(${size/2}px)`:name==='top'?`translateY(${-size/2}px)`:`translateY(${size/2}px)`;
   hinge.append(panel);this.hinges[name]=hinge;this.net.append(hinge);
  }
  const lid=document.createElement('div');lid.className='unfold-hinge';lid.dataset.hinge='lid';const panel=this.panel(0,faces[0],{axis:'x'});panel.style.transform=`translateY(${-size/2}px)`;lid.append(panel);this.hinges.top.append(lid);this.hinges.lid=lid;
  this.resize(width,height,size);
 }
 resize(width,height,size){
  this.size=size;this.width=width;this.height=height;this.root.style.setProperty('--tile',size+'px');
  if(this.canvas){const view=previewSize(width,height,size);this.canvas.style.width=view.width+'px';this.canvas.style.height=view.height+'px';}
  for(const name of ['left','right','top','bottom'])if(this.hinges[name])this.hinges[name].firstElementChild.style.transform=name==='left'?`translateX(${-size/2}px)`:name==='right'?`translateX(${size/2}px)`:name==='top'?`translateY(${-size/2}px)`:`translateY(${size/2}px)`;
  if(this.hinges.lid)this.hinges.lid.firstElementChild.style.transform=`translateY(${-size/2}px)`;
 }
 setBitmap(bitmap){if(this.canvas){this.bitmap=bitmap;this.canvas.width=bitmap.width;this.canvas.height=bitmap.height;const ctx=this.canvas.getContext('2d');if(bitmap.readingPixels)ctx.putImageData(bitmap.readingPixels,0,0);else ctx.drawImage(bitmap,0,0);}}
 get isFullPage(){return this.root.dataset.flat==='true';}
 readingProgress(progress){const p=this.bitmap?.readingProgress;if(!this.isFullPage||!p)return;const ctx=this.canvas.getContext('2d');ctx.save();ctx.scale(p.ratio,p.ratio);ctx.fillStyle=p.track;ctx.fillRect(p.x,p.y,p.width,p.height);ctx.fillStyle=p.fill;ctx.fillRect(p.x,p.y,p.width*Math.min(1,Math.max(0,progress)),p.height);ctx.restore();}
 draw(frame){
  const s=this.size;this.root.dataset.phase=frame.phase;this.rig.style.transform=`translateY(${frame.y}px) scale(${frame.scale}) rotateZ(${frame.roll}deg) rotateX(${frame.pitch}deg) rotateY(${frame.yaw}deg)`;
  this.net.style.transform=`translateZ(${frame.depth-s/2}px)`;this.core.style.setProperty('--edge',String(frame.edge));
  this.hinges.left.style.transform=`translateX(${-s/2}px) rotateY(${frame.left}deg)`;
  this.hinges.right.style.transform=`translateX(${s/2}px) rotateY(${frame.right}deg)`;
  this.hinges.top.style.transform=`translateY(${-s/2}px) rotateX(${frame.top}deg)`;
  this.hinges.bottom.style.transform=`translateY(${s/2}px) rotateX(${frame.bottom}deg)`;
  this.hinges.lid.style.transform=`translateY(${-s}px) rotateX(${frame.lid}deg)`;
 }
 showFullPage(){this.root.dataset.flat='true';this.rig.hidden=true;this.root.append(this.canvas);this.canvas.style.cssText='width:100%;height:100%;left:0;top:0;transform:none';}
 clear(){this.root.hidden=true;if(this.canvas?.parentElement===this.root)this.canvas.remove();this.rig.hidden=false;this.net.replaceChildren();this.canvas=null;this.bitmap=null;this.core=null;this.hinges={};delete this.root.dataset.phase;delete this.root.dataset.flat;}
}
