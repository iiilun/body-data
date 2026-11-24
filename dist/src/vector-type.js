const NS='http://www.w3.org/2000/svg';
export function typeMetrics(text,{size=512,family='Helvetica,Arial,sans-serif',weight=700,tracking=-.055,row=.91}={}){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.font=`${weight} ${size}px ${family}`;
 const m=ctx.measureText('Hg'),ascent=m.fontBoundingBoxAscent??size*.9,descent=m.fontBoundingBoxDescent??size*.22;
 return {text,size,family,weight,tracking,line:size*row,baseline:(size*row-ascent-descent)/2+ascent};
}
export function vectorType(metrics,width,height,rows=1,{rtl=false}={}){
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
 for(let i=0;i<rows;i++){
  const text=document.createElementNS(NS,'text');text.setAttribute('x',rtl?width:0);text.setAttribute('y',metrics.baseline+i*metrics.line);
  text.setAttribute('font-family',metrics.family);text.setAttribute('font-size',metrics.size);text.setAttribute('font-weight',metrics.weight);text.setAttribute('letter-spacing',metrics.tracking*metrics.size);
  text.setAttribute('fill','currentColor');text.setAttribute('direction',rtl?'rtl':'ltr');text.setAttribute('text-anchor','start');text.textContent=metrics.text;svg.append(text);
 }
 svg.typeLayout={...metrics,width,height,rows,rtl};return svg;
}
export function largestDarkSquare(rgba,width,height,margin=2){
 const previous=new Uint16Array(width+1),current=new Uint16Array(width+1);let best={size:0,x:0,y:0};
 for(let y=0;y<height;y++){
  current.fill(0);
  for(let x=0;x<width;x++){
   const p=(y*width+x)*4;
   if(x>margin&&x<width-margin-1&&y>margin&&y<height-margin-1&&rgba[p]<8&&rgba[p+1]<8&&rgba[p+2]<8){
    const n=1+Math.min(previous[x],previous[x+1],current[x]);current[x+1]=n;
    if(n>best.size)best={size:n,x:x-n+1,y:y-n+1};
   }
  }
  previous.set(current);
 }
 const inset=Math.min(2,Math.max(.25,best.size*.12)),size=Math.max(.5,best.size-2*inset);
 return {x:best.x+inset,y:best.y+inset,width:size,height:size,valid:best.size>=2};
}
export function darkAperture(svg,{ink=false}={}){
 const m=svg.typeLayout,canvas=document.createElement('canvas');canvas.width=Math.ceil(m.width);canvas.height=Math.ceil(m.height);
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle=ink?'#fff':'#000';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle=ink?'#000':'#fff';ctx.font=`${m.weight} ${m.size}px ${m.family}`;ctx.textBaseline='alphabetic';ctx.direction=m.rtl?'rtl':'ltr';ctx.textAlign='start';
 if('letterSpacing' in ctx)ctx.letterSpacing=m.tracking*m.size+'px';
 for(let row=0;row<m.rows;row++)ctx.fillText(m.text,m.rtl?m.width:0,m.baseline+row*m.line);
 const slot=largestDarkSquare(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,ink?1:8);
 if(!slot.valid)throw new Error('No interior black region in the rendered type');
 const rect=document.createElementNS(NS,'rect');for(const key of ['x','y','width','height'])rect.setAttribute(key,slot[key]);rect.setAttribute('fill','#000');rect.classList.add('type-aperture');svg.append(rect);
 return {...slot,u:slot.x/m.width,v:slot.y/m.height,w:slot.width/m.width,h:slot.height/m.height};
}
