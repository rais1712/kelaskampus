// server/lib/recommendation/recommendationEngine.ts
// ✅ COMPLETE & FIXED VERSION

import type {
  StudentProfile,
  StudyProgram,
  RecommendationResult
} from './types';

// ✅ Define locally (not exported from types.ts)
type RecommendationTier = 'safety' | 'target' | 'reach';

export class RecommendationEngine {
  /**
   * Generate personalized university recommendations
   */
  /**
 * Generate personalized university recommendations
 */
static async generateRecommendations(
  studentProfile: StudentProfile,
  programs: StudyProgram[],
  limit: number = 20
): Promise<RecommendationResult[]> {
  console.log('🧠 Starting recommendation generation...');
  console.log(`📊 Student abilities:`, studentProfile.abilities);
  console.log(`🎓 Programs to evaluate: ${programs.length}`);

  const recommendations: RecommendationResult[] = [];

  for (const program of programs) {
    try {
      const scores = this.calculateMatchScores(studentProfile, program);
      const tier = this.determineTier(scores.admissionProbability);
      const reasoning = this.generateReasoning(studentProfile, program, scores);

      recommendations.push({
        programId: program.id,
        rank: 0,
        program,
        scores,
        tier,
        reasoning
      });
    } catch (error) {
      console.warn(`⚠️ Failed to process program ${program.name}:`, error);
    }
  }

  recommendations.sort((a, b) => b.scores.overallMatch - a.scores.overallMatch);
  
  recommendations.forEach((rec, index) => {
    rec.rank = index + 1;
  });

  const limitedRecs = recommendations.slice(0, limit);

  console.log(`✅ Generated ${limitedRecs.length} recommendations`);

  return limitedRecs;
}


  /**
   * Calculate match scores between student and program
   */
  private static calculateMatchScores(
    studentProfile: StudentProfile,
    program: StudyProgram
  ): {
    overallMatch: number;
    academicFit: number;
    preferenceFit: number;
    admissionProbability: number;
  } {
    // 1. Calculate academic fit (based on IRT theta)
    const academicFit = this.calculateAcademicFit(
      studentProfile.abilities,
      program.passingGrades
    );

    // 2. Calculate preference fit (if preferences provided)
    const preferenceFit = studentProfile.preferences
      ? this.calculatePreferenceFit(studentProfile.preferences, program)
      : 0.5; // Neutral if no preferences

    // 3. Calculate admission probability
    const admissionProbability = this.calculateAdmissionProbability(
      studentProfile.abilities,
      program
    );

    // 4. Calculate overall match (weighted average)
    const weights = studentProfile.preferences?.priorityFactors || {
      academicFit: 0.4,
      locationFit: 0.2,
      careerFit: 0.2,
      admissionChance: 0.2
    };

    const overallMatch =
      academicFit * weights.academicFit +
      preferenceFit * (weights.locationFit + weights.careerFit) +
      admissionProbability * weights.admissionChance;

    return {
      overallMatch: Math.min(1.0, Math.max(0.0, overallMatch)),
      academicFit: Math.min(1.0, Math.max(0.0, academicFit)),
      preferenceFit: Math.min(1.0, Math.max(0.0, preferenceFit)),
      admissionProbability: Math.min(1.0, Math.max(0.0, admissionProbability))
    };
  }

  /**
   * Calculate academic fit based on theta scores
   */
  private static calculateAcademicFit(
    abilities: Record<string, number>,
    passingGrades: Record<string, number>
  ): number {
    const relevantCategories = Object.keys(passingGrades).filter(
      (key) => key !== 'overall' && abilities[key] !== undefined
    );

    if (relevantCategories.length === 0) {
      return 0.5; // Neutral if no matching categories
    }

    let totalFit = 0;
    let count = 0;

    for (const category of relevantCategories) {
      const studentTheta = abilities[category];
      const requiredTheta = passingGrades[category];

      if (requiredTheta !== undefined && requiredTheta !== null && requiredTheta !== 0) {
        const distance = studentTheta - requiredTheta;
        const fitScore = 1 / (1 + Math.exp(-2 * distance));
        
        totalFit += fitScore;
        count++;
      }
    }

    return count > 0 ? totalFit / count : 0.5;
  }

