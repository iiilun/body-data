export const GUIDE_SECONDS=6;
const point=(x,y)=>({x,y});
export function humanPose(scene,time=0){
 const wave=Math.sin(time*1.2),breath=Math.sin(time*1.5)*1.1;
 const p={head:point(0,94),leftShoulder:point(-82,194),rightShoulder:point(82,194),leftElbow:point(-198,192),rightElbow:point(198,192),leftWrist:point(-298,187),rightWrist:point(298,187),leftPalm:point(-1,0),rightPalm:point(1,0),closedLeft:false};
 if(scene==='shelter'){p.leftElbow=point(-177,110);p.rightElbow=point(177,110);p.leftWrist=point(-79,15+wave*4);p.rightWrist=point(79,15+wave*4);p.leftPalm=point(1,-.15);p.rightPalm=point(-1,-.15);}
 if(scene==='thirst'){p.leftElbow=point(-158,272);p.rightElbow=point(158,272);p.leftWrist=point(-163+wave*30,164);p.rightWrist=point(163-wave*30,164);p.leftPalm=p.rightPalm=point(0,-1);}
 if(scene==='space'){p.leftElbow=point(-190,182);p.rightElbow=point(190,182);p.leftWrist=point(-279-wave*16,194);p.rightWrist=point(279+wave*16,194);p.leftPalm=p.rightPalm=point(0,-1);}
 if(scene==='offline'){p.leftElbow=point(-188,224);p.rightElbow=point(188,224);p.leftWrist=point(-193,119);p.rightWrist=point(193,119);p.leftPalm=p.rightPalm=point(0,-1);p.shift=wave*25;}
 if(scene==='vacant'){p.leftElbow=point(-183,201);p.rightElbow=point(183,211);p.leftWrist=point(-274+wave*18,211-wave*12);p.rightWrist=point(279,205);p.leftPalm=point(-1,-.2);p.rightPalm=point(1,-.2);p.closedLeft=wave>.1;}
 for(const name of ['head','leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist'])p[name].y+=breath;
 return p;
}
function limb(ctx,a,b,ra,rb){
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length,ux=dx/length,uy=dy/length;
 ctx.beginPath();ctx.moveTo(a.x+nx*ra,a.y+ny*ra);ctx.bezierCurveTo(a.x+dx*.3+nx*ra*1.02,a.y+dy*.3+ny*ra*1.02,b.x-dx*.23+nx*rb*1.12,b.y-dy*.23+ny*rb*1.12,b.x+nx*rb,b.y+ny*rb);
 ctx.quadraticCurveTo(b.x+ux*rb,b.y+uy*rb,b.x-nx*rb,b.y-ny*rb);ctx.bezierCurveTo(b.x-dx*.23-nx*rb*1.12,b.y-dy*.23-ny*rb*1.12,a.x+dx*.3-nx*ra,a.y+dy*.3-ny*ra,a.x-nx*ra,a.y-ny*ra);ctx.quadraticCurveTo(a.x-ux*ra,a.y-uy*ra,a.x+nx*ra,a.y+ny*ra);ctx.fill();
 for(const [p,r]of [[a,ra],[b,rb]]){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();}
}
function hand(ctx,wrist,direction,closed){
 const length=Math.hypot(direction.x,direction.y),ux=direction.x/length,uy=direction.y/length;
 ctx.save();ctx.translate(wrist.x,wrist.y);ctx.transform(-uy,ux,ux,uy,0,0);
 ctx.beginPath();ctx.moveTo(-10,-3);ctx.bezierCurveTo(-15,5,-19,18,-17,29);ctx.quadraticCurveTo(-10,37,0,36);ctx.quadraticCurveTo(14,37,18,27);ctx.bezierCurveTo(20,17,12,4,11,-3);ctx.closePath();ctx.fill();
 if(closed){ctx.beginPath();ctx.ellipse(0,29,21,16,-.1,0,Math.PI*2);ctx.fill();}
 else{
  const fingers=[[-12,26,-21,53,4.8],[-5,31,-8,66,4.9],[3,31,6,70,5.0],[11,27,19,60,4.6],[15,14,34,36,5.2]];
  for(const [x,y,tx,ty,r]of fingers)limb(ctx,point(x,y),point(tx,ty),r,r*.78);
 }
 ctx.restore();
}
export function paintHuman(ctx,scene,time,{x,y,scale,color='#fff'}={}){
 const p=humanPose(scene,time);ctx.save();ctx.translate(x+(p.shift||0)*scale,y);ctx.scale(scale,scale);ctx.fillStyle=color;
 // Natural leg lengths, a soft knee, narrow ankles, and asymmetric feet.
 for(const side of [-1,1]){const hip=point(side*44,408),knee=point(side*48,585),ankle=point(side*51,767);limb(ctx,hip,knee,32,21);limb(ctx,knee,ankle,21,12);ctx.save();ctx.translate(ankle.x,ankle.y);ctx.scale(side,1);ctx.beginPath();ctx.moveTo(-11,-9);ctx.bezierCurveTo(-14,-1,-13,12,-5,16);ctx.lineTo(30,16);ctx.quadraticCurveTo(40,13,32,7);ctx.lineTo(14,0);ctx.lineTo(10,-9);ctx.closePath();ctx.fill();ctx.restore();}
 for(const side of ['left','right']){const a=p[side+'Shoulder'],b=p[side+'Elbow'],c=p[side+'Wrist'];limb(ctx,a,b,26,18);limb(ctx,b,c,19,10.5);hand(ctx,c,p[side+'Palm'],side==='left'&&p.closedLeft);}
 // One continuous anatomical torso: trapezius, deltoids, rib cage, waist and pelvis.
 ctx.beginPath();ctx.moveTo(-17,137);ctx.bezierCurveTo(-17,164,-49,167,-78,176);ctx.bezierCurveTo(-97,178,-111,195,-101,218);ctx.quadraticCurveTo(-91,235,-74,239);ctx.bezierCurveTo(-68,275,-55,313,-61,346);ctx.bezierCurveTo(-66,369,-83,393,-76,416);ctx.quadraticCurveTo(-48,444,0,437);ctx.quadraticCurveTo(48,444,76,416);ctx.bezierCurveTo(83,393,66,369,61,346);ctx.bezierCurveTo(55,313,68,275,74,239);ctx.quadraticCurveTo(91,235,101,218);ctx.bezierCurveTo(111,195,97,178,78,176);ctx.bezierCurveTo(49,167,17,164,17,137);ctx.closePath();ctx.fill();
 ctx.save();ctx.translate(p.head.x,p.head.y-94);ctx.beginPath();ctx.moveTo(0,48);ctx.bezierCurveTo(-28,47,-36,64,-34,88);ctx.quadraticCurveTo(-40,92,-34,105);ctx.bezierCurveTo(-30,125,-18,140,0,142);ctx.bezierCurveTo(18,140,30,125,34,105);ctx.quadraticCurveTo(40,92,34,88);ctx.bezierCurveTo(36,64,28,47,0,48);ctx.fill();ctx.restore();ctx.restore();
}
