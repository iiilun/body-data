# Data research / 2026-11-20

`../data-research.json` contains seven application-ready scopes in `scopes` and complete audit details in `groups`, `global`, and `taiwan`.

Run `python3 research/build_snapshot.py` to reproduce the JSON from bundled raw official responses. Run `python3 research/refresh_raw.py` with network access to refresh the API responses first. Taiwan publication values and the published global care ratio must be editorially reverified; the refresh script does not silently update these.

## Scope definitions

English means World. Traditional Chinese means Taiwan. Other geographic groups are explicit M49/ISO3 membership lists in `build_snapshot.py` and in `groups[lang].members`. These are entire geographies, not counts of speakers. Some groups overlap. French includes established administrative francophone geographies despite recent constitutional changes to language status. The lists are an editorial project definition and should not be described as an exhaustive census of everyone using a language.

## Important findings

- Official UN SDG API current release is `2026.Q3.G.01`. Correct unpaid-care series is `SL_DOM_TSPD`. Current `SH_FPL_INFM` is about reproductive-health decisions; an old series mapping would produce materially wrong data.
- UN API GET worked, but no `Access-Control-Allow-Origin` header was observed. Use the bundled snapshot or a server proxy. World Bank API GET explicitly returned `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET`, and a 24-hour cache lifetime.
- WDI CO2 annual 2024 totals can be added across explicitly listed geographies. French is 28/29 covered (Monaco missing); Arabic is 21/22 (Palestine missing). Missing values are not zeros. A constant annual-average tonnes/second counter must carry an estimate label; 2024 has 366 days.
- SPACE language-group counts are custom estimates: UN-Habitat 2024 slum percentages multiplied by World Bank 2024 urban populations, then summed. These are not UN-published language-region totals. Sources have different release vintages. Covered urban population and member coverage are included. Slum classification covers services and housing quality as well as crowding; it is not a direct floor-space indicator.
- Japan has an official UN 2024 slum observation of 2%. Korean-language group has a North Korean slum observation and no South Korean slum observation in this series. A separate South Korean official household minimum-standard measure is 3.8% in 2024; these definitions and denominators cannot be merged.
- Care surveys differ greatly in year and scope. Application values for Spanish, French, Arabic, and Korean are null rather than fabricated complete group means. `countryDetails` contains latest paired female/male age15+ ALLAREA observations with years. Japan's one-member scope has 3.53 hours/woman/day (2021). An explicitly labeled mixed-year research estimate exists in `groups`; it is not the primary app value.
- Taiwan 2024 women aged15-64 report 3.03h/day of unpaid care, housework, and volunteering. The inclusion of volunteering differs from the core SDG definition. This survey does not supply a matching male observation.
- Taiwan SPACE primary app value is41.46% for2026Q1, the modeled median-price mortgage-payment/median disposable-household-income ratio (20-year amortization,70%LTV,2.318%interest). It is not the share of people overburdened. Archived context14.3ping/person is an average living-area measure, not a housing inadequacy rate; conversion47.2727m²/person.
- Taiwan SHELTER 273.161MtCO2e in2024 is total greenhouse gases excluding LULUCF. Other groups use CO2 only. Keep the metric label distinct. The local temperature context is +1.65°C relative to1901-2000 from six long-running stations; WMO global +1.43°C in2025 uses1850-1900. Do not directly compare different baselines.
- Stocks (people living in slums), ratios, and temperature anomalies cannot honestly become new affected people or changing official values per second. Animate typography/occupancy or observed year-to-year changes instead. Artistic melting/load/compression is not a calibrated physical or health simulation.

`raw/` contains the downloaded official API responses and selected official HTML pages; no API keys or account credentials were used.

## Browser live refresh

The safest one-request refresh is:

`https://api.worldbank.org/v2/country/all/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=2024&per_page=400`

The response is `[metadata, observations]`, not a bare observations array. Check metadata.pages===1, response status, indicator ID, observation.date===the requested year, and that value is a finite number; zero is valid. For English, take only countryiso3code==='WLD'. For a custom group, construct a Set from groups[lang].members[].iso3 and filter observations by that exact Set. Never sum all rows: the response includes World, continents, income aggregates, etc., which would double-count. Keep entries with null values as explicit missing coverage and do not convert null to0.

Alternatively request only an exact ISO3 list, e.g.:

`https://api.worldbank.org/v2/country/JPN;PRK;KOR/indicator/EN.GHG.CO2.MT.CE.AR5?format=json&date=2024&per_page=400`

Use a fixed common observation year for a sum. `mrnev=1` returns each country's latest nonempty year and may silently mix years, so it is unsuitable for an unlabeled same-year aggregate. Refreshes can revise the2024 snapshot; they do not imply live physical measurements. Keep a short timeout and fall back to bundled data. A daily cache is sufficient; the API response had Cache-Control:max-age=86400.

`live_fetch.mjs` is a reference implementation; it does not modify the application.
