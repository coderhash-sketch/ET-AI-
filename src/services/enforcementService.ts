import { calculateHyperlocalGrid, GridCell, getAqiCategory } from './airsightPredictionService';
import { calculateGeospatialAttribution, AttributionCellResult } from './originXService';

export interface EnforcementRecommendation {
  id: string;
  row: number;
  col: number;
  cellName: string;
  cellType: 'industrial' | 'highway' | 'park' | 'residential' | 'commercial';
  aqiValue: number;
  aqiCategory: string;
  primarySource: string;
  sourceConfidence: number;
  historicalTrend: 'Improving' | 'Stable' | 'Worsening';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendedZone: string;
  suggestedAction: string;
  estimatedImpact: string;
  estimatedImpactValue: number;
  recommendationConfidence: number;
  evidenceSummary: string;
  coordinates: { x: number; y: number };
  affectedPopulation: number;
  estimatedImprovement: string;
}

export interface EnforcementSummary {
  totalHighRiskZones: number;
  averageAqi: number;
  criticalZonesCount: number;
  highZonesCount: number;
  mediumZonesCount: number;
  lowZonesCount: number;
  averageRecommendationConfidence: number;
  primarySourceContributor: string;
}

export interface EnforcementResponse {
  city: string;
  forecastPeriod: string;
  recommendations: EnforcementRecommendation[];
  summary: EnforcementSummary;
}

/**
 * Classifies the risk priority level based on AQI value and trend.
 */
export const classifyPriority = (aqiValue: number, trend: 'Improving' | 'Stable' | 'Worsening'): 'Critical' | 'High' | 'Medium' | 'Low' => {
  if (aqiValue >= 220) return 'Critical';
  if (aqiValue >= 160) {
    return trend === 'Worsening' ? 'Critical' : 'High';
  }
  if (aqiValue >= 100) {
    return trend === 'Worsening' ? 'High' : 'Medium';
  }
  return 'Low';
};

/**
 * Generates suggested enforcement action based on primary source and cell characteristics.
 */
export const determineSuggestedAction = (primarySource: string, cellType: string): string => {
  const source = primarySource.toLowerCase();
  if (source.includes('industrial')) {
    return 'Inspect Industry';
  }
  if (source.includes('construction')) {
    return 'Inspect Construction Site';
  }
  if (source.includes('waste') || source.includes('burn') || source.includes('refuse')) {
    return 'Verify Waste Burning';
  }
  if (source.includes('traffic') || source.includes('vehic')) {
    return 'Deploy Mobile Sensor';
  }
  return 'Increase Monitoring';
};

/**
 * Generates an evidence summary explaining the recommendation.
 */
export const generateEvidenceSummary = (
  cellName: string,
  aqiValue: number,
  primarySource: string,
  sourceConfidence: number,
  trend: string,
  suggestedAction: string,
  impactValue: number,
  windSpeed: number,
  windDirection: string
): string => {
  const sourceLabel = primarySource.toLowerCase().includes('emissions') || primarySource.toLowerCase().includes('dust') || primarySource.toLowerCase().includes('burning')
    ? primarySource
    : `${primarySource} emissions`;

  const meteorologicalFactor = windSpeed > 15
    ? `Strong wind vector of ${windSpeed} km/h from ${windDirection} is rapidly spreading the plume downwind.`
    : `Low wind speed (${windSpeed} km/h from ${windDirection}) is trapping particulates locally, amplifying concentrations.`;

  return `Localized air quality in ${cellName} has reached an AQI of ${aqiValue} with a ${trend.toLowerCase()} trend, driven primarily by ${sourceLabel}. Grid-level attribution models confirm source with ${sourceConfidence}% confidence. ${meteorologicalFactor} Executing the command "${suggestedAction}" immediately will contain emissions and is estimated to lower localized AQI by ${impactValue} points.`;
};

/**
 * Enforcement Intelligence Agent: Analyzes forecast and source attribution data
 * to produce actionable containment and inspection recommendations.
 */
