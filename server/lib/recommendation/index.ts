// server/lib/recommendation/index.ts
// ✅ FIXED: Only export what actually exists

export * from './types';
export * from './matchingAlgorithm';
export * from './recommendationEngine';

// Explicit named exports
export { RecommendationEngine } from './recommendationEngine';
export { MatchingAlgorithm } from './matchingAlgorithm';

// Export only types that exist in types.ts
export type {
  StudentProfile,
  StudentPreferences,
  StudyProgram,
  RecommendationResult
} from './types';
