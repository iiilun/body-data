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
