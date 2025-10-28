import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mockTryoutData } from '@/lib/mockTryoutData';
import { Timer } from '@/components/tryout/Timer';
import { QuestionNav } from '@/components/tryout/QuestionNav';
import { ConfirmDialog } from '@/components/tryout/ConfirmDialog';
import { toast } from 'sonner';

interface SessionState {
  currentQuestion: number;
  answers: Record<number, string | null>;
  flaggedQuestions: Record<number, boolean>;
  timeLeft: number;
  sessionId: string;
}

export default function TryoutSession() {
  const navigate = useNavigate();
  const { id } = useParams();
  const tryoutData = mockTryoutData;

  const STORAGE_KEY = `tryout_session_${id}`;

  const [sessionState, setSessionState] = useState<SessionState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      currentQuestion: 1,
      answers: {},
      flaggedQuestions: {},
      timeLeft: tryoutData.durasi_menit * 60,
      sessionId: id || 'default'
    };
  });

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionState));
  }, [sessionState, STORAGE_KEY]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleTick = () => {
    setSessionState((prev) => ({
      ...prev,
      timeLeft: Math.max(0, prev.timeLeft - 1)
    }));
  };

  const handleTimeUp = () => {
    toast.error('Waktu habis! Ujian otomatis disubmit.');
    handleSubmit();
  };

  const handleSubmit = () => {
    const timeSpent = tryoutData.durasi_menit * 60 - sessionState.timeLeft;
    localStorage.removeItem(STORAGE_KEY);
    navigate(`/tryout/${id}/result`, {
      state: {
        answers: sessionState.answers,
        timeSpent
      }
    });
  };

  const handleAnswerChange = (value: string) => {
    setSessionState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [prev.currentQuestion]: value
      }
    }));
    toast.success('Jawaban tersimpan');
  };

  const handleQuestionClick = (questionNumber: number) => {
    setSessionState((prev) => ({
      ...prev,
      currentQuestion: questionNumber
    }));
  };

  const handleToggleFlag = () => {
    setSessionState((prev) => ({
      ...prev,
      flaggedQuestions: {
        ...prev.flaggedQuestions,
        [prev.currentQuestion]: !prev.flaggedQuestions[prev.currentQuestion]
      }
    }));
  };

  const handlePrevious = () => {
    if (sessionState.currentQuestion > 1) {
      setSessionState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion - 1
      }));
    }
  };

  const handleNext = () => {
    if (sessionState.currentQuestion < tryoutData.total_soal) {
      setSessionState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1
      }));
    }
  };

  const currentQuestionData = tryoutData.questions[sessionState.currentQuestion - 1];
  const answeredCount = Object.keys(sessionState.answers).filter(
    (key) => sessionState.answers[parseInt(key)] !== null
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#89B0C7] to-[#89B1C7] rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">K</span>
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">Kelas Kampus</h1>
                  <p className="text-sm text-gray-600">Tryout Indonesia</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-medium text-gray-900">Ujian / Tes</h2>

            <Timer
              timeLeft={sessionState.timeLeft}
              onTick={handleTick}
              onTimeUp={handleTimeUp}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <p className="text-lg font-medium text-[#4a90e2]">
            Soal {sessionState.currentQuestion} dari {tryoutData.total_soal} 
            <span className="ml-2 text-gray-600 text-base">
              ({answeredCount} terjawab)
            </span>
          </p>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            <Card className="p-8 shadow-lg">
              <div className="space-y-6">
                <p className="text-lg text-gray-900 leading-relaxed">
                  {currentQuestionData?.teks_soal}
                </p>

                {currentQuestionData?.gambar_url && (
                  <div className="bg-gray-100 rounded-xl p-8 flex items-center justify-center">
                    <span className="text-gray-500">Gambar soal (jika ada)</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-8 shadow-lg">
              <RadioGroup
                value={sessionState.answers[sessionState.currentQuestion] || ''}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                {['A', 'B', 'C', 'D', 'E'].map((option) => {
                  const optionKey = `opsi_${option.toLowerCase()}` as keyof typeof currentQuestionData;
                  const optionText = currentQuestionData?.[optionKey];
                  const isSelected = sessionState.answers[sessionState.currentQuestion] === option;

                  return (
                    <div
                      key={option}
                      className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#295782] border-[#295782] shadow-md'
                          : 'bg-white border-gray-200 hover:border-[#89B0C7] hover:bg-gray-50'
                      }`}
                    >
                      <RadioGroupItem value={option} id={option} className={isSelected ? 'border-white' : ''} />
                      <Label
                        htmlFor={option}
                        className={`flex-1 cursor-pointer ${
                          isSelected ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        <span className={`font-semibold mr-3 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {option}.
                        </span>
                        <span className={isSelected ? 'text-white' : 'text-gray-700'}>
                          {optionText}
                        </span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </Card>
          </div>

          <div className="w-80">
            <QuestionNav
              totalQuestions={tryoutData.total_soal}
              currentQuestion={sessionState.currentQuestion}
              answers={sessionState.answers}
              flaggedQuestions={sessionState.flaggedQuestions}
              onQuestionClick={handleQuestionClick}
              onToggleFlag={handleToggleFlag}
              isFlagged={sessionState.flaggedQuestions[sessionState.currentQuestion] || false}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 gap-4">
          <Button
            onClick={handlePrevious}
            disabled={sessionState.currentQuestion === 1}
            variant="outline"
            className="px-8 py-6 text-lg"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Sebelumnya
          </Button>

          <Button
            onClick={() => setShowSubmitDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
          >
            Selesai & Submit
          </Button>

          <Button
            onClick={handleNext}
            disabled={sessionState.currentQuestion === tryoutData.total_soal}
            className="bg-[#295782] hover:bg-[#295782]/90 px-8 py-6 text-lg"
          >
            Selanjutnya
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleSubmit}
        title="Selesai Ujian?"
        description={`Anda telah menjawab ${answeredCount} dari ${tryoutData.total_soal} soal. Apakah Anda yakin ingin menyelesaikan ujian sekarang?`}
        confirmText="Ya, Selesai"
        cancelText="Lanjut Mengerjakan"
      />

      <ConfirmDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirm={() => navigate('/dashboard')}
        title="Keluar dari Ujian?"
        description="Progres Anda akan tersimpan dan dapat dilanjutkan nanti. Apakah Anda yakin ingin keluar?"
        confirmText="Ya, Keluar"
        cancelText="Tetap di Sini"
      />
    </div>
  );
}
