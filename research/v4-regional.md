# V4 regional access snapshots

Retrieved from World Bank's official API on 2026-11-21. The WDI responses identify their latest update as 2026-11-11. Raw responses and SHA256 values are in `research/raw/v4-access-manifest.json`.

The output is `research/v4-regional.json`. Reproduce with:

```sh
python3 research/refresh_v4_regional.py
```

Add `--refresh` to fetch fresh official responses. The builder verifies raw hashes, pagination, duplicate members, non-aggregate country identities, valid rates, same-year population/rates, coverage accounting and weighted-rate arithmetic.

## Definitions

- `SH.H2O.SMDW.ZS`: WHO/UNICEF JMP, **people using safely managed drinking-water services as a percent of the population**. Safely managed means an improved source accessible on premises, available when needed, and free from faecal and priority chemical contamination. The complement **does not mean no water or no basic water service**. [World Bank series](https://data.worldbank.org/indicator/SH.H2O.SMDW.ZS), [UN SDG 6.1.1 metadata](https://unstats.un.org/sdgs/metadata/files/Metadata-06-01-01.pdf).
- `IT.NET.USER.ZS`: ITU, **individuals who used the Internet from any location in the preceding three months**, as a percent of population. The complement is statistical non-use, not real-time outage, packet loss or inability to obtain any signal. [World Bank series](https://data.worldbank.org/indicator/IT.NET.USER.ZS), [UN SDG 17.8.1 metadata](https://unstats.un.org/sdgs/metadata/files/Metadata-17-08-01.pdf).
- `SP.POP.TOTL`: WDI total population, same reference year as the rate. [World Bank series](https://data.worldbank.org/indicator/SP.POP.TOTL).

## Year and estimation rules

2024 is the latest shared reporting vintage with same-year rate and population observations in **both** access indicators in **every** selected project set. Water has no non-null 2025 observation in this release. Internet has scattered 2025 country values but selecting those would produce severely incomplete sets (for example only 2/29 French-set members). We therefore do not silently combine 2025 and 2024 or replace missing 2024 values with older values.

The exact geographic sets are inherited from `dist/assets/data.json`. These are project-defined sets of countries/territories associated with a language, **not populations of speakers**, and they may overlap between languages. Only explicit members are selected; World Bank world, income and regional aggregate rows are never added. Do not sum the language sets together.

For each country with both observations:

```text
peopleWithout = population × (1 − percentage / 100)
```

Then sum those estimated counts and populations. `percentCovered` is the **population-weighted service/use percentage for countries with data**, and `percentWithout` is its complement. `populationCoverage` is the separate share of total set population represented by those countries. `coverage` gives country count. Missing rates are excluded, never zero. Counts require ≈ or an estimated label; they are **not official JMP/ITU language-region totals**. A missing/partial dataset must not be presented as the whole language set without qualification.

All country records contain the same `year` as their enclosing group, their official percentage, same-year population, and estimated complement count. `availableYears` records coverage counts by year for audit.

## Snapshot results

| Set | Topic | Year | Countries | Data population coverage | Weighted service/use | Estimated people without |
|---|---|---:|---:|---:|---:|---:|
| es | safely managed drinking water | 2024 | 12/21 | 74.95% | 62.6833% | 134,577,276 |
| es | Internet use | 2024 | 20/21 | 99.33% | 82.1898% | 85,128,571 |
| fr | safely managed drinking water | 2024 | 16/29 | 68.41% | 46.3149% | 199,719,086 |
| fr | Internet use | 2024 | 28/29 | 99.94% | 44.2670% | 302,912,641 |
| ja | safely managed drinking water | 2024 | 1/1 | 100% | 98.7270% | 1,578,176 |
| ja | Internet use | 2024 | 1/1 | 100% | 85.5415% | 17,924,941 |
| ko | safely managed drinking water | 2024 | 1/2 | 66.14% | 99.2827% | 371,226 |
| ko | Internet use | 2024 | 1/2 | 66.14% | 97.8956% | 1,089,030 |
| ar | safely managed drinking water | 2024 | 13/22 | 62.53% | 75.4661% | 75,567,382 |
| ar | Internet use | 2024 | 18/22 | 75.44% | 79.6423% | 75,652,935 |

**Korean set: both 2024 indicators cover South Korea (KOR) only. North Korea is absent, not zero.** Use South Korea as the encounter's displayed scope or explicitly mark 1/2 coverage.

## Missing members

For exact member IDs and missing reasons, use each scene's `missing` array. The larger drinking-water gaps reflect absence of a safely managed estimate; basic water-access statistics may exist for those countries, but they cannot be substituted without changing the indicator.
