
export enum WorkflowState {
  IDLE = 'idle',
  AIRSIGHT_AI = 'airsight-ai',
  ORIGIN_X = 'origin-x',
  AI_FILTERING = 'ai-filtering',
  AETHEL_Q = 'aethel-q',
  DIGITAL_TWIN = 'digital-twin',
  CONFIG = 'config',
  LOGS = 'logs',
  SUSTAINABILITY = 'sustainability',
  CITY_ADVISOR = 'city-advisor',
  STRATO_SIM = 'strato-sim',
  EXPLAINABLE_AI = 'explainable-ai',
  SCENARIO_LAB = 'scenario-lab',
  PREDICTION = 'prediction',
  DECISION_ENGINE = 'decision-engine',
  CITIZEN_ADVISORY = 'citizen-advisory',
  ENFORCEMENT_INTEL = 'enforcement-intel',
  CARBON_CAPTURE = 'carbon-capture',
  SKY_WEAVE = 'sky-weave'
}

export interface MaterialCandidate {
  id: string;
  name: string;
  metal: string;
  metalColor: string;
  adsorption: string;
  surfaceArea: string;
  synthesisTime: string;
  cost: string;
  highlightMetric: string;
  highlightLabel: string;
  formula: string;
  // Animation trajectory parameters
  entryX: number;
  entryY: number;
  entryRotation: number;
  velocity: number; // m/s
  // Added for Hybrid Optimization
  efficiencyScore?: number;
  durabilityScore?: number;
  feasibilityScore?: number;
  compositeScore?: number;
}

export interface SimulationLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ProcessStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed';
  progress: number;
}
