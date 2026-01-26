export type MemoryConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type MemoryStatus = 'active' | 'flagged_for_review' | 'deprecated';

export interface BaseMemory {
  id?: string;
  createdAt: string;
  tags: string[];
  confidence: MemoryConfidence;
  source: 'chat' | 'waterfall' | 'supervisor' | 'user_override';
  status?: MemoryStatus; // Default to 'active' if undefined
  deprecatedBy?: string; // ID of the memory that superseded this one
}

export interface CrystallizedRule extends BaseMemory {
  type: 'permanent_rule';
  ruleText: string;
  context: string; // The situation where this rule applies
  enforcementLevel: 'strict' | 'suggestion';
}

export interface SuccessPattern extends BaseMemory {
  type: 'solution_pattern';
  problemDomain: string;
  solutionCode: string; // The "Secret Sauce" snippet
  effectivenessScore: number; // 0-100
}

export interface SupervisoryInsight extends BaseMemory {
  type: 'architectural_decision';
  decision: string;
  rationale: string;
  impactedModules: string[];
}

export interface UserPreference extends BaseMemory {
  type: 'user_preference';
  preference: string;
  value: string | boolean | number;
}

export type CrystallizedMemory = CrystallizedRule | SuccessPattern | SupervisoryInsight | UserPreference;
