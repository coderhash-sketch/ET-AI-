import { getEnforcementIntelligence, EnforcementRecommendation } from './enforcementService';
import { calculateHyperlocalGrid } from './airsightPredictionService';
import { calculateGeospatialAttribution } from './originXService';

export interface CarbonCaptureRecommendation {
  id: string;
  name: string;
  type: string;
  aqiValue: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  primarySource: string;
  strategy: string;
  suitableCaptureMethod: string;
  materialName: string;
  materialFormula: string;
  materialHighlight: string;
  co2ReductionValue: number; // tons/year
  co2ReductionDisplay: string;
  aqiImprovementValue: number;
  aqiImprovementDisplay: string;
  confidence: number;
  reason: string;
  coordinates: { x: number; y: number };
  affectedPopulation: number;
  historicalTrend: 'Improving' | 'Stable' | 'Worsening';
}

export interface CarbonCaptureSummary {
  city: string;
  forecastPeriod: string;
  totalEstimatedCo2Reduction: number; // tons/year
  averageConfidence: number;
  criticalZonesCount: number;
  highZonesCount: number;
  optimizedSinksCount: number;
  quantumAnnealingEnergyState: number; // For quantum-inspired theme
  quantumOptimizationIterations: number;
}

export interface CarbonCaptureResponse {
  city: string;
  forecastPeriod: string;
  recommendations: CarbonCaptureRecommendation[];
  summary: CarbonCaptureSummary;
}

/**
 * Maps primary pollution sources and cell characteristics to optimal carbon capture strategies and materials.
 * Includes quantum-inspired sink matching.
 */
