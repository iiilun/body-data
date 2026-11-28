// Author-selected order: F (Internet access), then C (child labour).
// These are rounded global estimates with distinct observation years.
export const OPENING_FACTS=Object.freeze([
 {id:'offline-world-2026',value:2000000000,year:2026,estimate:true,source:'ITU',url:'https://www.itu.int/en/mediacentre/Pages/PR-2026-11-03-Facts-and-Figures.aspx',label:{
  en:'PEOPLE WORLDWIDE ARE STILL OFFLINE.',es:'PERSONAS EN EL MUNDO SIGUEN SIN USAR INTERNET.',fr:'DE PERSONNES DANS LE MONDE N’UTILISENT TOUJOURS PAS INTERNET.',zh:'全球仍未使用網路的人。',ja:'世界で、今もインターネットを利用していない人々。',ko:'전 세계에서 아직 인터넷을 사용하지 않는 사람들.',ar:'شخص حول العالم ما زالوا لا يستخدمون الإنترنت.'
 }},
 {id:'child-labour-world-2024',value:138000000,year:2024,estimate:true,source:'ILO / UNICEF',url:'https://www.ilo.org/resource/other/2024-global-estimates-child-labour-frequently-asked-questions',label:{
  en:'CHILDREN AGED 5–17 ARE IN CHILD LABOUR.',es:'NIÑOS Y NIÑAS DE 5 A 17 AÑOS EN SITUACIÓN DE TRABAJO INFANTIL.',fr:'D’ENFANTS DE 5 À 17 ANS EN SITUATION DE TRAVAIL DES ENFANTS.',zh:'全球處於童工勞動的 5–17 歲兒童。',ja:'世界で児童労働に従事する5〜17歳の子ども。',ko:'전 세계에서 아동노동에 종사하는 5–17세 아동.',ar:'طفل بين ٥ و١٧ عاماً منخرطون في عمل الأطفال حول العالم.'
 }}
]);
const estimates={en:'EST.',es:'EST.',fr:'EST.',zh:'估計',ja:'推計',ko:'추정',ar:'تقدير'};
export function openingFacts(language='en'){
 const locale=language==='zh'?'zh-Hant':language,yearFormat=new Intl.NumberFormat(locale,{useGrouping:false});
 return OPENING_FACTS.map(fact=>({...fact,label:fact.label[language]||fact.label.en,year:yearFormat.format(fact.year)+(fact.estimate?' '+(estimates[language]||estimates.en):'')}));
}
