const cases=[[],[[3,0]],[[0,1]],[[3,1]],[[1,2]],[[3,0],[1,2]],[[0,2]],[[3,2]],[[2,3]],[[0,2]],[[0,1],[2,3]],[[1,2]],[[1,3]],[[0,1]],[[3,0]],[]];
export function maskContours(data,width,height){
 if(!data||!width||!height)return [];
 const edges=new Map(),points=new Map(),sample=(x,y)=>x>=0&&y>=0&&x<width&&y<height?data[y*width+x]:0;
 const fraction=(a,b)=>Math.max(0,Math.min(1,(.5-a)/(b-a||1)));
 for(let y=-1;y<height;y++)for(let x=-1;x<width;x++){
  const a=sample(x,y),b=sample(x+1,y),c=sample(x+1,y+1),d=sample(x,y+1),code=Number(a>=.5)|Number(b>=.5)<<1|Number(c>=.5)<<2|Number(d>=.5)<<3;if(code===0||code===15)continue;
  const ends=[{x:x+fraction(a,b),y},{x:x+1,y:y+fraction(b,c)},{x:x+fraction(d,c),y:y+1},{x,y:y+fraction(a,d)}],keys=[`h:${x}:${y}`,`v:${x+1}:${y}`,`h:${x}:${y+1}`,`v:${x}:${y}`];
  for(const [a,b]of cases[code]){const p=ends[a],q=ends[b],pk=keys[a],qk=keys[b];points.set(pk,p);points.set(qk,q);if(!edges.has(pk))edges.set(pk,[]);if(!edges.has(qk))edges.set(qk,[]);edges.get(pk).push(qk);edges.get(qk).push(pk);}
 }
 const visited=new Set(),loops=[];
 for(const start of edges.keys()){
  if(visited.has(start))continue;let at=start,previous=null,loop=[];
  while(at&&!visited.has(at)){visited.add(at);const p=points.get(at);loop.push({x:(p.x+.5)/width,y:(p.y+.5)/height});const next=edges.get(at).find(k=>k!==previous);previous=at;at=next;}
  if(loop.length>=12){let area=0;for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];area+=a.x*b.y-b.x*a.y;}if(Math.abs(area)*width*height>24){const weights=[1,2,3,4,3,2,1];loops.push(loop.map((_,i)=>{let x=0,y=0;for(let j=-3;j<=3;j++){const p=loop[(i+j+loop.length)%loop.length],w=weights[j+3]/16;x+=p.x*w;y+=p.y*w;}return {x,y};}));}}
 }
 return loops;
}
export function strokeContours(ctx,contours,geometry,{color='#fff',width=3,offsetX=0,offsetY=0}={}){
 ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
 const map=p=>({x:geometry.x+(1-p.x-offsetX)*geometry.width,y:geometry.y+(p.y+offsetY)*geometry.height});
 for(const loop of contours){const points=loop.map(map),first=points[0],last=points.at(-1);ctx.beginPath();ctx.moveTo((first.x+last.x)/2,(first.y+last.y)/2);for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}ctx.closePath();ctx.stroke();}
 ctx.restore();
}
