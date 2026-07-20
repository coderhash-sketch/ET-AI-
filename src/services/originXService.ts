import { calculateHyperlocalGrid, GridCell, getCitySeed } from './airsightPredictionService';
import { CITIES } from '../../constants';

export interface SourceContribution {
  traffic: number;
  construction: number;
  industrial: number;
  wasteBurning: number;
  background: number;
}

export interface AttributionCellResult {
  id: string;
  row: number;
  col: number;
  name: string;
  type: 'industrial' | 'highway' | 'park' | 'residential' | 'commercial';
  aqiValue: number;
  aqiCategory: string;
  primarySource: 'Traffic' | 'Construction' | 'Industrial Emissions' | 'Waste Burning' | 'Background Pollution';
  contributions: SourceContribution;
  confidenceScore: number;
  evidenceSummary: string;
  latitude: number;
  longitude: number;
}

export interface AttributionGridResponse {
  city: string;
  forecastPeriod: string;
  cells: AttributionCellResult[];
  summary: {
    averageAqi: number;
    primaryCitySource: string;
    averageConfidence: number;
    highestAqiCell: {
      id: string;
      name: string;
      value: number;
      primarySource: string;
    };
    lowestAqiCell: {
      id: string;
      name: string;
      value: number;
      primarySource: string;
    };
  };
  environmentalConditions: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    generalVibe: string;
  };
}

/**
 * Calculates a complete geospatial source attribution for a city's 1km x 1km grid
 */
