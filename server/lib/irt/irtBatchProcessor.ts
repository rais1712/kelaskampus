// server/lib/irt/irtBatchProcessor.ts

import { IRTEngine } from './irtEngine';
import {
  CategoryResponses,
  BatchIRTResult,
  CategoryResult,
  StudentResponse
} from './irtTypes';

/**
 * Process IRT scoring for multiple categories in batch
 */
export class IRTBatchProcessor {
  
  /**
   * Process multiple categories and generate comprehensive report
   */
  static processBatch(
    categorizedResponses: CategoryResponses[]
  ): BatchIRTResult {
    
    console.log('🔄 Processing IRT batch for', categorizedResponses.length, 'categories');
    
    const categoryResults: CategoryResult[] = [];
    const allThetas: number[] = [];
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnanswered = 0;
    
    // Process each category
    for (const category of categorizedResponses) {
      const { kategoriId, kategoriName, responses, priorTheta } = category;
      
      if (responses.length === 0) {
        console.warn(`⚠️ No responses for category: ${kategoriId}`);
        continue;
      }
      
      // Validate IRT parameters
      const validResponses = responses.filter(r => 
        IRTEngine.validateParameters(r.irtParams)
      );
      
      if (validResponses.length < responses.length * 0.5) {
        console.warn(
          `⚠️ Category ${kategoriId}: Insufficient valid IRT parameters (${validResponses.length}/${responses.length})`
        );
      }
      
      // Use validated responses or fallback to all
      const processResponses = validResponses.length >= 3 ? validResponses : responses;
      
      // Estimate ability
      const ability = IRTEngine.estimateAbility(
        processResponses,
        priorTheta || 0.0
      );
      
      // Calculate statistics
      const correctCount = responses.filter(r => r.isCorrect).length;
      const incorrectCount = responses.filter(r => !r.isCorrect).length;
      const unansweredCount = responses.length - correctCount - incorrectCount;
      const percentage = (correctCount / responses.length) * 100;
      
      categoryResults.push({
        kategoriId,
        kategoriName,
        ability,
        rawScore: correctCount,
        maxScore: responses.length,
        percentage: Math.round(percentage * 10) / 10,
        correctCount,
        incorrectCount,
        unansweredCount
      });
      
      allThetas.push(ability.theta);
      totalQuestions += responses.length;
      totalCorrect += correctCount;
      totalIncorrect += incorrectCount;
      totalUnanswered += unansweredCount;
    }
    
    // Calculate overall ability (weighted by question count)
    const totalWeight = categoryResults.reduce(
      (sum, cat) => sum + cat.maxScore,
      0
    );
    
    const weightedTheta = categoryResults.reduce(
      (sum, cat) => sum + (cat.ability.theta * cat.maxScore),
      0
    ) / totalWeight;
    
    const weightedInformation = categoryResults.reduce(
      (sum, cat) => sum + (cat.ability.information * cat.maxScore),
      0
    ) / totalWeight;
    
    const averageReliability = categoryResults.reduce(
      (sum, cat) => sum + cat.ability.reliability,
      0
    ) / categoryResults.length;
    
    const overallPercentile = IRTEngine.thetaToPercentile(weightedTheta);
    const overallSE = weightedInformation > 0 ? 1 / Math.sqrt(weightedInformation) : 999;
    
    const overallAbility = {
      theta: Math.round(weightedTheta * 1000) / 1000,
      standardError: Math.round(overallSE * 1000) / 1000,
      percentile: overallPercentile,
      reliability: Math.round(averageReliability * 1000) / 1000,
      information: Math.round(weightedInformation * 100) / 100
    };
    
    // Convert to 0-100 score
    const overallScore = IRTEngine.thetaToScore(weightedTheta);
    
    // Generate insights
    const insights = this.generateInsights(categoryResults, overallAbility);
    
    // Performance level
    const performanceLevel = IRTEngine.classifyAbilityLevel(weightedTheta);
    
    console.log('✅ IRT batch processing complete:', {
      categories: categoryResults.length,
      overallTheta: weightedTheta,
      overallPercentile,
      overallScore
    });
    
    return {
      categoryResults,
      overallAbility,
      overallScore,
      testStatistics: {
        totalQuestions,
        totalCorrect,
        totalIncorrect,
        totalUnanswered,
        averageTheta: weightedTheta,
        thetaRange: {
          min: Math.min(...allThetas),
          max: Math.max(...allThetas)
        },
        testReliability: averageReliability
      },
      insights,
      performanceLevel
    };
  }

