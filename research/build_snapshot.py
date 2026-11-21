"""Build provenance-rich data for BODY/DATA. Run with Python 3, no packages.

Raw files are exact official API responses fetched on 2026-11-20.
Groups are project-defined geographic sets, not a count of language speakers.
"""
from pathlib import Path
import json
import calendar

ROOT = Path(__file__).resolve().parent
RAW = ROOT / 'raw'
YEAR = 2024
UN_BASE = 'https://unstats.un.org/SDGAPI/v1/sdg/Series/Data'
WB_BASE = 'https://api.worldbank.org/v2/country/all/indicator/'

def wb_url(code):
    return WB_BASE + code + '?format=json&date=2024&per_page=400'

def read(name):
    return json.loads((RAW / name).read_text())

def wb(name):
    return {x['countryiso3code']: x for x in read(name)[1]}

co2 = wb('wb-co2-2024.json')
urban = wb('wb-urban-2024.json')
female = wb('wb-female-population-2024.json')
female_under = wb('wb-female-under15-2024.json')
male = wb('wb-male-population-2024.json')
male_under = wb('wb-male-under15-2024.json')
care = read('un-care.json')['data']
slum = read('un-slum.json')['data']
inadequate = read('un-inadequate-housing.json')['data']

# M49, ISO3. Names are preserved from the official API.
SETS = {
    'es': '32 ARG,68 BOL,152 CHL,170 COL,188 CRI,192 CUB,214 DOM,218 ECU,222 SLV,226 GNQ,320 GTM,340 HND,484 MEX,558 NIC,591 PAN,600 PRY,604 PER,630 PRI,724 ESP,858 URY,862 VEN',
    'fr': '56 BEL,204 BEN,854 BFA,108 BDI,120 CMR,124 CAN,140 CAF,148 TCD,174 COM,178 COG,180 COD,384 CIV,262 DJI,226 GNQ,250 FRA,266 GAB,324 GIN,332 HTI,442 LUX,450 MDG,466 MLI,492 MCO,562 NER,646 RWA,686 SEN,690 SYC,756 CHE,768 TGO,548 VUT',
    'ja': '392 JPN',
    'ko': '408 PRK,410 KOR',
    'ar': '12 DZA,48 BHR,174 COM,262 DJI,818 EGY,368 IRQ,400 JOR,414 KWT,422 LBN,434 LBY,478 MRT,504 MAR,512 OMN,275 PSE,634 QAT,682 SAU,706 SOM,729 SDN,760 SYR,788 TUN,784 ARE,887 YEM',
}

def population_15plus(code, sex):
    pop, under = (female, female_under) if sex == 'FEMALE' else (male, male_under)
    a, b = pop.get(code, {}).get('value'), under.get(code, {}).get('value')
    return None if a is None or b is None else a-b

def record(r):
    return {
        'm49': r['geoAreaCode'], 'name': r['geoAreaName'],
        'year': int(r['timePeriodStart']), 'value': float(r['value']),
        'dimensions': r['dimensions'], 'nature': r['attributes'].get('Nature'),
        'source': r['source'], 'footnotes': r['footnotes'],
    }