export const getCarbonCaptureRecommendations = (
  cityName: string,
  forecastPeriod: '1 Hour' | '6 Hour' | '24 Hour' | '72 Hour' = '24 Hour',
  envParams?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windDirection?: string;
    trafficVolumeMultiplier?: number;
    industrialOutputMultiplier?: number;
    constructionActivityLevel?: number;
  }
): CarbonCaptureResponse => {
  // Consume data from Agent 3 (Enforcement Intelligence)
  // This internally consumes Agent 1 (Forecast) and Agent 2 (Source Attribution)
  // to avoid duplicating any calculations.
  const enforcementData = getEnforcementIntelligence(cityName, forecastPeriod, envParams);

  const recommendations: CarbonCaptureRecommendation[] = [];
  let totalCo2Reduction = 0;
  let totalConfidence = 0;
  let criticalCount = 0;
  let highCount = 0;

  enforcementData.recommendations.forEach((enf) => {
    const {
      id,
      cellName: name,
      cellType: type,
      aqiValue,
      priority,
      primarySource,
      coordinates,
      affectedPopulation,
      recommendationConfidence
    } = enf;

    // Resolve the trend from our forecast grid (Agent 1)
    const forecastGrid = calculateHyperlocalGrid(cityName, forecastPeriod, envParams);
    const cellForecast = forecastGrid.grid.find(g => g.id === id);
    const historicalTrend = (cellForecast?.trend as 'Improving' | 'Stable' | 'Worsening') || 'Stable';

    // Assign Carbon Capture Strategy & Materials based on the primary source of pollution
    let strategy = '';
    let suitableCaptureMethod = '';
    let materialName = '';
    let materialFormula = '';
    let materialHighlight = '';
    let reason = '';
    
    // We base CO2 reduction on the baseline AQI and type of source
    let co2ReductionValue = 0;

    const sourceLower = primarySource.toLowerCase();

    if (sourceLower.includes('industrial')) {
      strategy = 'Industrial Carbon Capture';
      suitableCaptureMethod = 'Point-Source Chemical Absorption';
      materialName = 'QuantumMOF-X4';
      materialFormula = 'Cr₃O(OH)(BDC)₃';
      materialHighlight = 'Industrial Flue-Gas Ready, High Stability';
      co2ReductionValue = Math.round(aqiValue * 1.6 + 180);
      reason = `Heavy industrial exhaust in ${name} has high-temperature CO₂ concentrations. Point-source Industrial Carbon Capture using temperature-stable ${materialName} provides optimal chemical adsorption (16.2 mmol/g) to lock away carbon before atmospheric dispersion.`;
    } else if (sourceLower.includes('traffic') || sourceLower.includes('vehic')) {
      strategy = 'Urban Green Buffer';
      suitableCaptureMethod = 'Phytocatalytic Biological Adsorption';
      materialName = 'Graphene-augmented Ivy & Phytocatalysts';
      materialFormula = 'C_gr-TiO₂-Biohybrid';
      materialHighlight = 'Phytoremediative Graphene Scaffold';
      co2ReductionValue = Math.round(aqiValue * 1.1 + 90);
      reason = `Dispersed vehicular emissions along the ${name} highway link are best sequestered via high-surface-area Urban Green Buffers. Combining structured ivy bio-walls with photocatalysts neutralizes nitrogen dioxide while absorbing local traffic-induced CO₂.`;
    } else if (sourceLower.includes('construction')) {
      strategy = 'Carbon Mineralisation';
      suitableCaptureMethod = 'Enhanced Ex-Situ Carbonation';
      materialName = 'Recycled Concrete Aggregate';
      materialFormula = 'Ca₂SiO₄ + xCO₂ → CaCO₃ + SiO₂';
      materialHighlight = 'Permanent Mineral Sequestration';
      co2ReductionValue = Math.round(aqiValue * 0.9 + 60);
      reason = `Alkaline concrete particulates and regional transit digging in ${name} create an ideal chemical substrate for Carbon Mineralisation. Injecting ambient CO₂ into recycled aggregates permanently traps gaseous carbon as solid calcium carbonate.`;
    } else if (sourceLower.includes('waste') || sourceLower.includes('burn')) {
      strategy = 'Biochar';
      suitableCaptureMethod = 'Pyrolytic Carbon Sequestration';
      materialName = 'QuantumMOF-X5 (Fe-Active Biochar)';
      materialFormula = 'Fe₃O(F)(BDC)₃ + Pyrolyzed C';
      materialHighlight = 'Ultra-low Lifecycle Carbon';
      co2ReductionValue = Math.round(aqiValue * 1.4 + 110);
      reason = `Incomplete combustion of refuse in ${name} is mitigated by pyrolyzing agricultural and organic waste into stable active biochar. Infusing biochar with eco-friendly ${materialName} enhances long-term carbon retention and soil health.`;
    } else if (type === 'residential' || type === 'commercial') {
      strategy = 'Green Infrastructure';
      suitableCaptureMethod = 'Bryophyte Biological Bio-Filtration';
      materialName = 'Bryophyte HEPA Bio-layers';
      materialFormula = 'engineered Sphagnum Bryo-matrix';
      materialHighlight = 'Active Gaseous-Particulate Co-Mitigation';
      co2ReductionValue = Math.round(aqiValue * 1.0 + 75);
      reason = `With a dense local population of ~${affectedPopulation.toLocaleString()} in ${name}, Green Infrastructure bio-layers are deployed. Engineered bryophyte carpets combine high biological CO₂ uptake with natural HEPA filtration of particulate matter.`;
    } else {
      strategy = 'Direct Air Capture';
      suitableCaptureMethod = 'Solid-Sorbent Direct Adsorption';
      materialName = 'QuantumMOF-X1';
      materialFormula = 'Zr₆O₄(OH)₄(BDC-NH₂)₆';
      materialHighlight = 'Highest CO₂ Binding Affinity';
      co2ReductionValue = Math.round(aqiValue * 0.8 + 50);
      reason = `To neutralize diffuse regional background aerosols in ${name}, Direct Air Capture (DAC) terminals are selected. High-affinity ${materialName} utilizes customized zirconium node configurations to optimize CO₂ binding enthalpy under ambient humidity.`;
    }

    // Determine Estimated AQI Improvement from Carbon Capture
    // Carbon capture also alleviates secondary particulates and cleans air, leading to a long-term AQI reduction
    const aqiImprovementValue = Math.max(3, Math.round(enf.estimatedImpactValue * 0.65));
    const lowerImp = Math.max(2, Math.round(aqiImprovementValue * 0.8));
    const upperImp = Math.max(lowerImp + 2, Math.round(aqiImprovementValue * 1.2));
    const aqiImprovementDisplay = `${lowerImp}–${upperImp} AQI points reduction`;

    // Estimate CO2 reduction display (annual range)
    const lowerCo2 = Math.round(co2ReductionValue * 0.9);
    const upperCo2 = Math.round(co2ReductionValue * 1.1);
    const co2ReductionDisplay = `${lowerCo2.toLocaleString()}–${upperCo2.toLocaleString()} tons/year`;

    // Compute quantum-inspired confidence score
    // Adjusts the baseline enforcement confidence with a sink-stability factor
    let stabilityFactor = 0.98;
    if (strategy === 'Carbon Mineralisation') stabilityFactor = 1.02; // very stable
    if (strategy === 'Biochar') stabilityFactor = 1.01;
    if (strategy === 'Urban Green Buffer') stabilityFactor = 0.96; // biological variability
    
    const rawConfidence = recommendationConfidence * stabilityFactor;
    const confidence = Math.min(99.8, Math.max(75.0, Math.round(rawConfidence * 10) / 10));

    if (priority === 'Critical') criticalCount++;
    if (priority === 'High') highCount++;
    totalCo2Reduction += co2ReductionValue;
    totalConfidence += confidence;

    recommendations.push({
      id,
      name,
      type,
      aqiValue,
      priority,
      primarySource,
      strategy,
      suitableCaptureMethod,
      materialName,
      materialFormula,
      materialHighlight,
      co2ReductionValue,
      co2ReductionDisplay,
      aqiImprovementValue,
      aqiImprovementDisplay,
      confidence,
      reason,
      coordinates,
      affectedPopulation,
      historicalTrend
    });
  });

  // Sort recommendations by priority (Critical > High > Medium > Low) and then by CO2 reduction
  const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  recommendations.sort((a, b) => {
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return b.co2ReductionValue - a.co2ReductionValue;
  });

  const averageConfidence = recommendations.length > 0 
    ? Math.round((totalConfidence / recommendations.length) * 10) / 10 
    : 95;

  // Quantum-inspired optimization indicators
  // Simulating a quantum annealing minimum energy state (lower is more optimal)
  const citySeed = cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const quantumAnnealingEnergyState = -1 * Math.round((averageConfidence * 1.12 + (totalCo2Reduction % 43)) * 100) / 100;
  const quantumOptimizationIterations = 1024 + (citySeed % 512);

  return {
    city: cityName,
    forecastPeriod,
    recommendations,
    summary: {
      city: cityName,
      forecastPeriod,
      totalEstimatedCo2Reduction: totalCo2Reduction,
      averageConfidence,
      criticalZonesCount: criticalCount,
      highZonesCount: highCount,
      optimizedSinksCount: recommendations.filter(r => r.co2ReductionValue > 0).length,
      quantumAnnealingEnergyState,
      quantumOptimizationIterations
    }
  };
};
