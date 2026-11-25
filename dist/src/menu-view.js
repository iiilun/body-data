import {CUBE_DWELL_SECONDS as seconds} from './controls.js?v=5.6.0';
// CSS 3D already projects the cube. Browser hit-testing finds the actual face under the cursor.
export function faceAtPoint(x,y,doc=document){
 const face=doc.elementFromPoint(x,y)?.closest('.cube-face');
 return face?Number(face.dataset.face):-1;
}
export function menuPointer(hand,geometry,width,height){
 const x=(geometry.x+(1-hand.x)*geometry.width)/width,y=(geometry.y+hand.y*geometry.height)/height;
 return {...hand,x:Math.max(0,Math.min(1,.5+(x-.5)*1.2)),y:Math.max(0,Math.min(1,.5+(y-.5)*1.2))};
}
// Repeat complete titles horizontally and vertically, including short CJK names.
export function faceTypography(title,size,measure){
 const font=size*.215,lineHeight=font*.91,wordWidth=Math.max(font*.5,measure(title,font));
 const repeats=Math.max(2,Math.ceil(size/wordWidth)+2),rows=Math.ceil(size/lineHeight)+1;
 return {font,lineHeight,rows,text:title.repeat(repeats)};
}
export const menuCopy={
 en:{drag:'GRIP TO ROTATE',dwell:`OPEN PALM · HOLD ${seconds}s`,preview:`DRAG TO ROTATE · REST ${seconds}s TO ENTER`},
 zh:{drag:'握拳轉動',dwell:`張手停留 ${seconds} 秒`,preview:`拖曳轉動 · 停留 ${seconds} 秒進入`},
 es:{drag:'PUÑO PARA GIRAR',dwell:`PALMA ABIERTA · ${seconds} s`,preview:`ARRASTRA PARA GIRAR · DETENTE ${seconds} s`},
 fr:{drag:'POING POUR TOURNER',dwell:`MAIN OUVERTE · ${seconds} s`,preview:`GLISSER POUR TOURNER · RESTER ${seconds} s`},
 ja:{drag:'握って回す',dwell:`手を開いて${seconds}秒`,preview:`ドラッグで回す · ${seconds}秒止めて選択`},
 ko:{drag:'주먹으로 회전',dwell:`손을 펴고 ${seconds}초 유지`,preview:`드래그로 회전 · ${seconds}초 머물러 선택`},
 ar:{drag:'اقبض وأدر المكعب',dwell:`افتح كفك · انتظر ${new Intl.NumberFormat('ar-EG').format(seconds)} ثوانٍ`,preview:`اسحب للتدوير · اثبت ${new Intl.NumberFormat('ar-EG').format(seconds)} ثوانٍ للدخول`}
};
