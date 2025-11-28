// server/lib/irt/irtEngine.ts

import { IRTParameters, StudentResponse, AbilityEstimate } from './irtTypes';

/**
 * IRT 3-Parameter Logistic Model Engine
 * Enhanced version with comprehensive statistical methods
 */
export class IRTEngine {
  
  /**
   * Calculate probability of correct response using 3PL model
   * Formula: P(θ) = c + (1 - c) / (1 + e^(-a(θ - b)))
   */
  static calculateProbability(
    theta: number,
    params: IRTParameters
  ): number {
    const { difficulty, discrimination, guessing } = params;
    
    // Logistic function
    const exponent = -discrimination * (theta - difficulty);
    const logistic = 1 / (1 + Math.exp(exponent));
    
    // 3PL formula
    return guessing + (1 - guessing) * logistic;
  }

  /**
   * Calculate item information function
   * Measures how much information an item provides at theta level
   */
  static calculateInformation(
    theta: number,
    params: IRTParameters
  ): number {
    const { discrimination, guessing } = params;
    const P = this.calculateProbability(theta, params);
    const Q = 1 - P;
    
    // 3PL information function
    const Pstar = (P - guessing) / (1 - guessing);
    const QPstar = 1 - Pstar;
    
    const information = 
      (discrimination * discrimination * QPstar * Pstar * Pstar) / 
      (P * (1 - guessing) * (1 - guessing));
    
    return information;
  }

  /**
   * Estimate ability using Maximum Likelihood with Newton-Raphson
   * Enhanced from your existing implementation
   */
  static estimateAbility(
    responses: StudentResponse[],
    initialTheta: number = 0.0,
    options?: {
      maxIterations?: number;
      tolerance?: number;
      minTheta?: number;
      maxTheta?: number;
    }
  ): AbilityEstimate {
    
    const {
      maxIterations = 50,
      tolerance = 0.001,
      minTheta = -4,
      maxTheta = 4
    } = options || {};

    if (responses.length === 0) {
      return {
        theta: 0.0,
        standardError: 999,
        percentile: 50,
        reliability: 0,
        information: 0
      };
    }

    let theta = initialTheta;
    let converged = false;
    
    // Newton-Raphson iteration
    for (let iter = 0; iter < maxIterations; iter++) {
      let firstDerivative = 0;   // L'(θ)
      let secondDerivative = 0;   // L''(θ)
      
      for (const response of responses) {
        const { irtParams, isCorrect } = response;
        const { discrimination: a, difficulty: b, guessing: c } = irtParams;
        
        const P = this.calculateProbability(theta, irtParams);
        const Q = 1 - P;
        
        // Avoid numerical issues
        if (P <= 0.0001 || P >= 0.9999) continue;
        
        // P* = (P - c) / (1 - c)
        const Pstar = (P - c) / (1 - c);
        const QPstar = 1 - Pstar;
        
        // Weight function
        const W = (Pstar * Q) / (P * (1 - c));
        
        // First derivative
        const u = isCorrect ? 1 : 0;
        firstDerivative += a * (u - P) / (P * Q);
        
        // Second derivative (negative information)
        secondDerivative -= a * a * W;
      }
      
      // Check for numerical stability
      if (Math.abs(secondDerivative) < 0.0001) {
        console.warn('⚠️ IRT: Second derivative too small, stopping iteration');
        break;
      }
      
      // Newton-Raphson update
      const change = -firstDerivative / secondDerivative;
      theta = theta + change;
      
      // Constrain theta to reasonable bounds
      theta = Math.max(minTheta, Math.min(maxTheta, theta));
      
      // Check convergence
      if (Math.abs(change) < tolerance) {
        converged = true;
        break;
      }
    }
    
    if (!converged) {
      console.warn('⚠️ IRT: Maximum iterations reached without convergence');
    }
    
    // Calculate total information
    let totalInformation = 0;
    for (const response of responses) {
      totalInformation += this.calculateInformation(theta, response.irtParams);
    }
    
    // Standard error
    const standardError = totalInformation > 0 
      ? 1 / Math.sqrt(totalInformation) 
      : 999;
    
    // Reliability: 1 - SE²
    const reliability = totalInformation > 0
      ? Math.max(0, Math.min(1, 1 - (standardError * standardError)))
      : 0;
    
    // Percentile
    const percentile = this.thetaToPercentile(theta);
    
    return {
      theta: Math.round(theta * 1000) / 1000,
      standardError: Math.round(standardError * 1000) / 1000,
      percentile,
      reliability: Math.round(reliability * 1000) / 1000,
      information: Math.round(totalInformation * 100) / 100
    };
  }

  /**
   * Convert theta to percentile using standard normal CDF
   */
  static thetaToPercentile(theta: number): number {
    // Abramowitz & Stegun approximation
    const x = theta;
    const sign = x >= 0 ? 1 : -1;
    const absX = Math.abs(x);
    
    const t = 1 / (1 + 0.2316419 * absX);
    const d = 0.3989423 * Math.exp(-absX * absX / 2);
    
    const probability = d * t * (
      0.3193815 +
      t * (-0.3565638 +
      t * (1.781478 +
      t * (-1.821256 +
      t * 1.330274)))
    );
    
    const cdf = sign >= 0 ? 1 - probability : probability;
    const percentile = Math.round(cdf * 100);
    
    return Math.max(0, Math.min(100, percentile));
  }

