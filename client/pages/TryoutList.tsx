// pages/TryoutList.tsx
// HYBRID: Tampilan code user + Fungsionalitas Direct Supabase + Empty state mockup

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { Search, ChevronDown, Calendar, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { id as idLocale } from 'date-fns/locale';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { generateAccessToken } from '@/lib/tryoutToken';
import { logAccessAttempt } from '@/lib/tryoutAccess';

interface TryoutProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  questions_answered: number;
  total_questions: number;
  score?: number | null;
}

interface Tryout {
  id: string;
  nama_tryout: string;
  tanggal_ujian: string;
  kategori: string;
  status: string;
  durasi_menit: number;
  jumlah_soal: number;
  progress: TryoutProgress;
}

export default function TryoutList() {
  const navigate = useNavigate();
  
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [filteredTryouts, setFilteredTryouts] = useState<Tryout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<Map<string, TryoutProgress>>(new Map());

  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedJadwal, setSelectedJadwal] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const kategoriOptions = ['Semua', 'SNBT', 'UTBK', 'Saintek', 'Soshum', 'Campuran'];
  const jadwalOptions = ['Semua', 'Hari Ini', 'Minggu Ini', 'Bulan Ini'];
  const statusOptions = ['Semua', 'Belum Dikerjakan', 'Sedang Dikerjakan', 'Selesai'];

  useEffect(() => {
    fetchCurrentUser();
    fetchTryouts();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUserProgress();
    }
  }, [currentUser]);

  useEffect(() => {
    filterTryouts();
  }, [tryouts, selectedKategori, selectedJadwal, selectedStatus, searchQuery, userProgress]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id, nama_lengkap, username, photo_profile, auth_id')
          .eq('auth_id', session.user.id)
          .single();
        
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // ✅ IMPROVED: Direct Supabase with API fallback
  const fetchTryouts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Fetching tryouts...');

      // Try API first
      try {
        const response = await api.getTryouts();
        const tryoutsData = Array.isArray(response?.data) ? response.data : [];
        
        if (tryoutsData.length > 0) {
          setTryouts(tryoutsData);
          console.log(`✅ Loaded ${tryoutsData.length} tryouts via API`);
          return;
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, trying direct Supabase...');
      }

      // Fallback to Direct Supabase
      const { data, error: dbError } = await supabase
        .from('tryouts')
        .select('*')
        .eq('status', 'active')
        .order('tanggal_ujian', { ascending: false });

      if (dbError) throw dbError;

      setTryouts(data || []);
      console.log(`✅ Loaded ${data?.length || 0} tryouts via Supabase`);

    } catch (err: any) {
      console.error('❌ Error fetching tryouts:', err);
      setError(err.message || 'Gagal memuat data tryout');
      toast.error('Gagal memuat daftar tryout');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    if (!currentUser?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_attempts')
        .select('tryout_id, status, score, finished_at, answers')
        .eq('user_id', currentUser.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const progressMap = new Map<string, TryoutProgress>();
      data?.forEach(attempt => {
        if (!progressMap.has(attempt.tryout_id)) {
          const answersCount = Object.keys(attempt.answers || {}).length;
          const totalQuestions = 40; // Default, can be fetched from tryout

          progressMap.set(attempt.tryout_id, {
            tryout_id: attempt.tryout_id,
            status: attempt.status,
            score: attempt.score,
            questions_answered: answersCount,
            total_questions: totalQuestions,
          });
        }
      });

      setUserProgress(progressMap);
      console.log(`✅ Loaded progress for ${progressMap.size} tryouts`);
      
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const filterTryouts = () => {
    let filtered = [...tryouts];

    if (selectedKategori !== 'Semua') {
      filtered = filtered.filter(t => t.kategori === selectedKategori);
    }

    if (selectedJadwal !== 'Semua') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(t => {
        const tryoutDate = new Date(t.tanggal_ujian);
        const tryoutDay = new Date(
          tryoutDate.getFullYear(), 
          tryoutDate.getMonth(), 
          tryoutDate.getDate()
        );
        
        if (selectedJadwal === 'Hari Ini') {
          return tryoutDay.getTime() === today.getTime();
        } else if (selectedJadwal === 'Minggu Ini') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return tryoutDay >= weekStart && tryoutDay <= weekEnd;
        } else if (selectedJadwal === 'Bulan Ini') {
          return tryoutDate.getMonth() === now.getMonth() && 
                 tryoutDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    if (selectedStatus !== 'Semua') {
      const statusMap: Record<string, string> = {
        'Belum Dikerjakan': 'not_started',
        'Sedang Dikerjakan': 'in_progress',
        'Selesai': 'completed'
      };
      const mappedStatus = statusMap[selectedStatus];
      
      filtered = filtered.filter(t => {
        const progress = userProgress.get(t.id);
        if (!progress) return mappedStatus === 'not_started';
        return progress.status === mappedStatus;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.nama_tryout.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTryouts(filtered);
  };

  const getStatusBadge = (tryoutId: string) => {
    const progress = userProgress.get(tryoutId);

    if (!progress || progress.status === 'not_started') {
      return (
        <div className="bg-gray-100 px-3 py-2 rounded-lg">
          <span className="text-gray-700 text-[11px] font-medium">Belum Dimulai</span>
        </div>
      );
    }
    
    if (progress.status === 'in_progress') {
      return (
        <div className="bg-blue-100 px-3 py-2 rounded-lg">
          <span className="text-blue-600 text-[11px] font-medium">Berlangsung</span>
        </div>
      );
    }
    
    return (
      <div className="bg-green-100 px-3 py-2 rounded-lg">
        <span className="text-green-600 text-[11px] font-medium">Selesai</span>
      </div>
    );
  };

  const getButtonText = (tryoutId: string) => {
    const progress = userProgress.get(tryoutId);
    
    if (!progress || progress.status === 'not_started') return 'Mulai';
    if (progress.status === 'in_progress') return 'Lanjutkan';
    return 'Review Hasil';
  };

  const handleStartTryout = async (tryoutId: string) => {
    if (!currentUser?.user_id) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/signin');
      return;
    }

    const progress = userProgress.get(tryoutId);

    if (progress?.status === 'in_progress') {
      toast.info('Melanjutkan sesi yang belum selesai...');
      navigate(`/tryout/${tryoutId}/start`);
      return;
    }

    if (progress?.status === 'completed') {
      navigate(`/tryout/${tryoutId}/result`);
      return;
    }

    // Generate access token
    const accessToken = generateAccessToken(currentUser.user_id, tryoutId);
    logAccessAttempt(currentUser.user_id, tryoutId, 'view', true);

    toast.success('Mengarahkan ke halaman persiapan...');
    
    setTimeout(() => {
      navigate(`/tryout/${tryoutId}/start`, {
        state: { accessToken: accessToken.token }
      });
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b0c7] mx-auto mb-4"></div>
          <p className="text-[#62748e] text-lg font-medium">Memuat tryout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center p-8">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-lg p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1d293d] mb-2">Oops! Terjadi Kesalahan</h2>
          <p className="text-[#62748e] mb-6">{error}</p>
          <button
            onClick={fetchTryouts}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#295782] text-white rounded-xl font-semibold hover:bg-[#1e4060] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header 
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
        activeMenu="tryout"
      />

      <div className="max-w-[1363px] mx-auto px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1d293d] mb-1">Semua Tryout</h1>
          <p className="text-[#62748e]">Pilih tryout untuk mulai latihan atau lanjutkan.</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Kategori</label>
              <div className="relative">
                <select
                  value={selectedKategori}
                  onChange={(e) => setSelectedKategori(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg px-3 py-2 text-[13px] text-[#717182] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                >
                  {kategoriOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Jadwal</label>
              <div className="relative">
                <select
                  value={selectedJadwal}
                  onChange={(e) => setSelectedJadwal(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg px-3 py-2 text-[13px] text-[#717182] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                >
                  {jadwalOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Status</label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg px-3 py-2 text-[13px] text-[#717182] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                >
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[#1d293d] text-[13px] font-medium">Cari Tryout</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari tryout..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f1f5f9] rounded-lg pl-10 pr-3 py-2 text-[13px] text-[#62748e] placeholder:text-[#62748e] focus:outline-none focus:ring-2 focus:ring-[#89b0c7]"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Empty State - Sesuai Mockup */}
        {filteredTryouts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-[#e6f3ff] rounded-full flex items-center justify-center mb-6">
              <FileText className="w-12 h-12 text-[#295782]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1d293d] mb-3 text-center">
              Mulai Latihan dengan Paket Tryout Premium!
            </h2>
            <p className="text-[#62748e] text-center mb-2">
              Akses ratusan soal, analisis mendalam, dan
            </p>
            <p className="text-[#62748e] text-center mb-8">
              pembahasan lengkap.
            </p>
            <Button
              onClick={() => navigate('/packages')}
              className="bg-[#295782] hover:bg-[#1e4060] text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg"
            >
              Lihat Paket Tryout
            </Button>
          </div>
        )}

        {/* Tryout Grid */}
        {filteredTryouts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTryouts.map((tryout) => {
              const progress = userProgress.get(tryout.id);

              return (
                <div
                  key={tryout.id}
                  className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-all hover:scale-[1.02] duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-[#1d293d] text-[15px] font-semibold mb-1.5 line-clamp-2">
                        {tryout.nama_tryout}
                      </h3>
                      <p className="text-[#62748e] text-[13px]">
                        {tryout.jumlah_soal} Soal • {tryout.durasi_menit} Menit
                      </p>
                    </div>
                    {getStatusBadge(tryout.id)}
                  </div>

                  {progress?.status === 'in_progress' && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#62748e]">
                          Progress: {progress.questions_answered}/{progress.total_questions} Soal
                        </span>
                        <span className="text-[#1d293d] font-medium">
                          {Math.round((progress.questions_answered / progress.total_questions) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-[#89b0c7] h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(progress.questions_answered / progress.total_questions) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {progress?.status === 'completed' && progress?.score !== null && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[#62748e] text-[11px]">Nilai Akhir</span>
                        <span className="text-green-600 text-[15px] font-bold">
                          {progress.score?.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#62748e]" />
                      <span className="text-[#62748e] text-[11px]">
                        {format(new Date(tryout.tanggal_ujian), 'd MMM yyyy', { locale: idLocale })}
                      </span>
                    </div>
                    <span className="text-[#89b0c7] text-[11px] font-medium bg-[#e6f3ff] px-2 py-1 rounded">
                      {tryout.kategori}
                    </span>
                  </div>

                  <button
                    onClick={() => handleStartTryout(tryout.id)}
                    className="w-full bg-gradient-to-r from-[#295782] to-[#295782] text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  >
                    {getButtonText(tryout.id)}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
