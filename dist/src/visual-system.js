import {clamp,lerp} from './math.js?v=5.9.0';
export const MOSAIC_COLUMNS=48;
export const MOSAIC_ROWS=36;

// Average the original colour inside the person mask; no grey conversion,
// colour quantization, or background colour on silhouette-edge blocks.
export function colourMosaic(rgba,width,height,mask,columns=MOSAIC_COLUMNS,rows=MOSAIC_ROWS){
  const cells=[];
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<columns;gx++){
    const x0=Math.floor(gx*width/columns),x1=Math.floor((gx+1)*width/columns);
    const y0=Math.floor(gy*height/rows),y1=Math.floor((gy+1)*height/rows);
    let r=0,g=0,b=0,count=0,total=0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const i=(y*width+x)*4;
      const mx=Math.floor((x/width-(mask?.offsetX||0))*mask?.width),my=Math.floor((y/height-(mask?.offsetY||0))*mask?.height);
      const inside=mask?.data?mx>=0&&my>=0&&mx<mask.width&&my<mask.height&&mask.data[my*mask.width+mx]>0:rgba[i+3]>127;
      total++;
      if(inside){r+=rgba[i];g+=rgba[i+1];b+=rgba[i+2];count++;}
    }
    if(count/Math.max(total,1)<.42)continue;
    const rgb=[r,g,b].map(v=>Math.round(v/count));
    cells.push({x:(gx+.5)/columns,y:(gy+.5)/rows,gx,gy,id:gy*columns+gx,rgb,color:`rgb(${rgb.join(',')})`});
  }
  return cells;
}
export function artworkGeometry(width,height,aspect=4/3){
  const w=Math.max(width,height*aspect),h=w/aspect;
  return {x:(width-w)/2,y:(height-h)/2,width:w,height:h,block:w/MOSAIC_COLUMNS};
}
export function typeSystem(height,width=Infinity){const size=Math.max(48,Math.min(height*.151,width*.095));return {size,row:size*1.18,weight:300};}
export function compressToRoom(point,bodyCentre,width,progress){return {x:lerp(bodyCentre,width/2,progress*.65)+(point.x-bodyCentre)*(1-progress*.57),y:point.y};}
export function shelterPosition(point,geometry,progress,shield=false){
  const sourceX=geometry.x+(1-point.x)*geometry.width,sourceY=geometry.y+point.y*geometry.height;
  const column=point.gx??Math.floor(point.x*MOSAIC_COLUMNS);
  const wave=.5+Math.sin(column*.37)*.28+Math.sin(column*.14+1.8)*.18;
  const heat=clamp((progress-.17-(shield&&point.y<.42?.1:0))/.83);
  const amount=Math.pow(heat,1.85)*(.72+.28*wave),floor=geometry.y+geometry.height-geometry.block*.5;
  return {x:sourceX,y:lerp(sourceY,floor,amount),height:geometry.block*(1+heat*heat*wave*2.5)};
}
export function contourForBand(cells,top,bottom,block,padding=0){
  let left=Infinity,right=-Infinity;
  for(const cell of cells)if(cell.y+block*.5>top&&cell.y-block*.5<bottom){left=Math.min(left,cell.x-block*.5);right=Math.max(right,cell.x+block*.5);}
  return Number.isFinite(left)?{left:left-padding,right:right+padding}:null;
}
