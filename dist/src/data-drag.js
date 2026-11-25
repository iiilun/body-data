const finite=value=>Number.isFinite(value);
const clamp=(value,max)=>Math.max(0,Math.min(max,value));
const validHand=hand=>hand?.id!=null&&hand.pinch&&hand.present!==false&&finite(hand.x)&&finite(hand.y);
const inside=(hand,box)=>hand.x>=box.left&&hand.x<=box.right&&hand.y>=box.top&&hand.y<=box.bottom;

// Hand coordinates and scroll displacement use CSS pixels. The page follows the grab.
export class DataDrag{
 constructor({deadzone=1,gain=1}={}){this.deadzone=Math.max(0,Math.min(2,finite(deadzone)?deadzone:1));this.gain=Math.max(1,Math.min(3,finite(gain)?gain:1));this.reset();}
 reset(){this.grab=null;}
 update(dt,hands=[],box={}){
  const maxScroll=finite(box.maxScroll)?Math.max(0,box.maxScroll):0;let scrollTop=clamp(finite(box.scrollTop)?box.scrollTop:0,maxScroll);
  const result=hand=>({scrollTop,dragging:!!hand,handId:hand?.id??null,cursor:hand?{x:hand.x,y:hand.y}:null});
  if(![box.left,box.top,box.right,box.bottom].every(finite)||box.right<=box.left||box.bottom<=box.top){this.reset();return result(null);}
  if(this.grab){
   const hand=hands.find(hand=>hand.id===this.grab.handId);
   if(!validHand(hand)){this.reset();return result(null);}
   if(!finite(dt)||dt<=0){this.grab.y=hand.y;return result(hand);}
   const delta=this.grab.y-hand.y;
   if(Math.abs(delta)>this.deadzone){scrollTop=clamp(scrollTop+delta*this.gain,maxScroll);this.grab.y=hand.y;}
   return result(hand);
  }
  const hand=hands.find(hand=>validHand(hand)&&inside(hand,box));
  if(hand)this.grab={handId:hand.id,y:hand.y};
  return result(hand);
 }
}
