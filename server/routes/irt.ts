// server/routes/irt.ts
// ✅ FIXED: Removed circular import, added better error handling

import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { IRTBatchProcessor } from '../lib/irt';
import type { CategoryResponses } from '../lib/irt/irtTypes';

const router = express.Router();

// ✅ Configuration
const QUESTIONS_TABLE = process.env.QUESTIONS_TABLE || 'soal';

/**
 * POST /irt/score
 * Calculate IRT score for a completed session
 */
router.post('/irt/score', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['sessionId', 'userId']
      });
    }

    console.log('🔄 Calculating IRT score for session:', sessionId);

    // 1. Fetch session data
    const { data: session, error: sessionError } = await supabase
      .from('tryout_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('❌ Session not found:', sessionError);
      return res.status(404).json({ error: 'Session not found' });
    }

    // 2. Fetch questions with answers
    const { data: questions, error: questionsError } = await supabase
      .from(QUESTIONS_TABLE)
      .select(`
        id,
        kategori_id,
        jawaban_benar,
        question_irt_params (
          difficulty,
          discrimination,
          guessing
        )
      `)
      .eq('tryout_id', session.tryout_id);

    if (questionsError || !questions) {
      console.error('❌ Failed to fetch questions:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    console.log(`📊 Fetched ${questions.length} questions`);

    // 3. Get user answers
    const answers = session.answers || {};

    // 4. Group by kategori and prepare IRT data
    const kategoriMap = new Map<string, CategoryResponses>();

    questions.forEach((q: any) => {
      const kategoriId = q.kategori_id;
      const kategoriName = getKategoriName(kategoriId);
      
      if (!kategoriMap.has(kategoriId)) {
        kategoriMap.set(kategoriId, {
          kategoriId,
          kategoriName,
          responses: []
        });
      }

      // ✅ FIXED: Better handling of missing IRT params
      let irtParams = q.question_irt_params;
      if (!irtParams) {
        console.warn(`⚠️ Missing IRT params for question ${q.id}, using defaults`);
        irtParams = {
          difficulty: 0.0,
          discrimination: 1.0,
          guessing: 0.25
        };
      }

      kategoriMap.get(kategoriId)!.responses.push({
        questionId: q.id,
        isCorrect: answers[q.id] === q.jawaban_benar,
        kategoriId,
        irtParams: {
          difficulty: irtParams.difficulty,
          discrimination: irtParams.discrimination,
          guessing: irtParams.guessing
        }
      });
    });

    const categoryResponses = Array.from(kategoriMap.values());

    // 5. Calculate IRT
    console.log('🧮 Running IRT calculation...');
    const irtResult = IRTBatchProcessor.processBatch(categoryResponses);

    // 6. Save to database
    console.log('💾 Saving IRT report...');
    const { error: saveError } = await supabase
      .from('irt_score_reports')
      .insert({
        user_id: userId,
        session_id: sessionId,
        tryout_id: session.tryout_id,
        kategori_scores: irtResult.categoryResults,
        overall_theta: irtResult.overallAbility.theta,
        overall_percentile: irtResult.overallAbility.percentile,
        overall_reliability: irtResult.overallAbility.reliability,
        raw_score: irtResult.testStatistics.totalCorrect,
        max_score: irtResult.testStatistics.totalQuestions,
        percentage: (irtResult.testStatistics.totalCorrect / irtResult.testStatistics.totalQuestions) * 100,
        performance_level: irtResult.performanceLevel.level,
        insights: irtResult.insights
      });

    if (saveError) {
      console.error('❌ Error saving IRT report:', saveError);
      // Continue even if save fails
    }

    // 7. Update student abilities
    console.log('📈 Updating student abilities...');
    for (const cat of irtResult.categoryResults) {
      const { error: abilityError } = await supabase.rpc('update_student_ability', {
        p_user_id: userId,
        p_kategori_id: cat.kategoriId,
        p_theta: cat.ability.theta,
        p_standard_error: cat.ability.standardError,
        p_is_correct: cat.correctCount > 0,
        p_tryout_id: session.tryout_id,
        p_session_id: sessionId
      });

      if (abilityError) {
        console.warn(`⚠️ Failed to update ability for ${cat.kategoriId}:`, abilityError);
      }
    }

    console.log('✅ IRT calculation completed successfully');

    res.json({
      success: true,
      report: irtResult
    });

  } catch (error: any) {
    console.error('❌ IRT calculation failed:', error);
    res.status(500).json({
      error: 'IRT calculation failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /irt/report/:sessionId
 * Get saved IRT report
 */
router.get('/irt/report/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    console.log('🔄 Fetching IRT report for session:', sessionId);

    const { data, error } = await supabase
      .from('irt_score_reports')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !data) {
      console.warn('⚠️ Report not found for session:', sessionId);
      return res.status(404).json({ error: 'Report not found' });
    }

    // Transform to match frontend format
    const report = {
      sessionId: data.session_id,
      categoryResults: data.kategori_scores,
      overallAbility: {
        theta: data.overall_theta,
        percentile: data.overall_percentile,
        reliability: data.overall_reliability,
        standardError: 0,
        information: 0
      },
      overallScore: Math.round((data.percentage / 100) * 1000),
      testStatistics: {
        totalQuestions: data.max_score,
        totalCorrect: data.raw_score,
        totalIncorrect: data.max_score - data.raw_score,
        totalUnanswered: 0,
        averageTheta: data.overall_theta,
        thetaRange: { min: -3, max: 3 },
        testReliability: data.overall_reliability
      },
      insights: data.insights,
      performanceLevel: {
        level: data.performance_level,
        description: '',
        color: '#3B82F6'
      }
    };

    console.log('✅ Report fetched successfully');

    res.json({ success: true, report });

  } catch (error: any) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({
      error: 'Failed to fetch report',
      message: error.message
    });
  }
});

