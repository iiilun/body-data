import test from 'node:test';
import assert from 'node:assert/strict';
import {PrologueSequence,PROLOGUE_TIMING,graphemes} from '../dist/src/prologue.js';
import {prologueCopy} from '../dist/src/prologue-copy.js';
import {OPENING_FACTS,openingFacts} from '../dist/src/prologue-facts.js';

const facts=[{value:1234567,label:'SELECTED FACT A',source:'OFFICIAL SOURCE A',year:2024,url:'https://example.org/a'},{value:'42%',label:'SELECTED FACT B',source:'OFFICIAL SOURCE B',year:2023,url:'https://example.org/b'}];
test('large Chinese opening figures retain two meaningful decimal places',()=>{
 const sequence=new PrologueSequence();assert.equal(sequence.start({facts:[{...facts[0],value:106000000},facts[1]],language:'zh'}).fact.value,'1.06億');
 assert.equal(sequence.start({facts:[{...facts[0],value:708000000},facts[1]],language:'zh'}).fact.value,'7.08億');
});
function advance(sequence,seconds){let result;for(let i=0;i<Math.round(seconds*100);i++)result=sequence.update(.01);return result;}
test('the selected opening keeps F then C, with global estimates and the correct observation years in every language',()=>{
 assert.deepEqual(OPENING_FACTS.map(fact=>[fact.id,fact.value,fact.year]),[['offline-world-2026',2000000000,2026],['child-labour-world-2024',138000000,2024]]);
 for(const language of Object.keys(prologueCopy)){const selected=openingFacts(language);assert.equal(selected.length,2);assert.ok(selected.every(fact=>fact.label&&fact.year&&fact.estimate));const sequence=new PrologueSequence();assert.equal(sequence.start({facts:selected,language}).phase,'fact');advance(sequence,5.5);assert.equal(sequence.snapshot().fact.source,'ILO / UNICEF');}
 assert.equal(openingFacts('zh')[0].year,'2026 估計');assert.equal(openingFacts('zh')[1].year,'2024 估計');
});

test('the prologue cannot start without exactly two explicitly selected and sourced facts',()=>{
 const sequence=new PrologueSequence();assert.equal(sequence.snapshot().phase,'idle');assert.throws(()=>sequence.start(),RangeError);assert.throws(()=>sequence.start({facts:[]}),RangeError);assert.throws(()=>sequence.start({facts:[facts[0]]}),RangeError);
 assert.throws(()=>sequence.start({facts:[facts[0],{...facts[1],source:''}]}),TypeError);assert.throws(()=>sequence.start({facts:[facts[0],{...facts[1],url:'javascript:alert(1)'}]}),TypeError);
 assert.equal(sequence.start({facts}).fact.label,facts[0].label);
});
test('two facts each occupy their own 5.5 second page before any story begins',()=>{
 const sequence=new PrologueSequence();let frame=sequence.start({facts});assert.equal(frame.phase,'fact');assert.equal(frame.factIndex,0);assert.equal(frame.fact.value,'1.23M');
 frame=advance(sequence,5.49);assert.equal(frame.factIndex,0);frame=sequence.update(.01);assert.equal(frame.factIndex,1);assert.equal(frame.fact.value,'42%');frame=advance(sequence,5.5);assert.equal(frame.phase,'story');assert.equal(frame.storyIndex,0);assert.equal(frame.visibleText,'');
});
test('a zero delta pauses typing and large, negative or invalid deltas never skip the sequence',()=>{
 const sequence=new PrologueSequence();sequence.start({facts});advance(sequence,11.5);const before=sequence.snapshot();assert.deepEqual(sequence.update(0),before);assert.deepEqual(sequence.update(NaN),before);assert.deepEqual(sequence.update(-4),before);assert.deepEqual(sequence.update(Infinity),before);
 assert.ok(Math.abs(sequence.update(50).elapsed-before.elapsed-PROLOGUE_TIMING.maxDelta)<1e-8);assert.equal(sequence.snapshot().ready,false);
});
test('every language has five complete stories, stable grapheme typing and a final reading tail',()=>{
 for(const language of ['en','es','fr','zh','ja','ko','ar']){
  const sequence=new PrologueSequence(),start=sequence.start({facts,language});assert.equal(start.rtl,language==='ar');assert.equal(prologueCopy[language].stories.length,5);advance(sequence,11);
  for(let i=0;i<5;i++){
   const frame=sequence.snapshot();assert.equal(frame.storyIndex,i);assert.equal(frame.fullText,prologueCopy[language].stories[i]);assert.ok(frame.phaseDuration>=4.5);
   const remaining=frame.phaseDuration-frame.phaseElapsed;advance(sequence,Math.max(0,remaining-2.1));const reading=sequence.snapshot();assert.equal(reading.visibleText,reading.fullText,language+' has complete text during its reading tail');
   advance(sequence,sequence.snapshot().phaseDuration-sequence.snapshot().phaseElapsed+.01);
  }
  const end=sequence.snapshot();assert.equal(end.phase,'ready');assert.equal(end.ready,true);assert.equal(end.progress,1);assert.equal(end.visibleText,prologueCopy[language].stories[4]);assert.deepEqual(sequence.update(50),end);
 }
 assert.deepEqual(graphemes('A👩‍👩‍👧‍👦e\u0301','en'),['A','👩‍👩‍👧‍👦','e\u0301']);assert.equal(graphemes('نَ','ar').length,1);
});
test('reduced motion shows whole sentences without shortening reading time or auto-continuing',()=>{
 const normal=new PrologueSequence(),reduced=new PrologueSequence({reducedMotion:true});normal.start({facts,language:'ar'});reduced.start({facts,language:'ar'});advance(normal,11);advance(reduced,11);
 assert.equal(normal.snapshot().visibleText,'');assert.equal(reduced.snapshot().visibleText,reduced.snapshot().fullText);assert.equal(normal.totalDuration,reduced.totalDuration);assert.equal(reduced.snapshot().ready,false);
 reduced.reset();assert.equal(reduced.snapshot().phase,'idle');assert.equal(reduced.snapshot().progress,0);
});
