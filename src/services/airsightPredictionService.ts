import { getRealisticAqi, CITIES } from '../../constants';

export interface GridCell {
  id: string;
  row: number;
  col: number;
  name: string;
  type: 'industrial' | 'highway' | 'park' | 'residential' | 'commercial';
  aqiValue: number;
  aqiCategory: 'Good' | 'Moderate' | 'Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  confidenceScore: number;
  trend: 'Improving' | 'Stable' | 'Worsening';
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  historicalAqi: number;
  latitude: number;
  longitude: number;
}

export interface GridForecastResponse {
  city: string;
  forecastTime: '1 Hour' | '6 Hour' | '24 Hour' | '72 Hour';
  grid: GridCell[];
  summary: {
    averageAqi: number;
    highestAqiCell: string;
    lowestAqiCell: string;
    dominantTrend: string;
    overallConfidence: number;
  };
  environmentalConditions: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    generalVibe: string;
  };
}

export interface CellTimelinePoint {
  time: string;
  aqi: number;
  confidence: number;
}

// Map AQI to standard categories
export const getAqiCategory = (aqi: number): GridCell['aqiCategory'] => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

// Wind direction angle in degrees
export const getWindAngle = (dir: string): number => {
  const directions: Record<string, number> = {
    'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
    'S': 180, 'SW': 225, 'W': 270, 'NW': 315
  };
  return directions[dir.toUpperCase()] ?? 0;
};

// Seeded pseudo-random generator
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export const getCitySeed = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

/**
 * Predicts hyperlocal AQI for a 1km x 1km grid over a simulated city.
 * Calculations are completely modular and deterministic based on parameters.
 */
