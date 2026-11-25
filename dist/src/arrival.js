import {clamp} from './math.js?v=5.7.0';

export const LANGUAGE_CUBES=[
 {id:'en',name:'ENGLISH'}, {id:'es',name:'ESPAÑOL'}, {id:'fr',name:'FRANÇAIS'},
 {id:'zh',name:'繁體中文'}, {id:'ja',name:'日本語'}, {id:'ko',name:'한국어'}, {id:'ar',name:'العربية'}
];
export const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export const menuCubeSize=width=>width<=700?clamp(width*.5,210,300):clamp(width*.29,230,420);

// One ordered entry transaction. Returning to languages invalidates an unfinished selection.
export class ArrivalSequence{
 constructor({reducedMotion=false}={}){this.reducedMotion=reducedMotion;this.reset();}
 reset({languagesOnly=false}={}){this.phase=languagesOnly?'languages':'data';this.elapsed=0;this.selected=null;this.delivered=false;}
 get durations(){return this.reducedMotion?{data:.12,opening:.25,merging:.45}:{data:1.35,opening:1.9,merging:2.65};}
 select(language){
  if(this.phase!=='languages'||!LANGUAGE_CUBES.some(c=>c.id===language))return false;
  this.selected=language;this.phase='merging';this.elapsed=0;return true;
 }
 advance(dt){
  if(!Number.isFinite(dt)||dt<=0)return null;
  this.elapsed+=dt;
  for(const [phase,next]of [['data','opening'],['opening','languages'],['merging','ready']]){
   if(this.phase===phase&&this.elapsed>=this.durations[phase]){this.elapsed-=this.durations[phase];this.phase=next;}
  }
  if(this.phase==='ready'&&!this.delivered){this.delivered=true;return this.selected;}
  return null;
 }
 get progress(){return clamp(this.elapsed/(this.durations[this.phase]||1));}
}

export function languageLayout(width,height){
 const portrait=width/height<1.1;
 const points=portrait?[[.27,.13],[.73,.13],[.27,.35],[.73,.35],[.27,.57],[.73,.57],[.5,.8]]:
  [[.23,.25],[.5,.22],[.77,.25],[.13,.65],[.375,.68],[.625,.65],[.87,.68]];
 const size=portrait?Math.min(width*.16,height*.11,105):Math.min(width*.09,height*.15,140);
 return points.map(([x,y],i)=>({x:x*width,y:y*height,size,pitch:-19+i%3*5,yaw:-29+i*7,roll:-7+(i%3-1)*4}));
}

export function floatingCube(base,index,time,reducedMotion=false){
 if(reducedMotion)return {...base};
 return {...base,x:base.x+Math.sin(time*.31+index*1.7)*7,y:base.y+Math.sin(time*.45+index*1.3)*10,
  pitch:base.pitch+Math.sin(time*.23+index)*6,yaw:base.yaw+Math.sin(time*.19+index)*13};
}

export function mergeCube(from,chosen,index,selectedIndex,progress,width,height){
 const p=clamp(progress),gather=ease(p/.64),grow=ease((p-.28)/.72),centre=ease((p-.36)/.64),selected=index===selectedIndex;
 if(p===1)return {x:width/2,y:height/2,size:selected?menuCubeSize(width):1,pitch:selected?-18:from.pitch+110,
  yaw:selected?-28:from.yaw+150,roll:selected?-7:from.roll+45,opacity:selected?1:0};
 const target={x:chosen.x+(width/2-chosen.x)*centre,y:chosen.y+(height/2-chosen.y)*centre};
 if(selected)return {...target,size:from.size+(menuCubeSize(width)-from.size)*grow,pitch:from.pitch+(-18-from.pitch)*grow,
  yaw:from.yaw+(-28-from.yaw)*grow,roll:from.roll+(-7-from.roll)*grow,opacity:1};
 const arc=Math.sin(gather*Math.PI)*(index%2?1:-1)*Math.min(80,height*.09);
 return {x:from.x+(target.x-from.x)*gather,y:from.y+(target.y-from.y)*gather+arc,
  size:Math.max(1,from.size*(1-.96*gather)),pitch:from.pitch+110*gather,yaw:from.yaw+150*gather,roll:from.roll+45*gather,
  opacity:1-ease((p-.46)/.16)};
}
