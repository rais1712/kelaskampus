import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, FileText, BookOpen, AlertCircle, ShieldCheck } from 'lucide-react';
import { mockTryoutData } from '@/lib/mockTryoutData';
import { verifyAccessToken, createTryoutSession } from '@/lib/tryoutToken';
import { logAccessAttempt } from '@/lib/tryoutAccess';
import { toast } from 'sonner';

export default function TryoutIntro() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [isStarting, setIsStarting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const tryoutData = mockTryoutData;

  useEffect(() => {
    verifyAccess();
  }, [id]);

  const verifyAccess = () => {
    try {
      // ✅ Get token from location.state or localStorage
      let token = location.state?.accessToken || localStorage.getItem(`tryout_access_${id}`);

      if (!token) {
        console.error('❌ No access token found');
        toast.error('Akses tidak valid. Mulai dari daftar tryout.');
        navigate('/tryout');
        return;
      }

      // ✅ Verify token
      const verified = verifyAccessToken(token);

      if (!verified) {
        toast.error('Token tidak valid atau sudah expired');
        navigate('/tryout');
        return;
      }

      // ✅ Check tryout ID match
      if (verified.tryout_id !== id) {
        console.error('❌ Tryout ID mismatch');
        toast.error('Token tidak sesuai dengan tryout');
        navigate('/tryout');
        return;
      }

      console.log('✅ Access verified:', verified);
      setAccessToken(token);
      setIsVerifying(false);

    } catch (error) {
      console.error('Error verifying access:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
      navigate('/tryout');
    }
  };

  const handleStartTryout = () => {
    setIsStarting(true);

    try {
      if (!accessToken) {
        toast.error('Token tidak valid');
        navigate('/tryout');
        return;
      }

      // ✅ Verify token again before starting
      const verified = verifyAccessToken(accessToken);

      if (!verified) {
        toast.error('Token tidak valid atau expired');
        navigate('/tryout');
        return;
      }

      // ✅ Create session
      const session = createTryoutSession(verified, tryoutData.durasi_menit);

      // ✅ Log start
      logAccessAttempt(verified.user_id, verified.tryout_id, 'start', true);

      // ✅ Navigate to exam
      setTimeout(() => {
        navigate(`/tryout/${id}/exam`, {
          state: {
            sessionId: session.session_id,
          },
        });
      }, 500);
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error('Gagal memulai ujian');
      setIsStarting(false);
    }
  };

  // ✅ Show loading while verifying
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#EFF6FB] to-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-gray-700">Memverifikasi akses...</p>
          <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with security badge */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {tryoutData.nama_tryout}
          </h1>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            ✅ Akses Terverifikasi
          </Badge>
        </div>

        {/* Tryout Info Card */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Informasi Tryout
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Durasi</p>
                  <p className="text-lg font-bold text-gray-900">
                    {tryoutData.durasi_menit} Menit
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jumlah Soal</p>
                  <p className="text-lg font-bold text-gray-900">
                    {tryoutData.total_soal} Soal
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipe</p>
                  <p className="text-lg font-bold text-gray-900">Multiple Choice</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules Card */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="bg-yellow-50 border-b">
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="w-5 h-5" />
              Peraturan & Ketentuan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Pastikan koneksi internet stabil selama mengerjakan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Jangan refresh atau tutup browser saat ujian berlangsung</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>
                  Berpindah tab lebih dari 3 kali akan menyebabkan ujian otomatis ter-submit
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Waktu akan berjalan otomatis setelah ujian dimulai</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>
                  Jawaban akan tersimpan otomatis, pastikan submit sebelum waktu habis
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/tryout')}
            className="flex-1 py-6 text-lg font-semibold"
            disabled={isStarting}
          >
            Kembali
          </Button>

          <Button
            onClick={handleStartTryout}
            disabled={isStarting}
            className="flex-1 py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Memulai...
              </>
            ) : (
              '🚀 Mulai Ujian Sekarang'
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            © 2025 Kelas Kampus - Platform Tryout Indonesia
          </p>
        </div>
      </div>
    </div>
  );
}
