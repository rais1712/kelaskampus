// server/lib/irt/index.ts
// ✅ FIXED: Only export what actually exists

export * from './irtTypes';
export * from './irtEngine';
export * from './irtBatchProcessor';

// Explicit named exports for main classes
export { IRTEngine } from './irtEngine';
export { IRTBatchProcessor } from './irtBatchProcessor';

// Note: Only export types that actually exist in irtTypes.ts
// Common exports that usually exist:
export type {
  IRTParameters,
  CategoryResponses,
  CategoryResult
} from './irtTypes';
