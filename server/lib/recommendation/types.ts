// server/lib/recommendation/types.ts

/**
 * Type definitions for University Recommendation System
 */

export interface StudentProfile {
  userId: string;
  abilities: Record<string, number>; // kategoriId -> theta
  preferences: StudentPreferences;
  demographics?: {
    province?: string;
    city?: string;
    schoolType?: string;
  };
}

export interface StudentPreferences {
  preferredRumpun: ('Saintek' | 'Soshum' | 'Campuran')[];
  preferredLocations: string[]; // Cities or provinces
  preferredUniversityTypes: ('PTN' | 'PTS' | 'Kedinasan')[];
  maxTuitionFee?: number; // in IDR, null = no limit
  careerInterests: string[];
  riskPreference: 'conservative' | 'moderate' | 'aggressive';
  priorityFactors?: {
    academicFit: number;      // 0-1, default 0.4
    locationFit: number;      // 0-1, default 0.2
    careerFit: number;        // 0-1, default 0.2
    admissionChance: number;  // 0-1, default 0.2
  };
}

export interface University {
  id: string;
  name: string;
  slug: string;
  akreditasi: 'A' | 'B' | 'C' | 'Unggul';
  type: 'PTN' | 'PTS' | 'Kedinasan';
  location: {
    province: string;
    city: string;
  };
  website?: string;
  logoUrl?: string;
  description?: string;
}

export interface StudyProgram {
  id: string;
  universityId: string;
  universityName: string;
  name: string;
  faculty?: string;
  rumpun: 'Saintek' | 'Soshum' | 'Campuran';
  akreditasi: 'A' | 'B' | 'C' | 'Unggul';
  
  // Location (inherited from university)
  location: {
    province: string;
    city: string;
  };
  universityType: 'PTN' | 'PTS' | 'Kedinasan';
  
  // Passing grade requirements (in theta scale)
  passingGrades: {
    [kategoriId: string]: number; // minimum theta required
  };
  
  // Historical data (most recent year)
  historicalData?: {
    year: number;
    totalApplicants: number;
    totalAccepted: number;
    acceptanceRate: number; // 0-1
    avgScore?: number;
    minScore?: number;
    maxScore?: number;
  };
  
  // Additional info
  tuitionFee?: number;
  careerProspects?: string[];
  description?: string;
}

export interface RecommendationResult {
  programId: string;
  program: StudyProgram;
  scores: {
    overallMatch: number;        // 0-1, final weighted score
    academicFit: number;         // 0-1
    preferenceFit: number;       // 0-1
    admissionProbability: number; // 0-1
  };
  tier: 'reach' | 'target' | 'safety';
  reasoning: {
    strengths: string[];
    concerns: string[];
    keyFactors: {
      factor: string;
      score: number;
      weight: number;
    }[];
  };
  rank: number;
  estimatedCompetitors?: number;
}

export interface RecommendationOptions {
  maxRecommendations?: number;
  minMatchScore?: number;
  diversifyByUniversity?: boolean;
  includeStretch?: boolean;
}
