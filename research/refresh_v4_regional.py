"""Build same-year water/internet access snapshots for the project's language sets.

Run normally to rebuild from audited raw downloads; add --refresh to redownload.
All counts are project estimates, not official UN/World Bank language aggregates.
"""
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'research/raw'
LANGUAGES = ('es', 'fr', 'ja', 'ko', 'ar')
QUERIES = {
    'water': 'https://api.worldbank.org/v2/country/all/indicator/SH.H2O.SMDW.ZS?format=json&date=2020:2025&per_page=20000',
    'internet': 'https://api.worldbank.org/v2/country/all/indicator/IT.NET.USER.ZS?format=json&date=2020:2025&per_page=20000',
    'population': 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2020:2025&per_page=20000',
    'countries': 'https://api.worldbank.org/v2/country?format=json&per_page=1000',
    'water-metadata': 'https://api.worldbank.org/v2/indicator/SH.H2O.SMDW.ZS?format=json',
    'internet-metadata': 'https://api.worldbank.org/v2/indicator/IT.NET.USER.ZS?format=json',
    'population-metadata': 'https://api.worldbank.org/v2/indicator/SP.POP.TOTL?format=json',
}

def download(item):
    name, url = item
    content = urlopen(url, timeout=60).read()
    value = json.loads(content)
    assert isinstance(value, list) and len(value) == 2, f'Unexpected response: {name}'
    assert value[0]['pages'] == 1, f'Pagination incomplete: {name}'
    (RAW / f'v4-{name}.json').write_bytes(content)
    return name