export const calculateHyperlocalGrid = (
  cityName: string,
  forecastPeriod: '1 Hour' | '6 Hour' | '24 Hour' | '72 Hour',
  envParams?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windDirection?: string;
    trafficVolumeMultiplier?: number;
    industrialOutputMultiplier?: number;
    constructionActivityLevel?: number;
  }
): GridForecastResponse => {
  // Retrieve the selected city's base AQI from the consolidated CITIES / REALISTIC_CITY_AQI
  const baseAqi = getRealisticAqi(cityName);
  const cityInfo = CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
  
  // Set default realistic environmental conditions if not supplied
  let temperature = envParams?.temperature ?? (baseAqi > 120 ? 34 : 22);
  let humidity = envParams?.humidity ?? (baseAqi > 120 ? 65 : 45);
  let windSpeed = envParams?.windSpeed ?? (baseAqi > 120 ? 4 : 12);
  let windDirection = envParams?.windDirection ?? (baseAqi > 120 ? 'W' : 'NE');

  // Let's seed unique local shifts based on forecast periods to simulate weather trends
  let tempOffset = 0;
  let humidityOffset = 0;
  let windSpeedOffset = 0;
  let windAngleOffset = 0;
  
  // Initial multipliers from sliders
  let industrialMultiplier = envParams?.industrialOutputMultiplier ?? 1.0;
  let highwayMultiplier = envParams?.trafficVolumeMultiplier ?? 1.0;
  let constructionMultiplier = envParams?.constructionActivityLevel ?? 1.0;

  let industrialPeriodFactor = 1.0;
  let highwayPeriodFactor = 1.0;

  if (forecastPeriod === '1 Hour') {
    tempOffset = 0;
    humidityOffset = 0;
    windSpeedOffset = 0;
    windAngleOffset = 0;
    industrialPeriodFactor = 1.0;
    highwayPeriodFactor = 1.0;
  } else if (forecastPeriod === '6 Hour') {
    tempOffset = baseAqi > 120 ? -3 : 2;
    humidityOffset = 8;
    windSpeedOffset = -1.5;
    windAngleOffset = 45;
    industrialPeriodFactor = 1.12;
    highwayPeriodFactor = 1.28;
  } else if (forecastPeriod === '24 Hour') {
    tempOffset = baseAqi > 120 ? 3 : -2;
    humidityOffset = -12;
    windSpeedOffset = 3.5;
    windAngleOffset = 90;
    industrialPeriodFactor = 0.95;
    highwayPeriodFactor = 1.05;
  } else if (forecastPeriod === '72 Hour') {
    tempOffset = baseAqi > 120 ? 6 : -5;
    humidityOffset = baseAqi > 120 ? 15 : -10;
    windSpeedOffset = baseAqi > 120 ? -2 : 5;
    windAngleOffset = 185;
    industrialPeriodFactor = 1.25;
    highwayPeriodFactor = 1.12;
  }

  industrialMultiplier = industrialMultiplier * industrialPeriodFactor;
  highwayMultiplier = highwayMultiplier * highwayPeriodFactor;

  // Apply the forecast offsets
  temperature = Math.max(5, Math.min(45, Math.round(temperature + tempOffset)));
  humidity = Math.max(10, Math.min(95, Math.round(humidity + humidityOffset)));
  windSpeed = Math.max(2, Math.min(45, Math.round(windSpeed + windSpeedOffset)));

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const baseAngle = getWindAngle(windDirection);
  const finalAngle = (baseAngle + windAngleOffset) % 360;
  const directionIndex = Math.round(finalAngle / 45) % 8;
  windDirection = directions[directionIndex];

  // Unique SeededRandom for this city's layout
  const citySeed = getCitySeed(cityName);
  const rng = new SeededRandom(citySeed);

  // Generate unique positions for sources so they don't overlap
  const usedCoords = new Set<string>();
  const getUniqueCoord = () => {
    let r = rng.nextInt(0, 5);
    let c = rng.nextInt(0, 5);
    while (usedCoords.has(`${r}-${c}`)) {
      r = rng.nextInt(0, 5);
      c = rng.nextInt(0, 5);
    }
    usedCoords.add(`${r}-${c}`);
    return { row: r, col: c };
  };

  const indCoord = getUniqueCoord();
  const hwyCoord = getUniqueCoord();
  const prkCoord = getUniqueCoord();
  const comCoord = getUniqueCoord();
  const resCoord = getUniqueCoord();
  const constCoord = getUniqueCoord();

  const cityPollution = cityInfo?.pollution ?? 50;
  const cityGreen = cityInfo?.greenCoverage ?? 30;
  const cityPolicy = cityInfo?.policyScore ?? 60;

  const baseIndWeight = 1.0 + (cityPollution / 100) * 1.3 - (cityPolicy / 100) * 0.45;
  const baseHwyWeight = 0.95 + (cityPollution / 100) * 0.9;
  const basePrkWeight = 0.8 - (cityGreen / 100) * 0.35;

  const sourceCells = [
    { 
      row: indCoord.row, 
      col: indCoord.col, 
      type: 'industrial' as const, 
      weight: parseFloat((baseIndWeight * industrialMultiplier).toFixed(2)), 
      name: `${cityName} Industrial Sector` 
    },
    { 
      row: hwyCoord.row, 
      col: hwyCoord.col, 
      type: 'highway' as const, 
      weight: parseFloat((baseHwyWeight * highwayMultiplier).toFixed(2)), 
      name: `${cityName} Transit Loop` 
    },
    { 
      row: prkCoord.row, 
      col: prkCoord.col, 
      type: 'park' as const, 
      weight: parseFloat(basePrkWeight.toFixed(2)), 
      name: `${cityName} Botanical Reserve` 
    },
    { 
      row: comCoord.row, 
      col: comCoord.col, 
      type: 'commercial' as const, 
      weight: 1.05, 
      name: `${cityName} Civic Square` 
    },
    { 
      row: resCoord.row, 
      col: resCoord.col, 
      type: 'residential' as const, 
      weight: 0.85, 
      name: `${cityName} Heights Estates` 
    }
  ];

  const windAngleRad = (getWindAngle(windDirection) * Math.PI) / 180;
  const windDx = Math.cos(windAngleRad);
  const windDy = Math.sin(windAngleRad);

  // Time-of-day multipliers based on forecast period
  let periodFactor = 1.0;
  let confidenceRange = { min: 88, max: 97 };
  
  if (forecastPeriod === '1 Hour') {
    periodFactor = 1.0;
    confidenceRange = { min: 94, max: 98 };
  } else if (forecastPeriod === '6 Hour') {
    periodFactor = 1.08;
    confidenceRange = { min: 90, max: 95 };
  } else if (forecastPeriod === '24 Hour') {
    periodFactor = 1.16;
    confidenceRange = { min: 84, max: 91 };
  } else if (forecastPeriod === '72 Hour') {
    periodFactor = 1.30;
    confidenceRange = { min: 76, max: 85 };
  }

  const gridSize = 6;
  const cells: GridCell[] = [];

  // Generate the cells
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cellId = `C-${r + 1}-${c + 1}`;
      
      // Determine base type
      let cellType: GridCell['type'] = 'residential';
      let cellName = `Sector ${r + 1},${c + 1}`;
      let specificWeight = 1.0;

      const matchedSource = sourceCells.find(s => s.row === r && s.col === c);
      if (matchedSource) {
        cellType = matchedSource.type;
        cellName = matchedSource.name;
        specificWeight = matchedSource.weight;
      } else {
        // Classify other cells based on proximity to unique city sources
        const distToIndustrial = Math.sqrt((r - indCoord.row) ** 2 + (c - indCoord.col) ** 2);
        const distToHighway = Math.sqrt((r - hwyCoord.row) ** 2 + (c - hwyCoord.col) ** 2);
        const distToPark = Math.sqrt((r - prkCoord.row) ** 2 + (c - prkCoord.col) ** 2);

        if (distToPark < 1.3) {
          cellType = 'park';
          cellName = `${cityName} Sub-Green Belt ${r + 1}-${c + 1}`;
          specificWeight = 0.78;
        } else if (distToIndustrial < 1.4) {
          cellType = 'industrial';
          cellName = `${cityName} Buffer Zone ${r + 1}-${c + 1}`;
          specificWeight = 1.22;
        } else if (distToHighway < 1.4) {
          cellType = 'highway';
          cellName = `${cityName} Transit Ribbon ${r + 1}-${c + 1}`;
          specificWeight = 1.12;
        } else if (Math.abs(r - comCoord.row) <= 1 && Math.abs(c - comCoord.col) <= 1) {
          cellType = 'commercial';
          cellName = `${cityName} Business Dist ${r + 1}-${c + 1}`;
          specificWeight = 1.05;
        } else {
          cellType = 'residential';
          cellName = `${cityName} Residential Dist ${r + 1}-${c + 1}`;
          specificWeight = 0.92;
        }
      }

      // Calculate localized cell AQI with realistic environmental variables
      let pollutionSourceAddition = 0;
      sourceCells.forEach(src => {
        if (src.type === 'park') return;
        const dr = r - src.row;
        const dc = c - src.col;
        const distance = Math.sqrt(dr * dr + dc * dc);
        
        if (distance === 0) {
          pollutionSourceAddition += src.weight * 52;
        } else {
          const ndr = dr / distance;
          const ndc = dc / distance;
          const dotProduct = ndc * windDx + ndr * windDy;
          const downwindFactor = dotProduct > 0 ? (1 + dotProduct * 1.8) : 0.45;
          const decayConst = 0.75 + (16 / windSpeed) * 0.12;
          const strength = src.weight * 38;
          pollutionSourceAddition += (strength * downwindFactor) / (distance ** decayConst);
        }
      });

      // Weather effects
      const tempEffect = Math.max(-12, (temperature - 24) * 1.3);
      const humidityEffect = Math.max(-15, (humidity - 50) * 0.55);
      const windEffect = -Math.max(-22, (windSpeed - 10) * 2.1);

      // Proximity to construction coordinate
      const distToConstruction = Math.sqrt((r - constCoord.row) ** 2 + (c - constCoord.col) ** 2);
      let constructionPollution = 0;
      if (distToConstruction === 0) {
        constructionPollution = 45 * constructionMultiplier;
      } else if (distToConstruction < 1.5) {
        constructionPollution = (25 * constructionMultiplier) / distToConstruction;
      } else if (distToConstruction < 2.5) {
        constructionPollution = (10 * constructionMultiplier) / distToConstruction;
      }

      // Base calculated cell AQI
      let rawCellAqi = baseAqi * specificWeight + pollutionSourceAddition + constructionPollution + tempEffect + humidityEffect + windEffect;
      
      if (cellType === 'park') {
        rawCellAqi *= 0.72;
      }

      // Ensure AQI stays within realistic bounds [5, 500]
      const finalCellAqi = Math.max(5, Math.min(500, Math.round(rawCellAqi * periodFactor)));

      // Trends
      let trend: GridCell['trend'] = 'Stable';
      const trendValue = Math.sin((r * 2.2 + c * 1.8 + getWindAngle(windDirection) / 45)) * 10;
      if (trendValue > 3) {
        trend = 'Worsening';
      } else if (trendValue < -3) {
        trend = 'Improving';
      }

      const distanceToAnySource = Math.min(...sourceCells.map(s => Math.sqrt((r - s.row) ** 2 + (c - s.col) ** 2)));
      const baseConfidence = confidenceRange.max - (distanceToAnySource * 1.6);
      const cellConfidence = Math.max(confidenceRange.min, Math.min(99, Math.round(baseConfidence)));

      const centerLat = cityInfo?.lat ?? 28.6139;
      const centerLon = cityInfo?.lng ?? 77.2090;
      
      const cellLat = centerLat + (r - (gridSize - 1) / 2) * 0.009;
      const cellLon = centerLon + (c - (gridSize - 1) / 2) * 0.01;

      cells.push({
        id: cellId,
        row: r,
        col: c,
        name: cellName,
        type: cellType,
        aqiValue: finalCellAqi,
        aqiCategory: getAqiCategory(finalCellAqi),
        confidenceScore: cellConfidence,
        trend,
        temperature,
        humidity,
        windSpeed,
        windDirection,
        historicalAqi: Math.round(baseAqi * specificWeight),
        latitude: parseFloat(cellLat.toFixed(5)),
        longitude: parseFloat(cellLon.toFixed(5))
      });
    }
  }

  // Summary Metrics
  const totalAqi = cells.reduce((sum, cell) => sum + cell.aqiValue, 0);
  const averageAqi = Math.round(totalAqi / cells.length);
  
  const sortedCells = [...cells].sort((a, b) => b.aqiValue - a.aqiValue);
  const highestAqiCell = `${sortedCells[0].name} (${sortedCells[0].id})`;
  const lowestAqiCell = `${sortedCells[sortedCells.length - 1].name} (${sortedCells[sortedCells.length - 1].id})`;

  const trends = cells.map(c => c.trend);
  const worseningCount = trends.filter(t => t === 'Worsening').length;
  const improvingCount = trends.filter(t => t === 'Improving').length;
  const dominantTrend = worseningCount > improvingCount ? 'Worsening' : (improvingCount > worseningCount ? 'Improving' : 'Stable');

  const avgConfidence = Math.round(cells.reduce((sum, c) => sum + c.confidenceScore, 0) / cells.length);

  // Climate context general description
  let generalVibe = 'Calm atmospheric conditions.';
  if (averageAqi > 150) {
    generalVibe = 'High atmospheric stagnation trapping industrial emissions downwind.';
  } else if (windSpeed > 15) {
    generalVibe = 'Active gusty ventilation dispersing ambient micro-particulates rapidly.';
  } else if (temperature > 32) {
    generalVibe = 'Thermal photochemical elevation accelerating ground-level ozone kinetics.';
  }

  return {
    city: cityName,
    forecastTime: forecastPeriod,
    grid: cells,
    summary: {
      averageAqi,
      highestAqiCell,
      lowestAqiCell,
      dominantTrend,
      overallConfidence: avgConfidence
    },
    environmentalConditions: {
      temperature,
      humidity,
      windSpeed,
      windDirection,
      generalVibe
    }
  };
};