  /**
   * Generate actionable insights from results
   */
  static generateInsights(
    categoryResults: CategoryResult[],
    overallAbility: { theta: number; reliability: number }
  ): {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    
    // Sort by theta
    const sorted = [...categoryResults].sort((a, b) => b.ability.theta - a.ability.theta);
    
    // Identify strengths (top 2 categories with theta > 0.5)
    const topCategories = sorted.slice(0, 2);
    for (const cat of topCategories) {
      if (cat.ability.theta > 0.5) {
        strengths.push(
          `${cat.kategoriName}: Persentil ${cat.ability.percentile} (${cat.percentage.toFixed(1)}% benar)`
        );
      }
    }
    
    // Identify weaknesses (bottom 2 categories with theta < -0.5)
    const bottomCategories = sorted.slice(-2);
    for (const cat of bottomCategories) {
      if (cat.ability.theta < -0.5) {
        weaknesses.push(
          `${cat.kategoriName}: Persentil ${cat.ability.percentile} (${cat.percentage.toFixed(1)}% benar)`
        );
        
        recommendations.push(
          `Tingkatkan latihan pada ${cat.kategoriName} dengan fokus pada konsep dasar`
        );
      }
    }
    
    // Overall recommendations
    if (overallAbility.theta < 0) {
      recommendations.push(
        'Perbanyak latihan soal dengan tingkat kesulitan sedang untuk membangun fondasi'
      );
    } else if (overallAbility.theta > 1.5) {
      recommendations.push(
        'Tantang diri dengan soal-soal tingkat lanjut untuk mempertahankan kemampuan'
      );
    }
    
    if (overallAbility.reliability < 0.7) {
      recommendations.push(
        'Kerjakan lebih banyak tryout untuk mendapatkan estimasi kemampuan yang lebih akurat'
      );
    }
    
    // Category-specific recommendations
    const variance = this.calculateThetaVariance(categoryResults.map(c => c.ability.theta));
    if (variance > 1.5) {
      recommendations.push(
        'Kemampuan kamu tidak merata antar kategori. Fokus pada kategori yang lemah untuk hasil optimal'
      );
    }
    
    return { strengths, weaknesses, recommendations };
  }

  /**
   * Calculate variance of theta values
   */
  private static calculateThetaVariance(thetas: number[]): number {
    if (thetas.length === 0) return 0;
    
    const mean = thetas.reduce((a, b) => a + b, 0) / thetas.length;
    const squaredDiffs = thetas.map(t => Math.pow(t - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / thetas.length;
  }

  /**
   * Compare two tryout attempts
   */
  static compareAttempts(
    attempt1: BatchIRTResult,
    attempt2: BatchIRTResult
  ): {
    overallImprovement: number;
    categoryImprovements: {
      kategoriId: string;
      improvement: number;
      previousTheta: number;
      currentTheta: number;
    }[];
    summary: string;
  } {
    
    const overallImprovement = attempt2.overallAbility.theta - attempt1.overallAbility.theta;
    
    const categoryImprovements = attempt2.categoryResults.map(cat2 => {
      const cat1 = attempt1.categoryResults.find(c => c.kategoriId === cat2.kategoriId);
      
      return {
        kategoriId: cat2.kategoriId,
        improvement: cat1 ? cat2.ability.theta - cat1.ability.theta : 0,
        previousTheta: cat1?.ability.theta || 0,
        currentTheta: cat2.ability.theta
      };
    });
    
    let summary = '';
    if (overallImprovement > 0.3) {
      summary = 'Peningkatan signifikan! Pertahankan momentum belajar';
    } else if (overallImprovement > 0) {
      summary = 'Ada peningkatan. Terus tingkatkan latihan';
    } else if (overallImprovement > -0.3) {
      summary = 'Kemampuan relatif stabil. Fokus pada area yang lemah';
    } else {
      summary = 'Perlu peningkatan fokus dalam belajar';
    }
    
    return {
      overallImprovement,
      categoryImprovements,
      summary
    };
  }
}