export const calculateGeospatialAttribution = (
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
): AttributionGridResponse => {
  // 1. Fetch the actual hyperlocal grid forecast directly from Agent 1 (Sky Vector / AirSight AI)
  const forecastRes = calculateHyperlocalGrid(cityName, forecastPeriod, envParams);

  const citySeed = getCitySeed(cityName);
  const cityInfo = CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
  const cityPollution = cityInfo?.pollution ?? 50;

  // Let's seed a deterministic pseudo-random sequence for construction zones and sporadic waste burning
  const seedMultiplier = (citySeed % 100) + 1;

  // Determine a simulated Construction Hotspot coordinate
  const constructionHotspotRow = citySeed % 6;
  const constructionHotspotCol = (citySeed + 3) % 6;

  const windAngleRad = (getWindAngle(forecastRes.environmentalConditions.windDirection) * Math.PI) / 180;
  const windDx = Math.cos(windAngleRad);
  const windDy = Math.sin(windAngleRad);
  const windSpeed = forecastRes.environmentalConditions.windSpeed;

  const trafficMultiplier = envParams?.trafficVolumeMultiplier ?? 1.0;
  const industrialMultiplier = envParams?.industrialOutputMultiplier ?? 1.0;
  const constructionActivity = envParams?.constructionActivityLevel ?? 1.0; // Slider factor 0 to 2

  // 2. Iterate through each cell to compute detailed source attributions
  const attributionCells: AttributionCellResult[] = forecastRes.grid.map(cell => {
    // We compute raw weights for each of the 5 sources based on cell types, wind, and custom inputs:
    let trafficWeight = 10;
    let constructionWeight = 10;
    let industrialWeight = 10;
    let wasteWeight = 5;
    let backgroundWeight = 15;

    // A. Base type adjustments
    if (cell.type === 'highway') {
      trafficWeight += 65 * trafficMultiplier;
      constructionWeight += 15 * constructionActivity;
      industrialWeight += 10;
      wasteWeight += 5;
      backgroundWeight += 10;
    } else if (cell.type === 'industrial') {
      trafficWeight += 15 * trafficMultiplier;
      constructionWeight += 20 * constructionActivity;
      industrialWeight += 75 * industrialMultiplier;
      wasteWeight += 15;
      backgroundWeight += 10;
    } else if (cell.type === 'commercial') {
      trafficWeight += 40 * trafficMultiplier;
      constructionWeight += 35 * constructionActivity;
      industrialWeight += 5;
      wasteWeight += 8;
      backgroundWeight += 15;
    } else if (cell.type === 'park') {
      trafficWeight += 5 * trafficMultiplier;
      constructionWeight += 5 * constructionActivity;
      industrialWeight += 3;
      wasteWeight += 2;
      backgroundWeight += 65; // Parks are clean, background is dominant
    } else { // residential
      trafficWeight += 25 * trafficMultiplier;
      constructionWeight += 20 * constructionActivity;
      industrialWeight += 8;
      wasteWeight += 20; // heating, local refuse
      backgroundWeight += 25;
    }

    // B. Proximity to simulated sources on the 6x6 grid
    // Distance to industrial hotspot (which is the source in AirSight AI grid, let's find it or use a default center)
    // We can infer source locations. Industrial is typically at indCoord.
    // Let's find industrial cell row/col from the grid
    const industrialSourceCell = forecastRes.grid.find(c => c.name.includes('Industrial Sector'));
    const highwaySourceCell = forecastRes.grid.find(c => c.name.includes('Transit Loop'));

    if (industrialSourceCell) {
      const distToInd = Math.sqrt((cell.row - industrialSourceCell.row) ** 2 + (cell.col - industrialSourceCell.col) ** 2);
      if (distToInd === 0) {
        industrialWeight += 60 * industrialMultiplier;
      } else {
        // Wind dispersion factor
        const dr = cell.row - industrialSourceCell.row;
        const dc = cell.col - industrialSourceCell.col;
        const dotProduct = dc * windDx + dr * windDy;
        const isDownwind = dotProduct > 0;
        const windInfluence = isDownwind ? (dotProduct * 22 * (windSpeed / 10)) : 2;
        industrialWeight += Math.max(1, (30 * industrialMultiplier + windInfluence) / (distToInd ** 1.1));
      }
    }

    if (highwaySourceCell) {
      const distToHwy = Math.sqrt((cell.row - highwaySourceCell.row) ** 2 + (cell.col - highwaySourceCell.col) ** 2);
      if (distToHwy === 0) {
        trafficWeight += 45 * trafficMultiplier;
      } else {
        const dr = cell.row - highwaySourceCell.row;
        const dc = cell.col - highwaySourceCell.col;
        const dotProduct = dc * windDx + dr * windDy;
        const isDownwind = dotProduct > 0;
        const windInfluence = isDownwind ? (dotProduct * 10 * (windSpeed / 12)) : 1;
        trafficWeight += Math.max(1, (20 * trafficMultiplier + windInfluence) / (distToHwy ** 1.2));
      }
    }

    // C. Construction hotspot proximity
    const distToConstruction = Math.sqrt((cell.row - constructionHotspotRow) ** 2 + (cell.col - constructionHotspotCol) ** 2);
    if (distToConstruction === 0) {
      constructionWeight += 65 * constructionActivity;
    } else {
      constructionWeight += Math.max(2, (35 * constructionActivity) / (distToConstruction ** 1.3));
    }

    // D. Waste Burning enhancements
    // Higher waste burning on outer outskirts of city, e.g. residential grids or borders
    const isBorderCell = cell.row === 0 || cell.row === 5 || cell.col === 0 || cell.col === 5;
    if (isBorderCell) {
      wasteWeight += 15 * (cityPollution / 45);
    }
    // Low temperatures or high humidity often lead to increased biomass/heating combustion
    if (forecastRes.environmentalConditions.temperature < 15) {
      wasteWeight += 12; // cold heating emissions
    }

    // E. Background baseline is tied to overall city cleanliness
    backgroundWeight += Math.max(5, (100 - cityPollution) * 0.4);

    // F. Normalization to exactly 100%
    const sum = trafficWeight + constructionWeight + industrialWeight + wasteWeight + backgroundWeight;
    let pTraffic = Math.round((trafficWeight / sum) * 100);
    let pConstruction = Math.round((constructionWeight / sum) * 100);
    let pIndustrial = Math.round((industrialWeight / sum) * 100);
    let pWasteBurning = Math.round((wasteWeight / sum) * 100);
    let pBackground = Math.round((backgroundWeight / sum) * 100);

    // Ensure perfect 100% sum
    let currentSum = pTraffic + pConstruction + pIndustrial + pWasteBurning + pBackground;
    let diff = 100 - currentSum;
    if (diff !== 0) {
      const shares = [
        { name: 'traffic', val: pTraffic },
        { name: 'construction', val: pConstruction },
        { name: 'industrial', val: pIndustrial },
        { name: 'wasteBurning', val: pWasteBurning },
        { name: 'background', val: pBackground }
      ];
      shares.sort((a, b) => b.val - a.val);
      // add remaining diff to the largest share
      if (shares[0].name === 'traffic') pTraffic += diff;
      else if (shares[0].name === 'construction') pConstruction += diff;
      else if (shares[0].name === 'industrial') pIndustrial += diff;
      else if (shares[0].name === 'wasteBurning') pWasteBurning += diff;
      else pBackground += diff;
    }

    // G. Determine primary source and evidence summary
    const maxContribution = Math.max(pTraffic, pConstruction, pIndustrial, pWasteBurning, pBackground);
    let primarySource: AttributionCellResult['primarySource'] = 'Background Pollution';
    let evidenceSummary = '';

    if (maxContribution === pTraffic) {
      primarySource = 'Traffic';
      const detail = cell.type === 'highway' ? 'Primary highway artery intersection.' : 'Transit dispersion under local grid proximity.';
      evidenceSummary = `Vehicular exhaust represents ${pTraffic}% of the local payload. ${detail} Gaseous carbon compounds and PM2.5 dominate.`;
    } else if (maxContribution === pIndustrial) {
      primarySource = 'Industrial Emissions';
      const alignmentText = windSpeed > 10 ? `aligned downwind from the industrial chimney stack at ${windSpeed} km/h.` : 'trapped under stable atmospheric stagnation.';
      evidenceSummary = `Industrial point-source particulates represent ${pIndustrial}% of the local payload. Sector is actively ${alignmentText}`;
    } else if (maxContribution === pConstruction) {
      primarySource = 'Construction';
      const proximityText = distToConstruction < 1.5 ? 'within the primary excavation radius of regional infrastructure works.' : 'downwind of development activity.';
      evidenceSummary = `Coarse dust and crushed silicate particulates from excavation account for ${pConstruction}% of the AQI score. Sector lies ${proximityText}`;
    } else if (maxContribution === pWasteBurning) {
      primarySource = 'Waste Burning';
      evidenceSummary = `Biomass burning, refuse incineration, or winter residential fuel combustion accounts for ${pWasteBurning}% of the load. Elevated PM10 and carbon soot.`;
    } else {
      primarySource = 'Background Pollution';
      evidenceSummary = `Aqueous organic aerosols and regional background background particulate matters account for ${pBackground}% of the total. No localized point-source is heavily active.`;
    }

    // H. Cell confidence score
    // Slightly lower than the prediction model because attribution has higher parameter variance
    const confidenceScore = Math.max(68, Math.round(cell.confidenceScore - 4 - (forecastPeriod === '72 Hour' ? 6 : 0)));

    return {
      id: cell.id,
      row: cell.row,
      col: cell.col,
      name: cell.name,
      type: cell.type,
      aqiValue: cell.aqiValue,
      aqiCategory: cell.aqiCategory,
      primarySource,
      contributions: {
        traffic: pTraffic,
        construction: pConstruction,
        industrial: pIndustrial,
        wasteBurning: pWasteBurning,
        background: pBackground
      },
      confidenceScore,
      evidenceSummary,
      latitude: cell.latitude,
      longitude: cell.longitude
    };
  });

  // Calculate overall summary statistics
  const sortedCells = [...attributionCells].sort((a, b) => b.aqiValue - a.aqiValue);
  const highestCell = sortedCells[0];
  const lowestCell = sortedCells[sortedCells.length - 1];

  // Primary source for the city as a whole based on average percentages across all cells
  let sumTraffic = 0;
  let sumIndustrial = 0;
  let sumConstruction = 0;
  let sumWaste = 0;
  let sumBackground = 0;

  attributionCells.forEach(c => {
    sumTraffic += c.contributions.traffic;
    sumIndustrial += c.contributions.industrial;
    sumConstruction += c.contributions.construction;
    sumWaste += c.contributions.wasteBurning;
    sumBackground += c.contributions.background;
  });

  const cityAverages = [
    { name: 'Traffic Emissions', val: sumTraffic },
    { name: 'Industrial Stack Emissions', val: sumIndustrial },
    { name: 'Construction & Excavation Dust', val: sumConstruction },
    { name: 'Biomass & Refuse Incineration', val: sumWaste },
    { name: 'Regional Background Particulates', val: sumBackground }
  ];
  cityAverages.sort((a, b) => b.val - a.val);
  const primaryCitySource = cityAverages[0].name;

  const averageConfidence = Math.round(attributionCells.reduce((sum, c) => sum + c.confidenceScore, 0) / attributionCells.length);

  return {
    city: cityName,
    forecastPeriod,
    cells: attributionCells,
    summary: {
      averageAqi: forecastRes.summary.averageAqi,
      primaryCitySource,
      averageConfidence,
      highestAqiCell: {
        id: highestCell.id,
        name: highestCell.name,
        value: highestCell.aqiValue,
        primarySource: highestCell.primarySource
      },
      lowestAqiCell: {
        id: lowestCell.id,
        name: lowestCell.name,
        value: lowestCell.aqiValue,
        primarySource: lowestCell.primarySource
      }
    },
    environmentalConditions: forecastRes.environmentalConditions
  };
};

// Helper for converting wind direction abbreviations
const getWindAngle = (dir: string): number => {
  const directions: Record<string, number> = {
    'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
    'S': 180, 'SW': 225, 'W': 270, 'NW': 315
  };
  return directions[dir.toUpperCase()] ?? 0;
};
