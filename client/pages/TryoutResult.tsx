import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Target, 
  Clock, 
  Home, 
  RefreshCw,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { verifySubmissionToken } from '@/lib/tryoutToken';
import { mockTryoutData } from '@/lib/mockTryoutData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';

interface ResultData {
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  total: number;
  timeSpent: number;
  passingGrade: number;
  isPassed: boolean;
  answers: Record<number, string>;
  topicAnalysis: Array<{
    topic: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
}

export default function TryoutResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tryoutId } = useParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    loadUserData();
    verifyAndLoadResult();
  }, [tryoutId]);

  const loadUserData = async () => {
    // Load user data (sama seperti di component lain)
    const mockUser = {
      user_id: 'temp-user',
      nama: 'Jakk Here',
      email: 'user@example.com',
      photo: null
    };
    setCurrentUser(mockUser);
  };

  const verifyAndLoadResult = () => {
    try {
      // ✅ Get submission token
      const submissionToken = location.state?.submissionToken;

      if (!submissionToken) {
        console.error('❌ No submission token');
        toast.error('Akses tidak valid. Hasil hanya bisa diakses setelah submit ujian.');
        navigate('/tryout');
        return;
      }

      // ✅ Verify token
      const submission = verifySubmissionToken(submissionToken);

      if (!submission) {
        toast.error('Token tidak valid');
        navigate('/tryout');
        return;
      }

      // ✅ Verify tryout ID match
      if (submission.tryout_id !== tryoutId) {
        console.error('❌ Tryout ID mismatch');
        toast.error('Data tidak sesuai');
        navigate('/tryout');
        return;
      }

      console.log('✅ Submission verified:', submission);

      // ✅ Calculate result
      const result = calculateResult(submission.answers, submission.time_spent);
      setResultData(result);
      setIsVerifying(false);

    } catch (error) {
      console.error('Error loading result:', error);
      toast.error('Gagal memuat hasil');
      navigate('/tryout');
    }
  };

  const calculateResult = (
    answers: Record<number, string>,
    timeSpent: number
  ): ResultData => {
    const correctAnswers = mockTryoutData.jawaban_benar;
    const total = mockTryoutData.total_soal;
    
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    // Calculate scores
    for (let i = 1; i <= total; i++) {
      const userAnswer = answers[i];
      const correctAnswer = correctAnswers[String(i)];

      if (!userAnswer) {
        unanswered++;
      } else if (userAnswer === correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    }

    const score = Math.round((correct / total) * 100);
    const passingGrade = 65;

    // Calculate topic analysis
    const topicStats: Record<string, { correct: number; total: number }> = {};

    mockTryoutData.questions.forEach((question) => {
      const topic = question.topik;
      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0 };
      }
      topicStats[topic].total++;

      const userAnswer = answers[question.nomor];
      const correctAnswer = correctAnswers[String(question.nomor)];
      if (userAnswer === correctAnswer) {
        topicStats[topic].correct++;
      }
    });

    const topicAnalysis = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      percentage: Math.round((stats.correct / stats.total) * 100),
    }));

    return {
      score,
      correct,
      wrong,
      unanswered,
      total,
      timeSpent,
      passingGrade,
      isPassed: score >= passingGrade,
      answers,
      topicAnalysis,
    };
  };

  if (isVerifying || !resultData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#295782] font-semibold">Memverifikasi hasil...</p>
          <p className="text-sm text-gray-500 mt-2">Mohon tunggu</p>
        </div>
      </div>
    );
  }

  // Data for charts
  const distributionData = [
    { name: 'Benar', value: resultData.correct, fill: '#22c55e' },
    { name: 'Salah', value: resultData.wrong, fill: '#ef4444' },
    { name: 'Tidak Dijawab', value: resultData.unanswered, fill: '#94a3b8' },
  ];

  const radarData = resultData.topicAnalysis.map(topic => ({
    subject: topic.topic,
    score: topic.percentage,
    fullMark: 100
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white">
      <Header 
        userName={currentUser?.nama || "User"}
        userPhoto={currentUser?.photo}
        activeMenu="tryout"
        variant="default"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Trophy */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            resultData.isPassed ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            <Trophy className={`w-10 h-10 ${
              resultData.isPassed ? 'text-green-600' : 'text-yellow-600'
            }`} />
          </div>
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">
            Hasil Tryout
          </h1>
          <p className="text-[#64748B]">
            {mockTryoutData.nama_tryout}
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Score Card */}
          <Card className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#295782]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#295782]" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Skor Anda</p>
            </div>
            <p className="text-4xl font-bold text-[#295782] mb-1">
              {resultData.score}/100
            </p>
          </Card>

          {/* Passing Grade Card */}
          <Card className={`rounded-2xl shadow-lg p-6 border-t-4 ${
            resultData.isPassed ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                resultData.isPassed ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <Target className={`w-5 h-5 ${
                  resultData.isPassed ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
              <p className="text-sm text-gray-600 font-medium">Passing Grade:</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${
                resultData.isPassed ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {resultData.isPassed ? 'LULUS' : resultData.passingGrade}
              </p>
            </div>
          </Card>

          {/* Time Card */}
          <Card className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-purple-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Waktu</p>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-1">
              {Math.floor(resultData.timeSpent / 60)} <span className="text-2xl">menit</span>
            </p>
            <p className="text-xs text-gray-500">
              {resultData.timeSpent % 60} detik
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Dari total {mockTryoutData.durasi_menit} menit
            </p>
          </Card>
        </div>

        {/* Detail Hasil Ujian */}
        <Card className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1E293B]">
              Detail Hasil Ujian
            </h2>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="text-xs"
              >
                Tabel
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="text-xs"
              >
                Grid
              </Button>
            </div>
          </div>

          {/* Grid View - Answer Buttons (seperti mockup) */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: resultData.total }, (_, i) => {
                const questionNum = i + 1;
                const userAnswer = resultData.answers[questionNum];
                const correctAnswer = mockTryoutData.jawaban_benar[String(questionNum)];
                
                let status: 'correct' | 'wrong' | 'unanswered' = 'unanswered';
                if (userAnswer) {
                  status = userAnswer === correctAnswer ? 'correct' : 'wrong';
                }

                const colorClass = {
                  correct: 'bg-green-500 text-white border-green-600',
                  wrong: 'bg-red-500 text-white border-red-600',
                  unanswered: 'bg-gray-300 text-gray-700 border-gray-400'
                }[status];

                return (
                  <button
                    key={questionNum}
                    className={`w-12 h-12 rounded-full font-bold text-sm border-2 ${colorClass} 
                      hover:scale-110 transition-transform flex items-center justify-center`}
                    title={`Soal ${questionNum}: ${status === 'correct' ? 'Benar' : status === 'wrong' ? 'Salah' : 'Tidak dijawab'}`}
                  >
                    {questionNum}
                  </button>
                );
              })}
            </div>
          )}

          {/* Table View - Stats */}
          {viewMode === 'table' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Jawaban Benar</p>
                  <p className="text-2xl font-bold text-green-600">{resultData.correct}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Jawaban Salah</p>
                  <p className="text-2xl font-bold text-red-600">{resultData.wrong}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tidak Dijawab</p>
                  <p className="text-2xl font-bold text-gray-600">{resultData.unanswered}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Analisis & Statistik */}
        <Card className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-[#1E293B] mb-6">
            Analisis & Statistik
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Distribusi Jawaban (Bar Chart) */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-4">
                Distribusi Jawaban
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Analisis Per Topik (Radar Chart) */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-4">
                Analisis Per Topik
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar 
                    name="Skor" 
                    dataKey="score" 
                    stroke="#295782" 
                    fill="#295782" 
                    fillOpacity={0.6} 
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => navigate('/tryout')}
            variant="outline"
            className="flex-1 py-6 text-base font-semibold border-2 border-[#295782] text-[#295782] hover:bg-[#295782] hover:text-white"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Ulangi Tryout
          </Button>

          <Button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-6 text-base font-semibold bg-[#295782] hover:bg-[#1e4060] text-white shadow-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <span className="font-semibold">Tips:</span> Hasil tryout ini dapat dilihat kembali di menu <span className="font-bold">Profile → Riwayat Tryout</span>
          </p>
        </div>
      </div>
    </div>
  );
}
