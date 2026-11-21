/** Exact-year, exact-geography World Bank refresh. Pure browser JavaScript. */
export async function fetchCO2Scope({ language, members = [], year = 2024, timeoutMs = 8000 }) {
  const indicator = 'EN.GHG.CO2.MT.CE.AR5';
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&date=${year}&per_page=400`;
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`World Bank HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body) || body.length !== 2 || body[0]?.pages !== 1 || !Array.isArray(body[1])) {
    throw new Error('Unexpected or paginated World Bank response');
  }
  const wanted = new Set(language === 'en' ? ['WLD'] : members.map(member => member.iso3));
  if (!wanted.size) throw new Error('Explicit geographic members required');
  const byCode = new Map();
  for (const row of body[1]) {
    if (!wanted.has(row.countryiso3code) || row.indicator?.id !== indicator || Number(row.date) !== year) continue;
    if (byCode.has(row.countryiso3code)) throw new Error('Duplicate geography in API response');
    byCode.set(row.countryiso3code, row);
  }
  const details = [...wanted].map(iso3 => {
    const row = byCode.get(iso3);
    const value = row?.value;
    return {
      iso3,
      iso2: language === 'en' ? '001' : members.find(member => member.iso3 === iso3)?.iso2,
      name: row?.country?.value ?? members.find(member => member.iso3 === iso3)?.name ?? iso3,
      year,
      value: typeof value === 'number' && Number.isFinite(value) ? value : null,
    };
  });
  const covered = details.filter(row => row.value !== null);
  if (!covered.length) throw new Error('No observations for requested common year');
  const totalMt = covered.reduce((sum, row) => sum + row.value, 0);
  const days = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  return {
    value: totalMt,
    unit: 'Mt CO2e/year',
    year,
    rateTonnesPerSecond: totalMt * 1e6 / (days * 86400),
    rateIsEstimate: true,
    memberCount: wanted.size,
    coverageCount: covered.length,
    countryDetails: details,
    sourceURL: url,
    sourceName: 'World Bank WDI / EDGAR',
    sourceLastUpdated: body[0].lastupdated,
    retrievedAt: new Date().toISOString(),
  };
}
