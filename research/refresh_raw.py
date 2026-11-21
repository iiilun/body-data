"""Refresh official API snapshots, validate JSON, then rebuild data-research.json.

Uses the system curl trust store. No API keys or account data are required.
Run: python3 research/refresh_raw.py
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import json
import sys

ROOT = Path(__file__).resolve().parent
RAW = ROOT / 'raw'
UN = 'https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?seriesCode={}&pageSize=25000'
WB = 'https://api.worldbank.org/v2/country/all/indicator/{}?format=json&date=2024&per_page=400'
SOURCES = {
    'un-care.json':UN.format('SL_DOM_TSPD'),
    'un-slum.json':UN.format('EN_LND_SLUM'),
    'un-inadequate-housing.json':UN.format('EN_LND_INDQTHSNG'),
    'wb-co2-2024.json':WB.format('EN.GHG.CO2.MT.CE.AR5'),
    'wb-urban-2024.json':WB.format('SP.URB.TOTL'),
    'wb-female-population-2024.json':WB.format('SP.POP.TOTL.FE.IN'),
    'wb-female-under15-2024.json':WB.format('SP.POP.0014.FE.IN'),
    'wb-male-population-2024.json':WB.format('SP.POP.TOTL.MA.IN'),
    'wb-male-under15-2024.json':WB.format('SP.POP.0014.MA.IN'),
}

def get(item):
    filename,url=item
    partial=RAW/(filename+'.part')
    subprocess.run(['curl','--fail','--silent','--show-error','--location','--compressed',
                    '--retry','2','--max-time','120',url,'-o',str(partial)],check=True)
    data=json.loads(partial.read_text())
    if isinstance(data,dict):
        assert data.get('totalPages')==1, 'UN response requires pagination'
        assert len(data['data'])==data['totalElements'], 'UN response incomplete'
    else:
        assert data[0].get('pages')==1, 'WB response requires pagination'
        assert len(data[1])==data[0]['total'], 'WB response incomplete'
    partial.replace(RAW/filename)
    print('Downloaded',filename)

if __name__=='__main__':
    RAW.mkdir(exist_ok=True)
    with ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(get,SOURCES.items()))
    # Published Taiwan and global headline observations are manually verified
    # in build_snapshot.py. Refreshing APIs does not magically update these.
    subprocess.run([sys.executable,str(ROOT/'build_snapshot.py')],check=True)
