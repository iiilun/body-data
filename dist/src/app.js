import {dictionary,languages,locales} from './i18n.js?v=5.4.2';
import {clamp,pointToScreen} from './math.js?v=5.4.2';
import {DataService} from './data.js?v=5.4.2';
import {Renderer,demoPose} from './renderer.js?v=5.4.2';
import {BodyTracker} from './interaction.js?v=5.4.2';
import {copy,icon,icons,experienceMetric,facts,displayYear} from './experience.js?v=5.4.2';
import {Catalogue,words,vacantDefinitions} from './catalogue.js?v=5.4.2';
import {sceneWords} from './scene-copy.js?v=5.4.2';
import {previewHand} from './glass-model.js?v=5.4.2';
import {faceAtPoint,menuPointer,faceTypography,menuCopy} from './menu-view.js?v=5.4.2';
import {GestureCube,PoseGate,poseMatch,FACE_SCENES} from './controls.js?v=5.4.2';
import {ArrivalView} from './arrival-view.js?v=5.4.2';
import {SceneTransition,cubeRasterDetail} from './scene-transition.js?v=5.4.2';
import {menuCubeSize} from './arrival.js?v=5.4.2';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),topics=['shelter','hold','space','thirst','offline','vacant'];
const data=new DataService(),catalogue=new Catalogue(),renderer=new Renderer($('stage'));
const ui={state:'arrival',entranceComplete:false,previewRequested:params.get('demo')==='1',scene:'',language:languages[params.get('lang')]?params.get('lang'):'en',demo:false,tracker:new BodyTracker(),cube:new GestureCube(),gate:new PoseGate(),pose:[],hands:[],mask:null,worker:null,stream:null,busy:false,visionReady:false,session:0,time:0,elapsed:0,introElapsed:0,resultElapsed:0,lastFrame:performance.now(),lastInference:0,lastVideoTime:-1,inferenceMs:0,frameErrors:0,modelProgress:0,booting:false,errorType:null,metric:null,cards:[],introPage:0,mouse:null,pointerFist:false,dragging:false,gestureSeen:false,observer:{shelter:0,hold:0,space:0,thirst:0,offline:0,vacant:0},alignment:null,exitHold:0,loaded:false,statsKey:'',resultReason:'time'};
const sceneTransition=new SceneTransition({reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
const arrival=new ArrivalView($('arrival'),{onSelect:language=>{ui.language=language;translate();},titles:()=>FACE_SCENES.map(title)});
icons.fist='<path d="M17 58V43L8 29c-3-6 2-10 6-4l5 7V15c0-7 8-7 8 0v12V10c0-7 8-7 8 0v17V12c0-7 8-7 8 0v17V19c0-7 8-7 8 0v21c0 10-4 15-9 18z"/>';
icons.thirst='<path d="M6 21V6h15M43 6h15v15M58 43v15H43M21 58H6V43M20 46V31c0-4 5-4 5 0v5-18c0-4 5-4 5 0v15-20c0-4 5-4 5 0v20-17c0-4 5-4 5 0v18-11c0-4 5-4 5 0v18c0 9-5 15-12 15s-13-5-13-10z"/>';
icons.offline='<path d="M7 9h50v35H7zM21 57h22M32 44v13M9 61 55 3M16 22c10-9 22-9 32 0M25 30c4-4 10-4 14 0"/>';
icons.vacant='<path d="M7 58V24L32 5l25 19v34H7zM25 58V36h15v22M14 25h10v10H14zM44 25h7v10h-7z"/>';
const text=(id,value)=>{$(id).textContent=value??'';};
function title(scene){return dictionary(ui.language)[scene]?.title||words[ui.language][scene];}
function datum(scene){const m=catalogue.primary(scene,ui.language);if(scene==='shelter'&&m)m.rate=data.metric('en','shelter')?.rate||0;return m;}
function setState(state){
 if(state!=='scene-transition')clearSceneTransition();
 ui.state=state;if(['idle','scanning'].includes(state))text('announcement','');if(state!=='scanning')document.querySelectorAll('.cube-face').forEach(el=>el.dataset.selected='false');document.body.dataset.state=state;document.body.dataset.scene=ui.scene;
 const menu=['idle','loading','scanning','error'].includes(state),ready=state==='scanning';
 $('arrival').hidden=state!=='arrival';$('entrance').hidden=state!=='error';$('cube-scene').hidden=!['idle','loading','scanning','scene-transition'].includes(state);$('cube-guidance').hidden=!['idle','scanning'].includes(state);
 $('scan-copy').hidden=state!=='loading';$('error').hidden=state!=='error';$('briefing').hidden=!['briefing','result'].includes(state);$('alignment').hidden=state!=='align';
 $('scene-context').hidden=true;$('coach').hidden=true;$('hand-cursor').hidden=true;
 document.querySelector('.masthead').hidden=!menu;document.querySelector('.footer').hidden=!['idle','scanning','error'].includes(state);
 $('back').hidden=['arrival','idle'].includes(state);$('end').hidden=!ready;$('preview').hidden=state!=='error'||!ui.loaded||!ui.entranceComplete;
 document.body.dataset.theme=['briefing','align','active','result'].includes(state)?ui.scene:'menu';translate();
}
function translate(){
 const d=dictionary(ui.language),w=words[ui.language],c=copy[ui.language];document.documentElement.lang=ui.language==='zh'?'zh-Hant':ui.language;document.body.dir=ui.language==='ar'?'rtl':'ltr';
 text('preview',d.preview);text('demo-badge',d.simulation);$('demo-badge').hidden=!ui.demo;
 text('end',d.end);text('sources-toggle',d.data);text('sources-title',d.data);text('retry',d.retry);text('scope',sceneWords[ui.language].globalData);text('entrance-title',d.home.join(' '));$('sources-close').setAttribute('aria-label',d.close);$('back').setAttribute('aria-label',d.back);$('fullscreen').setAttribute('aria-label',d.fullscreen);
 $('stage').setAttribute('aria-label',ui.metric?ui.metric.title+' · '+ui.metric.short:'BODY / DATA');document.title='BODY / DATA'+(ui.demo?' · '+d.preview:'');
 const hint=menuCopy[ui.language];$('menu-hint').innerHTML=icon('fist');$('menu-hint').append(document.createTextNode(ui.demo?hint.preview:hint.drag+' · '));if(!ui.demo){$('menu-hint').insertAdjacentHTML('beforeend',icon('palm'));$('menu-hint').append(document.createTextNode(hint.dwell));}
 updateCubeCaption();fitCube();
 if(['briefing','result','scene-transition'].includes(ui.state))renderBriefing();if(ui.state==='align'){text('align-title',w.align);text('align-action',ui.metric.action);}
 if(ui.state==='active')renderContext();
 if(ui.state==='error'&&ui.errorType==='data'){text('error-title','DATA UNAVAILABLE.');text('error-message','Please check your connection and try again.');}
 else if(ui.state==='error'){text('error-title',ui.errorType==='camera'?d.cameraError:d.modelError);text('error-message',ui.errorType==='unsupported'?d.notSupported:ui.errorType==='camera'?d.cameraHelp:d.modelHelp);}
 if($('sources-dialog').open)renderSources();
}
function fitCube(){
 const width=(ui.state==='scene-transition'?sceneTransition.size:$('cube').offsetWidth)||230,ctx=document.createElement('canvas').getContext('2d'),font=ui.language==='ar'?'"Noto Sans Arabic",Arial,sans-serif':'Helvetica,Arial,"Noto Sans JP",sans-serif';
 document.querySelectorAll('.cube-face > span').forEach((el,i)=>{
  const name=title(FACE_SCENES[i]),layout=faceTypography(name,width,(text,size)=>{ctx.font=`700 ${size}px ${font}`;return ctx.measureText(text).width;});
  el.replaceChildren();el.style.setProperty('--face-font',layout.font+'px');el.style.setProperty('--face-row',layout.lineHeight+'px');el.style.fontSize='calc(var(--face-font) * var(--cube-detail, 1))';el.style.lineHeight='calc(var(--face-row) * var(--cube-detail, 1))';el.setAttribute('aria-hidden','true');el.parentElement.setAttribute('aria-label',name);
  for(let n=0;n<layout.rows;n++){const row=document.createElement('b');row.textContent=layout.text;el.append(row);}
 });
}
function updateCubeCaption(){const scene=FACE_SCENES[ui.cube.face];text('cube-caption',title(scene));$('cube-scene').setAttribute('aria-label',title(scene)+' · '+menuCopy[ui.language].dwell);}
function cleanup(){ui.session++;ui.worker?.terminate();ui.worker=null;ui.visionReady=false;ui.busy=false;ui.booting=false;ui.stream?.getTracks().forEach(t=>t.stop());ui.stream=null;$('camera').srcObject=null;ui.tracker=new BodyTracker();ui.pose=[];ui.hands=[];ui.mask=null;}
function stop(){cleanup();ui.entranceComplete=false;ui.cube=new GestureCube();ui.demo=false;ui.scene='';ui.metric=null;ui.cards=[];ui.mouse=null;ui.dragging=false;ui.pointerFist=false;renderer.reset('');renderer.cells=[];arrival.reset();setState('arrival');}
function menu(preserveOrientation=false){if(!ui.stream&&!ui.demo){stop();return;}ui.scene='';ui.metric=null;ui.cards=[];ui.elapsed=0;if(!preserveOrientation)ui.cube.reset();ui.exitHold=0;renderer.reset('');setState('scanning');}
function error(type,message){console.error('[BODY / DATA]',type,message);cleanup();ui.errorType=type;setState('error');}
async function startCamera(){
 if(!ui.entranceComplete||!ui.loaded||ui.booting)return;cleanup();ui.demo=false;ui.booting=true;ui.modelProgress=0;setState('loading');const session=ui.session;
 if(!navigator.mediaDevices?.getUserMedia||typeof Worker==='undefined'||typeof createImageBitmap==='undefined'){error('unsupported','Browser APIs unavailable');return;}
 try{
  const request=navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1280},height:{ideal:720},aspectRatio:{ideal:innerWidth/innerHeight},frameRate:{ideal:30,max:30},facingMode:'user'}});
  request.then(stream=>{if(session!==ui.session)stream.getTracks().forEach(t=>t.stop())},()=>{});
  let timer,stream;try{stream=await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Camera request timed out')),45000)})])}finally{clearTimeout(timer)}
  if(session!==ui.session){stream.getTracks().forEach(t=>t.stop());return;}ui.stream=stream;$('camera').srcObject=stream;await $('camera').play();
  stream.getVideoTracks()[0].addEventListener('ended',()=>{if(session===ui.session)error('camera','Camera disconnected')});
 }catch(e){if(session===ui.session)error('camera',e);return;}
 try{
  ui.worker=new Worker(new URL('../vision-worker.js?v=5.4.2',import.meta.url));
  const timeout=setTimeout(()=>{if(session===ui.session&&!ui.visionReady)error('model','Vision initialization timed out')},90000);
  ui.worker.onmessage=({data:r})=>{
   if(session!==ui.session)return;if(r.type==='progress'){ui.modelProgress=r.value;return;}
   if(r.type==='ready'){clearTimeout(timeout);ui.visionReady=true;ui.booting=false;menu(true);return;}
   if(r.type==='hands'){ui.tracker.updateHands(r.hands,r.handedness,r.timestamp,r.gestures);return;}
   if(r.type==='result'){ui.busy=false;ui.frameErrors=0;ui.inferenceMs=r.elapsed;ui.tracker.update(r.landmarks,r.hands,r.handedness,r.timestamp,r.handTime,r.gestures);if(r.mask)ui.mask={data:r.mask,width:r.width,height:r.height,origin:r.landmarks?.[11]&&r.landmarks?.[12]?{x:(r.landmarks[11].x+r.landmarks[12].x)/2,y:(r.landmarks[11].y+r.landmarks[12].y)/2}:null,timestamp:r.timestamp};}
   else if(r.type==='skipped'){ui.busy=false;if(r.elapsed)ui.inferenceMs=r.elapsed;}else if(r.type==='frame-error'){ui.busy=false;if(++ui.frameErrors>=5)error('model',r.message)}else if(r.type==='error'){clearTimeout(timeout);error('model',r.message)}
  };
  ui.worker.onerror=e=>{clearTimeout(timeout);if(session===ui.session)error('model',e.message)};ui.worker.postMessage({type:'init'});
 }catch(e){if(session===ui.session)error('model',e)}
}
function preview(){if(!ui.loaded||!ui.entranceComplete)return;cleanup();ui.previewRequested=true;ui.demo=true;ui.cube.reset();ui.scene='';ui.metric=null;ui.cards=[];setState('scanning');}
function clearSceneTransition(){
 sceneTransition.cancel();$('scene-transition').hidden=true;$('scene-transition').style.opacity='0';
 for(const property of ['transform','width','height','perspective','--cube','--cube-detail'])$('cube-scene').style.removeProperty(property);ui.transitionDetail=0;
 $('briefing').style.removeProperty('transform');delete document.body.dataset.transitionPhase;
}
function renderSceneTransition(dt){
 const frame=sceneTransition.update(dt);if(!frame)return;
 const previous=document.body.dataset.transitionPhase;document.body.dataset.transitionPhase=frame.phase;
 $('scene-transition').hidden=false;$('scene-transition').style.opacity=String(frame.shade);
 $('cube-scene').hidden=frame.phase!=='expand';
 if(frame.phase==='expand'){
  const detail=cubeRasterDetail(frame.zoom),size=sceneTransition.size*detail;
  if(detail!==ui.transitionDetail){
   ui.transitionDetail=detail;for(const property of ['width','height'])$('cube-scene').style.setProperty(property,size+'px');
   $('cube-scene').style.setProperty('--cube',size+'px');$('cube-scene').style.setProperty('--cube-detail',String(detail));$('cube-scene').style.perspective=1200*detail+'px';
  }
  $('cube-scene').style.transform=`translate(-50%,-50%) scale(${frame.zoom/detail})`;
 }
 $('briefing').hidden=frame.phase==='expand';$('briefing').style.transform=`scale(${frame.briefScale})`;
 if(frame.phase!=='expand'){document.body.dataset.theme=ui.scene;if(previous==='expand')fitFacts();}
 if(frame.done){setState('briefing');text('announcement',ui.metric.title);}
}
function openBriefing(scene){
 if(!ui.loaded||!ui.entranceComplete||ui.state==='scene-transition')return;
 const fromCube=ui.state==='scanning';ui.scene=scene;ui.metric=datum(scene);if(!ui.metric){error('model','No source data for '+scene);return;}
 ui.cards=catalogue.cards(scene,ui.language);ui.elapsed=0;ui.introElapsed=0;ui.introPage=0;ui.gate.reset();ui.gestureSeen=false;ui.resultReason='time';ui.exitHold=0;renderer.reset(scene);$('brief-progress').querySelector('i').style.width='0%';
 if(fromCube){sceneTransition.start(scene,{width:innerWidth,height:innerHeight,size:$('cube-scene').offsetWidth,pitch:ui.cube.pitch,yaw:ui.cube.yaw,roll:-7});setState('scene-transition');renderSceneTransition(0);}
 else{setState('briefing');text('announcement',ui.metric.title);}
}
function renderBriefing(){
 const m=ui.metric;if(!m)return;const w=words[ui.language],result=ui.state==='result';$('brief-symbol').innerHTML=icon(ui.scene);text('brief-title',m.title);
 text('brief-scope',result?sceneWords[ui.language].resultContext:sceneWords[ui.language].globalData+' · '+w.variousYears);
 const shown=ui.cards.slice(result?0:ui.introPage*2,(result?0:ui.introPage*2)+2);
 let items=result&&renderer.result(ui.scene,ui.language,catalogue.rules,ui.cards)||shown.map(c=>({value:c.value,label:c.label+' · '+c.scope+' '+(c.yearText||c.year)}));
 const container=$('brief-facts');container.replaceChildren();container.classList.toggle('single',items.length===1);container.classList.toggle('triple',items.length===3);container.classList.toggle('quad',items.length===4);
 for(const fact of items){const div=document.createElement('div');div.className='brief-fact';const value=document.createElement('span');value.className='fact-value';value.textContent=fact.value;const label=document.createElement('p');label.className='fact-label';label.textContent=fact.label;div.append(value,label);container.append(div)}
 text('brief-unit','');$('brief-gesture').innerHTML=icon(ui.scene==='space'?'spread':ui.scene);
 text('brief-action',result?(ui.scene==='thirst'?sceneWords[ui.language].waterResult:m.note):m.action);text('brief-note',result?'':m.note);text('brief-source',result&&ui.scene==='thirst'?'WHO / UNICEF JMP · 2024':[...new Set(shown.map(c=>c.source))].join(' / '));requestAnimationFrame(fitFacts);
}
function fitFacts(){const values=[...document.querySelectorAll('.fact-value')];if(!values.length)return;const ctx=document.createElement('canvas').getContext('2d');const base=Math.min(innerHeight*(values.length>2?.10:.15),innerWidth*.105,145);let size=base;ctx.font=`300 ${base}px ${ui.language==='ar'?'"Noto Sans Arabic",Arial,sans-serif':'"Helvetica Neue",Helvetica,Arial,sans-serif'}`;for(const el of values)if(el.parentElement.clientWidth)size=Math.min(size,base*el.parentElement.clientWidth*.97/Math.max(1,ctx.measureText(el.textContent).width));$('brief-facts').style.setProperty('--fact-size',Math.max(36,size)+'px');}
function align(){ui.gate.reset();ui.alignment={ready:false,count:3,progress:0};setState('align');}
function activate(){if(ui.state!=='align')return;ui.elapsed=ui.demo?clamp(Number(params.get('time')||0),0,44):0;renderer.reset(ui.scene);setState('active');text('announcement',ui.metric.action);}
function finish(reason='time'){ui.resultReason=reason;ui.resultElapsed=0;ui.observer[ui.scene]++;setState('result');}
function renderContext(){ui.statsKey='';text('context-unit',ui.metric.title);text('context-scope',sceneWords[ui.language].globalData+' · '+words[ui.language].variousYears);renderStats();}
function renderStats(){
 const values=renderer.stats(ui.scene,ui.language,ui.metric,ui.elapsed),key=JSON.stringify(values);if(key===ui.statsKey)return;ui.statsKey=key;
 const list=$('live-stats');list.replaceChildren();for(const stat of values){const item=document.createElement('div');item.className='live-stat';item.dataset.tone=stat.tone||'';const value=document.createElement('strong'),label=document.createElement('span');value.textContent=stat.value;label.textContent=stat.label;item.append(value,label);list.append(item);}
}
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
function coach(){ $('coach').hidden=true; }
function tick(now){
 const dt=document.hidden?0:Math.min(.055,(now-ui.lastFrame)/1000);ui.lastFrame=now;ui.time+=dt;
 if(ui.state==='arrival'){
  const chosen=arrival.tick(dt);
  if(chosen){ui.entranceComplete=true;ui.cube.reset();$('cube').style.transform='rotateZ(-7deg) rotateX(-18deg) rotateY(-28deg)';ui.previewRequested?preview():startCamera();}
  requestAnimationFrame(tick);return;
 }
 if(ui.demo){
  ui.pose=(ui.scene==='thirst'?demoPose(ui.time,'thirst'):renderer.preview?.pose||demoPose(ui.time,ui.scene||'hold')).map(p=>({...p}));
  if(ui.mouse&&['offline','space'].includes(ui.scene)&&ui.state==='active'){
   const centre=(ui.pose[11].x+ui.pose[12].x)/2,shift=clamp(1-ui.mouse.x/innerWidth,.18,.82)-centre;for(const p of ui.pose)p.x+=shift;
  }
  ui.hands=[ui.pose[15],ui.pose[16]].map((p,i)=>({...p,id:'demo-'+i,open:1,fist:false}));
  if(ui.mouse&&ui.state==='active'){
   const g=renderer.geometry(4/3),px=1-(ui.mouse.x-g.x)/g.width,py=(ui.mouse.y-g.y)/g.height;
   ui.hands=[{x:px,y:py,id:'preview0',open:ui.pointerFist?0:1,fist:ui.pointerFist}];
  }
  if(ui.scene==='thirst'){
   const g=renderer.geometry(4/3),targets=ui.mouse&&ui.state==='active'?[{x:1-(ui.mouse.x-g.x)/g.width,y:(ui.mouse.y-g.y)/g.height},ui.pose[16]]:[ui.pose[15],ui.pose[16]];
   ui.hands=targets.map((p,i)=>({...previewHand(p.x,p.y,.05,i?-1:1),id:'glass-preview'+i,open:1,fist:false}));
   for(let i=0;i<2;i++)ui.pose[15+i]={...ui.pose[15+i],...ui.hands[i].landmarks[0],visibility:1};
  }
 }
 else{ui.pose=ui.tracker.pose(now);ui.hands=ui.tracker.hands(now);}
 const present=ui.demo||now-ui.tracker.lastBody<650;if(ui.stream&&!ui.demo)sendFrame(now);
 if(ui.state==='scene-transition'){renderSceneTransition(dt);requestAnimationFrame(tick);return;}
 if(ui.state==='loading')$('scan-progress-fill').style.width=ui.modelProgress*100+'%';
 if(ui.state==='scanning'&&!$('sources-dialog').open){
  const hands=ui.demo?ui.mouse?[{x:ui.mouse.x/innerWidth,y:ui.mouse.y/innerHeight,id:'pointer',open:ui.dragging?0:1,fist:ui.dragging}]:[]:ui.hands.map(h=>menuPointer(h,renderer.geometry($('camera').videoWidth/$('camera').videoHeight||16/9),innerWidth,innerHeight));
  const p=hands.find(h=>h.id===ui.cube.handId)||hands[0],hit=p?faceAtPoint(p.x*innerWidth,p.y*innerHeight):-1;
  const selection=ui.cube.update(dt,hands,hit);$('cube').style.transform=`rotateZ(-7deg) rotateX(${selection.pitch}deg) rotateY(${selection.yaw}deg)`;
  $('cube-scene').dataset.dragging=String(selection.dragging);
  updateCubeCaption();document.querySelectorAll('.cube-face').forEach((el,i)=>el.dataset.selected=String(selection.highlight&&i===selection.face));
  $('hand-cursor').hidden=!p;if(p){$('hand-cursor').style.transform=`translate(${p.x*innerWidth-56}px,${p.y*innerHeight-56}px)`;$('hand-cursor').dataset.dwelling=String(selection.highlight);$('hand-cursor').dataset.dragging=String(selection.dragging);$('hand-cursor').querySelector('.cursor-ring').style.strokeDashoffset=276.46*(1-selection.progress);}
  if(selection.selected){openBriefing(selection.selected);requestAnimationFrame(tick);return;}
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
 if(['idle','loading'].includes(ui.state)){const spin=ui.cube.update(dt,[]);$('cube').style.transform=`rotateZ(-7deg) rotateX(${spin.pitch}deg) rotateY(${spin.yaw}deg)`;}
 const paused=$('sources-dialog').open||!present||ui.state==='result'||ui.demo&&params.get('still')==='1';
 renderer.render({time:ui.time,dt:paused?0:dt,state:ui.state,scene:ui.scene,elapsed:ui.elapsed,progress:clamp(ui.elapsed/45),pose:ui.pose,hands:ui.hands,mask:ui.mask,video:$('camera'),demo:ui.demo,dict:dictionary(ui.language),lang:ui.language,metric:ui.metric,cards:ui.cards,rules:catalogue.rules,present,alignment:ui.alignment});
 requestAnimationFrame(tick);
}
$('retry').addEventListener('click',()=>ui.loaded?startCamera():loadData());$('preview').addEventListener('click',preview);$('end').addEventListener('click',stop);$('back').addEventListener('click',()=>['scanning','loading','error'].includes(ui.state)?stop():menu());
$('sources-toggle').addEventListener('click',()=>{if(ui.loaded){renderSources();$('sources-dialog').showModal()}});$('sources-close').addEventListener('click',()=>$('sources-dialog').close());
$('sources-dialog').addEventListener('click',e=>{if(e.target===$('sources-dialog'))$('sources-dialog').close()});
window.addEventListener('pointermove',e=>{if(ui.demo)ui.mouse={x:e.clientX,y:e.clientY};});
window.addEventListener('pointerdown',e=>{if(!ui.demo||e.target.closest('button,select,dialog'))return;ui.mouse={x:e.clientX,y:e.clientY};if(ui.state==='scanning')ui.dragging=true;if(ui.state==='active'){ui.pointerFist=true;renderer.previewGrip(e.clientX,e.clientY,true,ui.pose);}});window.addEventListener('pointerup',e=>{if(ui.demo&&ui.state==='active'&&ui.pointerFist){renderer.previewGrip(e.clientX,e.clientY,true,ui.pose);renderer.previewGrip(e.clientX,e.clientY,false,ui.pose);}ui.dragging=false;ui.pointerFist=false;});window.addEventListener('pointercancel',()=>{ui.dragging=false;ui.pointerFist=false;});
window.addEventListener('resize',()=>{renderer.resize();if(ui.state==='scene-transition'){sceneTransition.resize(innerWidth,innerHeight,menuCubeSize(innerWidth));ui.transitionDetail=0;}fitFacts();fitCube();arrival.resize();if(ui.state==='scene-transition')renderSceneTransition(0);});window.addEventListener('pagehide',cleanup);document.addEventListener('visibilitychange',()=>ui.lastFrame=performance.now());
window.addEventListener('keydown',e=>{
 if(e.target.matches('input,select,textarea')||$('sources-dialog').open)return;
 if(e.key==='Escape'&&document.fullscreenElement)return;
 if(e.key==='Escape'&&!['arrival','idle'].includes(ui.state))['scanning','loading','error'].includes(ui.state)?stop():menu();
 if(e.key.toLowerCase()==='f')toggleFullscreen();
 if(ui.demo&&e.code==='Space'){e.preventDefault();if(ui.state==='briefing')align();else if(ui.state==='align'&&params.get('frame')==='1')activate();}
 if(ui.demo&&!['arrival','scene-transition'].includes(ui.state)&&/^[1-6]$/.test(e.key)){openBriefing(topics[Number(e.key)-1]);}
});
window.__artwork={get state(){return ui.state},get scene(){return ui.scene},get diagnostics(){return {preview:ui.demo,inferenceMs:ui.inferenceMs,hands:ui.hands.length,modelReady:ui.visionReady,catches:renderer.physics.catches,face:ui.cube.face,cards:ui.cards.length}}};
document.querySelectorAll('.cube-face').forEach((el,i)=>el.dataset.face=String(i));
async function toggleFullscreen(){try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch(error){text('announcement',error.message);}}
$('fullscreen').addEventListener('click',toggleFullscreen);document.addEventListener('fullscreenchange',()=>$('fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement)));
async function loadData(){
 setState('arrival');
 try{
  await Promise.all([data.load(),catalogue.load()]);ui.loaded=true;translate();
  const groups=topics.map(scene=>catalogue.cards(scene,'en')),entranceCards=[];
  for(let i=0;i<Math.max(...groups.map(group=>group.length));i++)for(const group of groups)if(group[i])entranceCards.push(group[i]);
  arrival.load(entranceCards);
  // Explicit scene links are a camera-free inspection shortcut; the public entrance always asks for a language.
  if(params.get('demo')==='1'&&topics.includes(params.get('scene'))){ui.entranceComplete=true;preview();openBriefing(params.get('scene'));}
 }catch(e){error('data',e);}
}
setState('arrival');requestAnimationFrame(tick);loadData();

document.fonts.ready.then(()=>{fitCube();fitFacts();renderer.fontsChanged();arrival.resize()});
