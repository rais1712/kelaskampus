// pages/TryoutStart.tsx
// Halaman persiapan sebelum mulai tryout

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  FileText, 
  BookOpen, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle,
  Info,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { verifyAccessToken, createTryoutSession } from '@/lib/tryoutToken';
import { logAccessAttempt } from '@/lib/tryoutAccess';

export default function TryoutStart() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tryoutId } = useParams();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tryoutData, setTryoutData] = useState<any>(null);
  const [subtests, setSubtests] = useState<any[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [hasExistingAttempt, setHasExistingAttempt] = useState(false);
  const [existingAttempt, setExistingAttempt] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    verifyAccessAndLoadData();
  }, [tryoutId]);

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

  const verifyAccessAndLoadData = async () => {
    try {
      setIsVerifying(true);

      // ✅ Verify access token
      let token = location.state?.accessToken || localStorage.getItem(`tryout_access_${tryoutId}`);

      if (!token) {
        toast.error('Akses tidak valid');
        navigate('/tryout');
        return;
      }

      const verified = verifyAccessToken(token);
      if (!verified || verified.tryout_id !== tryoutId) {
        toast.error('Token tidak valid atau expired');
        navigate('/tryout');
        return;
      }

      setAccessToken(token);

      // ✅ Load tryout data (Direct Supabase)
      const { data: tryout, error: tryoutError } = await supabase
        .from('tryouts')
        .select('*')
        .eq('id', tryoutId)
        .single();

      if (tryoutError) throw tryoutError;
      setTryoutData(tryout);

      // ✅ Load subtests (Direct Supabase)
      const { data: subtestsData, error: subtestsError } = await supabase
        .from('subtest')
        .select('*')
        .eq('tryout_id', tryoutId)
        .order('urutan', { ascending: true });

      if (subtestsError) throw subtestsError;
      setSubtests(subtestsData || []);

      // ✅ Count total questions (Direct Supabase)
      const { count, error: countError } = await supabase
        .from('soal')
        .select('*', { count: 'exact', head: true })
        .eq('tryout_id', tryoutId);

      if (countError) throw countError;
      setTotalQuestions(count || 0);

      // ✅ Check existing attempt (Direct Supabase)
      if (verified.user_id) {
        const { data: attemptData, error: attemptError } = await supabase
          .from('user_attempts')
          .select('*')
          .eq('user_id', verified.user_id)
          .eq('tryout_id', tryoutId)
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        if (attemptData && !attemptError) {
          setHasExistingAttempt(true);
          setExistingAttempt(attemptData);
        }
      }

      setIsVerifying(false);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat memuat data');
      navigate('/tryout');
    }
  };

  const handleStartTryout = async () => {
    setIsLoading(true);

    try {
      const verified = verifyAccessToken(accessToken!);
      if (!verified) {
        toast.error('Token tidak valid');
        navigate('/tryout');
        return;
      }

      // If has subtests, navigate to subtest selection
      if (subtests.length > 0) {
        logAccessAttempt(verified.user_id, verified.tryout_id, 'start', true, { 
          action: 'select_subtest' 
        });

        navigate(`/tryout/${tryoutId}/subtests`, {
          state: { accessToken, tryoutData, subtests }
        });
      } else {
        // No subtests - direct to exam
        const session = createTryoutSession(verified, tryoutData.durasi_menit);
        
        logAccessAttempt(verified.user_id, verified.tryout_id, 'start', true, {
          action: 'start_exam',
          session_id: session.session_id
        });

        toast.success('Memulai ujian...');

        setTimeout(() => {
          navigate(`/tryout/${tryoutId}/exam`, {
            state: { 
              sessionId: session.session_id, 
              tryoutData, 
              subtestId: null 
            }
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memulai ujian');
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!existingAttempt) return;

    toast.info('Melanjutkan tryout...');
    
    setTimeout(() => {
      navigate(`/tryout/${tryoutId}/exam`, {
        state: { 
          continueAttempt: true,
          attemptId: existingAttempt.id 
        }
      });
    }, 500);
  };

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
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/tryout')}
          className="mb-6 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Daftar Tryout
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {tryoutData?.nama_tryout}
          </h1>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-1">
            ✅ Akses Terverifikasi
          </Badge>
        </div>

        {/* Continue Session Warning */}
        {hasExistingAttempt && (
          <Card className="mb-6 border-2 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-2">
                    ⚠️ Ada Sesi yang Belum Selesai
                  </h3>
                  <p className="text-sm text-yellow-800 mb-4">
                    Anda memiliki sesi tryout yang masih berlangsung. Pilih salah satu:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleContinue} 
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Lanjutkan Sesi Sebelumnya
                    </Button>
                    <Button 
                      onClick={handleStartTryout} 
                      variant="outline" 
                      className="flex-1 border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                      disabled={isLoading}
                    >
                      🔄 Mulai dari Awal (Reset)
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tryout Info */}
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
                  <p className="text-lg font-bold text-gray-900">{tryoutData?.durasi_menit} Menit</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jumlah Soal</p>
                  <p className="text-lg font-bold text-gray-900">{totalQuestions} Soal</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subtest</p>
                  <p className="text-lg font-bold text-gray-900">
                    {subtests.length > 0 ? `${subtests.length} Bagian` : 'Semua Soal'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subtests List */}
        {subtests.length > 0 && (
          <Card className="shadow-lg border-0 mb-6">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-gray-900">Subtest yang Akan Dikerjakan</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {subtests.map((subtest, index) => (
                  <div key={subtest.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{subtest.nama_subtest}</p>
                        <p className="text-sm text-gray-500">
                          {subtest.jumlah_soal} soal • {subtest.durasi_menit || tryoutData?.durasi_menit} menit
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Bobot {subtest.bobot_nilai}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rules */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="bg-yellow-50 border-b">
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Info className="w-5 h-5" />
              Peraturan & Ketentuan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Pastikan koneksi internet stabil selama ujian</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Jangan refresh browser saat ujian berlangsung</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Jawaban akan tersimpan otomatis setiap 10 detik</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Soal akan tampil secara acak untuk mencegah kecurangan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-1">•</span>
                <span>Timer akan berjalan otomatis saat ujian dimulai</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Button */}
        {!hasExistingAttempt && (
          <Button 
            onClick={handleStartTryout} 
            disabled={isLoading} 
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Memproses...
              </>
            ) : (
              <>
                🚀 {subtests.length > 0 ? 'Pilih Subtest' : 'Mulai Ujian Sekarang'}
                {subtests.length > 0 && <ArrowRight className="w-5 h-5 ml-2" />}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
