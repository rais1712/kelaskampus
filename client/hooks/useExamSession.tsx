// hooks/useExamSession.tsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// ✅ FIXED: Match dengan QuestionDisplay interface
interface Question {
  id: string;
  soal_id?: string;
  pertanyaan: string;  // ✅ CHANGED from soal_text
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  opsi_e?: string;
  urutan: number;
  jawaban_benar?: string;
}

interface Answer {
  question_id: string;
  selected_answer: string;
}

export function useExamSession(sessionId: string, kategoriId?: string) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tryoutId, setTryoutId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch session data
  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching session data for:', sessionId);
      console.log('📋 kategoriId filter:', kategoriId);

      const { data: sessionData, error: sessionError } = await supabase
        .from('tryout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error('Session data not found');

      console.log('✅ Session data:', sessionData);
      setTryoutId(sessionData.tryout_id);
      setTimeRemaining(sessionData.time_remaining || 0);

      // ✅ CRITICAL FIX: Fetch questions with proper field mapping
      let questionsQuery = supabase
        .from('questions')
        .select('*')
        .eq('tryout_id', sessionData.tryout_id);

      if (kategoriId) {
        questionsQuery = questionsQuery.eq('kategori_id', kategoriId);
      }

      const { data: questionData, error: questionsError } = await questionsQuery
        .order('urutan', { ascending: true });

      if (questionsError) throw questionsError;

      console.log('📊 Raw question data from DB:', questionData);

      if (Array.isArray(questionData)) {
        // ✅ MAP field names dari DB ke interface
        const mappedQuestions: Question[] = questionData.map(q => ({
          id: q.soal_id || q.id,
          soal_id: q.soal_id,
          pertanyaan: q.pertanyaan || q.soal_text || '',  // ✅ Fallback
          opsi_a: q.opsi_a || '',
          opsi_b: q.opsi_b || '',
          opsi_c: q.opsi_c || '',
          opsi_d: q.opsi_d || '',
          opsi_e: q.opsi_e || '',
          urutan: q.urutan,
          jawaban_benar: q.jawaban_benar
        }));

        console.log('✅ Mapped questions:', mappedQuestions);
        setQuestions(mappedQuestions);
        console.log(`✅ Questions loaded: ${mappedQuestions.length}`);
      }

      // Fetch existing answers
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select('*')
        .eq('session_id', sessionId);

      if (answersError) throw answersError;

      const answersMap: Record<string, string> = {};
      (answersData || []).forEach(answer => {
        answersMap[answer.question_id] = answer.selected_answer;
      });

      setAnswers(answersMap);
      console.log('✅ Existing answers loaded:', Object.keys(answersMap).length);

      // Load bookmarks
      const bookmarks = sessionData.bookmarked_questions || [];
      setBookmarkedQuestions(Array.isArray(bookmarks) ? bookmarks : []);

    } catch (error) {
      console.error('❌ Error fetching session data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && questions.length > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, questions.length]);

  // Save answer
  const saveAnswer = useCallback(async (questionId: string, answer: string) => {
    console.log('💾 saveAnswer called:', { questionId, answer });
    
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('answers')
        .upsert({
          session_id: sessionId,
          question_id: questionId,
          selected_answer: answer,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_id,question_id'
        });

      if (error) throw error;
      console.log('✅ Answer saved successfully');
    } catch (error) {
      console.error('❌ Error saving answer:', error);
    } finally {
      setIsSaving(false);
    }
  }, [sessionId]);

  // Save bookmarks
  const saveBookmarks = useCallback(async (bookmarks: number[]) => {
    setBookmarkedQuestions(bookmarks);
    
    try {
      const { error } = await supabase
        .from('tryout_sessions')
        .update({ bookmarked_questions: bookmarks })
        .eq('id', sessionId);

      if (error) throw error;
      console.log('✅ Bookmarks saved');
    } catch (error) {
      console.error('❌ Error saving bookmarks:', error);
    }
  }, [sessionId]);

  // Submit exam
  const submitExam = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('tryout_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          time_remaining: timeRemaining
        })
        .eq('id', sessionId);

      if (error) throw error;
      console.log('✅ Exam submitted');
    } catch (error) {
      console.error('❌ Error submitting exam:', error);
      throw error;
    }
  }, [sessionId, timeRemaining]);

  return {
    questions,
    currentIndex,
    setCurrentIndex,
    answers,
    saveAnswer,
    submitExam,
    isLoading,
    timeRemaining,
    tryoutId,
    isSaving,
    bookmarkedQuestions,
    saveBookmarks
  };
}
