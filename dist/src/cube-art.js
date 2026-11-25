const NS='http://www.w3.org/2000/svg';
export const FACE_STROKE=8;
export const REFERENCE_LABELS={space:'SPACE',shelter:'SHELTERS',thirst:'THIRST',vacant:'VACANT',offline:'OFFLINE',hold:'HOLD'};
export const TOPIC_PATHS={
 space:'M140 160V84H216 M296 84H372V160 M140 240V316H216 M296 316H372V240 M140 84L372 316 M372 84L140 316',
 shelter:'M101 189C150 117 209 84 256 84C303 84 362 117 411 189 M190 202C190 134 220 84 256 84C292 84 322 134 322 202 M256 84V324',
 thirst:'M143 84L187 304H327L367 84 M256 128C224 154 211 183 214 208C217 231 235 248 256 248C277 248 295 231 298 208C301 183 288 154 256 128Z',
 vacant:'M142 312V150L252 68L372 150V312Z',
 offline:'M202 122A110 110 0 1 0 310 122 M256 98V218',
 hold:'M164 98V330 M256 98V330 M348 98V330 M118 286L164 330L210 286L256 330L302 286L348 330L394 286'
};
const sizes={space:72,shelter:64,thirst:72,vacant:68,offline:64,hold:72},contexts=new WeakMap();
const latin='"Helvetica Neue",Helvetica,Arial,"Noto Sans TC","Noto Sans JP","Noto Sans KR",sans-serif';
function element(doc,name,attributes){const node=doc.createElementNS(NS,name);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));return node;}
export function createFaceRoot(doc=document){
 const svg=element(doc,'svg',{viewBox:'0 0 512 512',preserveAspectRatio:'xMidYMid meet','aria-hidden':'true'});svg.classList.add('framed-face-art');
 svg.append(element(doc,'rect',{x:4,y:4,width:504,height:504,fill:'none',stroke:'currentColor','stroke-width':FACE_STROKE,'stroke-linejoin':'miter'}));return svg;
}
export function faceLabel(scene,language,translated){return language==='en'?REFERENCE_LABELS[scene]:translated||REFERENCE_LABELS[scene];}
export function fitFaceLabel(label,measure,size=72){return Math.min(size,size*432/Math.max(1,measure(label,size)));}
export function createTopicFace(scene,{label,language='en',document:doc=document}={}){
 if(!TOPIC_PATHS[scene])throw new RangeError('Unknown cube face: '+scene);
 const svg=createFaceRoot(doc);svg.classList.add('topic-face-art');svg.dataset.scene=scene;
 svg.append(element(doc,'path',{d:TOPIC_PATHS[scene],fill:'none',stroke:'currentColor','stroke-width':FACE_STROKE,'stroke-linecap':'butt','stroke-linejoin':'miter'}));
 const name=faceLabel(scene,language,label),family=language==='ar'?'"Noto Sans Arabic",Arial,sans-serif':latin;
 let ctx=contexts.get(doc);if(!ctx){ctx=doc.createElement('canvas').getContext('2d');contexts.set(doc,ctx);}ctx.direction=language==='ar'?'rtl':'ltr';
 const size=fitFaceLabel(name,(value,px)=>{ctx.font=`400 ${px}px ${family}`;return ctx.measureText(value).width;},language==='en'?sizes[scene]:72);
 const text=element(doc,'text',{x:256,y:438,'text-anchor':'middle','font-family':family,'font-size':size,'font-weight':400,'letter-spacing':0,fill:'currentColor',stroke:'none',direction:language==='ar'?'rtl':'ltr'});text.textContent=name;svg.append(text);return svg;
}