  /**
   * Calculate preference fit
   */
  private static calculatePreferenceFit(
    preferences: StudentProfile['preferences'],
    program: StudyProgram
  ): number {
    if (!preferences) return 0.5;

    let fitScore = 0;
    let maxScore = 0;

    // Rumpun preference
    if (preferences.preferredRumpun && preferences.preferredRumpun.length > 0) {
      maxScore += 0.4;
      if (preferences.preferredRumpun.includes(program.rumpun)) {
        fitScore += 0.4;
      }
    }

    // Location preference
    if (preferences.preferredLocations && preferences.preferredLocations.length > 0) {
      maxScore += 0.3;
      const matchesLocation = preferences.preferredLocations.some((loc) => {
        const locStr = typeof loc === 'string' ? loc.toLowerCase() : '';
        const programCity = program.location?.city?.toLowerCase() || '';
        const programProvince = program.location?.province?.toLowerCase() || '';
        
        return programCity.includes(locStr) || programProvince.includes(locStr);
      });
      if (matchesLocation) {
        fitScore += 0.3;
      }
    }

    // University type preference
    if (preferences.preferredUniversityTypes && preferences.preferredUniversityTypes.length > 0) {
      maxScore += 0.3;
      if (preferences.preferredUniversityTypes.includes(program.universityType)) {
        fitScore += 0.3;
      }
    }

    return maxScore > 0 ? fitScore / maxScore : 0.5;
  }

  /**
   * Calculate admission probability using logistic regression
   */
  private static calculateAdmissionProbability(
    abilities: Record<string, number>,
    program: StudyProgram
  ): number {
    const gaps: number[] = [];
    
    Object.keys(program.passingGrades).forEach((category) => {
      if (category !== 'overall' && abilities[category] !== undefined) {
        const required = program.passingGrades[category];
        if (required !== undefined && required !== null && required !== 0) {
          gaps.push(abilities[category] - required);
        }
      }
    });

    if (gaps.length === 0) {
      return 0.5;
    }

    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const baseAcceptanceRate = program.historicalData?.acceptanceRate || 0.1;
    const gapEffect = 1 / (1 + Math.exp(-3 * avgGap));
    const probability = gapEffect * 0.7 + baseAcceptanceRate * 0.3;

    return Math.min(0.95, Math.max(0.05, probability));
  }

  /**
   * Determine recommendation tier
   */
  private static determineTier(admissionProbability: number): RecommendationTier {
    if (admissionProbability >= 0.7) {
      return 'safety';
    } else if (admissionProbability >= 0.4) {
      return 'target';
    } else {
      return 'reach';
    }
  }

  /**
   * Generate reasoning text for recommendation
   */
  private static generateReasoning(
    studentProfile: StudentProfile,
    program: StudyProgram,
    scores: {
      overallMatch: number;
      academicFit: number;
      preferenceFit: number;
      admissionProbability: number;
    }
  ): {
    strengths: string[];
    concerns: string[];
    keyFactors: Array<{
      factor: string;
      score: number;
      weight: number;
    }>;
  } {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const keyFactors: Array<{
      factor: string;
      score: number;
      weight: number;
    }> = [];

    // Academic fit analysis
    if (scores.academicFit >= 0.8) {
      strengths.push('Kemampuan akademik Anda sangat sesuai dengan program ini');
    } else if (scores.academicFit >= 0.6) {
      strengths.push('Kemampuan akademik Anda cukup sesuai dengan program ini');
    } else {
      concerns.push('Kemampuan akademik masih perlu ditingkatkan');
    }

    // Admission probability analysis
    if (scores.admissionProbability >= 0.7) {
      strengths.push('Peluang diterima sangat tinggi');
    } else if (scores.admissionProbability >= 0.5) {
      strengths.push('Peluang diterima cukup baik');
    } else if (scores.admissionProbability >= 0.3) {
      concerns.push('Peluang diterima masih rendah');
    } else {
      concerns.push('Peluang diterima sangat rendah');
    }

    // Preference fit analysis
    if (scores.preferenceFit >= 0.7) {
      strengths.push('Program ini sangat sesuai dengan preferensi Anda');
    } else if (scores.preferenceFit < 0.4 && studentProfile.preferences) {
      concerns.push('Program ini kurang sesuai dengan preferensi lokasi atau tipe kampus Anda');
    }

    // Category-specific analysis
    const categoryGaps = this.analyzeCategories(
      studentProfile.abilities,
      program.passingGrades
    );

    if (categoryGaps.strong.length > 0) {
      strengths.push(`Kategori unggulan: ${categoryGaps.strong.join(', ')}`);
    }

    if (categoryGaps.weak.length > 0) {
      concerns.push(`Perlu perbaikan di: ${categoryGaps.weak.join(', ')}`);
    }

    // Key factors
    const weights = studentProfile.preferences?.priorityFactors || {
      academicFit: 0.4,
      locationFit: 0.2,
      careerFit: 0.2,
      admissionChance: 0.2
    };

    keyFactors.push(
      {
        factor: 'Academic Fit',
        score: scores.academicFit,
        weight: weights.academicFit
      },
      {
        factor: 'Preference Fit',
        score: scores.preferenceFit,
        weight: weights.locationFit + weights.careerFit
      },
      {
        factor: 'Admission Probability',
        score: scores.admissionProbability,
        weight: weights.admissionChance
      }
    );

    return { strengths, concerns, keyFactors };
  }

