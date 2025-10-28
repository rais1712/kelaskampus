import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, MinusCircle, Trophy, Clock, RefreshCw, Home } from 'lucide-react';
import { mockTryoutData } from '@/lib/mockTryoutData';

export default function TryoutResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const { answers = {}, timeSpent = 0 } = location.state || {};
  const tryoutData = mockTryoutData;

  const calculateResults = () => {
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    tryoutData.questions.forEach((question) => {
      const userAnswer = answers[question.nomor];
      const correctAnswer = tryoutData.jawaban_benar[question.id];

      if (!userAnswer) {
        unanswered++;
      } else if (userAnswer === correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });

    return { correct, wrong, unanswered };
  };

  const { correct, wrong, unanswered } = calculateResults();
  const totalQuestions = tryoutData.total_soal;
  const score = Math.round((correct / totalQuestions) * 100);
  const isPassed = score >= 70;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? `${hours} jam ` : ''}${minutes} menit ${secs} detik`;
  };

  const getQuestionStatus = (questionNum: number): 'correct' | 'wrong' | 'unanswered' => {
    const question = tryoutData.questions[questionNum - 1];
    const userAnswer = answers[questionNum];
    const correctAnswer = tryoutData.jawaban_benar[question.id];

    if (!userAnswer) return 'unanswered';
    return userAnswer === correctAnswer ? 'correct' : 'wrong';
  };

  const topicAnalysis = () => {
    const topics: Record<string, { correct: number; total: number }> = {};

    tryoutData.questions.forEach((question) => {
      const topic = question.topik;
      if (!topics[topic]) {
        topics[topic] = { correct: 0, total: 0 };
      }
      topics[topic].total++;

      const userAnswer = answers[question.nomor];
      const correctAnswer = tryoutData.jawaban_benar[question.id];
      if (userAnswer === correctAnswer) {
        topics[topic].correct++;
      }
    });

    return Object.entries(topics).map(([topic, data]) => ({
      topic,
      correct: data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 100)
    }));
  };

  const analysis = topicAnalysis();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                  isPassed ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Trophy className={`w-12 h-12 ${isPassed ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Hasil Ujian Tryout
              </CardTitle>
              <Badge className={`text-lg px-6 py-2 ${
                isPassed 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}>
                {isPassed ? 'LULUS' : 'TIDAK LULUS'}
              </Badge>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-blue-600 font-medium mb-2">Skor Akhir</p>
                    <p className="text-4xl font-bold text-blue-900">{score}</p>
                    <p className="text-sm text-blue-700 mt-1">dari 100</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-green-600 font-medium mb-2">Jawaban Benar</p>
                    <p className="text-4xl font-bold text-green-900">{correct}</p>
                    <p className="text-sm text-green-700 mt-1">dari {totalQuestions} soal</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="pt-6 text-center">
                    <p className="text-purple-600 font-medium mb-2 flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      Waktu Pengerjaan
                    </p>
                    <p className="text-lg font-bold text-purple-900">{formatTime(timeSpent)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Statistik Jawaban</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Benar</span>
                    </div>
                    <span className="font-semibold text-green-600">{correct} soal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-gray-700">Salah</span>
                    </div>
                    <span className="font-semibold text-red-600">{wrong} soal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MinusCircle className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700">Tidak Dijawab</span>
                    </div>
                    <span className="font-semibold text-gray-600">{unanswered} soal</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Detail Jawaban per Soal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-10 gap-2">
                    {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
                      const status = getQuestionStatus(num);
                      return (
                        <div
                          key={num}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-medium text-sm ${
                            status === 'correct'
                              ? 'bg-green-500 text-white'
                              : status === 'wrong'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-gray-600">Benar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-gray-600">Salah</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-300 rounded"></div>
                      <span className="text-gray-600">Tidak Dijawab</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Analisis per Topik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.map(({ topic, correct, total, percentage }) => (
                      <div key={topic} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{topic}</span>
                          <span className="text-sm text-gray-600">
                            {correct}/{total} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-[#295782] h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  onClick={() => navigate(`/tryout/${id}`)}
                  className="flex-1 bg-[#89B0C7] hover:bg-[#89B0C7]/90 text-white py-6 text-lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Ulangi Tryout
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="flex-1 py-6 text-lg"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Kembali ke Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
