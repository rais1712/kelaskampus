// pages/SubtestSelection.tsx
// Halaman pemilihan subtest

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, FileText, Star } from 'lucide-react';
import { toast } from 'sonner';
import { verifyAccessToken, createTryoutSession } from '@/lib/tryoutToken';
import { logAccessAttempt } from '@/lib/tryoutAccess';

export default function SubtestSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tryoutId } = useParams();
  
  const [selectedSubtest, setSelectedSubtest] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const accessToken = location.state?.accessToken;
  const tryoutData = location.state?.tryoutData;
  const subtests = location.state?.subtests || [];

  useEffect(() => {
    // Validate data
    if (!accessToken || !tryoutData || subtests.length === 0) {
      toast.error('Data tidak valid');
      navigate('/tryout');
    }
  }, []);

  const handleStartSubtest = async () => {
    if (!selectedSubtest) {
      toast.error('Silakan pilih subtest terlebih dahulu');
      return;
    }

    setIsStarting(true);

    try {
      const verified = verifyAccessToken(accessToken);
      if (!verified) {
        toast.error('Token tidak valid atau expired');
        navigate('/tryout');
        return;
      }

      const subtest = subtests.find((s: any) => s.id === selectedSubtest);
      const duration = subtest?.durasi_menit || tryoutData.durasi_menit;
      
      // Create session
      const session = createTryoutSession(verified, duration);

      // Log access
      logAccessAttempt(verified.user_id, verified.tryout_id, 'start', true, {
        subtest_id: selectedSubtest,
        subtest_name: subtest.nama_subtest
      });

      toast.success(`Memulai ${subtest.nama_subtest}...`);

      setTimeout(() => {
        navigate(`/tryout/${tryoutId}/exam`, {
          state: {
            sessionId: session.session_id,
            tryoutData,
            subtestId: selectedSubtest,
            subtestData: subtest
          }
        });
      }, 1000);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memulai subtest');
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pilih Subtest</h1>
          <p className="text-gray-600">{tryoutData?.nama_tryout}</p>
          <p className="text-sm text-gray-500 mt-1">
            Pilih salah satu subtest yang ingin dikerjakan
          </p>
        </div>

        {/* Subtest Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {subtests.map((subtest: any, index: number) => {
            const isSelected = selectedSubtest === subtest.id;
            
            return (
              <Card
                key={subtest.id}
                onClick={() => setSelectedSubtest(subtest.id)}
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                  isSelected 
                    ? 'ring-4 ring-blue-500 shadow-2xl scale-105' 
                    : 'hover:scale-102'
                }`}
              >
                <CardHeader className={`${
                  isSelected 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-700'
                } text-white transition-all`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        isSelected ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <CardTitle className="text-lg">{subtest.nama_subtest}</CardTitle>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-8 h-8 animate-bounce" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Question Count */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText className="w-5 h-5" />
                        <span className="text-sm">Jumlah Soal</span>
                      </div>
                      <span className="font-bold text-gray-900 text-lg">
                        {subtest.jumlah_soal} soal
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm">Durasi</span>
                      </div>
                      <span className="font-bold text-gray-900 text-lg">
                        {subtest.durasi_menit || tryoutData.durasi_menit} menit
                      </span>
                    </div>

                    {/* Weight */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Star className="w-5 h-5" />
                        <span className="text-sm">Bobot Nilai</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-base px-3 py-1">
                        {subtest.bobot_nilai}%
                      </Badge>
                    </div>

                    {/* Description (if available) */}
                    {subtest.deskripsi && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-700">
                          {subtest.deskripsi}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Subtest Confirmation */}
        {selectedSubtest && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Subtest Terpilih:</p>
                    <p className="text-xl font-bold text-blue-900">
                      {subtests.find((s: any) => s.id === selectedSubtest)?.nama_subtest}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {subtests.find((s: any) => s.id === selectedSubtest)?.jumlah_soal} soal • 
                      {' '}{subtests.find((s: any) => s.id === selectedSubtest)?.durasi_menit || tryoutData.durasi_menit} menit
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleStartSubtest} 
                  disabled={isStarting} 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {isStarting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Memulai...
                    </>
                  ) : (
                    <>
                      🚀 Mulai Subtest
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8 bg-yellow-50 border-2 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💡</span>
              </div>
              <div>
                <p className="font-semibold text-yellow-900 mb-2">Catatan Penting:</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Pilih subtest sesuai dengan yang ingin dikerjakan</li>
                  <li>• Setiap subtest memiliki durasi dan bobot nilai yang berbeda</li>
                  <li>• Pastikan koneksi internet stabil sebelum memulai</li>
                  <li>• Anda dapat mengerjakan subtest lain setelah menyelesaikan yang dipilih</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
