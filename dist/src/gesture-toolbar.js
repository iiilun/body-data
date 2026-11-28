const NS='http://www.w3.org/2000/svg';
const sides=['front','back','right','left','top','bottom'];
const definitions=[['back','back'],['fullscreen','fullscreen'],['sources-toggle','data'],['sources-close','close'],['prologue-continue','continue']];
export const TOOL_HAND_MARGIN=32;
export function toolHandBounds(box,width=Infinity,height=Infinity){return {left:Math.max(0,box.left-TOOL_HAND_MARGIN),top:Math.max(0,box.top-TOOL_HAND_MARGIN),right:Math.min(width,box.right+TOOL_HAND_MARGIN),bottom:Math.min(height,box.bottom+TOOL_HAND_MARGIN)};}
export const GESTURE_ICONS={
 back:'M27 16H6m9-9-9 9 9 9',
 close:'M27 16H6m9-9-9 9 9 9',
 continue:'M5 16h22M18 7l9 9-9 9',
 fullscreen:'M12 5H5v7m15-7h7v7M5 20v7h7m15-7v7h-7',
 data:'M16 4c-6.6 0-12 2.2-12 5s5.4 5 12 5 12-2.2 12-5S22.6 4 16 4Zm-12 5v14c0 2.8 5.4 5 12 5s12-2.2 12-5V9M4 16c0 2.8 5.4 5 12 5s12-2.2 12-5'
};
function icon(kind){const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');svg.classList.add('gesture-control-icon');const path=document.createElementNS(NS,'path');path.setAttribute('d',GESTURE_ICONS[kind]||GESTURE_ICONS.back);svg.append(path);return svg;}
function progressRing(){
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 88 88');svg.setAttribute('aria-hidden','true');svg.classList.add('gesture-control-progress');
 for(const name of ['gesture-control-track','gesture-control-meter']){const circle=document.createElementNS(NS,'circle');circle.classList.add(name);for(const [key,value]of Object.entries({cx:44,cy:44,r:39,pathLength:1}))circle.setAttribute(key,String(value));svg.append(circle);}return svg;
}
export class GestureToolbar{
 constructor(root=document){this.root=root;this.nodes=new Map();for(const [id,kind]of definitions){const button=root.getElementById?.(id)||root.querySelector?.('#'+id);if(button)this.nodes.set(id,{button,kind});}this.refresh();}
 refresh(){
  for(const [id,node]of this.nodes){const {button,kind}=node;button.classList.add('gesture-cube-button','gesture-cube-button--'+kind);button.dataset.input=kind==='fullscreen'?'click':'hand';if(kind==='fullscreen')delete button.dataset.gestureTarget;else button.dataset.gestureTarget=id;
   if(button.querySelector('.gesture-control-stage'))continue;
   const existing=button.textContent.trim();if(!button.getAttribute('aria-label')&&existing)button.setAttribute('aria-label',existing);
   const stage=document.createElement('span');stage.className='gesture-control-stage';stage.setAttribute('aria-hidden','true');const cube=document.createElement('span');cube.className='gesture-action-cube';
   for(const side of sides){const face=document.createElement('span');face.className='gesture-action-face gesture-action-face--'+side;face.append(icon(kind));cube.append(face);}stage.append(cube);button.replaceChildren(stage,...(kind==='fullscreen'?[]:[progressRing()]));
  }
 }
 setVisible(id,visible){const node=this.nodes.get(id);if(node)node.button.hidden=!visible;}
 setLabel(id,label){const node=this.nodes.get(id);if(node)node.button.setAttribute('aria-label',label);}
 getTargets(){
  const targets=[],modal=this.root.querySelector?.('dialog[open]');
  for(const [id,{button,kind}]of this.nodes){if(kind==='fullscreen'||button.hidden||button.disabled||modal&&!modal.contains(button)||!button.getClientRects().length)continue;const box=button.getBoundingClientRect();if(box.width<=0||box.height<=0)continue;targets.push({id,kind,priority:100,...toolHandBounds(box,this.root.defaultView?.innerWidth,this.root.defaultView?.innerHeight)});}
  return targets;
 }
 update(dwell){
  this.refresh();for(const [id,{button}]of this.nodes){const active=dwell?.highlight&&dwell.targetId===id;button.dataset.dwelling=String(!!active);button.style.setProperty('--gesture-progress',String(active?dwell.progress:0));}
 }
}
