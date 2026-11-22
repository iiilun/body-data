// Low-latency body, hands and a 250 KB person/background segmenter.
let poseModel,handModel,segmenter,ready=false,lastHands=[],lastLabels=[],lastHandTime=0,lastGestures=[],frame=0,gestureMode=true,personIndex=1,segmentLabels=[];
const asset=p=>new URL(p,self.location.href).href;
async function initialize(){
 const {FilesetResolver,PoseLandmarker,HandLandmarker,GestureRecognizer,ImageSegmenter}=await import('./vendor/vision_bundle.mjs');
 const files=await FilesetResolver.forVisionTasks(asset('./vendor/wasm'));
 const create=async(Task,options)=>{
  try{return await Task.createFromOptions(files,{...options,canvas:new OffscreenCanvas(480,360),baseOptions:{...options.baseOptions,delegate:'GPU'}})}
  catch{return Task.createFromOptions(files,{...options,baseOptions:{...options.baseOptions,delegate:'CPU'}})}
 };
 self.postMessage({type:'progress',value:.15});
 poseModel=await create(PoseLandmarker,{baseOptions:{modelAssetPath:asset('./models/pose_landmarker_lite.task')},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.4,minPosePresenceConfidence:.4,minTrackingConfidence:.45});
 self.postMessage({type:'progress',value:.5});
 try{handModel=await create(GestureRecognizer,{baseOptions:{modelAssetPath:asset('./models/gesture_recognizer.task')},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.4,minHandPresenceConfidence:.4,minTrackingConfidence:.4,cannedGesturesClassifierOptions:{scoreThreshold:.45,maxResults:1}});}
 catch{gestureMode=false;handModel=await create(HandLandmarker,{baseOptions:{modelAssetPath:asset('./models/hand_landmarker.task')},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.4,minHandPresenceConfidence:.4,minTrackingConfidence:.4});}
 self.postMessage({type:'progress',value:.8});
 segmenter=await create(ImageSegmenter,{baseOptions:{modelAssetPath:asset('./models/selfie_landscape.tflite')},runningMode:'VIDEO',outputCategoryMask:true,outputConfidenceMasks:false});
 segmentLabels=segmenter.getLabels();const named=segmentLabels.findIndex(label=>/person|selfie|human/i.test(label));if(named>=0)personIndex=named;
 ready=true;self.postMessage({type:'ready',segmentLabels});
}
self.onmessage=async({data})=>{
 if(data.type==='init'){try{await initialize()}catch(e){self.postMessage({type:'error',message:String(e.stack||e)})}return;}
 if(data.type!=='frame')return;const bitmap=data.bitmap;
 if(!ready){bitmap.close();self.postMessage({type:'skipped'});return;}
 const start=performance.now();
 try{
  frame++;let mask,width=0,height=0,maskStats;
  if(data.mode==='menu'||data.mode==='align'||frame%2===0||frame===1){const r=gestureMode?handModel.recognizeForVideo(bitmap,data.timestamp):handModel.detectForVideo(bitmap,data.timestamp);lastHands=r.landmarks||[];lastLabels=r.handednesses||r.handedness||[];lastGestures=gestureMode?lastHands.map((_,i)=>r.gestures?.[i]?.length?r.gestures[i]:[{categoryName:'None',score:1}]):[];lastHandTime=data.timestamp;self.postMessage({type:'hands',timestamp:data.timestamp,hands:lastHands,handedness:lastLabels,gestures:lastGestures,elapsed:performance.now()-start});}
  if(data.mode==='menu'&&frame%3!==1){self.postMessage({type:'skipped',elapsed:performance.now()-start});return;}
  const pose=poseModel.detectForVideo(bitmap,data.timestamp),landmarks=pose.landmarks?.[0]||[];
  segmenter.segmentForVideo(bitmap,data.timestamp,r=>{const m=r.categoryMask;if(m){const raw=m.getAsUint8Array();mask=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)mask[i]=raw[i]===personIndex?1:0;width=m.width;height=m.height;if(data.debug)maskStats={labels:segmentLabels,personIndex,total:mask.reduce((n,x)=>n+(x>0),0),length:mask.length};}});
  self.postMessage({type:'result',timestamp:data.timestamp,landmarks,hands:lastHands,handedness:lastLabels,handTime:lastHandTime,gestures:lastGestures,mask,width,height,maskStats,elapsed:performance.now()-start},mask?[mask.buffer]:[]);
 }catch(e){self.postMessage({type:'frame-error',message:String(e.stack||e)})}finally{bitmap.close();}
};