/**
 * GET /irt/ability/:userId
 * Get student's current abilities
 */
router.get('/irt/ability/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('student_abilities')
      .select('*')
      .eq('user_id', userId)
      .order('last_updated_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      abilities: data || []
    });

  } catch (error: any) {
    console.error('❌ Error fetching abilities:', error);
    res.status(500).json({
      error: 'Failed to fetch abilities',
      message: error.message
    });
  }
});

/**
 * POST /irt/compare
 * Compare two tryout attempts
 */
router.post('/irt/compare', async (req: Request, res: Response) => {
  try {
    const { sessionId1, sessionId2 } = req.body;

    if (!sessionId1 || !sessionId2) {
      return res.status(400).json({ 
        error: 'Both sessionId1 and sessionId2 are required'
      });
    }

    // Fetch both reports
    const { data: report1 } = await supabase
      .from('irt_score_reports')
      .select('*')
      .eq('session_id', sessionId1)
      .single();

    const { data: report2 } = await supabase
      .from('irt_score_reports')
      .select('*')
      .eq('session_id', sessionId2)
      .single();

    if (!report1 || !report2) {
      return res.status(404).json({ error: 'One or both reports not found' });
    }

    // Calculate improvements
    const comparison = {
      session1: {
        sessionId: report1.session_id,
        theta: report1.overall_theta,
        percentile: report1.overall_percentile,
        score: report1.raw_score
      },
      session2: {
        sessionId: report2.session_id,
        theta: report2.overall_theta,
        percentile: report2.overall_percentile,
        score: report2.raw_score
      },
      improvement: {
        theta: report2.overall_theta - report1.overall_theta,
        percentile: report2.overall_percentile - report1.overall_percentile,
        score: report2.raw_score - report1.raw_score
      }
    };

    res.json({
      success: true,
      comparison
    });

  } catch (error: any) {
    console.error('❌ Error comparing attempts:', error);
    res.status(500).json({
      error: 'Failed to compare attempts',
      message: error.message
    });
  }
});

/**
 * POST /irt/test
 * Test endpoint with sample data (no database)
 */
router.post('/irt/test', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Running IRT test with sample data...');

    const testData: CategoryResponses[] = [
      {
        kategoriId: 'kpu',
        kategoriName: 'Kemampuan Penalaran Umum',
        responses: [
          { questionId: 'q1', isCorrect: true, kategoriId: 'kpu', irtParams: { difficulty: 0.5, discrimination: 1.2, guessing: 0.25 } },
          { questionId: 'q2', isCorrect: true, kategoriId: 'kpu', irtParams: { difficulty: 0.8, discrimination: 1.5, guessing: 0.25 } },
          { questionId: 'q3', isCorrect: false, kategoriId: 'kpu', irtParams: { difficulty: 1.2, discrimination: 1.3, guessing: 0.25 } },
          { questionId: 'q4', isCorrect: true, kategoriId: 'kpu', irtParams: { difficulty: -0.2, discrimination: 1.1, guessing: 0.25 } }
        ]
      },
      {
        kategoriId: 'pm',
        kategoriName: 'Penalaran Matematika',
        responses: [
          { questionId: 'q5', isCorrect: true, kategoriId: 'pm', irtParams: { difficulty: 0.3, discrimination: 1.1, guessing: 0.25 } },
          { questionId: 'q6', isCorrect: false, kategoriId: 'pm', irtParams: { difficulty: 1.5, discrimination: 1.4, guessing: 0.25 } },
          { questionId: 'q7', isCorrect: true, kategoriId: 'pm', irtParams: { difficulty: 0.1, discrimination: 1.2, guessing: 0.25 } }
        ]
      }
    ];

    const result = IRTBatchProcessor.processBatch(testData);

    res.json({
      success: true,
      message: 'IRT test successful',
      result: {
        overallAbility: result.overallAbility,
        overallScore: result.overallScore,
        performanceLevel: result.performanceLevel,
        categoryResults: result.categoryResults.map(cat => ({
          kategoriId: cat.kategoriId,
          kategoriName: cat.kategoriName,
          theta: cat.ability.theta,
          percentile: cat.ability.percentile,
          score: `${cat.correctCount}/${cat.maxScore}`,
          percentage: cat.percentage
        })),
        insights: result.insights
      }
    });

  } catch (error: any) {
    console.error('❌ IRT test failed:', error);
    res.status(500).json({
      error: 'IRT test failed',
      message: error.message
    });
  }
});

// Helper function
function getKategoriName(kategoriId: string): string {
  const names: Record<string, string> = {
    'kpu': 'Kemampuan Penalaran Umum',
    'ppu': 'Pengetahuan dan Pemahaman Umum',
    'pk': 'Pemahaman Kuantitatif',
    'pm': 'Penalaran Matematika',
    'lit-id': 'Literasi Bahasa Indonesia',
    'lit-en': 'Literasi Bahasa Inggris',
    'kmbm': 'Kemampuan Memahami Bacaan dan Menulis'
  };
  return names[kategoriId] || kategoriId;
}

export default router;
