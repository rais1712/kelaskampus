// server/routes/recommendations.ts
// ✅ COMPLETE & FIXED VERSION

import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { RecommendationEngine } from '../lib/recommendation';

const router = express.Router();

/**
 * POST /recommendations/generate
 * Generate fresh recommendations for a user
 */
router.post('/recommendations/generate', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('🔄 Generating recommendations for user:', userId);

    // 1. Get student abilities
    const { data: abilities, error: abilitiesError } = await supabase
      .from('student_abilities')
      .select('*')
      .eq('user_id', userId);

    if (abilitiesError || !abilities || abilities.length === 0) {
      return res.status(400).json({ 
        error: 'No ability data found',
        message: 'User must complete at least one tryout first'
      });
    }

    console.log(`📊 Found ${abilities.length} ability records`);

    // 2. Transform abilities to theta object
    const thetaScores: Record<string, number> = {};
    abilities.forEach((ability: any) => {
      thetaScores[ability.kategori_id] = ability.theta;
    });

    console.log('📈 Theta scores:', thetaScores);

    // 3. Get student preferences (optional)
    const { data: preferences } = await supabase
      .from('student_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (preferences) {
      console.log('🎯 Using student preferences');
    } else {
      console.log('ℹ️ No preferences found, using defaults');
    }

    // 4. Get passing grade requirements
    const { data: passingGrades, error: gradesError } = await supabase
      .from('passing_grade_requirements')
      .select('*')
      .eq('is_active', true);

    if (gradesError || !passingGrades) {
      console.error('❌ Failed to fetch passing grades:', gradesError);
      return res.status(500).json({ error: 'Failed to fetch passing grades' });
    }

    console.log(`📚 Found ${passingGrades.length} programs`);

    // 5. Transform to StudyProgram format (exact match with types.ts)
    const programs = passingGrades.map((pg: any) => ({
      id: `${pg.kampus_name}_${pg.prodi_name}`,
      name: pg.prodi_name,
      universityId: pg.kampus_id?.toString() || pg.kampus_name,
      universityName: pg.kampus_name,
      faculty: pg.faculty || '',
      rumpun: pg.rumpun,
      universityType: pg.university_type,
      location: {
        province: pg.location_province || '',
        city: pg.location_city || ''
      },
      akreditasi: pg.akreditasi || 'B',
      passingGrades: {
        kpu: pg.min_theta_kpu || 0,
        ppu: pg.min_theta_ppu || 0,
        pk: pg.min_theta_pk || 0,
        pm: pg.min_theta_pm || 0,
        'lit-id': pg.min_theta_lit_id || 0,
        'lit-en': pg.min_theta_lit_en || 0,
        kmbm: pg.min_theta_kmbm || 0,
        overall: pg.min_overall_theta || 0
      },
      historicalData: {
        year: pg.year || 2024,
        totalApplicants: pg.total_applicants || 1000,
        totalAccepted: pg.total_accepted || 100,
        acceptanceRate: pg.acceptance_rate || 0.1,
        avgScore: pg.min_overall_theta || 0,
        minScore: pg.min_overall_theta || 0,
        maxScore: undefined
      }
    }));

    // 6. Create student profile
    const studentProfile = {
      userId,
      abilities: thetaScores,
      preferences: preferences ? {
        preferredRumpun: preferences.preferred_rumpun || [],
        preferredLocations: preferences.preferred_locations || [],
        preferredUniversityTypes: preferences.preferred_university_types || ['PTN', 'PTS'],
        maxTuitionFee: preferences.max_tuition_fee_idr,
        careerInterests: preferences.career_interests || [],
        riskPreference: preferences.risk_preference || 'moderate',
        priorityFactors: preferences.priority_factors || {
          academicFit: 0.4,
          locationFit: 0.2,
          careerFit: 0.2,
          admissionChance: 0.2
        }
      } : undefined
    };

    // 7. Generate recommendations
    console.log('🧠 Running recommendation algorithm...');
    const recommendations = await RecommendationEngine.generateRecommendations(
      studentProfile,
      programs
    );

    console.log(`🎯 Generated ${recommendations.length} recommendations`);

    // 8. Clear old recommendations
    await supabase
      .from('university_recommendations')
      .delete()
      .eq('user_id', userId);

    // 9. Save new recommendations
    if (recommendations.length > 0) {
      const recsToSave = recommendations.map((rec, index) => ({
        user_id: userId,
        kampus_id: rec.program.universityId ? parseInt(rec.program.universityId) : null,
        kampus_name: rec.program.universityName,
        prodi_id: rec.program.id ? parseInt(rec.program.id.split('_')[1]) : null,
        prodi_name: rec.program.name,
        match_score: rec.scores.overallMatch,
        academic_fit_score: rec.scores.academicFit,
        preference_fit_score: rec.scores.preferenceFit || 0,
        admission_probability: rec.scores.admissionProbability,
        recommendation_tier: rec.tier,
        match_reasons: rec.reasoning,
        based_on_theta: thetaScores,
        rank: index + 1,
        is_active: true
      }));

      const { error: saveError } = await supabase
        .from('university_recommendations')
        .insert(recsToSave);

      if (saveError) {
        console.error('❌ Error saving recommendations:', saveError);
      } else {
        console.log('✅ Recommendations saved successfully');
      }
    }

    res.json({
      success: true,
      count: recommendations.length,
      recommendations
    });

  } catch (error: any) {
    console.error('❌ Recommendation generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /recommendations/:userId
 * Get saved recommendations
 */
router.get('/recommendations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    console.log('🔄 Fetching recommendations for user:', userId);

    const { data, error } = await supabase
      .from('university_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('rank', { ascending: true });

    if (error) throw error;

    const recommendations = (data || []).map((rec: any) => ({
      rank: rec.rank,
      program: {
        id: rec.prodi_id?.toString() || rec.prodi_name,
        name: rec.prodi_name,
        universityId: rec.kampus_id?.toString() || '',
        universityName: rec.kampus_name,
        faculty: '',
        rumpun: '',
        universityType: '',
        location: {
          province: '',
          city: ''
        },
        akreditasi: '',
        passingGrades: {},
        historicalData: {}
      },
      scores: {
        overallMatch: rec.match_score,
        academicFit: rec.academic_fit_score,
        preferenceFit: rec.preference_fit_score,
        admissionProbability: rec.admission_probability
      },
      tier: rec.recommendation_tier,
      reasoning: rec.match_reasons
    }));

    console.log(`✅ Fetched ${recommendations.length} recommendations`);

    res.json({
      success: true,
      recommendations
    });

  } catch (error: any) {
    console.error('❌ Error fetching recommendations:', error);
    res.status(500).json({
      error: 'Failed to fetch recommendations',
      message: error.message
    });
  }
});

export default router;