  /**
   * Convert percentile to theta (inverse CDF)
   */
  static percentileToTheta(percentile: number): number {
    const p = Math.max(0.01, Math.min(99.99, percentile)) / 100;
    
    // Beasley-Springer-Moro approximation
    const y = p < 0.5 ? p : 1 - p;
    const r = Math.sqrt(-Math.log(y));
    
    let theta: number;
    
    if (r <= 5) {
      const a = [-39.6968302866538, 220.946098424521, -275.928510446969,
                 138.357751867269, -30.6647980661472, 2.50662827745924];
      const b = [-54.4760987982241, 161.585836858041, -155.698979859887,
                 66.8013118877197, -13.2806815528857, 1];
      
      const numerator = a[0] + r * (a[1] + r * (a[2] + r * (a[3] + r * (a[4] + r * a[5]))));
      const denominator = b[0] + r * (b[1] + r * (b[2] + r * (b[3] + r * (b[4] + r * b[5]))));
      theta = numerator / denominator;
    } else {
      const c = [-0.007784894002430293, -0.32239645804147, -2.400758277161838,
                 -2.549732539343734, 4.374664141464968, 2.938163982698783];
      const d = [0.007784695709041462, 0.32246712907004, 2.445134137142996,
                 3.754408661907416, 1];
      
      const numerator = c[0] + r * (c[1] + r * (c[2] + r * (c[3] + r * (c[4] + r * c[5]))));
      const denominator = d[0] + r * (d[1] + r * (d[2] + r * (d[3] + r * d[4])));
      theta = numerator / denominator;
    }
    
    return p < 0.5 ? -theta : theta;
  }

  /**
   * Convert theta to 0-100 scale
   */
  static thetaToScore(theta: number, min: number = 0, max: number = 100): number {
    // Map theta (-3 to +3) to score range
    const normalized = (theta + 3) / 6; // 0-1
    const score = min + normalized * (max - min);
    return Math.max(min, Math.min(max, Math.round(score)));
  }

  /**
   * Convert raw score to theta (rough approximation for initial estimate)
   */
  static rawScoreToTheta(rawScore: number, maxScore: number): number {
    if (maxScore === 0) return 0;
    const proportion = Math.max(0.001, Math.min(0.999, rawScore / maxScore));
    return this.percentileToTheta(proportion * 100);
  }

  /**
   * Calculate expected score given theta
   */
  static calculateExpectedScore(
    theta: number,
    items: IRTParameters[]
  ): number {
    return items.reduce((sum, item) => 
      sum + this.calculateProbability(theta, item),
      0
    );
  }

  /**
   * Calculate test information at theta level
   */
  static calculateTestInformation(
    theta: number,
    items: IRTParameters[]
  ): number {
    return items.reduce((sum, item) => 
      sum + this.calculateInformation(theta, item),
      0
    );
  }

  /**
   * Classify ability level
   */
  static classifyAbilityLevel(theta: number): {
    level: string;
    description: string;
    color: string;
  } {
    if (theta >= 2.0) {
      return {
        level: 'Sangat Tinggi',
        description: 'Kemampuan jauh di atas rata-rata (Top 2%)',
        color: '#10B981'
      };
    } else if (theta >= 1.0) {
      return {
        level: 'Tinggi',
        description: 'Kemampuan di atas rata-rata (Top 16%)',
        color: '#3B82F6'
      };
    } else if (theta >= 0.0) {
      return {
        level: 'Sedang-Tinggi',
        description: 'Kemampuan sedikit di atas rata-rata',
        color: '#8B5CF6'
      };
    } else if (theta >= -1.0) {
      return {
        level: 'Sedang',
        description: 'Kemampuan rata-rata',
        color: '#F59E0B'
      };
    } else if (theta >= -2.0) {
      return {
        level: 'Rendah',
        description: 'Kemampuan di bawah rata-rata',
        color: '#EF4444'
      };
    } else {
      return {
        level: 'Sangat Rendah',
        description: 'Kemampuan jauh di bawah rata-rata',
        color: '#991B1B'
      };
    }
  }

  /**
   * Validate IRT parameters
   */
  static validateParameters(params: IRTParameters): boolean {
    const { difficulty, discrimination, guessing } = params;
    
    return (
      typeof difficulty === 'number' &&
      typeof discrimination === 'number' &&
      typeof guessing === 'number' &&
      !isNaN(difficulty) &&
      !isNaN(discrimination) &&
      !isNaN(guessing) &&
      discrimination > 0 &&
      discrimination <= 3 &&
      guessing >= 0 &&
      guessing <= 0.5 &&
      difficulty >= -4 &&
      difficulty <= 4
    );
  }
}
