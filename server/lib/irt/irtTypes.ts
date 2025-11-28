// server/lib/irt/irtTypes.ts

/**
 * Core IRT type definitions
 */

export interface IRTParameters {
  difficulty: number;      // b: -3 to +3 (tingkat kesulitan)
  discrimination: number;  // a: 0 to 2.5 (daya pembeda)
  guessing: number;        // c: 0 to 0.35 (peluang tebakan)
}

export interface StudentResponse {
  questionId: string;
  isCorrect: boolean;
  irtParams: IRTParameters;
  kategoriId: string;      // 'kpu', 'ppu', 'pm', etc.
  timeSpent?: number;      // seconds
}

export interface AbilityEstimate {
  theta: number;           // -3 to +3
  standardError: number;   // Confidence in estimate
  percentile: number;      // 0-100
  reliability: number;     // 0-1
  information: number;     // Total information
}

export interface CategoryResult {
  kategoriId: string;
  kategoriName: string;
  ability: AbilityEstimate;
  rawScore: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
}

export interface BatchIRTResult {
  categoryResults: CategoryResult[];
  overallAbility: AbilityEstimate;
  overallScore: number; // 0-100 scaled score
  testStatistics: {
    totalQuestions: number;
    totalCorrect: number;
    totalIncorrect: number;
    totalUnanswered: number;
    averageTheta: number;
    thetaRange: { min: number; max: number };
    testReliability: number;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  performanceLevel: {
    level: string;
    description: string;
    color: string;
  };
}

export interface CategoryResponses {
  kategoriId: string;
  kategoriName: string;
  responses: StudentResponse[];
  priorTheta?: number;
}
