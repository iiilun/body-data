// CSS 3D already projects the cube. Browser hit-testing finds the actual face under the cursor.
export function faceAtPoint(x,y,doc=document){
 const face=doc.elementFromPoint(x,y)?.closest('.cube-face');
 return face?Number(face.dataset.face):-1;
}
export function menuPointer(hand,geometry,width,height){
 const x=(geometry.x+(1-hand.x)*geometry.width)/width,y=(geometry.y+hand.y*geometry.height)/height;
 return {...hand,x:Math.max(0,Math.min(1,.5+(x-.5)*1.2)),y:Math.max(0,Math.min(1,.43+(y-.43)*1.2))};
}
// Repeat complete titles horizontally and vertically, including short CJK names.
export function faceTypography(title,size,measure){
 const font=size*.215,lineHeight=font*.91,wordWidth=Math.max(font*.5,measure(title,font)),gap=font*.18;
 const repeats=Math.max(2,Math.ceil((size+wordWidth)/(wordWidth+gap))),rows=Math.ceil(size/lineHeight)+1;
 return {font,lineHeight,rows,text:Array.from({length:repeats},()=>title).join(' ')};
}
export const menuCopy={
 en:{drag:'GRIP TO DRAG',dwell:'OPEN PALM · HOLD 4s',preview:'DRAG · REST 4s TO ENTER'},
 zh:{drag:'握拳拖動',dwell:'張手停留 4 秒',preview:'拖動方塊 · 停留 4 秒進入'},
 es:{drag:'PUÑO PARA ARRASTRAR',dwell:'PALMA ABIERTA · 4 s',preview:'ARRASTRA · DETENTE 4 s'},
 fr:{drag:'POING POUR DÉPLACER',dwell:'MAIN OUVERTE · 4 s',preview:'GLISSER · RESTER 4 s'},
 ja:{drag:'握って動かす',dwell:'手を開いて4秒',preview:'ドラッグ · 4秒止めて選択'},
 ko:{drag:'주먹으로 이동',dwell:'손을 펴고 4초 유지',preview:'드래그 · 4초 머물러 선택'},
 ar:{drag:'اقبض واسحب',dwell:'افتح كفك · انتظر ٤ ثوانٍ',preview:'اسحب · اثبت ٤ ثوانٍ للدخول'}
};
