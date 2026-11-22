import {dictionary,languages,locales} from './i18n.js?v=5.0.0';
import {clamp,pointToScreen} from './math.js?v=5.0.0';
import {DataService} from './data.js?v=5.0.0';
import {Renderer,demoPose} from './renderer.js?v=5.0.0';
import {BodyTracker} from './interaction.js?v=5.0.0';
import {copy,icon,icons,experienceMetric,facts,displayYear} from './experience.js?v=5.0.0';
import {Catalogue,words,vacantDefinitions} from './catalogue.js?v=5.0.0';
import {sceneWords} from './scene-copy.js?v=5.0.0';
import {GestureCube,PoseGate,poseMatch,FACE_SCENES} from './controls.js?v=5.0.0';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),topics=['shelter','hold','space','thirst','offline','vacant'];
const data=new DataService(),catalogue=new Catalogue(),renderer=new Renderer($('stage'));
const ui={state:'idle',scene:'',language:languages[params.get('lang')]?params.get('lang'):'en',demo:false,tracker:new BodyTracker(),cube:new GestureCube(),gate:new PoseGate(),pose:[],hands:[],mask:null,worker:null,stream:null,busy:false,visionReady:false,session:0,time:0,elapsed:0,introElapsed:0,resultElapsed:0,lastFrame:performance.now(),lastInference:0,lastVideoTime:-1,inferenceMs:0,frameErrors:0,modelProgress:0,booting:false,errorType:null,metric:null,cards:[],introPage:0,mouse:null,pointerFist:false,dragging:false,previewFist:0,gestureSeen:false,observer:{shelter:0,hold:0,space:0,thirst:0,offline:0,vacant:0},alignment:null,exitHold:0,loaded:false};
icons.fist='<path d="M17 58V43L8 29c-3-6 2-10 6-4l5 7V15c0-7 8-7 8 0v12V10c0-7 8-7 8 0v17V12c0-7 8-7 8 0v17V19c0-7 8-7 8 0v21c0 10-4 15-9 18z"/>';
icons.thirst='<path d="M32 4c-5 9-16 19-16 29a16 16 0 0 0 32 0C48 23 37 13 32 4zM5 44l13 14h28l13-14M24 36c0 6 4 10 8 10"/>';
icons.offline='<path d="M7 9h50v35H7zM21 57h22M32 44v13M9 61 55 3M16 22c10-9 22-9 32 0M25 30c4-4 10-4 14 0"/>';
icons.vacant='<path d="M7 58V24L32 5l25 19v34H7zM25 58V36h15v22M14 25h10v10H14zM44 25h7v10h-7z"/>';
const text=(id,value)=>{$(id).textContent=value??'';};
function title(scene){return dictionary(ui.language)[scene]?.title||words[ui.language][scene];}
function datum(scene){const m=catalogue.primary(scene,ui.language);if(scene==='shelter'&&m)m.rate=data.metric('en','shelter')?.rate||0;return m;}
function setState(state){
 ui.state=state;if(['idle','scanning'].includes(state))text('announcement','');if(state!=='scanning')document.querySelectorAll('.cube-face').forEach(el=>el.dataset.selected='false');document.body.dataset.state=state;document.body.dataset.scene=ui.scene;
 const menu=['idle','loading','scanning','error'].includes(state),ready=state==='scanning';
 $('entrance').hidden=!['idle','scanning'].includes(state);$('cube-scene').hidden=!['idle','loading','scanning'].includes(state);$('cube-guidance').hidden=!['idle','scanning'].includes(state);
 $('scan-copy').hidden=state!=='loading';$('error').hidden=state!=='error';$('briefing').hidden=!['briefing','result'].includes(state);$('alignment').hidden=state!=='align';
 $('scene-context').hidden=state!=='active';$('coach').hidden=true;$('hand-cursor').hidden=true;
 document.querySelector('.masthead').hidden=!menu;document.querySelector('.footer').hidden=!['idle','scanning','error'].includes(state);
 $('back').hidden=state==='idle';$('end').hidden=!ready;$('enter').hidden=ready;$('preview').hidden=ready;
 document.body.dataset.theme=['briefing','align','active','result'].includes(state)?ui.scene:'menu';translate();
}
function translate(){
 const d=dictionary(ui.language),w=words[ui.language],c=copy[ui.language];document.documentElement.lang=ui.language==='zh'?'zh-Hant':ui.language;document.body.dir=ui.language==='ar'?'rtl':'ltr';
 $('language').value=ui.language;$('language').setAttribute('aria-label',d.language);text('language-label',d.language);text('enter',d.enter);text('preview',d.preview);text('demo-badge',d.simulation);$('demo-badge').hidden=!ui.demo;
 text('end',d.end);text('sources-toggle',d.data);text('sources-title',d.data);text('retry',d.retry);text('scope',sceneWords[ui.language].globalData);text('entrance-title',d.home.join(' '));$('sources-close').setAttribute('aria-label',d.close);$('back').setAttribute('aria-label',d.back);
 $('stage').setAttribute('aria-label',ui.metric?ui.metric.title+' · '+ui.metric.short:'BODY / DATA');document.title='BODY / DATA'+(ui.demo?' · '+d.preview:'');
 document.querySelectorAll('.cube-face span').forEach((el,i)=>{el.replaceChildren();for(let n=0;n<4;n++){if(n)el.append(document.createElement('br'));el.append(document.createTextNode(title(FACE_SCENES[i])));}});
 $('menu-hint').innerHTML=icon('palm');$('menu-hint').append(document.createTextNode(ui.demo?w.preview:w.turn+' · '));if(!ui.demo){$('menu-hint').insertAdjacentHTML('beforeend',icon('fist'));$('menu-hint').append(document.createTextNode(w.grip));}
 updateCubeCaption();fitCube();
 if(['briefing','result'].includes(ui.state))renderBriefing();if(ui.state==='align'){text('align-title',w.align);text('align-action',ui.metric.action);}
 if(ui.state==='active')renderContext();
 if(ui.state==='error'){text('error-title',ui.errorType==='camera'?d.cameraError:d.modelError);text('error-message',ui.errorType==='unsupported'?d.notSupported:ui.errorType==='camera'?d.cameraHelp:d.modelHelp);}
 if($('sources-dialog').open)renderSources();
}
function fitCube(){const width=$('cube').offsetWidth||230,base=width*.215,ctx=document.createElement('canvas').getContext('2d');ctx.font=`700 ${base}px ${ui.language==='ar'?'"Noto Sans Arabic",Arial,sans-serif':'Helvetica,Arial,"Noto Sans JP",sans-serif'}`;document.querySelectorAll('.cube-face span').forEach((el,i)=>el.style.fontSize=Math.min(base,base*width*.98/Math.max(1,ctx.measureText(title(FACE_SCENES[i])).width))+'px');}
function updateCubeCaption(){const scene=FACE_SCENES[ui.cube.face];text('cube-caption',title(scene));$('cube-scene').setAttribute('aria-label',title(scene)+' · '+words[ui.language].grip);}
function cleanup(){ui.session++;ui.worker?.terminate();ui.worker=null;ui.visionReady=false;ui.busy=false;ui.booting=false;ui.stream?.getTracks().forEach(t=>t.stop());ui.stream=null;$('camera').srcObject=null;ui.tracker=new BodyTracker();ui.pose=[];ui.hands=[];ui.mask=null;}
function stop(){cleanup();ui.cube=new GestureCube();ui.demo=false;ui.scene='';ui.metric=null;ui.cards=[];renderer.reset('');renderer.cells=[];setState('idle');}
function menu(){if(!ui.stream&&!ui.demo){stop();return;}ui.scene='';ui.metric=null;ui.cards=[];ui.elapsed=0;ui.cube.reset();ui.exitHold=0;renderer.reset('');setState('scanning');}
function error(type,message){console.error('[BODY / DATA]',type,message);cleanup();ui.errorType=type;setState('error');}
async function startCamera(){
 if(ui.booting)return;cleanup();ui.demo=false;ui.booting=true;ui.modelProgress=0;setState('loading');const session=ui.session;
 if(!navigator.mediaDevices?.getUserMedia||typeof Worker==='undefined'||typeof createImageBitmap==='undefined'){error('unsupported','Browser APIs unavailable');return;}
 try{
  const request=navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1280},height:{ideal:720},aspectRatio:{ideal:innerWidth/innerHeight},frameRate:{ideal:30,max:30},facingMode:'user'}});
  request.then(stream=>{if(session!==ui.session)stream.getTracks().forEach(t=>t.stop())},()=>{});
  let timer,stream;try{stream=await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Camera request timed out')),45000)})])}finally{clearTimeout(timer)}
  if(session!==ui.session){stream.getTracks().forEach(t=>t.stop());return;}ui.stream=stream;$('camera').srcObject=stream;await $('camera').play();
  stream.getVideoTracks()[0].addEventListener('ended',()=>{if(session===ui.session)error('camera','Camera disconnected')});
 }catch(e){if(session===ui.session)error('camera',e);return;}
 try{
  ui.worker=new Worker(new URL('../vision-worker.js?v=5.0.0',import.meta.url));
  const timeout=setTimeout(()=>{if(session===ui.session&&!ui.visionReady)error('model','Vision initialization timed out')},90000);
  ui.worker.onmessage=({data:r})=>{
   if(session!==ui.session)return;if(r.type==='progress'){ui.modelProgress=r.value;return;}
   if(r.type==='ready'){clearTimeout(timeout);ui.visionReady=true;ui.booting=false;menu();return;}
   if(r.type==='result'){ui.busy=false;ui.frameErrors=0;ui.inferenceMs=r.elapsed;ui.tracker.update(r.landmarks,r.hands,r.handedness,r.timestamp,r.handTime);if(r.mask)ui.mask={data:r.mask,width:r.width,height:r.height,origin:r.landmarks?.[11]&&r.landmarks?.[12]?{x:(r.landmarks[11].x+r.landmarks[12].x)/2,y:(r.landmarks[11].y+r.landmarks[12].y)/2}:null,timestamp:r.timestamp};}
   else if(r.type==='skipped')ui.busy=false;else if(r.type==='frame-error'){ui.busy=false;if(++ui.frameErrors>=5)error('model',r.message)}else if(r.type==='error'){clearTimeout(timeout);error('model',r.message)}
  };
  ui.worker.onerror=e=>{clearTimeout(timeout);if(session===ui.session)error('model',e.message)};ui.worker.postMessage({type:'init'});
 }catch(e){if(session===ui.session)error('model',e)}
}
function preview(){cleanup();ui.demo=true;ui.cube.reset();ui.scene='';ui.metric=null;ui.cards=[];setState('scanning');}
function openBriefing(scene){
 if(!ui.loaded)return;ui.scene=scene;ui.metric=datum(scene);if(!ui.metric){error('model','No source data for '+scene);return;}
 ui.cards=catalogue.cards(scene,ui.language);ui.elapsed=0;ui.introElapsed=0;ui.introPage=0;ui.gate.reset();ui.gestureSeen=false;ui.exitHold=0;renderer.reset(scene);setState('briefing');text('announcement',ui.metric.title);
}
function renderBriefing(){
 const m=ui.metric;if(!m)return;const w=words[ui.language],result=ui.state==='result';$('brief-symbol').innerHTML=icon(ui.scene);text('brief-title',m.title);
 text('brief-scope',result?sceneWords[ui.language].resultContext:sceneWords[ui.language].globalData+' · '+w.variousYears);
 const shown=ui.cards.slice(result?0:ui.introPage*2,(result?0:ui.introPage*2)+2);
 let items=result&&renderer.result(ui.scene,ui.language,catalogue.rules)||shown.map(c=>({value:c.value,label:c.label+' · '+c.scope+' '+(c.yearText||c.year)}));
 const container=$('brief-facts');container.replaceChildren();container.classList.toggle('single',items.length===1);container.classList.toggle('triple',items.length===3);container.classList.toggle('quad',items.length===4);
 for(const fact of items){const div=document.createElement('div');div.className='brief-fact';const value=document.createElement('span');value.className='fact-value';value.textContent=fact.value;const label=document.createElement('p');label.className='fact-label';label.textContent=fact.label;div.append(value,label);container.append(div)}
 text('brief-unit','');$('brief-gesture').innerHTML=icon(ui.scene==='space'?'spread':ui.scene);
 text('brief-action',result?(ui.scene==='thirst'?sceneWords[ui.language].waterResult:m.note):m.action);text('brief-note',result?'':m.note);text('brief-source',result&&ui.scene==='thirst'?'WHO · '+sceneWords[ui.language].personDays:[...new Set(shown.map(c=>c.source))].join(' / '));requestAnimationFrame(fitFacts);
}
function fitFacts(){const values=[...document.querySelectorAll('.fact-value')];if(!values.length)return;const ctx=document.createElement('canvas').getContext('2d');const base=Math.min(innerHeight*(values.length>2?.10:.15),innerWidth*.105,145);let size=base;ctx.font=`300 ${base}px ${ui.language==='ar'?'"Noto Sans Arabic",Arial,sans-serif':'"Helvetica Neue",Helvetica,Arial,sans-serif'}`;for(const el of values)if(el.parentElement.clientWidth)size=Math.min(size,base*el.parentElement.clientWidth*.97/Math.max(1,ctx.measureText(el.textContent).width));$('brief-facts').style.setProperty('--fact-size',Math.max(36,size)+'px');}
function align(){ui.gate.reset();ui.alignment={ready:false,count:3,progress:0};setState('align');}
function activate(){if(ui.state!=='align')return;ui.elapsed=ui.demo?clamp(Number(params.get('time')||0),0,44):0;renderer.reset(ui.scene);setState('active');text('announcement',ui.metric.action);}
function finish(){ui.resultElapsed=0;ui.observer[ui.scene]++;setState('result');}
function renderContext(){text('context-unit',ui.metric.title);text('context-scope',sceneWords[ui.language].globalData+' · '+words[ui.language].variousYears);}
function renderSources(){
 const list=$('source-list'),d=dictionary(ui.language);list.replaceChildren();text('sources-scope',sceneWords[ui.language].globalData);
 for(const scene of topics){const m=datum(scene);if(!m)continue;const section=document.createElement('section');section.className='source-entry';const h=document.createElement('h3');h.textContent=m.title;section.append(h);
  const cards=catalogue.cards(scene,ui.language);
  for(const card of cards){for(const s of [card.value+' · '+card.label,card.scope+' · '+(card.yearText||card.year)+(card.coverage?' · '+d.coverage+' '+card.coverage:'')]){const p=document.createElement('p');p.textContent=s;section.append(p)}const a=document.createElement('a');a.href=card.url;a.textContent=card.source;a.target='_blank';a.rel='noopener noreferrer';section.append(a);}
  if(scene==='vacant'){const p=document.createElement('p');p.textContent=sceneWords[ui.language].vacantDefinition;section.prepend(p);section.prepend(h);}
  if(scene==='thirst'){const p=document.createElement('p');p.textContent=sceneWords[ui.language].waterDefinition;section.prepend(p);section.prepend(h);}
  list.append(section);
 }
}
async function sendFrame(now){
 const v=$('camera');if(!ui.visionReady||ui.busy||!ui.worker||v.readyState<2||document.hidden)return;if(now-ui.lastInference<Math.max(28,ui.inferenceMs*.85)||v.currentTime===ui.lastVideoTime)return;
 ui.busy=true;ui.lastInference=now;ui.lastVideoTime=v.currentTime;const session=ui.session;
 try{const bitmap=await createImageBitmap(v,{resizeWidth:480,resizeHeight:Math.round(480*v.videoHeight/v.videoWidth),resizeQuality:'low'});if(session!==ui.session||!ui.worker){bitmap.close();return;}ui.worker.postMessage({type:'frame',bitmap,timestamp:now,mode:ui.state==='scanning'?'menu':ui.state==='align'?'align':'active'},[bitmap]);}catch(e){ui.busy=false;if(++ui.frameErrors>=5)error('model',e)}
}
function coach(present){const c=copy[ui.language];let message=!present?c.bodyHint:ui.elapsed<7?sceneWords[ui.language][ui.scene+'Action']:'';if(ui.scene==='hold'&&renderer.physics.catches>1&&present)message='';$('coach').hidden=!message;if(message){text('coach-text',message);$('coach-icon').innerHTML=icon(ui.scene);}}
function tick(now){
 const dt=document.hidden?0:Math.min(.055,(now-ui.lastFrame)/1000);ui.lastFrame=now;ui.time+=dt;
 if(ui.demo){
  ui.pose=(renderer.preview?.pose||demoPose(ui.time,ui.scene||'hold')).map(p=>({...p}));
  if(ui.mouse&&['offline','space'].includes(ui.scene)&&ui.state==='active'){
   const centre=(ui.pose[11].x+ui.pose[12].x)/2,shift=clamp(1-ui.mouse.x/innerWidth,.18,.82)-centre;for(const p of ui.pose)p.x+=shift;
  }
  ui.hands=[ui.pose[15],ui.pose[16]].map((p,i)=>({...p,id:'demo-'+i,open:1,fist:false}));
  if(ui.mouse&&ui.state==='active'){
   const g=renderer.geometry(4/3),px=1-(ui.mouse.x-g.x)/g.width,py=(ui.mouse.y-g.y)/g.height,offsets=ui.scene==='thirst'?[-.09,.09]:[0];
   ui.hands=offsets.map((offset,i)=>({x:px+offset,y:py+(ui.scene==='thirst'&&i===1&&ui.pointerFist ? .2 : 0),id:'preview'+i,open:ui.pointerFist?0:1,fist:ui.pointerFist}));
  }
 }
 else{ui.pose=ui.tracker.pose(now);ui.hands=ui.tracker.hands(now);}
 const present=ui.demo||now-ui.tracker.lastBody<650;if(ui.stream&&!ui.demo)sendFrame(now);
 if(ui.state==='loading')$('scan-progress-fill').style.width=ui.modelProgress*100+'%';
 if(ui.state==='scanning'&&!$('sources-dialog').open){
  const hands=ui.demo?ui.mouse?[{x:ui.mouse.x/innerWidth,y:ui.mouse.y/innerHeight,id:'pointer',open:ui.previewFist>now?0:1,fist:ui.previewFist>now}]:[]:ui.hands.map(h=>({...h,x:1-h.x}));
  const selection=ui.cube.update(dt,hands);$('cube').style.transform=`rotateZ(-7deg) rotateX(${selection.pitch}deg) rotateY(${selection.yaw}deg)`;updateCubeCaption();document.querySelectorAll('.cube-face').forEach((el,i)=>el.dataset.selected=String(selection.highlight&&i===selection.face));$('grip-progress').style.width=selection.progress*100+'%';
  const p=hands[0];$('hand-cursor').hidden=!p;if(p){$('hand-cursor').style.transform=`translate(${p.x*innerWidth-22}px,${p.y*innerHeight-22}px)`;$('hand-cursor').querySelector('.cursor-ring').style.strokeDashoffset=113.1*(1-selection.progress);}
  if(selection.selected)openBriefing(selection.selected);
 }else if(ui.state==='briefing'){
  ui.introElapsed+=dt;const page=Math.min(1,Math.floor(ui.introElapsed/3));if(page!==ui.introPage){ui.introPage=page;renderBriefing();}$('brief-progress').querySelector('i').style.width=clamp(ui.introElapsed/6)*100+'%';if(ui.introElapsed>=6&&!(ui.demo&&params.get('intro')==='1'))align();
 }else if(ui.state==='align'){
  const aspect=ui.demo?4/3:$('camera').videoWidth/$('camera').videoHeight||16/9,g=renderer.geometry(aspect),pose=ui.pose.map(p=>{const q=pointToScreen(p,g);return {...p,x:q.x/innerWidth,y:q.y/innerHeight}});
  const match=ui.demo?{ready:params.get('frame')!=='1'}:poseMatch(ui.scene,pose);ui.alignment=ui.gate.update(dt,match,present);
  text('countdown',ui.alignment.ready?new Intl.NumberFormat(locales[ui.language]).format(ui.alignment.count):'');text('align-status',present?words[ui.language][ui.alignment.ready?'holdPose':'align']:copy[ui.language].bodyHint);
  if(ui.alignment.done)activate();
 }else if(ui.state==='active'){
  if(present&&!(ui.demo&&params.get('still')==='1'))ui.elapsed+=dt;coach(present);
  ui.exitHold=ui.hands.length>=2&&ui.hands.every(h=>h.fist&&h.y<(ui.pose[0]?.y??.2)+.15)?ui.exitHold+dt:0;
  if(ui.exitHold>1.5||!present&&now-ui.tracker.lastBody>10000)menu();else if(ui.elapsed>=45)finish();
 }else if(ui.state==='result'){ui.resultElapsed+=dt;if(ui.resultElapsed>7&&!(ui.demo&&params.get('result')==='1'))menu();}
 if(ui.state==='idle')$('cube').style.transform=`rotateZ(-7deg) rotateX(-12deg) rotateY(-20deg)`;
 const paused=$('sources-dialog').open||!present||ui.state==='result'||ui.demo&&params.get('still')==='1';
 renderer.render({time:ui.time,dt:paused?0:dt,state:ui.state,scene:ui.scene,elapsed:ui.elapsed,progress:clamp(ui.elapsed/45),pose:ui.pose,hands:ui.hands,mask:ui.mask,video:$('camera'),demo:ui.demo,dict:dictionary(ui.language),lang:ui.language,metric:ui.metric,cards:ui.cards,rules:catalogue.rules,present,alignment:ui.alignment});
 requestAnimationFrame(tick);
}
$('enter').addEventListener('click',startCamera);$('retry').addEventListener('click',startCamera);$('preview').addEventListener('click',preview);$('end').addEventListener('click',stop);$('back').addEventListener('click',menu);
$('language').addEventListener('change',e=>{ui.language=e.target.value;if(ui.scene){ui.metric=datum(ui.scene);ui.cards=catalogue.cards(ui.scene,ui.language);}translate();document.fonts.ready.then(()=>{fitCube();fitFacts();renderer.fontsChanged();})});$('sources-toggle').addEventListener('click',()=>{if(ui.loaded){renderSources();$('sources-dialog').showModal()}});$('sources-close').addEventListener('click',()=>$('sources-dialog').close());
$('sources-dialog').addEventListener('click',e=>{if(e.target===$('sources-dialog'))$('sources-dialog').close()});
window.addEventListener('pointermove',e=>{if(ui.demo&&(ui.state!=='scanning'||ui.dragging))ui.mouse={x:e.clientX,y:e.clientY};});
$('cube-scene').addEventListener('pointerdown',e=>{if(!ui.demo)return;ui.dragging=true;ui.mouse={x:e.clientX,y:e.clientY};$('cube-scene').setPointerCapture(e.pointerId);});window.addEventListener('pointerdown',e=>{if(ui.demo&&ui.state==='active'&&!e.target.closest('button,select,dialog')){ui.pointerFist=true;ui.mouse={x:e.clientX,y:e.clientY};renderer.previewGrip(e.clientX,e.clientY,true,ui.pose);}});window.addEventListener('pointerup',e=>{if(ui.demo&&ui.state==='active'&&ui.pointerFist){renderer.previewGrip(e.clientX,e.clientY,true,ui.pose);renderer.previewGrip(e.clientX,e.clientY,false,ui.pose);}ui.dragging=false;ui.pointerFist=false;if(ui.demo&&ui.state==='scanning'){ui.cube.anchor=null;ui.cube.last=null;ui.cube.stroke=null;}});
window.addEventListener('resize',()=>{renderer.resize();fitFacts();fitCube()});window.addEventListener('pagehide',cleanup);document.addEventListener('visibilitychange',()=>ui.lastFrame=performance.now());
window.addEventListener('keydown',e=>{
 if(e.target.matches('input,select,textarea')||$('sources-dialog').open)return;
 if(e.key==='Escape'&&ui.state!=='idle')ui.state==='scanning'?stop():menu();
 if(e.key.toLowerCase()==='f'){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}catch{}}
 if(ui.demo&&e.code==='Space'){e.preventDefault();if(ui.state==='scanning'){ui.mouse??={x:innerWidth/2,y:innerHeight/2};ui.previewFist=performance.now()+650;}else if(ui.state==='briefing')align();else if(ui.state==='align'&&params.get('frame')==='1')activate();}
 if(ui.demo&&/^[1-6]$/.test(e.key)){openBriefing(topics[Number(e.key)-1]);}
});
window.__artwork={get state(){return ui.state},get scene(){return ui.scene},get diagnostics(){return {preview:ui.demo,inferenceMs:ui.inferenceMs,hands:ui.hands.length,modelReady:ui.visionReady,catches:renderer.physics.catches,face:ui.cube.face,cards:ui.cards.length}}};
setState('idle');requestAnimationFrame(tick);Promise.all([data.load(),catalogue.load()]).then(()=>{ui.loaded=true;translate();if(params.get('demo')==='1'){preview();if(topics.includes(params.get('scene')))openBriefing(params.get('scene'))}}).catch(e=>error('model',e));

document.fonts.ready.then(()=>{fitCube();fitFacts();renderer.fontsChanged()});
