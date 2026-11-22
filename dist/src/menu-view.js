// CSS 3D already projects the cube. Browser hit-testing finds the actual face under the cursor.
export function faceAtPoint(x,y,doc=document){
 const face=doc.elementFromPoint(x,y)?.closest('.cube-face');
 return face?Number(face.dataset.face):-1;
}
export function menuPointer(hand,geometry,width,height){
 const x=(geometry.x+(1-hand.x)*geometry.width)/width,y=(geometry.y+hand.y*geometry.height)/height;
 return {...hand,x:Math.max(0,Math.min(1,.5+(x-.5)*1.2)),y:Math.max(0,Math.min(1,.43+(y-.43)*1.2))};
}