export const getEnforcementIntelligence = (
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
): EnforcementResponse => {
  // 1. Consume forecast from Agent 1 (Sky Vector)
  const forecastData = calculateHyperlocalGrid(cityName, forecastPeriod, envParams);

  // 2. Consume attribution from Agent 2 (Origin - X)
  const attributionData = calculateGeospatialAttribution(cityName, forecastPeriod, envParams);

  const recommendations: EnforcementRecommendation[] = [];
  
  // 3. Map forecast grid and attribution cells to generate actionable recommendations
  attributionData.cells.forEach(attrCell => {
    // Find the corresponding forecast cell from Agent 1
    const forecastCell = forecastData.grid.find(g => g.id === attrCell.id) || {
      trend: 'Stable' as const,
      aqiValue: attrCell.aqiValue,
      aqiCategory: attrCell.aqiCategory
    };

    const trend = forecastCell.trend as 'Improving' | 'Stable' | 'Worsening';
    const priority = classifyPriority(attrCell.aqiValue, trend);
    const suggestedAction = determineSuggestedAction(attrCell.primarySource, attrCell.type);
    
    // Estimate AQI reduction impact
    let reductionPercent = 15;
    if (attrCell.primarySource.toLowerCase().includes('industrial')) reductionPercent = 25;
    if (attrCell.primarySource.toLowerCase().includes('construction')) reductionPercent = 20;
    if (attrCell.primarySource.toLowerCase().includes('waste')) reductionPercent = 30;
    
    const estimatedImpactValue = Math.round(attrCell.aqiValue * (reductionPercent / 100));
    const estimatedImpact = `AQI -${estimatedImpactValue} (-${reductionPercent}%)`;

    // Calculate Estimated AQI Improvement (e.g. 12-18 AQI points within 24 hours)
    const lowerImprovement = Math.max(2, Math.round(estimatedImpactValue * 0.85));
    const upperImprovement = Math.max(lowerImprovement + 2, Math.round(estimatedImpactValue * 1.15));
    const estimatedImprovement = `${lowerImprovement}–${upperImprovement} AQI points within 24 hours`;

    // Compute realistic and deterministic affected population based on city name, cell name and cell type
    const citySeed = cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cellSeed = attrCell.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePop = ((citySeed * cellSeed) % 25000) + 8000; // range 8k to 33k
    let popMultiplier = 1.0;
    if (attrCell.type === 'residential') popMultiplier = 1.6;
    if (attrCell.type === 'commercial') popMultiplier = 1.2;
    if (attrCell.type === 'industrial') popMultiplier = 0.5;
    if (attrCell.type === 'highway') popMultiplier = 0.4;
    if (attrCell.type === 'park') popMultiplier = 0.8;
    const affectedPopulation = Math.round(basePop * popMultiplier);

    // Compute recommendation confidence
    const windSpeed = envParams?.windSpeed ?? forecastData.environmentalConditions.windSpeed;
    const windDirection = envParams?.windDirection ?? forecastData.environmentalConditions.windDirection;
    const recommendationConfidence = Math.min(
      99,
      Math.max(60, Math.round(attrCell.confidenceScore * 0.95 + (trend === 'Stable' ? 3 : -2)))
    );

    // Recommended zone calculation
    const recommendedZone = `Zone ${attrCell.row + 1}-${attrCell.col + 1} (${attrCell.name} Upwind Sector)`;

    // Evidence summary generation
    const evidenceSummary = generateEvidenceSummary(
      attrCell.name,
      attrCell.aqiValue,
      attrCell.primarySource,
      attrCell.confidenceScore,
      trend,
      suggestedAction,
      estimatedImpactValue,
      windSpeed,
      windDirection
    );

    recommendations.push({
      id: `rec-${attrCell.id}`,
      row: attrCell.row,
      col: attrCell.col,
      cellName: attrCell.name,
      cellType: attrCell.type,
      aqiValue: attrCell.aqiValue,
      aqiCategory: attrCell.aqiCategory,
      primarySource: attrCell.primarySource,
      sourceConfidence: attrCell.confidenceScore,
      historicalTrend: trend,
      priority,
      recommendedZone,
      suggestedAction,
      estimatedImpact,
      estimatedImpactValue,
      recommendationConfidence,
      evidenceSummary,
      coordinates: { x: attrCell.row, y: attrCell.col },
      affectedPopulation,
      estimatedImprovement
    });
  });

  // Sort recommendations: Critical first, then High, then Medium, then Low, and then by AQI descending
  const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
  recommendations.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.aqiValue - a.aqiValue;
  });

  // Calculate summaries
  const highRiskZones = recommendations.filter(r => r.priority === 'Critical' || r.priority === 'High');
  const criticalCount = recommendations.filter(r => r.priority === 'Critical').length;
  const highCount = recommendations.filter(r => r.priority === 'High').length;
  const mediumCount = recommendations.filter(r => r.priority === 'Medium').length;
  const lowCount = recommendations.filter(r => r.priority === 'Low').length;
  
  const sumConf = recommendations.reduce((acc, r) => acc + r.recommendationConfidence, 0);
  const avgConf = recommendations.length > 0 ? Math.round(sumConf / recommendations.length) : 0;

  return {
    city: cityName,
    forecastPeriod,
    recommendations,
    summary: {
      totalHighRiskZones: highRiskZones.length,
      averageAqi: attributionData.summary.averageAqi,
      criticalZonesCount: criticalCount,
      highZonesCount: highCount,
      mediumZonesCount: mediumCount,
      lowZonesCount: lowCount,
      averageRecommendationConfidence: avgConf,
      primarySourceContributor: attributionData.summary.primaryCitySource
    }
  };
};
