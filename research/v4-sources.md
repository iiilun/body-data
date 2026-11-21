# v4 verified facts —2026-11-21

Only `v4-extra-facts.json` and this file were authored for this research pass. JSON `cards` uses the requested schema; `labelDefinitions` supplies English meaning and units. Percent values are0–100, not fractions. All population and dwelling stocks are snapshots; do not turn them into new people per second.

## Key source checks

- HOLD Taiwan: [MOHW2024 Women15–64 Survey](https://www.mohw.gov.tw/dl-96609-c79fe586-f992-49e1-8ab8-add082022198.html), printedp14/PDFp22,Table15:3.03h total=1.51housework+1.47care+0.05volunteering. Survey includes nonparticipants.4.41h only married/cohabiting women.
- SPACE Taiwan: [MOI2026Q1](https://pip.moi.gov.tw/Publicize/Info/E1050): national41.46% mortgage burden /9.47price-income ratio plus all six cities. Raw previously downloaded official HTML also rechecked for every numeric value. Mortgage ratio uses20-year amortization,70%LTV,2.318%interest; it is not a percent of households overburdened.
- THIRST World: [WHO/UNICEF JMP2025](https://data.unicef.org/resources/jmp-report-2025/) covers2024.2.1b lacking safely-managed service includes1.4b basic-only,287m limited,302m unimproved,106m surface-water users. [Definition](https://www.who.int/news-room/fact-sheets/detail/drinking-water/): improved source,on premises,available when needed,and uncontaminated. The below-basic count in JSON is a separately marked estimate from exact2024 WDI coverage and population, not a sum of rounded categories.
- THIRST Taiwan: [2024 SDG annual review](https://ncsd.ndc.gov.tw/_ofu/FileDatabase/c755e6d4-c380-4f83-910e-6d05f3773c42/2024%E8%87%BA%E7%81%A3%E6%B0%B8%E7%BA%8C%E7%99%BC%E5%B1%95%E7%9B%AE%E6%A8%99%E5%B9%B4%E5%BA%A6%E6%AA%A2%E8%A8%8E%E5%A0%B1%E5%91%8AV2.pdf): public tap-water95.78%,389000unconnected households,utility leakage11.99%(Taiwan Water) and10.27%(Taipei Water). These are not the JMP safely-managed indicator. [WRA2024 water-use report](https://web.wra.gov.tw/wralib/WraLib/wSite/books_97917): domestic use3.178billion m³.
- OFFLINE World: [ITU2026 release,2026-11-03](https://www.itu.int/en/mediacentre/Pages/PR-2026-11-03-Facts-and-Figures.aspx):2b offline,6.3b online,76%online; urban82/rural63;male79/female74. This is the latest release, while machine-readable WDI country cards use common-year2024.
- OFFLINE Taiwan: [MODA2025 report](https://www-api.moda.gov.tw/File/Get/moda/zh-tw/UtFPqDu90WXGz2h), published2026-01-13:12+national residents ever-use90.3%,households93.4%,65+63.3%,75+41.4%,men92.5/women88.2. Age/sex:appendix4TableB-1/PDFp368. Ever-use12+ differs from ITU recent3-month all-population use.
- VACANT Taiwan: [DGBAS2020 census FINAL report](https://ws.dgbas.gov.tw/001/Upload/463/relfile/11064/230649/0b703c3e-23af-471f-a1f6-555315ca0ce2.pdf), printedp63/PDFp69:1.662m idle dwellings,18.5%;1.174m currently unused,13.1%;489000occasional own use. The preliminary1.664m was superseded. Idle includes occasional own use, not low-power inferred vacancy and not immediately rentable supply. Rounded subcounts need not sum exactly.
- VACANT Japan: [Statistics Bureau final2023tabulation,2024-10bulletin](https://www.stat.go.jp/english/info/news/20241030.html):9.002m,13.8%;includes rental,sale,secondary and other vacancies.
- VACANT Spain: [INE2021census,2023release](https://www.ine.es/prensa/censo_2021_jun.pdf),PDFp7:3.837328m,14.4%;no power contract or preceding-year use below the same-municipality15-day benchmark. Provisional release; not directly comparable to other national definitions. Low-use943924and sporadic2.514511m are separate classes.
- VACANT France: [INSEE Focus359](https://www.insee.fr/fr/statistiques/8640662),Table1:2.962m,7.7%,2025-01-01,provisional,France excludingMayotte; excludes secondary dwellings. Mainland-only values differ.
- VACANT US: [Census HVS2026Q3](https://www.census.gov/housing/hvs/current/index.html),released2026-10-28:rental vacancy7.6%,homeowner vacancy1.2%. Different market denominators; neither is total dwelling vacancy.

## Live country/group strategy

Four official World Bank responses were successfully downloaded and validated for common-year2024:`SH.H2O.SMDW.ZS`,`SH.H2O.BASW.ZS`,`IT.NET.USER.ZS`,`SP.POP.TOTL`. Exact endpoints,weighting code,covered member counts,missing ISO3,and all source country observations are inside JSON `apiStrategy` and `apiAudits`. CORS GET support was verified in the earlier pass. Query per_page400 and validate pages=1; filter the explicit project ISO3 set before weighting, never sum the266rows wholesale. Values with missing observations stay missing. `mrnev=1` may mix years.

`vacant` has no manufactured World total. English cards are country observations; ja/es/fr repeat their own verified national examples with explicit scope. Korean and Arabic VACANT now have named country observations (see final additions below); none is a full-language-region total.

## Final additions

- VACANT South Korea: [official2024 census report](https://mods.go.kr/boardDownload.es?bid=203&list_no=437767&seq=3),released2025-07-29,printedpp71–72/PDFpp80–81,Tables50–51:1.599million unoccupied dwellings as of2024-11-01,8.0%of all dwellings;468000of them were built in1989or earlier. Values rounded to thousands. Census point-in-time nonoccupancy is not the legal long-abandoned-home definition. Added for ko/en with explicit Republic of Korea scope.
- VACANT Arabic country example: [Morocco HCP RGPH2024 urban housing study](https://www.hcp.ma/Parc-logement-urbain-au-Maroc-selon-les-resultats-du-recensement-general-de-la-population-et-de-l-habitat-de-2024_a4226.html),December2025:urban vacant dwellings approximately1.1million,13.4%of urban dwellings. Secondary/seasonal15.5%is a separate class. Added for ar/en; urban-only scope is essential.
- Egypt2017: official CAPMAS [training definitions](https://censusinfo.capmas.gov.eg/metadata-ar-v4.2/index.php/catalog/1723/download/6394) distinguish closed because family abroad/owns another home,completed vacant,unfinished vacant,renovation and demolition. No category total was primary-source verified in this pass, so newspaper12.5/12.8million aggregates were not inserted.

Final JSON contains110cards. No application files or other research files were changed.

## Integration additions: global care and housing

The released `dist/assets/extra-facts.json` also contains explicitly labelled global measures:

- ILO 2024 release, observation year2023:708million women and40million men aged15+ outside the labour force because of care.45%/5% use only the population of the relevant sex **already outside the labour force**, not all women/men. https://www.ilo.org/resource/news/unpaid-care-work-prevents-708-million-women-participating-labour-market
- ILO 2018 report:16.4billion hours/day estimate based on64-country time-use surveys with differing observation years; minimum-wage valuation about9% of global GDP. These are linked measures, not additive quantities. https://www.ilo.org/resource/news/ilo-calls-urgent-action-prevent-looming-global-care-crisis
- UN-Habitat World Cities Report2026: **up to**3.4billion affected by housing inadequacy; approximately64million evicted during2003–2023. The eviction estimate is a historical cumulative measure. The housing estimate is a report estimate, not an observation dated2024. https://unhabitat.org/knowledge/publications/world-cities-report-2026-the-global-housing-crisis-pathways-to-action

Data card typography is a visual metaphor. It does not add hours, percentages, monetary valuations and people into a shared numerical total.
