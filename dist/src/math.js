export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = (current, target, dt, speed = 6) => lerp(current, target, 1 - Math.exp(-dt * speed));
export const hash = (x) => { const v = Math.sin(x * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
export function weightedMean(rows) {
  const usable = rows.filter(r => Number.isFinite(r.value) && Number.isFinite(r.weight) && r.weight > 0);
  const weight = usable.reduce((n, r) => n + r.weight, 0);
  return weight ? usable.reduce((n, r) => n + r.value * r.weight, 0) / weight : null;
}
export function sceneScores(pose, appearance = {}, previousNose = null) {
  if (!pose?.[11] || !pose?.[12] || !pose?.[0]) return null;
  const p = pose;
  const width = Math.max(.08, Math.abs(p[11].x - p[12].x));
  const wrists = [p[15], p[16]].filter(v => v && (v.visibility ?? 1) > .45);
  const shouldersY = (p[11].y + p[12].y) / 2;
  const raised = wrists.some(v => v.y < p[0].y + .06);
  const armHeight = wrists.length === 2 ? clamp(1-Math.max(0,((wrists[0].y+wrists[1].y)/2-shouldersY)/width-.15)*2) : 0;
  const open = wrists.length === 2 ? clamp((Math.abs(wrists[0].x - wrists[1].x)/width-1)/1.1)*armHeight : 0;
  const level = wrists.length === 2 ? 1 - clamp(Math.abs(wrists[0].y - wrists[1].y) / width) : 0;
  const movement = previousNose ? clamp(Math.abs(p[0].x - previousNose.x) * 40) : 0;
  return {
    shelter: .1 + (raised ? .8 : 0) + (appearance.headwear ? .3 : 0),
    hold: .1 + open * .65 + level * open * .25 + (appearance.longHair ? .08 : 0),
    space: .22 + (1 - open) * .3 + movement * .35,
    raised, open, shouldersY,
  };
}
export function coverGeometry(width, height, videoWidth, videoHeight) {
  const scale = Math.min(width * .9 / videoWidth, height * .83 / videoHeight);
  const w = videoWidth * scale, h = videoHeight * scale;
  return { x: (width - w) / 2, y: height * .56 - h / 2, width: w, height: h };
}
export function pointToScreen(point, geometry) {
  return {x: geometry.x + (1 - point.x) * geometry.width, y: geometry.y + point.y * geometry.height};
}
export function inferScene(scores) {
  return Object.keys(scores).filter(k => ['shelter', 'hold', 'space'].includes(k)).sort((a,b) => scores[b] - scores[a])[0] || 'space';
}
