import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, FileText, BookOpen, AlertCircle } from 'lucide-react';
import { mockTryoutData } from '@/lib/mockTryoutData';

export default function TryoutIntro() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isStarting, setIsStarting] = useState(false);

  const tryoutData = mockTryoutData;

  const handleStartTryout = () => {
    setIsStarting(true);
    setTimeout(() => {
      navigate(`/tryout/${id}/start`);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-3xl shadow-2xl">
            <CardHeader className="text-center space-y-4 pb-4">
              <div className="flex justify-center">
                <Badge className="bg-[#89B0C7] text-white text-sm px-4 py-1">
                  Tryout SNBT 2026
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                {tryoutData.nama_tryout}
              </CardTitle>
              <p className="text-gray-600">
                Belajar efektif, nilai maksimal. Mulai dari Try Out Online sekarang juga!
              </p>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <Clock className="w-8 h-8 text-[#295782]" />
                  <div>
                    <p className="text-sm text-gray-600">Durasi</p>
                    <p className="font-semibold text-gray-900">{tryoutData.durasi_menit} Menit</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <FileText className="w-8 h-8 text-[#295782]" />
                  <div>
                    <p className="text-sm text-gray-600">Jumlah Soal</p>
                    <p className="font-semibold text-gray-900">{tryoutData.total_soal} Soal</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <BookOpen className="w-8 h-8 text-[#295782]" />
                  <div>
                    <p className="text-sm text-gray-600">Tipe</p>
                    <p className="font-semibold text-gray-900">Multiple Choice</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">Peraturan dan Instruksi Tryout:</h3>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>Pastikan koneksi internet Anda stabil selama ujian</li>
                      <li>Setiap soal memiliki 5 pilihan jawaban (A, B, C, D, E)</li>
                      <li>Anda dapat menandai soal untuk ditinjau kembali</li>
                      <li>Jawaban akan tersimpan otomatis saat Anda berpindah soal</li>
                      <li>Waktu akan terus berjalan dan tidak dapat di-pause</li>
                      <li>Ujian akan otomatis berakhir saat waktu habis</li>
                      <li>Pastikan menyelesaikan semua soal sebelum waktu habis</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleStartTryout}
                  disabled={isStarting}
                  className="w-full bg-[#295782] hover:bg-[#295782]/90 text-white py-6 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200"
                >
                  {isStarting ? 'Memulai Ujian...' : 'Mulai Ujian Sekarang'}
                </Button>

                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="w-full py-6 text-lg font-medium rounded-xl"
                >
                  Kembali ke Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-gray-500 text-sm mt-6 text-center">
            © 2026 Kelas Kampus - Tryout Indonesia
          </p>
        </div>
      </div>
    </div>
  );
}