groups = {}
for lang, definition in SETS.items():
    members = [x.split() for x in definition.split(',')]
    emissions = []
    housing = []
    care_records = []
    alternative_housing = []
    for m49, iso3 in members:
        c = co2.get(iso3)
        if c and c['value'] is not None:
            emissions.append({'m49': m49, 'iso3': iso3, 'name': c['country']['value'], 'year': YEAR, 'value': c['value']})
        s = [r for r in slum if r['geoAreaCode'] == m49 and r['timePeriodStart'] == YEAR and r['dimensions'].get('Reporting Type') == 'G']
        u = urban.get(iso3, {}).get('value')
        if len(s) == 1 and u is not None:
            row = record(s[0])
            row.update({'iso3': iso3, 'urbanPopulation': u, 'estimatedPeople': u*row['value']/100})
            housing.append(row)
        cr = [r for r in care if r['geoAreaCode'] == m49 and r['dimensions'].get('Age') == '15+' and r['dimensions'].get('Location') == 'ALLAREA' and r['dimensions'].get('Sex') in ['FEMALE', 'MALE']]
        fy = {int(r['timePeriodStart']) for r in cr if r['dimensions']['Sex'] == 'FEMALE'}
        my = {int(r['timePeriodStart']) for r in cr if r['dimensions']['Sex'] == 'MALE'}
        paired = fy & my
        if paired:
            latest = max(paired)
            both = [r for r in cr if int(r['timePeriodStart']) == latest]
            f = next(r for r in both if r['dimensions']['Sex'] == 'FEMALE')
            m = next(r for r in both if r['dimensions']['Sex'] == 'MALE')
            fp = population_15plus(iso3, 'FEMALE')
            mp = population_15plus(iso3, 'MALE')
            care_records.append({
                'm49':m49, 'iso3':iso3, 'name':f['geoAreaName'], 'surveyYear':latest,
                'femalePercentDay':float(f['value']), 'malePercentDay':float(m['value']),
                'femaleHoursDay':float(f['value'])*24/100, 'maleHoursDay':float(m['value'])*24/100,
                'femaleAdultPopulation2024':fp,'maleAdultPopulation2024':mp,
                'femaleRaw':record(f), 'maleRaw':record(m),
            })
        ih = [r for r in inadequate if r['geoAreaCode'] == m49 and r['dimensions'].get('Cities') == 'NOCITI' and r['dimensions'].get('Location') == 'ALLAREA']
        if ih:
            alternative_housing.append(record(max(ih,key=lambda x:x['timePeriodStart'])))
    total_mt = sum(x['value'] for x in emissions)
    covered_urban = sum(x['urbanPopulation'] for x in housing)
    total_urban = sum(urban.get(code,{}).get('value') or 0 for _, code in members)
    estimated_people = sum(x['estimatedPeople'] for x in housing)
    care_with_pop = [x for x in care_records if x['femaleAdultPopulation2024'] is not None and x['maleAdultPopulation2024'] is not None]
    fpop = sum(x['femaleAdultPopulation2024'] for x in care_with_pop)
    mpop = sum(x['maleAdultPopulation2024'] for x in care_with_pop)
    fhours = sum(x['femaleAdultPopulation2024']*x['femaleHoursDay'] for x in care_with_pop)
    mhours = sum(x['maleAdultPopulation2024']*x['maleHoursDay'] for x in care_with_pop)
    fhpd = fhours/fpop if fpop else None
    mhpd = mhours/mpop if mpop else None
    groups[lang] = {
        'members':[{'m49':m49,'iso3':iso,'iso2':co2.get(iso,urban.get(iso,{})).get('country',{}).get('id'),'name':co2.get(iso,urban.get(iso,{})).get('country',{}).get('value',iso)} for m49,iso in members],
        'memberCount':len(members),
        'shelter':{
            'indicator':'EN.GHG.CO2.MT.CE.AR5','label':'CO2 emissions excluding LULUCF',
            'value':total_mt,'unit':'Mt CO2e/year','year':YEAR,
            'estimatedTonnesPerSecond':total_mt*1e6/(366*86400),
            'coverageCount':len(emissions),'raw':emissions,
            'sourceUrl':wb_url('EN.GHG.CO2.MT.CE.AR5'),
            'interpretation':'Climate pressure context. This is not a measure of current heat or an individual health-risk model.',
        },
        'space':{
            'indicator':'EN_LND_SLUM','label':'Urban population living in slums',
            'value':estimated_people,'unit':'estimated people','year':YEAR,
            'weightedPercentCovered':estimated_people/covered_urban*100 if covered_urban else None,
            'coveredUrbanPopulation':covered_urban,'groupUrbanPopulationWithData':total_urban,
            'populationCoverage':covered_urban/total_urban if total_urban else None,
            'coverageCount':len(housing),'raw':housing,
            'sourceUrl':UN_BASE+'?seriesCode=EN_LND_SLUM&pageSize=25000',
            'denominatorSourceUrl':wb_url('SP.URB.TOTL'),
            'estimateNote':'Custom estimate: UN-Habitat 2024 slum shares times World Bank 2024 urban populations, then summed. Two source vintages; this is not an official UN language-region aggregate. Missing countries are excluded, never treated as zero. Slum classification includes services and housing quality, not only floor space.',
            'alternativeHousingObservations':alternative_housing,
        },
        'hold':{
            'indicator':'SL_DOM_TSPD','label':'Unpaid domestic and care work, age 15+, all areas',
            'femaleEstimatedHoursPerDay':fhpd,'maleEstimatedHoursPerDay':mhpd,
            'estimatedRatio':fhpd/mhpd if fhpd is not None and mhpd else None,
            'femaleEstimatedTotalPersonHoursPerDay':fhours if fpop else None,
            'maleEstimatedTotalPersonHoursPerDay':mhours if mpop else None,
            'coverageCount':len(care_with_pop),'observationYears':sorted(set(x['surveyYear'] for x in care_records)),
            'raw':care_records,'sourceUrl':UN_BASE+'?seriesCode=SL_DOM_TSPD&pageSize=25000',
            'estimateNote':'Custom mixed-year estimate only, NOT a same-year complete language-region observation. Latest paired female/male age15+ ALLAREA survey per geography; weight percentages by 2024 sex-specific population age15+ (total minus age0-14). Do not silently extrapolate to missing members. Use the estimate label, survey year range, and coverage.',
        },
    }

