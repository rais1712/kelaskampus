// pages/TryoutExam.tsx
// Halaman ujian tryout dengan auto-save dan timer

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getTryoutSession, clearTryoutSession } from '@/lib/tryoutToken';
import { logAccessAttempt } from '@/lib/tryoutAccess';
import { Timer } from '@/components/tryout/Timer';
import { ConfirmDialog } from '@/components/tryout/ConfirmDialog';
import QuestionDisplay from '@/components/exam/QuestionDisplay';
import QuestionSidebar from '@/components/exam/QuestionSidebar';
import QuestionNavigation from '@/components/exam/QuestionNavigation';

interface Question {
  id: string;
  soal_text: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  pilihan_e?: string;
  jawaban_benar: string;
  nomor_soal: number;
  topik?: string;
  kategori?: string;
  irt_discrimination?: number;
  irt_difficulty?: number;
  irt_guessing?: number;
}

export default function TryoutExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tryoutId } = useParams();

  // State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime] = useState(Date.now());

  // Refs
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(Date.now());

  const sessionData = location.state?.sessionId;
  const tryoutData = location.state?.tryoutData;
  const subtestId = location.state?.subtestId;
  const continueAttempt = location.state?.continueAttempt;
  const attemptIdFromState = location.state?.attemptId;

  useEffect(() => {
    loadUserData();
    initializeExam();

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

  // ✅ Auto-save every 10 seconds
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      handleAutoSave();
    }, 10000); // 10 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [answers, attemptId]);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: userData } = await supabase
            .from("users")
            .select("user_id, nama_lengkap")
            .eq("auth_id", authUser.id)
            .single();
          
          if (userData) {
            setCurrentUser(userData);
            return;
          }
        }
      }
      setCurrentUser({ user_id: 'temp-user', nama_lengkap: 'User' });
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const initializeExam = async () => {
    try {
      setIsLoading(true);

      // If continuing, load existing attempt
      if (continueAttempt && attemptIdFromState) {
        await loadExistingAttempt(attemptIdFromState);
        return;
      }

      // Verify session
      if (!sessionData || !tryoutData) {
        toast.error('Sesi tidak valid');
        navigate('/tryout');
        return;
      }

      const session = getTryoutSession(tryoutId!);
      if (!session) {
        toast.error('Sesi expired');
        navigate('/tryout');
        return;
      }

      // Load questions (Direct Supabase)
      await loadQuestions();

      // Create new attempt
      await createNewAttempt(session);

      // Set timer
      const durationMs = (tryoutData.durasi_menit || 60) * 60 * 1000;
      setTimeRemaining(durationMs);

    } catch (error: any) {
      console.error('Error initializing exam:', error);
      toast.error('Gagal memulai ujian');
      navigate('/tryout');
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async () => {
    console.log('🔄 [EXAM] Loading questions...');

    try {
      let query = supabase
        .from('soal')
        .select('*');

      if (subtestId) {
        query = query.eq('subtest_id', subtestId);
      } else {
        query = query.eq('tryout_id', tryoutId);
      }

      query = query.order('nomor_soal', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Randomize questions
      const randomized = (data || []).sort(() => Math.random() - 0.5);
      
      setQuestions(randomized);
      console.log(`✅ [EXAM] Loaded ${randomized.length} questions`);

    } catch (error) {
      console.error('❌ [EXAM] Failed to load questions:', error);
      throw error;
    }
  };

  const createNewAttempt = async (session: any) => {
    console.log('🔄 [EXAM] Creating new attempt...');

    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .insert([{
          user_id: session.user_id,
          tryout_id: session.tryout_id,
          subtest_id: subtestId || null,
          answers: {},
          status: 'in_progress',
          started_at: new Date().toISOString(),
          session_data: {
            session_id: session.session_id,
            duration_minutes: session.duration_minutes,
          }
        }])
        .select()
        .single();

      if (error) throw error;

      setAttemptId(data.id);
      console.log(`✅ [EXAM] Attempt created: ${data.id}`);

    } catch (error) {
      console.error('❌ [EXAM] Failed to create attempt:', error);
      throw error;
    }
  };

  const loadExistingAttempt = async (id: string) => {
    console.log(`🔄 [EXAM] Loading existing attempt: ${id}`);

    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setAttemptId(data.id);
      setAnswers(data.answers || {});

      // Load questions
      await loadQuestions();

      // Calculate remaining time
      const startedAt = new Date(data.started_at).getTime();
      const elapsed = Date.now() - startedAt;
      const durationMs = (data.session_data?.duration_minutes || 60) * 60 * 1000;
      const remaining = Math.max(0, durationMs - elapsed);
      
      setTimeRemaining(remaining);

      console.log(`✅ [EXAM] Loaded existing attempt`);
      setIsLoading(false);

    } catch (error) {
      console.error('❌ [EXAM] Failed to load attempt:', error);
      toast.error('Gagal memuat sesi sebelumnya');
      navigate('/tryout');
    }
  };

  const handleAutoSave = useCallback(async () => {
    if (!attemptId || Object.keys(answers).length === 0) return;

    // Throttle: only save if 5 seconds passed since last save
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) return;

    try {
      setIsSaving(true);
      lastSaveRef.current = now;

      const { error } = await supabase
        .from('user_attempts')
        .update({
          answers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (error) throw error;

      console.log('💾 [EXAM] Auto-saved');

    } catch (error) {
      console.error('❌ [EXAM] Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [attemptId, answers]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleBookmark = (questionId: string) => {
    setBookmarks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleTimeUp = () => {
    toast.warning('Waktu habis! Mengumpulkan jawaban...');
    setTimeout(() => {
      handleSubmit();
    }, 2000);
  };

  const handleSubmit = async () => {
    if (!attemptId) {
      toast.error('Attempt ID tidak ditemukan');
      return;
    }

    setIsSubmitting(true);
    setShowSubmitDialog(false);

    try {
      // Calculate statistics
      const correctAnswers = questions.filter(q => answers[q.id] === q.jawaban_benar).length;
      const wrongAnswers = questions.filter(q => answers[q.id] && answers[q.id] !== q.jawaban_benar).length;
      const unanswered = questions.length - correctAnswers - wrongAnswers;
      const timeSpent = Math.floor((Date.now() - startTime) / 1000); // seconds

      // Simple score (will be recalculated with IRT in result page)
      const simpleScore = Math.round((correctAnswers / questions.length) * 100);

      // Update attempt
      const { error } = await supabase
        .from('user_attempts')
        .update({
          answers,
          status: 'completed',
          finished_at: new Date().toISOString(),
          time_spent: timeSpent,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          unanswered,
          score: simpleScore,
        })
        .eq('id', attemptId);

      if (error) throw error;

      // Log completion
      if (currentUser) {
        logAccessAttempt(currentUser.user_id, tryoutId!, 'submit', true, {
          attempt_id: attemptId,
          score: simpleScore,
        });
      }

      // Clear session
      clearTryoutSession(tryoutId!);

      toast.success('Jawaban berhasil dikumpulkan!');

      // Navigate to result
      setTimeout(() => {
        navigate(`/tryout/${tryoutId}/result`, {
          state: { attemptId }
        });
      }, 1500);

    } catch (error) {
      console.error('❌ [EXAM] Failed to submit:', error);
      toast.error('Gagal mengumpulkan jawaban');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Memuat soal...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-gray-700 mb-4">
            Tidak ada soal tersedia
          </p>
          <Button onClick={() => navigate('/tryout')}>
            Kembali ke Daftar Tryout
          </Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {tryoutData?.nama_tryout}
              </h1>
              <p className="text-sm text-gray-500">
                Soal {currentQuestionIndex + 1} dari {questions.length}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {isSaving && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  💾 Menyimpan...
                </Badge>
              )}
              
              <Timer
                initialTime={timeRemaining}
                onTimeUp={handleTimeUp}
              />

              <Button
                onClick={() => setShowSubmitDialog(true)}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                Selesai
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress: {answeredCount}/{questions.length} terjawab</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Display - 3 columns */}
          <div className="lg:col-span-3">
            <QuestionDisplay
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              selectedAnswer={answers[currentQuestion.id]}
              onAnswerChange={handleAnswerChange}
              isBookmarked={bookmarks.has(currentQuestion.id)}
              onBookmark={handleBookmark}
            />

            <QuestionNavigation
              currentIndex={currentQuestionIndex}
              totalQuestions={questions.length}
              onPrevious={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              onNext={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              hasPrevious={currentQuestionIndex > 0}
              hasNext={currentQuestionIndex < questions.length - 1}
            />
          </div>

          {/* Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <QuestionSidebar
              questions={questions}
              answers={answers}
              bookmarks={bookmarks}
              currentIndex={currentQuestionIndex}
              onQuestionSelect={setCurrentQuestionIndex}
            />
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        open={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        onConfirm={handleSubmit}
        title="Konfirmasi Pengumpulan"
        description={`Anda telah menjawab ${answeredCount} dari ${questions.length} soal. Apakah Anda yakin ingin mengumpulkan jawaban?`}
        confirmText="Ya, Kumpulkan"
        cancelText="Belum"
        variant="warning"
        isLoading={isSubmitting}
      />
    </div>
  );
}
