import {prologueCopy,PROLOGUE_LOCALES,prologueLanguage} from './prologue-copy.js?v=5.10.1';

const NS='http://www.w3.org/2000/svg',sides=['front','back','right','left','top','bottom'];
function node(doc,tag,className){const element=doc.createElement(tag);if(className)element.className=className;return element;}
function svg(doc,tag,attributes){const element=doc.createElementNS(NS,tag);for(const [key,value]of Object.entries(attributes))element.setAttribute(key,String(value));return element;}
function setText(element,value){if(element.textContent!==value)element.textContent=value;}

export class PrologueView{
 constructor(root){
  this.root=root;this.doc=root.ownerDocument;root.classList.add('prologue');root.dataset.phase='idle';this.key=null;
  this.brand=node(this.doc,'p','prologue-brand');this.brand.textContent='BODY / DATA';
  this.content=node(this.doc,'div','prologue-content');this.fact=node(this.doc,'div','prologue-fact');
  this.value=node(this.doc,'div','prologue-value');this.value.dir='auto';this.label=node(this.doc,'p','prologue-label');
  this.citation=node(this.doc,'p','prologue-citation');this.source=node(this.doc,'a');this.source.target='_blank';this.source.rel='noopener noreferrer';this.year=node(this.doc,'span');this.citation.append(this.source,this.year);this.fact.append(this.value,this.label,this.citation);
  this.story=node(this.doc,'div','prologue-story');this.sizer=node(this.doc,'p','prologue-story-sizer');this.sizer.setAttribute('aria-hidden','true');
  this.typed=node(this.doc,'p','prologue-story-text');this.typed.setAttribute('aria-hidden','true');this.readable=node(this.doc,'p','prologue-readable');this.readable.setAttribute('aria-live','polite');this.readable.setAttribute('aria-atomic','true');this.story.append(this.sizer,this.typed,this.readable);this.content.append(this.fact,this.story);
  this.continueButton=this.makeContinue();this.progress=node(this.doc,'div','prologue-progress');this.progress.setAttribute('aria-hidden','true');this.meter=node(this.doc,'i');this.progress.append(this.meter);
  root.replaceChildren(this.brand,this.content,this.continueButton,this.progress);
  this.measure=this.doc.createElement('canvas').getContext('2d');
  this.onResize=()=>this.fitValue();this.doc.defaultView?.addEventListener('resize',this.onResize);
 }
 makeContinue(){
  const button=node(this.doc,'button','gesture-cube-button prologue-continue');button.id='prologue-continue';button.type='button';button.hidden=true;button.dataset.gestureTarget='prologue-continue';
  const stage=node(this.doc,'span','gesture-control-stage');stage.setAttribute('aria-hidden','true');const cube=node(this.doc,'span','gesture-action-cube');
  for(const side of sides){const face=node(this.doc,'span','gesture-action-face gesture-action-face--'+side),icon=svg(this.doc,'svg',{viewBox:'0 0 32 32','aria-hidden':'true'});icon.classList.add('prologue-continue-icon');icon.append(svg(this.doc,'path',{d:'M5 16h22M18 7l9 9-9 9'}));face.append(icon);cube.append(face);}stage.append(cube);
  const ring=svg(this.doc,'svg',{viewBox:'0 0 88 88','aria-hidden':'true'});ring.classList.add('gesture-control-progress');
  for(const name of ['gesture-control-track','gesture-control-meter']){const circle=svg(this.doc,'circle',{cx:44,cy:44,r:39,pathLength:1});circle.classList.add(name);ring.append(circle);}button.append(stage,ring);return button;
 }
 start(snapshot){this.key=null;this.setProgress(0,false);return this.update(snapshot);}
 update(snapshot){
  if(!snapshot)return;
  const language=prologueLanguage(snapshot.language),copy=prologueCopy[language],phase=snapshot.phase;
  this.root.lang=PROLOGUE_LOCALES[language];this.root.dir=snapshot.rtl?'rtl':'ltr';this.root.dataset.phase=phase;this.root.dataset.reducedMotion=String(!!snapshot.reducedMotion);this.root.setAttribute('aria-label',copy.title);
  this.continueButton.setAttribute('aria-label',copy.continue);this.continueButton.hidden=!snapshot.ready;
  this.fact.hidden=phase!=='fact';this.story.hidden=!['story','ready'].includes(phase);this.content.style.opacity=String(snapshot.opacity??1);this.meter.style.width=Math.max(0,Math.min(1,snapshot.progress||0))*100+'%';
  if(this.key!==snapshot.phaseKey){
   this.key=snapshot.phaseKey;
   if(snapshot.fact){setText(this.value,snapshot.fact.value);setText(this.label,snapshot.fact.label);setText(this.source,snapshot.fact.source);this.source.href=snapshot.fact.url;setText(this.year,' · '+snapshot.fact.year);this.fitValue();}
   setText(this.sizer,snapshot.fullText||'');setText(this.readable,snapshot.fullText||'');
  }
  setText(this.typed,snapshot.visibleText||'');return snapshot;
 }
 fitValue(){
  if(!this.measure||!this.value.textContent)return;
  const view=this.doc.defaultView,width=this.root.clientWidth||view?.innerWidth||1280,height=this.root.clientHeight||view?.innerHeight||720;
  const preferred=Math.min(height*.43,width*.255,400),padding=Math.max(24,Math.min(64,width*.05)),family=this.root.lang==='ar'?'"Noto Sans Arabic",Arial,sans-serif':'"Helvetica Neue",Helvetica,Arial,sans-serif';
  this.measure.font=`300 ${preferred}px ${family}`;const measured=this.measure.measureText(this.value.textContent).width;
  this.root.style.setProperty('--prologue-value-size',Math.min(preferred,preferred*(width-padding*2)/Math.max(1,measured))+'px');
 }
 setProgress(progress=0,active=false){this.continueButton.dataset.dwelling=String(!!active||progress>0);this.continueButton.style.setProperty('--gesture-progress',String(Math.max(0,Math.min(1,progress||0))));}
 destroy(){this.doc.defaultView?.removeEventListener('resize',this.onResize);}
}
