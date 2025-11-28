// server/lib/recommendation/matchingAlgorithm.ts

import { StudentProfile, StudyProgram } from './types';

/**
 * Core matching algorithms for university recommendations
 */
export class MatchingAlgorithm {
  
  /**
   * Calculate academic fit score
   * Compares student abilities vs program requirements
   */
  static calculateAcademicFit(
    studentAbilities: Record<string, number>,
    programRequirements: Record<string, number>
  ): number {
    
    const scores: number[] = [];
    
    for (const [kategoriId, requiredTheta] of Object.entries(programRequirements)) {
      const studentTheta = studentAbilities[kategoriId] || 0;
      
      // Calculate distance from requirement
      const distance = studentTheta - requiredTheta;
      
      // Convert to 0-1 score using sigmoid
      // Positive distance (above requirement) = higher score
      // Negative distance (below requirement) = lower score
      const score = 1 / (1 + Math.exp(-1.5 * distance));
      
      scores.push(score);
    }
    
    // If no requirements, return neutral score
    if (scores.length === 0) return 0.5;
    
    // Average across all categories
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Calculate preference alignment
   */
  static calculatePreferenceFit(
    preferences: StudentProfile['preferences'],
    program: StudyProgram
  ): number {
    
    let totalScore = 0;
    let totalWeight = 0;
    
    // 1. Rumpun match (weight: 0.35)
    if (preferences.preferredRumpun.length > 0) {
      const rumpunMatch = preferences.preferredRumpun.includes(program.rumpun) ? 1.0 : 0.3;
      totalScore += rumpunMatch * 0.35;
      totalWeight += 0.35;
    }
    
    // 2. Location match (weight: 0.25)
    if (preferences.preferredLocations.length > 0) {
      const cityMatch = preferences.preferredLocations.includes(program.location.city);
      const provinceMatch = preferences.preferredLocations.includes(program.location.province);
      
      const locationScore = cityMatch ? 1.0 : (provinceMatch ? 0.7 : 0.3);
      totalScore += locationScore * 0.25;
      totalWeight += 0.25;
    }
    
    // 3. University type match (weight: 0.20)
    if (preferences.preferredUniversityTypes.length > 0) {
      const typeMatch = preferences.preferredUniversityTypes.includes(program.universityType) ? 1.0 : 0.4;
      totalScore += typeMatch * 0.20;
      totalWeight += 0.20;
    }
    
    // 4. Tuition fee match (weight: 0.10)
    if (preferences.maxTuitionFee && program.tuitionFee) {
      if (program.tuitionFee <= preferences.maxTuitionFee) {
        totalScore += 1.0 * 0.10;
      } else {
        const overage = (program.tuitionFee - preferences.maxTuitionFee) / preferences.maxTuitionFee;
        const penalty = Math.max(0, 1 - overage * 0.5);
        totalScore += penalty * 0.10;
      }
      totalWeight += 0.10;
    }
    
    // 5. Career interest match (weight: 0.10)
    if (preferences.careerInterests.length > 0 && program.careerProspects) {
      const matches = preferences.careerInterests.filter(interest =>
        program.careerProspects!.some(prospect =>
          prospect.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(prospect.toLowerCase())
        )
      );
      const careerScore = matches.length > 0 ? matches.length / preferences.careerInterests.length : 0.3;
      totalScore += careerScore * 0.10;
      totalWeight += 0.10;
    }
    
    // Normalize by total weight
    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }

  /**
   * Estimate admission probability
   * Uses Bayesian approach combining ability fit and historical acceptance rate
   */
  static estimateAdmissionProbability(
    academicFit: number,
    program: StudyProgram
  ): number {
    
    // Base acceptance rate from historical data
    let baseRate = 0.3; // Default conservative estimate
    
    if (program.historicalData) {
      baseRate = program.historicalData.acceptanceRate;
    }
    
    // Adjust based on academic fit
    // academicFit = 1.0 (perfect) -> boost by 50%
    // academicFit = 0.5 (average) -> no change
    // academicFit = 0.0 (poor) -> reduce to 30%
    const fitMultiplier = 0.3 + (academicFit * 1.2);
    
    let probability = baseRate * fitMultiplier;
    
    // Apply realism bounds
    // Even perfect fit doesn't guarantee 100% admission
    // Even poor fit has some minimal chance
    probability = Math.max(0.02, Math.min(0.95, probability));
    
    return probability;
  }

  /**
   * Calculate overall match score
   */
  static calculateOverallMatch(
    academicFit: number,
    preferenceFit: number,
    admissionProb: number,
    priorityFactors?: StudentProfile['preferences']['priorityFactors']
  ): number {
    
    const weights = priorityFactors || {
      academicFit: 0.4,
      locationFit: 0.2,
      careerFit: 0.2,
      admissionChance: 0.2
    };
    
    // preferenceFit encompasses location and career
    const preferenceWeight = weights.locationFit + weights.careerFit;
    
    const overallMatch = (
      academicFit * weights.academicFit +
      preferenceFit * preferenceWeight +
      admissionProb * weights.admissionChance
    );
    
    return Math.max(0, Math.min(1, overallMatch));
  }

  /**
   * Determine recommendation tier
   */
  static determineRecommendationTier(
    admissionProb: number,
    riskPreference: StudentProfile['preferences']['riskPreference']
  ): 'reach' | 'target' | 'safety' {
    
    const thresholds = {
      conservative: { safety: 0.70, target: 0.50 },
      moderate:     { safety: 0.65, target: 0.45 },
      aggressive:   { safety: 0.60, target: 0.35 }
    }[riskPreference];
    
    if (admissionProb >= thresholds.safety) {
      return 'safety';
    } else if (admissionProb >= thresholds.target) {
      return 'target';
    } else {
      return 'reach';
    }
  }

  /**
   * Generate reasoning for recommendation
   */
  static generateReasoning(
    profile: StudentProfile,
    program: StudyProgram,
    scores: {
      academicFit: number;
      preferenceFit: number;
      admissionProb: number;
    }
  ): {
    strengths: string[];
    concerns: string[];
    keyFactors: Array<{ factor: string; score: number; weight: number }>;
  } {
    
    const strengths: string[] = [];
    const concerns: string[] = [];
    
    // Academic assessment
    if (scores.academicFit >= 0.8) {
      strengths.push('Kemampuan akademik sangat sesuai dengan program ini');
    } else if (scores.academicFit >= 0.6) {
      strengths.push('Kemampuan akademik cukup untuk program ini');
    } else if (scores.academicFit < 0.5) {
      concerns.push('Kemampuan akademik perlu ditingkatkan untuk program ini');
    }
    
    // Preference match
    if (profile.preferences.preferredRumpun.includes(program.rumpun)) {
      strengths.push(`Sesuai dengan minat ${program.rumpun}`);
    }
    
    if (profile.preferences.preferredLocations.includes(program.location.city)) {
      strengths.push(`Lokasi di ${program.location.city} sesuai preferensi`);
    }
    
    // Admission probability
    if (scores.admissionProb >= 0.7) {
      strengths.push('Peluang diterima tinggi');
    } else if (scores.admissionProb < 0.4) {
      concerns.push('Kompetisi cukup ketat, perlu persiapan maksimal');
    }
    
    // Tuition
    if (profile.preferences.maxTuitionFee && program.tuitionFee) {
      if (program.tuitionFee > profile.preferences.maxTuitionFee) {
        const excess = program.tuitionFee - profile.preferences.maxTuitionFee;
        const excessPercent = (excess / profile.preferences.maxTuitionFee) * 100;
        concerns.push(`Biaya kuliah ${excessPercent.toFixed(0)}% lebih tinggi dari budget`);
      }
    }
    
    // Key factors breakdown
    const weights = profile.preferences.priorityFactors || {
      academicFit: 0.4,
      locationFit: 0.2,
      careerFit: 0.2,
      admissionChance: 0.2
    };
    
    const keyFactors = [
      {
        factor: 'Academic Fit',
        score: scores.academicFit,
        weight: weights.academicFit
      },
      {
        factor: 'Preference Match',
        score: scores.preferenceFit,
        weight: weights.locationFit + weights.careerFit
      },
      {
        factor: 'Admission Chance',
        score: scores.admissionProb,
        weight: weights.admissionChance
      }
    ];
    
    return { strengths, concerns, keyFactors };
  }
}