world_slum = next(r for r in slum if r['geoAreaCode']=='1' and r['timePeriodStart']==2024)
out = {
    'retrievedAt':'2026-11-20','unRelease':'2026.Q3.G.01','worldBankLastUpdated':read('wb-co2-2024.json')[0]['lastupdated'],
    'groupDefinition':'Project-defined geographic sets where a language is official, de facto national, or an established national administrative language. Whole geography populations; NOT actual speakers. French includes established francophone administrative countries even where official status recently changed. Sets may overlap across languages. Spanish includes Puerto Rico. Korean includes both Koreas; missing North/South observations remain explicit. These sets need editorial review before claiming exhaustive coverage.',
    'api':{
        'un':'https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?seriesCode=SL_DOM_TSPD&pageSize=25000',
        'unCors':'No Access-Control-Allow-Origin observed on fetched response; use snapshot or server proxy.',
        'wb':wb_url('EN.GHG.CO2.MT.CE.AR5'),
        'wbCors':'Verified response header Access-Control-Allow-Origin: *; GET allowed. Snapshot fallback still recommended.',
        'unCorrectSeries':'SL_DOM_TSPD. SH_FPL_INFM is reproductive-health decision making in the current release; do not reuse it for unpaid care.',
    },
    'global':{
        'shelter':{'co2Mt2024':co2['WLD']['value'],'tonnesPerSecond2024':co2['WLD']['value']*1e6/(366*86400),'sourceUrl':wb_url('EN.GHG.CO2.MT.CE.AR5')},
        'temperature':{'value':1.43,'uncertainty':0.13,'unit':'C anomaly','year':2025,'baseline':'1850-1900','sourceUrl':'https://wmo.int/publication-series/state-of-global-climate/state-of-global-climate-2025'},
        'hold':{'value':2.5,'unit':'female-to-male unpaid domestic/care hours ratio','publicationYear':2025,'sourceUrl':'https://www.un.org/en/node/235665','note':'Published aggregate; underlying surveys vary in year. This ratio is not a per-second count.'},
        'careLabourExclusion':{'women':708000000,'men':40000000,'year':2023,'population':'age15+ outside labour force due to care responsibilities','sourceUrl':'https://www.ilo.org/resource/news/unpaid-care-work-prevents-708-million-women-participating-labour-market'},
        'space':{'value':float(world_slum['value']),'unit':'percent urban population in slums','year':2024,'raw':record(world_slum),'reportedPeople':1160000000,'sourceUrl':'https://unstats.un.org/sdgs/report/2026/Goal-11'},
    },
    'taiwan':{
        'shelter':{'value':1.65,'unit':'C anomaly','temperature':24.97,'year':2024,'baseline':'1901-2000','coverage':'six long-running stations: Taipei, Taichung, Tainan, Hengchun, Hualien, Taitung','sourceUrl':'https://www.cwa.gov.tw/Data/service/notice/download/Publish_20250722161337.pdf','note':'Do not mix with the CWA all-station 24.6C / +0.7C vs1991-2020 statistic; it is a different spatial and temporal baseline.'},
        'ghg':{'value':273.161,'unit':'MtCO2e total GHG excluding LULUCF','year':2024,'sourceUrl':'https://www.cca.gov.tw/news-and-releases/faq/1517.html','note':'ALL GHG, not just CO2. Cannot directly compare to the CO2-only WDI indicator without relabeling.'},
        'hold':{'value':3.03,'unit':'hours per woman per day','year':2024,'population':'women age15-64 including nonparticipants','components':{'housework':1.51,'careOfFamilyNeighboursFriends':1.47,'volunteer':0.05},'sourceUrl':'https://www.mohw.gov.tw/dl-96609-c79fe586-f992-49e1-8ab8-add082022198.html','note':'Includes volunteering, unlike core SDG domestic/care definition. This survey supplies no matching male statistic. Do not invent a gender ratio. Married/cohabiting women:4.41h/day.'},
        'space':{'value':14.3,'unit':'ping per person average living area','squareMetres':14.3*400/121,'year':2024,'sourceUrl':'https://www.ey.gov.tw/state/E01934D402D13ED7/d8582b41-8aa9-454d-9a9a-9f9dde6d4c6d','note':'Population average, not an overcrowding or housing-inadequacy rate; it does not measure distribution.'},
        'housingAffordability':{'value':41.46,'unit':'percent median mortgage-payment to median disposable-income ratio','period':'2026Q1','priceToIncome':9.47,'sourceUrl':'https://pip.moi.gov.tw/Publicize/Info/E1050','note':'2026Q1 official published values. Modeled affordability ratio:20-year amortizing loan,70%LTV,interest rate2.318%; not the percent of actual residents overburdened. Detail page sometimes rejects automated requests.'},
    },
    'groups':groups,
    'dynamicRules':[
        'Annual CO2 emissions can be converted to an average tonnes/second rate. Label EST.; year2024 uses366 days. Elapsed-session accumulation is not a real-time sensor or an exact current-day total.',
        'Care hours/day can determine visual particle rate. A static average must not be displayed as though it increases each second. Mixed survey-year aggregate requires EST., covered count, and year range.',
        'Slum population is a stock, not a flow. Do NOT divide a stock by seconds/year and claim newly affected people per second. Repeated counts, pixel occupancy, or year-to-year chart animation are acceptable; any interpolation needs an estimate label.',
        'Temperature anomaly is not a counter. Animate its typography or use past annual observations; do not make it climb at random and retain an official-data label.',
        'Artistic melting, load, and compression are not calibrated health or physical-risk predictions.',
    ],
}

