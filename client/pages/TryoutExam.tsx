import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import QuestionDisplay from '@/components/exam/QuestionDisplay';
import QuestionSidebar from '@/components/exam/QuestionSidebar';
import { useExamSession } from '@/hooks/useExamSession';

export default function TryoutExam() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session');
  const kategoriId = searchParams.get('kategori');

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ✅ Get hook data
  const {
    questions,
    currentIndex,
    setCurrentIndex,
    answers,
    saveAnswer,
    submitExam,
    isLoading,
    timeRemaining,
    tryoutId: examTryoutId,
    bookmarkedQuestions,
    saveBookmarks
  } = useExamSession(sessionId || '', kategoriId || undefined);

  // ✅ Fetch current user
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('nama_lengkap, username, photo_profile')
          .eq('auth_id', session.user.id)
          .single();
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // Redirect if no session
  useEffect(() => {
    if (!sessionId) {
      toast.error('Session tidak valid');
      navigate(`/tryout/${tryoutId}/start`);
    }
  }, [sessionId, navigate, tryoutId]);

  // Auto-submit when time is up
  useEffect(() => {
    if (timeRemaining === 0 && questions.length > 0) {
      handleAutoSubmit();
    }
  }, [timeRemaining, questions.length]);

  const handleAutoSubmit = async () => {
    toast.error('Waktu habis! Tryout akan disubmit otomatis.');
    try {
      await submitExam();
      // ✅ CHANGED: Navigate to TryoutStart instead of Result
      navigate(`/tryout/${tryoutId}/start`);
    } catch (err) {
      console.error('Auto submit error:', err);
    }
  };

  const handleManualSubmit = async () => {
    try {
      await submitExam();
      toast.success('Tryout berhasil disubmit!');
      // ✅ CHANGED: Navigate to TryoutStart instead of Result
      navigate(`/tryout/${tryoutId}/start`);
    } catch (err) {
      toast.error('Gagal submit tryout');
    }
  };

  // ✅ KEEP: Save bookmarks before exit
  const handleExit = async () => {
    console.log('🚪 Exit button clicked');
    try {
      if (bookmarkedQuestions.length > 0) {
        console.log('💾 Saving bookmarks before exit:', bookmarkedQuestions);
        await saveBookmarks(bookmarkedQuestions);
      }

      await supabase
        .from('tryout_sessions')
        .update({
          time_remaining: timeRemaining,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      toast.success('Progress tersimpan');
    } catch (err) {
      console.error('Error saving progress:', err);
      toast.error('Gagal menyimpan progress');
    }

    navigate(`/tryout/${tryoutId}/start`);
  };

  // ✅ KEEP: Toggle bookmark
  const handleToggleBookmark = async () => {
    let updated: number[];
    if (bookmarkedQuestions.includes(currentIndex)) {
      updated = bookmarkedQuestions.filter(q => q !== currentIndex);
      toast.success('Tanda soal dihapus');
    } else {
      updated = [...bookmarkedQuestions, currentIndex];
      toast.success('Soal ditandai');
    }
    await saveBookmarks(updated);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleAnswerChange = (answer: string) => {
  console.log('═══════════════════════════════════');
  console.log('🎯 handleAnswerChange CALLED');
  console.log('  - answer:', answer);
  console.log('  - currentQuestion:', currentQuestion);
  console.log('  - currentQuestion.id:', currentQuestion?.id);
  console.log('═══════════════════════════════════');
  
  if (currentQuestion) {
    saveAnswer(currentQuestion.id, answer);
  }
};


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, questions.length, setCurrentIndex]);

  // Prevent accidental page close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Memuat soal...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Soal tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
      />

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-4">
        {/* Title and Timer Section with Exit Button */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            {/* Tombol Keluar */}
            <button
              onClick={handleExit}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Keluar</span>
            </button>

            <h1 className="hidden md:block text-xl font-bold text-gray-800">Ujian/Tes</h1>

            <div className="hidden md:block text-right">
              <p className="text-sm text-gray-500 mb-1">Waktu Tersisa:</p>
              <p className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatTime(timeRemaining)}
              </p>
            </div>
          </div>

          {/* Mobile info row */}
          <div className="md:hidden flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Soal <span className="font-semibold">{currentIndex + 1}</span> dari <span className="font-semibold">{questions.length}</span>
            </p>
            <div className="text-right">
              <p className="text-xs text-gray-500">Waktu Tersisa:</p>
              <p className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-800'}`}>
                {formatTime(timeRemaining)}
              </p>
            </div>
          </div>
        </div>

        {/* Question Card and Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-8 xl:col-span-9">
            <QuestionDisplay
              question={currentQuestion}
              currentAnswer={answers[currentQuestion.id]}
              onAnswerChange={handleAnswerChange}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
            />

            {/* Navigation Buttons */}
            <div className="mt-4 flex items-center justify-between gap-4">
              {/* Tombol Sebelumnya */}
              {currentIndex > 0 && (
                <button
                  onClick={handlePrevious}
                  className="rounded-xl border-2 border-gray-300 hover:border-gray-400 bg-white px-8 py-2.5 font-medium text-gray-700 shadow-sm transition-colors"
                >
                  Sebelumnya
                </button>
              )}

              {/* Spacer */}
              {currentIndex === 0 && <div className="flex-1" />}

              {/* Tombol Selanjutnya atau Selesai */}
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="rounded-xl bg-[#295782] hover:bg-[#1e4060] text-white px-10 py-2.5 font-medium shadow-md transition-colors ml-auto"
                >
                  Selanjutnya
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="rounded-xl bg-[#00A63E] hover:bg-[#009038] text-white px-10 py-2.5 font-medium shadow-md transition-colors ml-auto"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar - Question Navigator */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sticky top-4">
              {/* Bookmark Button */}
              <button
                onClick={handleToggleBookmark}
                className={`w-full mb-4 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  bookmarkedQuestions.includes(currentIndex)
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {bookmarkedQuestions.includes(currentIndex) ? 'Batal Tandai Soal' : 'Tandai Soal'}
              </button>

              {/* Question Grid */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((question, index) => {
                  const isAnswered = !!answers[question.id];
                  const isCurrent = index === currentIndex;
                  const isBookmarked = bookmarkedQuestions.includes(index);

                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`aspect-square rounded-lg font-bold text-sm transition-all ${
                        isCurrent ? 'ring-2 ring-[#295782] ring-offset-2' : ''
                      } ${
                        isBookmarked
                          ? 'bg-gray-500 text-white hover:bg-gray-600'
                          : isAnswered
                          ? 'bg-[#295782] text-white hover:bg-[#1e3f5f]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-gray-700">Keterangan:</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#295782]"></div>
                  <span className="text-gray-600">Sudah dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-500"></div>
                  <span className="text-gray-600">Soal ditandai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowSubmitConfirm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Konfirmasi Selesai</h3>
              <p className="text-gray-600 mb-4">
                Apakah kamu yakin ingin mengakhiri tryout? Pastikan semua jawaban sudah benar.
              </p>
              <p className="text-sm text-amber-600 font-medium mb-6">
                ⚠️ Soal terjawab: {Object.keys(answers).length}/{questions.length}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleManualSubmit}
                  className="flex-1 px-4 py-2.5 bg-[#00A63E] hover:bg-[#009038] text-white rounded-xl font-medium transition-colors"
                >
                  Ya, Selesai
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Question Sidebar Modal (Mobile) */}
      {showSidebar && (
        <QuestionSidebar
          questions={questions}
          currentIndex={currentIndex}
          answers={answers}
          bookmarkedQuestions={bookmarkedQuestions}
          onSelectQuestion={setCurrentIndex}
          onClose={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
