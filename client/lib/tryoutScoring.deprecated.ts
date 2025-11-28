// client/lib/tryoutScoring.ts
// ⚠️ DEPRECATED: This file is kept for backward compatibility only
// ✅ NEW: All IRT calculations now done server-side via API
// 
// To migrate:
// 1. Replace calculateIRTScore() calls with api.calculateIRTScore()
// 2. Results will come from server with enhanced IRT features
//
// Example migration:
// OLD: const result = calculateIRTScore(questions, answers);
// NEW: const { report } = await api.calculateIRTScore(sessionId, userId);

import { api } from './api';

/**
 * @deprecated Use api.calculateIRTScore() instead
 * Kept for backward compatibility during migration
 */
export function calculateIRTScore(
  questions: any[],
  userAnswers: Record<string, string>
): any {
  console.warn('⚠️ DEPRECATED: calculateIRTScore() is deprecated. Use api.calculateIRTScore() instead.');
  
  // Fallback to simple calculation
  let correct = 0;
  questions.forEach(q => {
    if (userAnswers[q.id] === q.jawaban_benar) {
      correct++;
    }
  });

  const percentage = (correct / questions.length) * 100;

  return {
    success: true,
    method: 'simple',
    finalScore: Math.round(percentage),
    statistics: {
      correct,
      wrong: questions.length - correct,
      unanswered: 0,
      totalQuestions: questions.length,
      accuracy: percentage
    },
    performanceLevel: percentage >= 70 ? 'Baik' : 'Cukup'
  };
}

/**
 * Helper function to migrate to server-side IRT
 */
export async function migrateToServerIRT(
  sessionId: string,
  userId: string
): Promise<any> {
  console.log('🔄 Migrating to server-side IRT calculation...');
  
  try {
    const { report } = await api.calculateIRTScore(sessionId, userId);
    console.log('✅ Server-side IRT calculation successful');
    return report;
  } catch (error) {
    console.error('❌ Server-side IRT failed, using fallback:', error);
    throw error;
  }
}
