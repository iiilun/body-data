export const GUIDE_SECONDS=6;
const point=(x,y)=>({x,y});
const mix=(a,b,t)=>point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
const normalise=p=>{const n=Math.hypot(p.x,p.y)||1;return point(p.x/n,p.y/n);};

// The same quiet, single-piece figure is articulated for all six instructions.
export function humanPose(scene,time=0){
 const wave=Math.sin(time*1.2),breath=Math.sin(time*1.5)*1.1;
 const p={head:point(0,94),leftShoulder:point(-82,194),rightShoulder:point(82,194),leftElbow:point(-198,192),rightElbow:point(198,192),leftWrist:point(-298,187),rightWrist:point(298,187),leftPalm:point(-1,0),rightPalm:point(1,0),closedLeft:false};
 if(scene==='shelter'){p.leftElbow=point(-177,110);p.rightElbow=point(177,110);p.leftWrist=point(-79,15+wave*4);p.rightWrist=point(79,15+wave*4);p.leftPalm=point(1,-.15);p.rightPalm=point(-1,-.15);}
 if(scene==='thirst'){p.leftElbow=point(-200,270);p.rightElbow=point(200,270);p.leftWrist=point(-222+wave*15,155);p.rightWrist=point(222-wave*15,155);p.leftPalm=p.rightPalm=point(0,-1);}
 if(scene==='space'){p.leftElbow=point(-190,182);p.rightElbow=point(190,182);p.leftWrist=point(-279-wave*16,194);p.rightWrist=point(279+wave*16,194);p.leftPalm=point(-1,0);p.rightPalm=point(1,0);}
 if(scene==='offline'){p.leftElbow=point(-188,224);p.rightElbow=point(188,224);p.leftWrist=point(-193,119);p.rightWrist=point(193,119);p.leftPalm=p.rightPalm=point(0,-1);p.shift=wave*25;}
 if(scene==='vacant'){p.leftElbow=point(-183,201);p.rightElbow=point(183,211);p.leftWrist=point(-274+wave*18,211-wave*12);p.rightWrist=point(279,205);p.leftPalm=point(-1,-.2);p.rightPalm=point(1,-.2);p.closedLeft=wave>.1;}
 for(const name of ['head','leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist'])p[name].y+=breath;
 return p;
}

function armEdges(p,side){
 const key=side<0?'left':'right',a=p[key+'Shoulder'],b=p[key+'Elbow'],w=p[key+'Wrist'],direction=normalise(p[key+'Palm']);
 const end=point(w.x+direction.x*22,w.y+direction.y*22),centres=[a,mix(a,b,.5),b,mix(b,w,.5),w,end],radii=[32,31,28,26,24,24];
 const outer=[],inner=[];
 for(let i=0;i<centres.length;i++){
  const before=centres[Math.max(0,i-1)],after=centres[Math.min(centres.length-1,i+1)],tangent=normalise(point(after.x-before.x,after.y-before.y));
  const n=point(side*tangent.y,-side*tangent.x),c=centres[i],r=radii[i];
  outer.push(point(c.x+n.x*r,c.y+n.y*r));inner.push(point(c.x-n.x*r,c.y-n.y*r));
 }
 // Rounded mitten ends continue the arm contour; no separate hand or finger shapes.
 const n=normalise(point(outer.at(-1).x-end.x,outer.at(-1).y-end.y)),cap=[];
 for(let i=1;i<4;i++){const t=i*Math.PI/4;cap.push(point(end.x+(n.x*Math.cos(t)+direction.x*Math.sin(t))*24,end.y+(n.y*Math.cos(t)+direction.y*Math.sin(t))*24));}
 return {outer,inner,cap};
}

export function humanOutline(scene,time=0,variant=0){
 const p=humanPose(scene,time),right=armEdges(p,1),left=armEdges(p,-1),breath=p.head.y-94;
 const torso=[point(86,252),point(77,330),point(85,406),point(104,476),point(118,555),point(118,641),point(117,709),point(141,751),point(137,775),point(88,783),point(59,768),point(59,715),point(65,642),point(52,568),point(31,514),point(0,497),point(-31,514),point(-52,568),point(-65,642),point(-59,715),point(-59,768),point(-88,783),point(-137,775),point(-141,751),point(-117,709),point(-118,641),point(-118,555),point(-104,476),point(-85,406),point(-77,330),point(-86,252)];
 const points=[point(0,47),point(43,58),point(65,96),point(63,136),point(47,174),...right.outer,...right.cap,...right.inner.slice().reverse(),...torso,...left.inner,...left.cap.slice().reverse(),...left.outer.slice().reverse(),point(-47,174),point(-63,136),point(-65,96),point(-43,58)];
 // Three close impressions reproduce the flowing, offset outline in the reference.
 // Their offsets stay fixed over time so the image never flickers between shapes.
 const spread=variant-1;
 return points.map((v,i)=>point(v.x*(1+spread*.012)+spread*12+Math.sin(i*.23)*spread*1.4,v.y+breath+spread*8));
}

function trace(ctx,points){
 ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(let i=0;i<points.length;i++){
  const a=points[(i-1+points.length)%points.length],b=points[i],c=points[(i+1)%points.length],d=points[(i+2)%points.length];
  ctx.bezierCurveTo(b.x+(c.x-a.x)/6,b.y+(c.y-a.y)/6,c.x-(d.x-b.x)/6,c.y-(d.y-b.y)/6,c.x,c.y);
 }
 ctx.closePath();
}

export function paintHuman(ctx,scene,time=0,{x=0,y=0,scale=1,color='#fff'}={}){
 const p=humanPose(scene,time);ctx.save();ctx.translate(x+(p.shift||0)*scale,y);ctx.scale(scale,scale);ctx.strokeStyle=color;ctx.lineWidth=4.6;ctx.lineCap='round';ctx.lineJoin='round';
 for(let variant=0;variant<3;variant++){trace(ctx,humanOutline(scene,time,variant));ctx.stroke();}
 ctx.restore();
}
