import {createFaceRoot} from './cube-art.js?v=5.10.1';

const NS='http://www.w3.org/2000/svg',contexts=new WeakMap();
const latin='"Helvetica Neue",Helvetica,Arial,"Noto Sans TC","Noto Sans JP","Noto Sans KR",sans-serif';
const arabic='"Noto Sans Arabic","Helvetica Neue",Arial,sans-serif';

export function createLanguageFace(name,{document:doc=document}={}){
 const svg=createFaceRoot(doc),rtl=/[\u0600-\u06ff]/.test(name),family=rtl?arabic:latin;
 svg.classList.add('language-face-art');
 let ctx=contexts.get(doc);if(!ctx){ctx=doc.createElement('canvas').getContext('2d');contexts.set(doc,ctx);}
 ctx.direction=rtl?'rtl':'ltr';ctx.font=`500 82px ${family}`;
 const size=Math.min(82,82*400/Math.max(1,ctx.measureText(name).width));ctx.font=`500 ${size}px ${family}`;
 const metrics=ctx.measureText(name),ascent=metrics.actualBoundingBoxAscent??size*.8,descent=metrics.actualBoundingBoxDescent??size*.2;
 const text=doc.createElementNS(NS,'text');
 for(const [key,value]of Object.entries({x:256,y:256,dy:(ascent-descent)/2,'text-anchor':'middle','dominant-baseline':'alphabetic','font-family':family,'font-size':size,'font-weight':500,'letter-spacing':0,direction:rtl?'rtl':'ltr',fill:'currentColor',stroke:'none'}))text.setAttribute(key,String(value));
 text.textContent=name;svg.append(text);return svg;
}