def topic(value, unit, year, url, name, label, notes, details, **extra):
    return dict(value=value,unit=unit,year=year,sourceURL=url,sourceName=name,label=label,
                coverageNotes=notes,countryDetails=details,**extra)

# Application-ready schema. Research estimates above are preserved for audit;
# mixed-year care averages are deliberately NOT the primary app values.
scopes = {}
scopes['en'] = {
    'shelter':topic(co2['WLD']['value'],'Mt CO2e/year',2024,wb_url('EN.GHG.CO2.MT.CE.AR5'),
        'World Bank WDI / EDGAR','CO2 emissions excluding LULUCF',
        'Official World aggregate. Annual total, not real-time heat. Constant tonnes/second conversion is an estimate.',
        [co2['WLD']],estimated=False,rateTonnesPerSecond=co2['WLD']['value']*1e6/(366*86400),
        temperatureContext=out['global']['temperature']),
    'hold':topic(2.5,'female/male hours ratio',2025,'https://www.un.org/en/node/235665',
        'UN DESA / UN Women, Gender Snapshot 2025','Unpaid domestic and care work',
        'Published global ratio. 2025 is publication year; underlying country survey years vary. This is not a daily total.',[],estimated=False),
    'space':topic(float(world_slum['value']),'percent urban population',2024,
        UN_BASE+'?seriesCode=EN_LND_SLUM&geoAreaCode=1&pageSize=100','UN-Habitat / UNSD SDG Database',
        'Urban population living in slums',
        'Official World aggregate. Slum classification includes basic services and housing quality as well as space.',
        [record(world_slum)],estimated=False,reportedPeople=1160000000),
}
tw = out['taiwan']
scopes['zh'] = {
    'shelter':topic(tw['ghg']['value'],'Mt CO2e/year',2024,tw['ghg']['sourceUrl'],'Taiwan Climate Change Administration',
        'Total greenhouse-gas emissions excluding LULUCF',
        'Taiwan official inventory; all greenhouse gases, unlike the CO2-only metric used in other scopes. Labels must reflect this difference.',
        [tw['ghg']],estimated=False,rateTonnesPerSecond=tw['ghg']['value']*1e6/(366*86400),temperatureContext=tw['shelter']),
    'hold':topic(3.03,'hours/woman/day',2024,tw['hold']['sourceUrl'],'Taiwan Ministry of Health and Welfare',
        'Unpaid care, housework and volunteering',
        'Taiwan women aged15-64, including nonparticipants. Includes volunteering; not exactly the SDG definition. Matching male value is unavailable in this survey.',
        [tw['hold']],estimated=False,population='Women age15-64'),
    'space':topic(tw['housingAffordability']['value'],'percent median mortgage-payment / median disposable-income',2026,
        tw['housingAffordability']['sourceUrl'],'Taiwan Ministry of the Interior, Real Estate Information Platform',
        'Median mortgage repayment / median disposable income',
        'Taiwan2026Q1 official modeled housing-affordability ratio. A median-priced-home loan repayment relative to median household disposable income; not the percent of households actually overburdened, not a floor-space inadequacy rate.',
        [tw['housingAffordability']],estimated=False,period='2026Q1',
        alternativeMetric=tw['space']),
}
for lang,g in groups.items():
    c,s,h=g['shelter'],g['space'],g['hold']
    count=g['memberCount']
    observations=h['raw']
    # Only a one-member complete scope can have an observed headline average.
    # Korean-language scope deliberately does not silently become South Korea.
    lone=observations[0] if len(observations)==1 and count==1 else None
    scopes[lang]={
        'shelter':topic(c['value'],c['unit'],2024,c['sourceUrl'],'World Bank WDI / EDGAR',c['label'],
            f'Custom geographic sum, {c["coverageCount"]}/{count} members. Whole countries/territories, not speaker populations. CO2-only excluding LULUCF.',c['raw'],
            estimated=False,customAggregation=True,rateTonnesPerSecond=c['estimatedTonnesPerSecond'],memberCount=count,coverageCount=c['coverageCount']),
        'space':topic(s['value'],'estimated people',2024,s['sourceUrl'],'UN-Habitat / UNSD; World Bank urban populations',
            'Urban population living in slums',s['estimateNote']+f' Coverage: {s["coverageCount"]}/{count} members.',s['raw'],
            estimated=True,customAggregation=True,weightedPercentCovered=s['weightedPercentCovered'],memberCount=count,coverageCount=s['coverageCount'],
            populationCoverage=s['populationCoverage'],denominatorSourceURL=s['denominatorSourceUrl'],alternativeObservations=s['alternativeHousingObservations']),
        'hold':topic(lone['femaleHoursDay'] if lone else None,'hours/woman/day',lone['surveyYear'] if lone else None,
            h['sourceUrl'],'UNSD / UN Women, SDG5.4.1',
            'Unpaid domestic and care work, women age15+',
            f'Observed country records, {h["coverageCount"]}/{count} members. Different survey years; no full-language-region aggregate is claimed. ALLAREA + age15+ only.',
            observations,estimated=False,memberCount=count,coverageCount=h['coverageCount'],observationYears=h['observationYears'],
            observedRangeHoursPerDay=[min(x['femaleHoursDay'] for x in observations),max(x['femaleHoursDay'] for x in observations)] if observations else None,
            maleValue=lone['maleHoursDay'] if lone else None),
    }
