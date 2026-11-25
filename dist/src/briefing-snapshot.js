// Render the existing reading layout once. Zooming a fixed viewport avoids allocating
// enormous DOM/SVG layers while coming out of a small piece of black printing.
export function captureBriefing(root,width,height){
 const canvas=document.createElement('canvas'),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
 const ctx=canvas.getContext('2d',{alpha:false});ctx.scale(ratio,ratio);ctx.fillStyle=getComputedStyle(root).backgroundColor;ctx.fillRect(0,0,width,height);
 const selectors=['.brief-heading h2','.brief-heading>p','.fact-value','.fact-label','.brief-source'];
 for(const el of root.querySelectorAll(selectors.join(','))){
  const box=el.getBoundingClientRect(),style=getComputedStyle(el),size=parseFloat(style.fontSize),line=parseFloat(style.lineHeight)||size*1.2,text=el.dataset.value||el.textContent;
  ctx.save();ctx.font=`${style.fontWeight} ${size}px ${style.fontFamily}`;ctx.fillStyle=style.color;ctx.globalAlpha=parseFloat(style.opacity)||1;ctx.textBaseline='alphabetic';ctx.direction=style.direction;
  const right=style.textAlign==='right'||style.textAlign==='end'&&style.direction!=='rtl'||style.textAlign==='start'&&style.direction==='rtl';ctx.textAlign=style.textAlign==='center'?'center':right?'right':'left';
  if('letterSpacing' in ctx)ctx.letterSpacing=style.letterSpacing==='normal'?'0px':style.letterSpacing;
  const metrics=ctx.measureText('Hg'),baseline=(line-(metrics.fontBoundingBoxAscent??size*.9)-(metrics.fontBoundingBoxDescent??size*.22))/2+(metrics.fontBoundingBoxAscent??size*.9);
  const tokens=/[\u3400-\u9fff\u3040-\u30ff]/.test(text)?[...text]:text.match(/\S+\s*|\s+/g)||[],lines=[];let current='';
  if(el.classList.contains('fact-value'))lines.push(text);
  else{for(const token of tokens){if(current&&ctx.measureText(current+token).width>box.width+.5){lines.push(current.trimEnd());current=token.trimStart();}else current+=token;}if(current)lines.push(current.trimEnd());}
  for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],ctx.textAlign==='center'?box.x+box.width/2:right?box.right:box.x,box.y+baseline+i*line);
  ctx.restore();
 }
 for(const svg of root.querySelectorAll('.brief-heading .gesture-icon')){
  const box=svg.getBoundingClientRect();ctx.save();ctx.translate(box.x,box.y);ctx.scale(box.width/64,box.height/64);ctx.strokeStyle=getComputedStyle(svg).color;ctx.lineWidth=1.45;ctx.lineCap='round';ctx.lineJoin='round';for(const path of svg.querySelectorAll('path'))ctx.stroke(new Path2D(path.getAttribute('d')));ctx.restore();
 }
 const progress=root.querySelector('#brief-progress'),box=progress.getBoundingClientRect();ctx.fillStyle=getComputedStyle(progress).backgroundColor;ctx.fillRect(box.x,box.y,box.width,Math.max(1,box.height));
 return canvas;
}