/**
 * Exposes a timeline series for a single selected cell.
 * Great for rendering the cell forecast trend charts!
 */
export const getCellForecastTimeline = (
  cityName: string,
  cellId: string,
  baseCellAqi: number
): CellTimelinePoint[] => {
  const timeline: CellTimelinePoint[] = [];
  const citySeed = getCitySeed(cityName);
  const cellSeed = getCitySeed(cellId);
  const rng = new SeededRandom(citySeed + cellSeed);

  const steps = [0, 1, 6, 12, 24, 48, 72];

  steps.forEach((hour, idx) => {
    const timeLabel = hour === 0 ? 'Now' : `+${hour} hrs`;
    // Add periodic cycle (diurnal traffic peak, etc.) uniquely per city and cell
    const cycleAmplitude = 10 + rng.next() * 15;
    const cycle = Math.sin((idx * Math.PI) / 3.2) * cycleAmplitude;
    const weatherTrend = (hour / 72) * (15 - rng.next() * 30); // trend can be positive or negative uniquely
    
    const noise = rng.nextInt(-6, 6);
    const predictedAqi = Math.max(5, Math.min(500, Math.round(baseCellAqi + cycle + weatherTrend + noise)));
    
    // Confidence decays over time
    const confidence = Math.max(70, Math.min(99, 96 - (hour * 0.28)));

    timeline.push({
      time: timeLabel,
      aqi: predictedAqi,
      confidence: Math.round(confidence)
    });
  });

  return timeline;
};
