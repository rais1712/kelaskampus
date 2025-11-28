// server/routes/preferences.ts
// ✅ This file is already correct - no changes needed

import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

/**
 * GET /student-preferences/:userId
 */
router.get('/student-preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('student_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const defaultPreferences = {
      preferred_rumpun: [],
      preferred_locations: [],
      preferred_university_types: ['PTN', 'PTS'],
      career_interests: [],
      risk_preference: 'moderate',
      priority_factors: {
        academicFit: 0.4,
        locationFit: 0.2,
        careerFit: 0.2,
        admissionChance: 0.2
      }
    };

    res.json({
      success: true,
      preferences: data || defaultPreferences
    });

  } catch (error: any) {
    console.error('❌ Error fetching preferences:', error);
    res.status(500).json({
      error: 'Failed to fetch preferences',
      message: error.message
    });
  }
});

/**
 * POST /student-preferences
 */
router.post('/student-preferences', async (req: Request, res: Response) => {
  try {
    const { userId, ...preferences } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data, error } = await supabase
      .from('student_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      preferences: data
    });

  } catch (error: any) {
    console.error('❌ Error saving preferences:', error);
    res.status(500).json({
      error: 'Failed to save preferences',
      message: error.message
    });
  }
});

export default router;
