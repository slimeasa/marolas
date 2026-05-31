// Integração com a API gratuita Open-Meteo (sem chave de API).
// Marine API  -> ondas, swell, período, direção e nível do mar (maré)
// Forecast API -> vento, rajadas, temperatura

const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const TZ = 'America/Sao_Paulo';

const cache = new Map();
const CACHE_MS = 30 * 60 * 1000; // 30 min

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo respondeu ${res.status}`);
  return res.json();
}

// Converte graus em ponto cardeal (N, NE, L, ...)
export function degToCompass(deg) {
  if (deg == null) return '—';
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

// Converte a ondulação em MAR ABERTO (Open-Meteo) na altura que de fato
// quebra na praia, considerando o quanto a praia é exposta e o alinhamento
// da direção do swell com a praia.
export function surfHeight(swellH, swellDir, beach) {
  if (swellH == null) return null;
  let dirF = 1;
  if (swellDir != null && beach.optimalSwell != null) {
    // diferença angular (0 = perfeitamente alinhado, 180 = oposto)
    const delta = Math.abs(((swellDir - beach.optimalSwell + 180) % 360 + 360) % 360 - 180);
    dirF = Math.max(0.45, 0.5 + 0.5 * Math.cos((delta * Math.PI) / 180));
  }
  return Math.round(swellH * (beach.exposure ?? 0.6) * dirF * 10) / 10;
}

// Nomenclatura do surfe (gíria) a partir da altura do surf em metros.
export function surfSlang(m) {
  if (m == null) return '—';
  if (m <= 0.24) return 'Flat';
  if (m <= 0.44) return 'Meio metrinho';
  if (m <= 0.54) return 'Meio metro';
  if (m <= 0.74) return 'Meio metrão';
  if (m <= 1.04) return 'Um metro';
  if (m <= 1.34) return 'Um metrão';
  if (m <= 1.84) return 'Dois metros';
  if (m <= 2.24) return 'Dois metrão';
  if (m <= 2.74) return 'Três metros';
  if (m <= 3.24) return 'Três metrão';
  return Math.round(m) + ' metros';
}

// Nota de qualidade simples (0-10) a partir de altura, período e vento.
export function scoreCondition(waveH, period, windSpeed, windDir, beach) {
  if (waveH == null) return null;
  let score = 0;

  // Tamanho do surf na praia: ideal entre 0,7 e 2,2 m
  if (waveH >= 0.7 && waveH <= 2.2) score += 4;
  else if (waveH >= 0.5 && waveH < 0.7) score += 2.6;
  else if (waveH >= 0.4 && waveH < 0.5) score += 1.6;
  else if (waveH > 2.2 && waveH <= 3) score += 3;
  else if (waveH < 0.4) score += 0.6;
  else score += 2;

  // Período: quanto maior, mais formada a onda
  if (period >= 11) score += 3;
  else if (period >= 9) score += 2.3;
  else if (period >= 7) score += 1.5;
  else score += 0.6;

  // Vento: terral (offshore) limpa, vento forte estraga
  const [a, b] = beach.idealWindDir;
  const offshore = a > b ? windDir >= a || windDir <= b : windDir >= a && windDir <= b;
  if (windSpeed < 8) score += 3;
  else if (offshore && windSpeed < 18) score += 2.5;
  else if (windSpeed < 14) score += 1.5;
  else if (windSpeed < 22) score += 0.6;
  else score += 0;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export function ratingLabel(score) {
  if (score == null) return { label: '—', className: 'rate-none' };
  if (score >= 8) return { label: 'Épico', className: 'rate-epic' };
  if (score >= 6.5) return { label: 'Muito bom', className: 'rate-good' };
  if (score >= 5) return { label: 'Surfável', className: 'rate-ok' };
  if (score >= 3.5) return { label: 'Fraco', className: 'rate-weak' };
  return { label: 'Flat', className: 'rate-flat' };
}

// Busca previsão combinada (ondas + vento) para uma praia.
export async function getForecast(beach) {
  const key = beach.id;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.data;

  const marineUrl =
    `${MARINE_URL}?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,swell_wave_direction,sea_level_height_msl` +
    `&timezone=${TZ}&forecast_days=7`;

  const weatherUrl =
    `${WEATHER_URL}?latitude=${beach.lat}&longitude=${beach.lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m` +
    `&timezone=${TZ}&forecast_days=7&wind_speed_unit=kmh`;

  const [marine, weather] = await Promise.all([
    fetchJSON(marineUrl),
    fetchJSON(weatherUrl),
  ]);

  const data = mergeForecast(marine, weather, beach);
  cache.set(key, { t: Date.now(), data });
  return data;
}

function mergeForecast(marine, weather, beach) {
  const time = marine.hourly.time;
  const wh = marine.hourly.wave_height;
  const wd = marine.hourly.wave_direction;
  const wp = marine.hourly.wave_period;
  const swh = marine.hourly.swell_wave_height;
  const swp = marine.hourly.swell_wave_period;
  const swd = marine.hourly.swell_wave_direction;
  const sea = marine.hourly.sea_level_height_msl;

  // Os dois endpoints usam o mesmo grid horário; mapeamos por timestamp.
  const wTime = weather.hourly.time;
  const wIndex = new Map(wTime.map((t, i) => [t, i]));

  const hours = time.map((t, i) => {
    const j = wIndex.has(t) ? wIndex.get(t) : i;
    const windSpeed = weather.hourly.wind_speed_10m[j];
    const windDir = weather.hourly.wind_direction_10m[j];
    const period = wp[i] ?? swp[i];
    // ondulação em mar aberto (offshore) -> altura do surf na praia
    const swellH = swh[i] ?? wh[i];
    const offshoreH = wh[i] ?? swh[i];
    const surfH = surfHeight(swellH, swd[i] ?? wd[i], beach);
    return {
      time: t,
      date: new Date(t),
      waveHeight: surfH, // altura do surf que quebra na praia
      offshoreHeight: offshoreH, // altura em mar aberto (referência)
      waveDir: swd[i] ?? wd[i],
      wavePeriod: period,
      swellHeight: swh[i],
      swellPeriod: swp[i],
      seaLevel: sea[i],
      windSpeed,
      windGust: weather.hourly.wind_gusts_10m[j],
      windDir,
      temp: weather.hourly.temperature_2m[j],
      score: scoreCondition(surfH, period, windSpeed, windDir, beach),
    };
  });

  return {
    beach,
    hours,
    days: groupByDay(hours),
    tides: computeTides(time, sea),
    updatedAt: new Date(),
  };
}

function groupByDay(hours) {
  const map = new Map();
  for (const h of hours) {
    const key = h.time.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(h);
  }
  return [...map.entries()].map(([day, hrs]) => {
    const valid = hrs.filter((h) => h.score != null);
    const best = valid.reduce((a, b) => (b.score > (a?.score ?? -1) ? b : a), null);
    const avgWave =
      hrs.reduce((s, h) => s + (h.waveHeight || 0), 0) / (hrs.length || 1);
    return { day, date: new Date(day + 'T12:00:00'), hours: hrs, best, avgWave };
  });
}

// Detecta marés alta/baixa a partir da curva de nível do mar (máx/mín locais).
function computeTides(time, sea) {
  const tides = [];
  for (let i = 1; i < sea.length - 1; i++) {
    const prev = sea[i - 1];
    const cur = sea[i];
    const next = sea[i + 1];
    if (cur == null || prev == null || next == null) continue;
    if (cur > prev && cur >= next) {
      tides.push({ time, date: new Date(time[i]), height: cur, type: 'alta' });
    } else if (cur < prev && cur <= next) {
      tides.push({ date: new Date(time[i]), height: cur, type: 'baixa' });
    }
  }
  return tides;
}
