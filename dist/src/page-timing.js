export const PAGE_DURATIONS=Object.freeze({briefing:6,guide:6,align:3,result:7});
const clock=elapsed=>{const value=Number(elapsed??0);return Number.isNaN(value)?0:value;};
export function pageProgress(page,elapsed){
 const duration=PAGE_DURATIONS[page];if(!duration)return 0;
 return Math.max(0,Math.min(1,clock(elapsed)/duration));
}
export function pageCountdown(page,elapsed){
 const duration=PAGE_DURATIONS[page];if(!duration)return 0;
 return Math.max(0,Math.min(duration,Math.ceil(duration-clock(elapsed))));
}