def build(refresh=False):
    RAW.mkdir(exist_ok=True)
    if refresh:
        list(ThreadPoolExecutor(max_workers=4).map(download, QUERIES.items()))
        manifest = {
            'retrievedAt': datetime.now(timezone.utc).isoformat(),
            'sources': {k: {'url': url, 'sha256': hashlib.sha256((RAW/f'v4-{k}.json').read_bytes()).hexdigest()} for k, url in QUERIES.items()},
        }
        (RAW/'v4-access-manifest.json').write_text(json.dumps(manifest, indent=2))
    manifest = json.loads((RAW/'v4-access-manifest.json').read_text())
    for key, source in manifest['sources'].items():
        assert hashlib.sha256((RAW/f'v4-{key}.json').read_bytes()).hexdigest() == source['sha256'], f'Raw file changed: {key}'
    original = json.loads((ROOT/'dist/assets/data.json').read_text())
    fetched = {k: json.loads((RAW/f'v4-{k}.json').read_text()) for k in QUERIES}
    country_metadata = {r['id']: r for r in fetched['countries'][1]}
    rates = {k: {(r['countryiso3code'], int(r['date'])): r['value'] for r in fetched[k][1]} for k in ('water', 'internet')}
    population = {(r['countryiso3code'], int(r['date'])): r['value'] for r in fetched['population'][1]}
    # Use a joint reporting vintage, rather than cherry-pick sparse newer rows.
    # 2025 has no drinking-water observations in this release; 2024 is the latest
    # year with observations in both series in every one of the five sets.
    years = sorted({int(r['date']) for r in fetched['water'][1]}, reverse=True)
    shared = [y for y in years if all(any(rates[k].get((m['iso3'], y)) is not None and population.get((m['iso3'], y)) is not None for m in original['groups'][lang]['members']) for lang in LANGUAGES for k in ('water','internet'))]
    assert shared, 'No common reporting year'
    year = shared[0]
    groups = {}
    for lang in LANGUAGES:
        members = original['groups'][lang]['members']
        ids = [m['iso3'] for m in members]
        assert len(set(ids)) == len(ids), f'Duplicate members: {lang}'
        assert all(m['iso3'] in country_metadata and country_metadata[m['iso3']]['region']['value'] != 'Aggregates' for m in members), f'Aggregate or unknown member: {lang}'
        group = {}
        for key, scene in [('water','thirst'), ('internet','offline')]:
            countries, missing = [], []
            group_pop = 0
            for m in members:
                iso3, iso2 = m['iso3'], m['iso2']
                rate, pop = rates[key].get((iso3, year)), population.get((iso3, year))
                if pop is not None:
                    assert pop > 0
                    group_pop += pop
                if rate is None or pop is None:
                    missing.append({'iso2': iso2, 'iso3': iso3, 'reason': 'indicator_missing' if rate is None else 'population_missing'})
                    continue
                assert 0 <= rate <= 100
                without = pop*(1-rate/100)
                countries.append({'iso2': iso2, 'iso3': iso3, 'name': m['name'], 'year': year, 'percent': rate, 'population': pop, 'without': without, 'estimated': True})
            covered_pop = sum(c['population'] for c in countries)
            without = sum(c['without'] for c in countries)
            assert covered_pop > 0
            percent = 100*(1-without/covered_pop)
            assert 0 <= without <= covered_pop and 0 <= percent <= 100
            group[scene] = {
                'year': year,
                'percentCovered': percent,
                'percentWithout': 100-percent,
                'peopleWithout': without,
                'coveredPopulation': covered_pop,
                'groupPopulationWithData': group_pop,
                'populationCoverage': covered_pop/group_pop if group_pop else None,
                'coverage': f'{len(countries)}/{len(members)}',
                'coverageCount': len(countries),
                'memberCount': len(members),
                'partial': len(countries) != len(members),
                'estimated': True,
                'countries': countries,
                'missing': missing,
                'availableYears': {str(y): sum(rates[key].get((m['iso3'],y)) is not None and population.get((m['iso3'],y)) is not None for m in members) for y in years},
                'indicator': 'SH.H2O.SMDW.ZS' if key == 'water' else 'IT.NET.USER.ZS',
                'source': 'WHO/UNICEF JMP via World Bank WDI' if key == 'water' else 'ITU via World Bank WDI',
                'url': QUERIES[key],
                'populationUrl': QUERIES['population'],
            }
            # Algebraic and coverage invariants catch accidental denominator or
            # aggregate errors without rounding the published underlying values.
            assert abs(sum(c['percent']*c['population'] for c in countries)/covered_pop-percent) < 1e-10
            assert len(countries)+len(missing) == len(members)
        groups[lang] = group
    result = {
        'retrievedAt': manifest['retrievedAt'],
        'referenceYear': year,
        'yearPolicy': 'Latest shared reporting vintage with same-year indicator and population observations in both access series in every project language set. Missing countries are excluded, not filled from other years or treated as zero.',
        'estimateNote': 'Project-defined language sets. Counts are estimated as population × (1 − access percentage / 100); proportions are weighted by the population of countries with both observations. These are not official UN/ITU/JMP language-region totals. Sets may overlap and must not be added together.',
        'groups': groups,
        'definitions': {
            'thirst': 'Safely managed drinking water: an improved source on premises, available when needed, and free from faecal and priority chemical contamination. Its complement does not mean no drinking water or no basic water service.',
            'offline': 'Internet use: using the Internet from any location in the last three months. Its complement is non-use under this statistical definition, not an observed real-time connection failure.',
        },
        'sources': {
            'water': {'indicator': 'SH.H2O.SMDW.ZS', 'producer': 'WHO/UNICEF JMP', 'url': QUERIES['water'], 'definitionUrl': 'https://unstats.un.org/sdgs/metadata/files/Metadata-06-01-01.pdf', 'metadata': fetched['water-metadata'][1][0], 'lastUpdated': fetched['water'][0].get('lastupdated')},
            'internet': {'indicator': 'IT.NET.USER.ZS', 'producer': 'ITU', 'url': QUERIES['internet'], 'definitionUrl': 'https://unstats.un.org/sdgs/metadata/files/Metadata-17-08-01.pdf', 'metadata': fetched['internet-metadata'][1][0], 'lastUpdated': fetched['internet'][0].get('lastupdated')},
            'population': {'indicator': 'SP.POP.TOTL', 'producer': 'World Bank WDI / UN Population Division and national statistical offices', 'url': QUERIES['population'], 'metadata': fetched['population-metadata'][1][0], 'lastUpdated': fetched['population'][0].get('lastupdated')},
            'manifest': 'research/raw/v4-access-manifest.json',
        },
    }
    (ROOT/'research/v4-regional.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true')
    result = build(parser.parse_args().refresh)
    for lang, group in result['groups'].items():
        for scene, value in group.items():
            print(lang, scene, value['year'], value['coverage'], f"access={value['percentCovered']:.4f}%", f"without={value['peopleWithout']:.0f}", f"populationCoverage={value['populationCoverage']:.2%}")
