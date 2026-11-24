import test from 'node:test';
import assert from 'node:assert/strict';
import {Condensation,figureDepth,glassContact,mergeDrops,previewHand} from '../dist/src/glass-model.js';
import {BodyTracker} from '../dist/src/interaction.js';
import {framePose,poseMatch} from '../dist/src/controls.js';
import {sceneWords} from '../dist/src/scene-copy.js';
import {DataFlow} from '../dist/src/spatial-type.js';

const options={width:1000,height:600},hand=(x=300,y=250,id='a')=>({x,y,id,open:1,fist:false,contact:1,radius:55});
const at=(model,x,y)=>model.fog[Math.floor(y/model.height*model.rows)*model.cols+Math.floor(x/model.width*model.cols)];
test('glass begins fully fogged and rainfall alone cannot clear the data',()=>{const m=new Condensation();for(let i=0;i<180;i++)m.update(1/60,[],options);assert.equal(m.summary().clear,0);assert.ok(m.drops.length>200);assert.ok(m.drops.some(d=>d.r>.5&&d.r<1));});
test('two open palms clear continuous feathered tracks rather than isolated stamps',()=>{
 const m=new Condensation();for(let x=200;x<=800;x+=75)m.update(1/60,[hand(x),hand(1000-x,420,'b')],options);
 for(let x=200;x<800;x+=35){assert.ok(at(m,x,250)<.08);assert.ok(at(m,x,420)<.08);}assert.ok(at(m,500,100)>.95);assert.ok(m.summary().clear>.1);
});
test('a closed fist or a withdrawn hand does not wipe the surface',()=>{for(const h of [{...hand(),fist:true},{...hand(),contact:.1}]){const m=new Condensation();for(let i=0;i<30;i++)m.update(1/60,[h],options);assert.equal(m.summary().clear,0);}});
test('cleared glass stays clear briefly then slowly condenses while retaining its session maximum',()=>{
 const m=new Condensation();for(let i=0;i<5;i++)m.update(1/60,[hand()],options);const initial=at(m,300,250),best=m.best;
 for(let i=0;i<120;i++)m.update(1/60,[],options);assert.equal(at(m,300,250),initial);
 for(let i=0;i<360;i++)m.update(1/60,[],options);assert.ok(at(m,300,250)>initial+.07&&at(m,300,250)<.3);assert.equal(m.best,best);
});
test('tracking loss and a distant reacquisition do not erase a line across the glass',()=>{
 const m=new Condensation();m.update(1/60,[hand(100)],options);m.update(1/60,[],options);m.update(1/60,[hand(900)],options);assert.equal(at(m,500,250),1);
});
test('full screen resizing preserves the wiped region instead of restarting the surface',()=>{
 const m=new Condensation();m.update(1/60,[hand()],options);const value=at(m,300,250);m.resize(1600,960);assert.ok(Math.abs(at(m,480,400)-value)<.01);assert.equal(m.previous.size,0);
});
test('wiping pushes water beads towards the edge and larger drops descend under gravity',()=>{
 const m=new Condensation();m.resize(1000,600);m.drops=[{id:77,x:300,y:250,r:4,vx:0,vy:0,oldY:250}];m.update(1/60,[hand()],options);const drop=m.drops[0];assert.ok(Math.hypot(drop.x-300,drop.y-250)>50);const y=drop.y;for(let i=0;i<60;i++)m.update(1/60,[],options);assert.ok(drop.y>y+10);
});
test('coalescence conserves bead volume and momentum',()=>{
 const a={x:100,y:100,r:2,vx:3,vy:4},b={x:102,y:101,r:3,vx:-2,vy:6},m=mergeDrops(a,b);assert.ok(Math.abs(m.r**3-a.r**3-b.r**3)<1e-10);assert.ok(Math.abs(m.vy*(a.r**3+b.r**3)-(a.vy*a.r**3+b.vy*b.r**3))<1e-10);
});
test('distance softens the silhouette while approaching palms gain contact without treating hand z as absolute depth',()=>{
 const near=framePose('thirst'),far=near.map(p=>({...p,x:.5+(p.x-.5)*.6}));assert.ok(figureDepth(far,720).blur>figureDepth(near,720).blur);
 const p=framePose('thirst');p[11].z=p[12].z=0;p[15].z=0;const h={...previewHand(p[15].x,p[15].y,.04),span:.035};const weak=glassContact(h,p);p[15].z=-.4;assert.ok(glassContact(h,p)>weak);assert.ok(glassContact({...h,span:.09},p)>glassContact(h,p));assert.equal(glassContact({...h,landmarks:h.landmarks.map(q=>({...q,z:-20}))},p),glassContact(h,p));
});
test('the tracker keeps all 21 monochrome hand outline points aligned with its smoothed palm',()=>{
 const tracker=new BodyTracker(),h=previewHand(.4,.4,.05);tracker.updateHands([h.landmarks],[],100,[[{categoryName:'Open_Palm',score:.99}]]);tracker.updateHands([h.landmarks.map(p=>({...p,x:p.x+.05}))],[],140,[[{categoryName:'Open_Palm',score:.99}]]);
 const out=tracker.hands(155)[0],centre=[0,5,9,13,17].reduce((p,i)=>({x:p.x+out.landmarks[i].x/5,y:p.y+out.landmarks[i].y/5}),{x:0,y:0});assert.equal(out.landmarks.length,21);assert.ok(Math.abs(centre.x-out.x)<1e-10&&Math.abs(centre.y-out.y)<1e-10);assert.ok(out.span>0);assert.equal(out.open,1);
});
test('water onboarding requests a glass wiping pose and all seven languages name the new interaction',()=>{
 assert.equal(poseMatch('thirst',framePose('thirst')).ready,true);const p=framePose('thirst');p[15].y=p[16].y=.9;assert.equal(poseMatch('thirst',p).ready,false);
 for(const w of Object.values(sceneWords)){assert.ok(w.glassCleared.length>3&&w.glassBest.length>3);assert.ok(w.thirstAction.length>4&&w.waterDefinition.length>40);}assert.match(sceneWords.en.thirstAction,/WIPE THE GLASS/);assert.doesNotMatch(sceneWords.en.thirstNote,/bucket|litres/i);
});
test('Arabic water facts keep complete phrases and numeric sequences in one bidirectional run',()=>{
 const flow=new DataFlow(),card={value:'٢٦٫٣٣٪',label:'دون مياه شرب مدارة بأمان',scope:'العالم',year:'٢٠٢٤'};flow.build(1000,600,24,[card],s=>s.length*10);assert.equal(flow.lanes[0].rtl,true);assert.ok(flow.lanes[0].items.every(g=>g.char.includes(card.value)&&g.char.includes(card.label)&&g.char.includes(card.year)));
});
