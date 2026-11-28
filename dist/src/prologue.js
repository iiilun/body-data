import {prologueCopy,PROLOGUE_LOCALES,prologueLanguage} from './prologue-copy.js?v=5.10.1';

export const PROLOGUE_TIMING=Object.freeze({fact:5.5,minimumStory:4.5,readingTail:2.2,graphemesPerSecond:26,maxDelta:.1});
const clamp=value=>Math.max(0,Math.min(1,value));

export function graphemes(text,language='en'){
 if(typeof Intl.Segmenter==='function')return [...new Intl.Segmenter(PROLOGUE_LOCALES[prologueLanguage(language)],{granularity:'grapheme'}).segment(text)].map(part=>part.segment);
 const result=[];let join=false;
 for(const value of Array.from(text)){
  if(result.length&&(join||/[\p{Mark}\uFE0E\uFE0F]/u.test(value)||value==='\u200d'))result[result.length-1]+=value;
  else result.push(value);
  join=value==='\u200d';
 }
 return result;
}

function normaliseFact(fact,language){
 if(!fact||!['string','number'].includes(typeof fact.value)||typeof fact.value==='number'&&!Number.isFinite(fact.value)||String(fact.value).trim()==='')throw new TypeError('Each prologue fact requires a value.');
 for(const field of ['label','source','year','url'])if(fact[field]===null||fact[field]===undefined||!String(fact[field]).trim())throw new TypeError('Each prologue fact requires '+field+'.');
 let url;try{url=new URL(String(fact.url));}catch{throw new TypeError('Each prologue fact requires a source URL.');}
 if(!['https:','http:'].includes(url.protocol))throw new TypeError('Prologue source URLs must use HTTP or HTTPS.');
 const value=typeof fact.value==='number'?new Intl.NumberFormat(PROLOGUE_LOCALES[language],{notation:'compact',maximumFractionDigits:2}).format(fact.value):fact.value;
 return Object.freeze({value,label:String(fact.label),source:String(fact.source),year:String(fact.year),url:url.href});
}

// Facts are supplied explicitly after editorial selection. There are no default statistics.
export class PrologueSequence{
 constructor({reducedMotion=false}={}){this.reducedMotion=!!reducedMotion;this.reset();}
 reset(){this.elapsed=0;this.phases=[];this.facts=[];this.totalDuration=0;this.language='en';return this.snapshot();}
 start({facts,language='en',reducedMotion=this.reducedMotion}={}){
  if(!Array.isArray(facts)||facts.length!==2)throw new RangeError('The prologue requires exactly two selected facts.');
  const lang=prologueLanguage(language),selected=facts.map(fact=>normaliseFact(fact,lang));
  const stories=prologueCopy[lang].stories.map((text,index)=>{
   const units=graphemes(text,lang),duration=Math.max(PROLOGUE_TIMING.minimumStory,units.length/PROLOGUE_TIMING.graphemesPerSecond+PROLOGUE_TIMING.readingTail);
   return {kind:'story',index,text,units,duration,typingDuration:duration-PROLOGUE_TIMING.readingTail};
  });
  this.language=lang;this.facts=selected;this.reducedMotion=!!reducedMotion;this.elapsed=0;
  this.phases=[...selected.map((fact,index)=>({kind:'fact',index,fact,duration:PROLOGUE_TIMING.fact})),...stories];
  this.totalDuration=this.phases.reduce((total,phase)=>total+phase.duration,0);
  return this.snapshot();
 }
 update(dt){
  if(this.phases.length&&Number.isFinite(dt)&&dt>0)this.elapsed=Math.min(this.totalDuration,this.elapsed+Math.min(dt,PROLOGUE_TIMING.maxDelta));
  return this.snapshot();
 }
 snapshot(){
  const base={language:this.language,rtl:this.language==='ar',reducedMotion:this.reducedMotion,elapsed:this.elapsed,totalDuration:this.totalDuration,progress:this.totalDuration?clamp(this.elapsed/this.totalDuration):0};
  if(!this.phases.length)return {...base,phase:'idle',phaseKey:'idle',ready:false,fact:null,fullText:'',visibleText:'',opacity:0};
  const ready=this.elapsed+1e-8>=this.totalDuration;let start=0,index=0;
  while(index<this.phases.length-1&&this.elapsed+1e-8>=start+this.phases[index].duration){start+=this.phases[index].duration;index++;}
  const current=this.phases[index],phaseElapsed=Math.max(0,Math.min(current.duration,this.elapsed-start)),last=index===this.phases.length-1;
  const count=current.kind==='story'?(this.reducedMotion||ready?current.units.length:Math.min(current.units.length,Math.floor((phaseElapsed+1e-8)/current.typingDuration*current.units.length))):0;
  const opacity=ready||this.reducedMotion?1:clamp(phaseElapsed/.5)*(last?1:clamp((current.duration-phaseElapsed)/.32));
  return {...base,phase:ready?'ready':current.kind,phaseKey:current.kind+'-'+current.index,ready,index,factIndex:current.kind==='fact'?current.index:null,storyIndex:current.kind==='story'?current.index:null,
   fact:current.fact||null,fullText:current.text||'',visibleText:current.kind==='story'?current.units.slice(0,count).join(''):'',phaseElapsed,phaseDuration:current.duration,phaseProgress:clamp(phaseElapsed/current.duration),opacity};
 }
}