scopes['ko']['space']['alternativeObservations'].append({
    'name':'Republic of Korea','m49':'410','year':2024,'value':3.8,'unit':'percent households',
    'label':'Households below minimum housing standards',
    'sourceURL':'https://www.index.go.kr/unify/idx-info.do?idxCd=8014',
    'sourceName':'Republic of Korea Ministry of Land, Infrastructure and Transport / National Indicator System',
    'coverageNotes':'National household survey. Below one or more of floor area, bedrooms, facilities thresholds. Different definition and denominator from urban slum population; do NOT merge the two percentages.'
})
by_m49={'1':{'iso2':'001','iso3':'WLD'}}
for group in groups.values():
    for member in group['members']:by_m49[member['m49']]=member
for lang,topics in scopes.items():
    for item in topics.values():
        for row in item['countryDetails']:
            if lang=='zh':
                row.update(iso2='TW',iso3='TWN',name='Taiwan')
            elif lang=='en':
                row.update(iso2='001',iso3='WLD')
            else:
                code=by_m49.get(row.get('m49'),{})
                row['iso2']=code.get('iso2')
                if 'iso3' not in row:row['iso3']=code.get('iso3')
        for row in item.get('alternativeObservations',[]):
            code=by_m49.get(row.get('m49'),{})
            row['iso2']=code.get('iso2')
            row['iso3']=code.get('iso3')
out['scopes']=scopes
(ROOT.parent/'data-research.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
for lang,g in groups.items():
    print(lang,'members',g['memberCount'],'CO2',round(g['shelter']['value'],3),'housing',round(g['space']['value']),g['space']['coverageCount'],'care',g['hold']['femaleEstimatedHoursPerDay'],g['hold']['coverageCount'],g['hold']['observationYears'])
