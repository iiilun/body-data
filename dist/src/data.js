import {dictionary,number,compact,countryName} from './i18n.js?v=5.6.2';
export function aggregateCarbon(rows,members,scope){
  if(scope==='en'){
    const world=rows.find(r=>r.countryiso3code==='WLD'&&Number.isFinite(r.value));
    return world?{value:world.value,coverageCount:1,memberCount:1,year:Number(world.date)}:null;
  }
  const set=new Set(members.map(m=>m.iso3));
  const covered=rows.filter(r=>set.has(r.countryiso3code)&&Number.isFinite(r.value));
  return covered.length?{value:covered.reduce((n,r)=>n+r.value,0),coverageCount:covered.length,memberCount:set.size,year:Number(covered[0].date)}:null;
}
export class DataService{
  constructor(){this.snapshot=null;this.live=null;this.liveError=null;}
  async load(){
    const response=await fetch('./assets/data.json');
    if(!response.ok)throw new Error(`Data snapshot: ${response.status}`);
    this.snapshot=await response.json();
    try{this.live=JSON.parse(localStorage.getItem('body-data-carbon-v1')||'null');}catch{}
    this.refresh().catch(error=>{this.liveError=String(error.message)});
    return this.snapshot;
  }
  async refresh(){
    // Same reference year and exact country membership: do not sum aggregate rows.
    const year=this.snapshot.scopes.en.shelter.year;
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const url=`https://api.worldbank.org/v2/country/all/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=${year}:${Math.max(year,new Date().getFullYear())}&per_page=2000`;
      const response=await fetch(url,{signal:controller.signal});
      if(!response.ok)throw new Error(`World Bank: ${response.status}`);
      const payload=await response.json(),rows=payload[1];
      if(!Array.isArray(rows))throw new Error('Unexpected World Bank response');
      const availableYear=Math.max(...rows.filter(r=>r.countryiso3code==='WLD'&&Number.isFinite(r.value)).map(r=>Number(r.date)));
      if(!Number.isFinite(availableYear)||availableYear<year)throw new Error('No current reference year');
      const annualRows=rows.filter(r=>Number(r.date)===availableYear);
      const live={year:availableYear,updated:new Date().toISOString(),scopes:{}};
      for(const scope of ['en','es','fr','ja','ko','ar']){
        const result=aggregateCarbon(annualRows,this.snapshot.groups[scope]?.members||[],scope);
        const previous=this.snapshot.scopes[scope].shelter;
        if(result&&result.coverageCount>=(previous.coverageCount||1))live.scopes[scope]=result;
      }
      this.live=live;
      try{localStorage.setItem('body-data-carbon-v1',JSON.stringify(live))}catch{}
      return live;
    }finally{clearTimeout(timeout)}
  }
  raw(scope,topic){
    const original=this.snapshot?.scopes?.[scope]?.[topic];
    if(!original)return null;
    if(topic==='shelter'&&this.live?.year>=original.year&&this.live.scopes?.[scope]){
      const r=this.live.scopes[scope];
      return {...original,...r,sourceURL:`https://api.worldbank.org/v2/country/all/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=${r.year}&per_page=400`,rateTonnesPerSecond:r.value*1e6/(86400*(r.year%4===0?366:365)),retrievedAt:this.live.updated};
    }
    return original;
  }
  metric(scope,topic,elapsed=0){
    const raw=this.raw(scope,topic);if(!raw)return null;
    const d=dictionary(scope);
    let value=raw.value,year=raw.period||raw.year,label,observation=null,male=raw.maleValue;
    if(topic==='hold'&&value==null&&raw.countryDetails?.length){
      observation=raw.countryDetails[Math.floor(elapsed/7)%raw.countryDetails.length];
      value=observation.femaleHoursDay;year=observation.surveyYear;male=observation.maleHoursDay;
    }
    if(topic==='shelter')label=scope==='zh'?'carbonGhg':'carbon';
    if(topic==='hold')label=raw.unit.includes('ratio')?'careRatio':scope==='zh'?'careTaiwan':'careWomen';
    if(topic==='space')label=raw.unit.includes('estimated people')?'housingPeople':raw.unit.includes('square')?'floorArea':raw.unit.includes('mortgage')?'mortgage':'housingShare';
    const isPercent=label==='housingShare'||label==='mortgage';
    const displayValue=topic==='shelter'?value*1e6:value;
    let short=compact(displayValue,scope);
    if(isPercent)short=number(value,scope,2)+'%';
    else if(label==='careRatio')short=number(value,scope,1)+'×';
    else if(topic==='hold')short=number(value,scope,2);
    const country=observation?.iso2?countryName(observation.iso2,scope):null;
    const ratio=label==='careRatio'?value:male>0?value/male:1;
    const housingPressure=clampHousing(raw.weightedPercentCovered??(isPercent?value:25));
    const source=scope==='zh'?({shelter:'環境部氣候變遷署',hold:'衛生福利部',space:'內政部不動產資訊平台'}[topic]):raw.sourceName;
    return {raw,rawValue:value,value:displayValue,short,label,unit:d.labels[label],year,country,male,observation,ratio,housingPressure,
      rate:raw.rateTonnesPerSecond||0,estimated:raw.estimated,partial:raw.coverageCount<raw.memberCount,
      coverage:raw.memberCount?`${number(raw.coverageCount,scope,0)}/${number(raw.memberCount,scope,0)}`:null,
      source,url:raw.sourceURL,retrieved:raw.retrievedAt||this.snapshot.retrievedAt};
  }
}
function clampHousing(percent){return Math.min(1,Math.max(0,percent/100));}
