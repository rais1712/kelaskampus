// pages/TryoutResult.tsx
// Halaman hasil tryout dengan IRT scoring dan visualisasi

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Award, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  ArrowLeft,
  Download,
  Share2
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { calculateIRTScore, calculateWeightedScore, calculateSimpleScore } from '@/lib/tryoutScoring';

interface AttemptData {
  id: string;
  user_id: string;
  tryout_id: string;
  answers: Record<string, string>;
  status: string;
  started_at: string;
  finished_at: string;
  time_spent: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  score: number;
}

export default function TryoutResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tryoutId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [attemptData, setAttemptData] = useState<AttemptData | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [tryoutData, setTryoutData] = useState<any>(null);
  const [irtResult, setIrtResult] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');

  const attemptIdFromState = location.state?.attemptId;

  useEffect(() => {
    loadResultData();
  }, []);

  const loadResultData = async () => {
    try {
      setIsLoading(true);

      if (!attemptIdFromState) {
        toast.error('Attempt ID tidak ditemukan');
        navigate('/tryout');
        return;
      }

      // Load attempt data (Direct Supabase)
      const { data: attempt, error: attemptError } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('id', attemptIdFromState)
        .single();

      if (attemptError) throw attemptError;
      setAttemptData(attempt);

      // Load tryout data
      const { data: tryout, error: tryoutError } = await supabase
        .from('tryouts')
        .select('*')
        .eq('id', attempt.tryout_id)
        .single();

      if (tryoutError) throw tryoutError;
      setTryoutData(tryout);

      // Load questions
      let query = supabase
        .from('soal')
        .select('*');

      if (attempt.subtest_id) {
        query = query.eq('subtest_id', attempt.subtest_id);
      } else {
        query = query.eq('tryout_id', attempt.tryout_id);
      }

      const { data: questionsData, error: questionsError } = await query;
      if (questionsError) throw questionsError;

      setQuestions(questionsData || []);

      // Calculate IRT score
      await calculateScore(attempt, questionsData || []);

    } catch (error: any) {
      console.error('Error loading result:', error);
      toast.error('Gagal memuat hasil');
      navigate('/tryout');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScore = async (attempt: AttemptData, questionsData: any[]) => {
    console.log('🔄 Calculating IRT score...');

    try {
      // Try IRT first
      const irtScore = calculateIRTScore(questionsData, attempt.answers);
      
      if (irtScore.success) {
        console.log('✅ IRT score calculated:', irtScore);
        setIrtResult(irtScore);

        // Update attempt with IRT score
        await supabase
          .from('user_attempts')
          .update({ 
            score: irtScore.finalScore,
            irt_theta: irtScore.theta,
            irt_se: irtScore.standardError
          })
          .eq('id', attempt.id);

        return;
      }

      // Fallback to weighted score
      console.warn('⚠️ IRT failed, trying weighted score...');
      const weightedScore = calculateWeightedScore(questionsData, attempt.answers);
      
      if (weightedScore.success) {
        console.log('✅ Weighted score calculated:', weightedScore);
        setIrtResult(weightedScore);

        await supabase
          .from('user_attempts')
          .update({ score: weightedScore.finalScore })
          .eq('id', attempt.id);

        return;
      }

      // Final fallback to simple score
      console.warn('⚠️ Weighted failed, using simple score...');
      const simpleScore = calculateSimpleScore(questionsData, attempt.answers);
      console.log('✅ Simple score calculated:', simpleScore);
      setIrtResult(simpleScore);

    } catch (error) {
      console.error('❌ Error calculating score:', error);
      toast.error('Gagal menghitung skor');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#EFF6FB] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Menghitung hasil...</p>
        </div>
      </div>
    );
  }

  if (!attemptData || !irtResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-gray-700 mb-4">
            Data hasil tidak ditemukan
          </p>
          <Button onClick={() => navigate('/tryout')}>
            Kembali ke Daftar Tryout
          </Button>
        </Card>
      </div>
    );
  }

  const { correct, wrong, unanswered, totalQuestions } = irtResult.statistics;
  const timeSpentMinutes = Math.floor(attemptData.time_spent / 60);
  const timeSpentSeconds = attemptData.time_spent % 60;

  // Data for Pie Chart
  const pieData = [
    { name: 'Benar', value: correct, color: '#10b981' },
    { name: 'Salah', value: wrong, color: '#ef4444' },
    { name: 'Tidak Dijawab', value: unanswered, color: '#9ca3af' },
  ];

  // Data for Topic Analysis Bar Chart
  const topicData = irtResult.topicAnalysis?.map((topic: any) => ({
    name: topic.topik || 'General',
    Benar: topic.correct,
    Salah: topic.wrong,
    'Tidak Dijawab': topic.unanswered,
  })) || [];

  // Data for Radar Chart (Performance by Topic)
  const radarData = irtResult.topicAnalysis?.map((topic: any) => ({
    subject: topic.topik || 'General',
    score: topic.percentage,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/tryout')}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Tryout
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Hasil Tryout
            </h1>
            <p className="text-lg text-gray-600">{tryoutData?.nama_tryout}</p>
            <p className="text-sm text-gray-500 mt-1">
              Selesai pada {new Date(attemptData.finished_at).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Score Card - Big & Beautiful */}
        <Card className="mb-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-full mb-6">
                <Award className="w-16 h-16 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Skor Akhir</h2>
              <div className="text-7xl font-bold mb-4">
                {irtResult.finalScore}
              </div>
              <div className="flex items-center justify-center gap-4 text-white/90">
                <Badge className={`text-lg px-4 py-2 ${
                  irtResult.performanceLevel === 'Sangat Baik' ? 'bg-green-500' :
                  irtResult.performanceLevel === 'Baik' ? 'bg-blue-500' :
                  irtResult.performanceLevel === 'Cukup' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}>
                  {irtResult.performanceLevel}
                </Badge>
                {irtResult.method && (
                  <Badge variant="outline" className="text-white border-white bg-white/20 px-4 py-2">
                    {irtResult.method === 'irt' ? '📊 IRT 3PL' :
                     irtResult.method === 'weighted' ? '⚖️ Weighted' : '📝 Simple'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <Button
              variant={viewMode === 'summary' ? 'default' : 'ghost'}
              onClick={() => setViewMode('summary')}
              className="rounded-md"
            >
              📊 Ringkasan
            </Button>
            <Button
              variant={viewMode === 'detail' ? 'default' : 'ghost'}
              onClick={() => setViewMode('detail')}
              className="rounded-md"
            >
              📋 Detail
            </Button>
          </div>
        </div>

        {/* Summary View */}
        {viewMode === 'summary' && (
          <div className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Jawaban Benar</p>
                      <p className="text-3xl font-bold text-green-600">{correct}</p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Jawaban Salah</p>
                      <p className="text-3xl font-bold text-red-600">{wrong}</p>
                    </div>
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Tidak Dijawab</p>
                      <p className="text-3xl font-bold text-gray-600">{unanswered}</p>
                    </div>
                    <MinusCircle className="w-12 h-12 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Waktu</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {timeSpentMinutes}:{timeSpentSeconds.toString().padStart(2, '0')}
                      </p>
                    </div>
                    <Clock className="w-12 h-12 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribusi Jawaban</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              {radarData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performa per Topik</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Radar
                          name="Persentase"
                          dataKey="score"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Topic Analysis Table */}
            {irtResult.topicAnalysis && irtResult.topicAnalysis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Analisis per Topik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Topik</th>
                          <th className="text-center p-3">Benar</th>
                          <th className="text-center p-3">Salah</th>
                          <th className="text-center p-3">Tidak Dijawab</th>
                          <th className="text-center p-3">Persentase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {irtResult.topicAnalysis.map((topic: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">{topic.topik || 'General'}</td>
                            <td className="text-center p-3 text-green-600">{topic.correct}</td>
                            <td className="text-center p-3 text-red-600">{topic.wrong}</td>
                            <td className="text-center p-3 text-gray-600">{topic.unanswered}</td>
                            <td className="text-center p-3">
                              <Badge className={
                                topic.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                topic.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                                topic.percentage >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }>
                                {topic.percentage.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Detail View */}
        {viewMode === 'detail' && (
          <Card>
            <CardHeader>
              <CardTitle>Detail Jawaban</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((question, index) => {
                  const userAnswer = attemptData.answers[question.id];
                  const isCorrect = userAnswer === question.jawaban_benar;
                  const isAnswered = !!userAnswer;

                  return (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg border-2 ${
                        !isAnswered ? 'border-gray-300 bg-gray-50' :
                        isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          !isAnswered ? 'bg-gray-400' :
                          isCorrect ? 'bg-green-500' : 'bg-red-500'
                        } text-white font-bold`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">
                            {question.soal_text}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {['a', 'b', 'c', 'd', 'e'].filter(opt => question[`pilihan_${opt}`]).map(option => {
                              const optionValue = option.toUpperCase();
                              const isUserChoice = userAnswer === optionValue;
                              const isCorrectAnswer = question.jawaban_benar === optionValue;

                              return (
                                <div
                                  key={option}
                                  className={`p-2 rounded ${
                                    isCorrectAnswer ? 'bg-green-100 border-2 border-green-500' :
                                    isUserChoice ? 'bg-red-100 border-2 border-red-500' :
                                    'bg-white border border-gray-200'
                                  }`}
                                >
                                  <span className="font-semibold">{optionValue}.</span> {question[`pilihan_${option}`]}
                                  {isCorrectAnswer && <span className="ml-2 text-green-600">✓ Jawaban Benar</span>}
                                  {isUserChoice && !isCorrectAnswer && <span className="ml-2 text-red-600">✗ Jawaban Anda</span>}
                                </div>
                              );
                            })}
                          </div>
                          {!isAnswered && (
                            <p className="text-sm text-gray-500 mt-2">Tidak dijawab</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Button
            onClick={() => navigate('/tryout')}
            variant="outline"
            size="lg"
          >
            Kembali ke Daftar
          </Button>
          <Button
            onClick={() => window.print()}
            variant="default"
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-5 h-5 mr-2" />
            Cetak Hasil
          </Button>
        </div>
      </div>
    </div>
  );
}