  /**
   * Analyze category-by-category performance
   */
  private static analyzeCategories(
    abilities: Record<string, number>,
    passingGrades: Record<string, number>
  ): {
    strong: string[];
    weak: string[];
  } {
    const strong: string[] = [];
    const weak: string[] = [];

    const categoryNames: Record<string, string> = {
      kpu: 'KPU',
      ppu: 'PPU',
      pk: 'PK',
      pm: 'PM',
      'lit-id': 'Literasi Indonesia',
      'lit-en': 'Literasi Inggris',
      kmbm: 'KMBM'
    };

    Object.keys(passingGrades).forEach((category) => {
      if (category === 'overall') return;

      const studentScore = abilities[category];
      const requiredScore = passingGrades[category];

      if (
        studentScore !== undefined &&
        requiredScore !== undefined &&
        requiredScore !== null &&
        requiredScore !== 0
      ) {
        const gap = studentScore - requiredScore;
        const categoryName = categoryNames[category] || category.toUpperCase();

        if (gap >= 0.5) {
          strong.push(categoryName);
        } else if (gap < -0.3) {
          weak.push(categoryName);
        }
      }
    });

    return { strong, weak };
  }

  /**
   * Compare two programs
   */
  static comparePrograms(
    studentProfile: StudentProfile,
    program1: StudyProgram,
    program2: StudyProgram
  ): {
    winner: 'program1' | 'program2' | 'tie';
    comparison: Array<{
      factor: string;
      program1Score: number;
      program2Score: number;
      winner: 'program1' | 'program2' | 'tie';
    }>;
  } {
    const scores1 = this.calculateMatchScores(studentProfile, program1);
    const scores2 = this.calculateMatchScores(studentProfile, program2);

    const comparison: Array<{
      factor: string;
      program1Score: number;
      program2Score: number;
      winner: 'program1' | 'program2' | 'tie';
    }> = [];

    const factors = ['overallMatch', 'academicFit', 'preferenceFit', 'admissionProbability'] as const;

    factors.forEach((factor) => {
      const score1 = scores1[factor];
      const score2 = scores2[factor];
      
      let winner: 'program1' | 'program2' | 'tie';
      if (score1 > score2 + 0.01) {
        winner = 'program1';
      } else if (score2 > score1 + 0.01) {
        winner = 'program2';
      } else {
        winner = 'tie';
      }

      comparison.push({
        factor,
        program1Score: score1,
        program2Score: score2,
        winner
      });
    });

    let program1Wins = 0;
    let program2Wins = 0;

    comparison.forEach((comp) => {
      if (comp.winner === 'program1') program1Wins++;
      else if (comp.winner === 'program2') program2Wins++;
    });

    const overallWinner: 'program1' | 'program2' | 'tie' =
      program1Wins > program2Wins
        ? 'program1'
        : program2Wins > program1Wins
        ? 'program2'
        : 'tie';

    return {
      winner: overallWinner,
      comparison
    };
  }

  /**
   * Get recommendations by tier
   */
  static filterByTier(
    recommendations: RecommendationResult[],
    tier: RecommendationTier
  ): RecommendationResult[] {
    return recommendations.filter((rec) => rec.tier === tier);
  }

  /**
   * Get top N recommendations
   */
  static getTopRecommendations(
    recommendations: RecommendationResult[],
    count: number
  ): RecommendationResult[] {
    return recommendations.slice(0, count);
  }

  /**
   * Calculate diversity score
   */
  static calculateDiversity(recommendations: RecommendationResult[]): number {
    if (recommendations.length === 0) return 0;

    const uniqueUniversities = new Set(
      recommendations.map((rec) => rec.program.universityId)
    );
    
    const uniqueRumpun = new Set(
      recommendations.map((rec) => rec.program.rumpun)
    );

    const universityDiversity = uniqueUniversities.size / recommendations.length;
    const rumpunDiversity = uniqueRumpun.size / Math.min(recommendations.length, 3);

    return (universityDiversity + rumpunDiversity) / 2;
  }
}
