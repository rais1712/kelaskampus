// pages/TryoutResult.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import toast from 'react-hot-toast';
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
  Radar
} from 'recharts';

interface QuestionResult {
  number: number;
  isCorrect: boolean;
  userAnswer: string | null;
  correctAnswer: string;
}

interface KategoriResult {
  kategori_name: string;
  correct: number;
  total: number;
  score: number;
}

interface ResultData {
  tryout_name: string;
  total_questions: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  passingGrade: number;
  isPassed: boolean;
  completion_time: number;
  questionResults: QuestionResult[];
  kategoriResults: KategoriResult[];
}

export default function TryoutResult() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    fetchCurrentUser();
    loadData();
  }, [tryoutId]);

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

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Loading result for tryout:', tryoutId);

      const { data: { session } } = await supabase.auth.getSession();
      let userId = null;

      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id')
          .eq('auth_id', session.user.id)
          .single();
        userId = userData?.user_id;
      } else {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.user_id;
        }
      }

      if (!userId) throw new Error('User not found');

      // Get tryout data
      const { data: tryoutData, error: tryoutError } = await supabase
        .from('tryouts')
        .select('*')
        .eq('id', tryoutId)
        .single();

      if (tryoutError || !tryoutData) throw new Error('Tryout not found');

      // Get completed sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('tryout_sessions')
        .select('*')
        .eq('tryout_id', tryoutId)
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (sessionsError || !sessions || sessions.length === 0) {
        throw new Error('No completed sessions found');
      }

      // Get all answers with question details
      const sessionIds = sessions.map(s => s.id);
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('*, questions(*)')
        .in('session_id', sessionIds);

      if (answersError) throw answersError;

      // Calculate results
      const totalQuestions = answers?.length || 0;
      const correctAnswers = answers?.filter(
        a => a.selected_answer === a.questions?.jawaban_benar
      ).length || 0;
      const unanswered = answers?.filter(a => !a.selected_answer).length || 0;
      const incorrect = totalQuestions - correctAnswers - unanswered;

      const score = totalQuestions > 0 
        ? Math.round((correctAnswers / totalQuestions) * 100) 
        : 0;

      const passingGrade = 65;
      const isPassed = score >= passingGrade;

      // Build question results array
      const questionResults: QuestionResult[] = (answers || [])
        .sort((a, b) => (a.questions?.urutan || 0) - (b.questions?.urutan || 0))
        .map((answer, index) => ({
          number: index + 1,
          isCorrect: answer.selected_answer === answer.questions?.jawaban_benar,
          userAnswer: answer.selected_answer || null,
          correctAnswer: answer.questions?.jawaban_benar || ''
        }));

      // Group by kategori for radar chart
      const kategoriMap = new Map();
      answers?.forEach(answer => {
        const kategoriId = answer.questions?.kategori_id;
        if (!kategoriId) return;

        if (!kategoriMap.has(kategoriId)) {
          kategoriMap.set(kategoriId, {
            correct: 0,
            total: 0,
            kategori_id: kategoriId
          });
        }

        const kategoriStat = kategoriMap.get(kategoriId);
        kategoriStat.total++;
        if (answer.selected_answer === answer.questions?.jawaban_benar) {
          kategoriStat.correct++;
        }
      });

      // Get kategori names
      const kategoriIds = Array.from(kategoriMap.keys());
      const { data: kategoris } = await supabase
        .from('kategoris')
        .select('*')
        .in('kategori_id', kategoriIds);

      const kategoriResults: KategoriResult[] = Array.from(kategoriMap.values()).map(stat => {
        const kategori = kategoris?.find(k => k.kategori_id === stat.kategori_id);
        const kategoriScore = stat.total > 0 
          ? Math.round((stat.correct / stat.total) * 100) 
          : 0;

        return {
          kategori_name: kategori?.nama_kategori || 'Unknown',
          correct: stat.correct,
          total: stat.total,
          score: kategoriScore
        };
      });

      // Calculate total time
      const totalTime = sessions.reduce((sum, s) => {
        const timeUsed = (tryoutData.durasi_menit * 60) - (s.time_remaining || 0);
        return sum + timeUsed;
      }, 0);

      const resultData: ResultData = {
        tryout_name: tryoutData.nama_tryout,
        total_questions: totalQuestions,
        correct: correctAnswers,
        incorrect,
        unanswered,
        score,
        passingGrade,
        isPassed,
        completion_time: Math.round(totalTime / 60),
        questionResults,
        kategoriResults
      };

      setResult(resultData);
    } catch (error: any) {
      console.error('Error loading result:', error);
      toast.error(error.message || 'Gagal memuat hasil tryout');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b0c7] mx-auto mb-4"></div>
          <p className="text-[#62748e] font-medium">Memuat hasil...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-lg text-[#1d293d] font-semibold mb-4">Data hasil tidak ditemukan</p>
            <button
              onClick={() => navigate('/tryout')}
              className="px-6 py-3 bg-gradient-to-r from-[#295782] to-[#89b0c7] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const distributionData = [
    { name: 'Benar', value: result.correct, fill: '#22c55e' },
    { name: 'Salah', value: result.incorrect, fill: '#ef4444' },
    { name: 'Tidak Dijawab', value: result.unanswered, fill: '#9ca3af' }
  ];

  const radarData = result.kategoriResults.map(k => ({
    subject: k.kategori_name,
    score: k.score
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header 
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/tryout')}
            className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Kembali ke Daftar Tryout</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-[#295782] transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Kembali ke Dashboard</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(`tryout_${tryoutId}_submitted`);
                navigate(`/tryout/${tryoutId}/start`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#295782] to-[#89b0c7] text-white rounded-lg hover:shadow-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Ulangi Tryout</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1d293d] mb-1">{result.tryout_name}</h1>
          <p className="text-[#62748e]">Detail Hasil Ujian</p>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className={`text-5xl font-bold mb-2 ${
                result.isPassed ? 'text-green-600' : 'text-red-600'
              }`}>
                {result.score}/100
              </div>
              <p className="text-sm text-[#62748e]">Skor Anda</p>
            </div>

            <div className="flex items-center justify-center">
              <div>
                <div className={`px-4 py-2 rounded-full text-sm font-bold mb-1 ${
                  result.isPassed 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {result.isPassed ? 'LULUS' : 'TIDAK LULUS'}
                </div>
                <div className="text-xs text-center text-[#62748e]">
                  Passing Grade: {result.passingGrade}
                </div>
              </div>
            </div>

            <div className="text-center bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-600">{result.correct}</div>
              <p className="text-xs text-[#62748e]">Benar</p>
            </div>

            <div className="text-center bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{result.incorrect}</div>
              <p className="text-xs text-[#62748e]">Salah</p>
            </div>

            <div className="text-center bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-600">{result.completion_time} menit</div>
              <p className="text-xs text-[#62748e]">Dari total {result.total_questions} soal</p>
            </div>
          </div>
        </div>

        {/* Analisis & Statistik WITH REAL CHARTS */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1d293d] mb-4">Analisis & Statistik</h2>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <h3 className="text-sm font-semibold text-[#62748e] mb-3">Distribusi Jawaban</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div>
              <h3 className="text-sm font-semibold text-[#62748e] mb-3">Analisis Per Topik</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" stroke="#6b7280" fontSize={11} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" fontSize={10} />
                  <Radar 
                    name="Score" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.5} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detail Hasil Ujian */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1d293d]">Detail Hasil Ujian</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#62748e]">Tampilan:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-white text-[#295782] shadow-sm' 
                      : 'text-[#62748e]'
                  }`}
                >
                  Tabel
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-[#295782] shadow-sm' 
                      : 'text-[#62748e]'
                  }`}
                >
                  Grid
                </button>
              </div>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-10 gap-2">
              {result.questionResults.map((q) => (
                <div
                  key={q.number}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                    q.isCorrect 
                      ? 'bg-green-500 text-white' 
                      : q.userAnswer 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-300 text-gray-600'
                  }`}
                  title={`Soal ${q.number}: ${q.isCorrect ? 'Benar' : q.userAnswer ? 'Salah' : 'Kosong'}`}
                >
                  {q.number}
                </div>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#62748e]">No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#62748e]">Jawaban Anda</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#62748e]">Jawaban Benar</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#62748e]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.questionResults.map((q) => (
                    <tr key={q.number} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{q.number}</td>
                      <td className="py-3 px-4 text-sm">
                        {q.userAnswer ? (
                          <span className={q.isCorrect ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {q.userAnswer}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Tidak dijawab</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-green-600">{q.correctAnswer}</td>
                      <td className="py-3 px-4">
                        {q.isCorrect ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            Benar
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            {q.userAnswer ? 'Salah' : 'Kosong'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
