import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, ChevronDown, Calendar, Lock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { generateAccessToken } from '@/lib/tryoutToken';
import { checkTryoutAccess, logAccessAttempt, checkExistingAttempt } from '@/lib/tryoutAccess';

interface Tryout {
  id: string;
  nama_tryout: string;
  tanggal_ujian: string;
  kategori: string;
  status: string;
  durasi_menit: number;
  jumlah_soal: number;
  is_free?: boolean;
}

interface TryoutProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  questions_answered: number;
  total_questions: number;
  score?: number;
}

interface TryoutWithProgress extends Tryout {
  progress?: TryoutProgress;
}

export default function TryoutList() {
  const navigate = useNavigate();
  const [tryouts, setTryouts] = useState<TryoutWithProgress[]>([]);
  const [filteredTryouts, setFilteredTryouts] = useState<TryoutWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedJadwal, setSelectedJadwal] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    loadTryouts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tryouts, selectedKategori, selectedJadwal, selectedStatus, searchQuery]);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: userData } = await supabase
            .from("users")
            .select("user_id, nama_lengkap, email, photo_profile")
            .eq("auth_id", authUser.id)
            .single();

          if (userData) {
            setCurrentUser({
              user_id: userData.user_id,
              nama: userData.nama_lengkap || authUser.user_metadata?.nama_lengkap || "User",
              email: userData.email || authUser.email,
              photo: userData.photo_profile
            });
            return;
          }
        }
      } else {
        const token = localStorage.getItem("auth_token");
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const { data: userData } = await supabase
            .from("users")
            .select("user_id, nama_lengkap, email, photo_profile")
            .eq("user_id", payload.user_id)
            .single();

          if (userData) {
            setCurrentUser({
              user_id: userData.user_id,
              nama: userData.nama_lengkap || payload.nama_lengkap || "User",
              email: userData.email || payload.email,
              photo: userData.photo_profile
            });
            return;
          }
        }
      }

      setCurrentUser({ 
        user_id: "temp-user", 
        nama: "User", 
        email: "user@example.com",
        photo: null 
      });
    } catch (error) {
      console.error('Error loading user:', error);
      setCurrentUser({ 
        user_id: "temp-user", 
        nama: "User", 
        email: "user@example.com",
        photo: null 
      });
    }
  };

  const loadTryouts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tryouts')
        .select('*')
        .order('tanggal_ujian', { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        const tryoutsWithProgress = data.map(tryout => ({
          ...tryout,
          progress: {
            status: 'not_started' as const,
            questions_answered: 0,
            total_questions: tryout.jumlah_soal
          }
        }));

        setTryouts(tryoutsWithProgress);
      }
    } catch (error: any) {
      console.error('Error loading tryouts:', error);
      setError(error.message || 'Gagal memuat data tryout');
      toast.error('Gagal memuat tryout');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tryouts];

    if (selectedKategori !== 'Semua') {
      filtered = filtered.filter(t => t.kategori === selectedKategori);
    }

    if (selectedJadwal !== 'Semua') {
      const today = new Date();
      filtered = filtered.filter(t => {
        const tryoutDate = new Date(t.tanggal_ujian);
        if (selectedJadwal === 'Hari Ini') {
          return tryoutDate.toDateString() === today.toDateString();
        } else if (selectedJadwal === 'Minggu Ini') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return tryoutDate >= weekAgo && tryoutDate <= today;
        } else if (selectedJadwal === 'Bulan Ini') {
          return tryoutDate.getMonth() === today.getMonth() && 
                 tryoutDate.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }

    if (selectedStatus !== 'Semua') {
      filtered = filtered.filter(t => {
        if (selectedStatus === 'Belum Dikerjakan') {
          return t.progress?.status === 'not_started';
        } else if (selectedStatus === 'Sedang Dikerjakan') {
          return t.progress?.status === 'in_progress';
        } else if (selectedStatus === 'Selesai') {
          return t.progress?.status === 'completed';
        }
        return true;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.nama_tryout.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTryouts(filtered);
  };

  // ✅ UPDATED: Handle start dengan tokenization
  const handleStartTryout = async (tryout: Tryout) => {
    try {
      if (!currentUser || currentUser.user_id === 'temp-user') {
        toast.error('Silakan login terlebih dahulu');
        navigate('/signin');
        return;
      }

      // ✅ Step 1: Check access control
      const accessCheck = await checkTryoutAccess(tryout.id, currentUser.user_id);

      if (!accessCheck.hasAccess) {
        toast.error(accessCheck.reason || 'Akses ditolak');
        logAccessAttempt(currentUser.user_id, tryout.id, 'access', false, accessCheck.reason);

        // Redirect ke packages
        setTimeout(() => {
          navigate('/packages');
        }, 2000);
        return;
      }

      // ✅ Step 2: Check existing attempts
      const attemptCheck = await checkExistingAttempt(currentUser.user_id, tryout.id);

      // ✅ Step 3: Generate access token
      const accessToken = generateAccessToken(
        tryout.id,
        currentUser.user_id,
        attemptCheck.attemptNumber
      );

      // ✅ Step 4: Save token to localStorage
      localStorage.setItem(`tryout_access_${tryout.id}`, accessToken.token);

      // ✅ Step 5: Log successful access
      logAccessAttempt(currentUser.user_id, tryout.id, 'access', true);

      // ✅ Step 6: Show success message
      toast.success('✅ Akses tryout berhasil!');

      // ✅ Step 7: Navigate with token
      setTimeout(() => {
        navigate(`/tryout/${tryout.id}/start`, {
          state: {
            accessToken: accessToken.token,
            tryoutData: tryout
          },
        });
      }, 500);

    } catch (error) {
      console.error('Error starting tryout:', error);
      toast.error('Gagal memulai tryout. Silakan coba lagi.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'not_started': { label: 'Belum Dikerjakan', color: 'bg-gray-100 text-gray-700' },
      'in_progress': { label: 'Sedang Dikerjakan', color: 'bg-yellow-100 text-yellow-700' },
      'completed': { label: 'Selesai', color: 'bg-green-100 text-green-700' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;

    return (
      <Badge className={`${config.color} text-xs font-medium`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#295782] mx-auto mb-4"></div>
          <p className="text-[#295782] font-semibold">Memuat tryout...</p>
          <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white">
        <Header 
          userName={currentUser?.nama || "User"}
          userPhoto={currentUser?.photo}
          activeMenu="tryout"
          variant="default"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-semibold mb-2">⚠️ Terjadi Kesalahan</p>
            <p className="text-red-500 text-sm">{error}</p>
            <Button 
              onClick={loadTryouts}
              className="mt-4 bg-red-600 hover:bg-red-700"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFF6FB] to-white">
      <Header 
        userName={currentUser?.nama || "User"}
        userPhoto={currentUser?.photo}
        activeMenu="tryout"
        variant="default"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">
            Daftar Try Out
          </h1>
          <p className="text-[#64748B]">
            Pilih try out yang ingin kamu kerjakan
          </p>
        </div>

        {/* Filters & Search */}
        <Card className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari tryout..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Kategori Filter */}
            <Select value={selectedKategori} onValueChange={setSelectedKategori}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Kategori</SelectItem>
                <SelectItem value="SNBT">SNBT</SelectItem>
                <SelectItem value="UTBK">UTBK</SelectItem>
                <SelectItem value="CPNS">CPNS</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>

            {/* Jadwal Filter */}
            <Select value={selectedJadwal} onValueChange={setSelectedJadwal}>
              <SelectTrigger>
                <SelectValue placeholder="Jadwal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Waktu</SelectItem>
                <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
                <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Status</SelectItem>
                <SelectItem value="Belum Dikerjakan">Belum Dikerjakan</SelectItem>
                <SelectItem value="Sedang Dikerjakan">Sedang Dikerjakan</SelectItem>
                <SelectItem value="Selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Info */}
          {(selectedKategori !== 'Semua' || selectedJadwal !== 'Semua' || selectedStatus !== 'Semua' || searchQuery) && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Menampilkan <span className="font-bold text-[#295782]">{filteredTryouts.length}</span> tryout
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedKategori('Semua');
                  setSelectedJadwal('Semua');
                  setSelectedStatus('Semua');
                  setSearchQuery('');
                }}
                className="text-[#295782] hover:text-[#1e4060]"
              >
                Reset Filter
              </Button>
            </div>
          )}
        </Card>

        {/* Tryout List */}
        {filteredTryouts.length === 0 ? (
          <Card className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Tidak ada tryout yang tersedia
            </p>
            <p className="text-sm text-gray-500">
              Coba ubah filter atau cari dengan kata kunci lain
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTryouts.map((tryout) => (
              <Card 
                key={tryout.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Card Header dengan Gradient */}
                <div className="bg-gradient-to-r from-[#295782] to-[#3b7aa8] p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className="bg-white/20 text-white border-0">
                      {tryout.kategori}
                    </Badge>
                    {tryout.is_free && (
                      <Badge className="bg-green-500 text-white border-0">
                        GRATIS
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white line-clamp-2">
                    {tryout.nama_tryout}
                  </h3>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(tryout.tanggal_ujian), 'dd MMMM yyyy', { locale: idLocale })}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">📝</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Soal</p>
                        <p className="text-sm font-bold text-gray-900">{tryout.jumlah_soal}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-xs">⏱️</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Durasi</p>
                        <p className="text-sm font-bold text-gray-900">{tryout.durasi_menit} min</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Status */}
                  <div className="mb-4">
                    {getStatusBadge(tryout.progress?.status || 'not_started')}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleStartTryout(tryout)}
                    className="w-full bg-gradient-to-r from-[#295782] to-[#3b7aa8] hover:from-[#1e4060] hover:to-[#295782] text-white font-semibold py-5 rounded-lg shadow-md group-hover:shadow-xl transition-all"
                  >
                    {tryout.progress?.status === 'completed' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Lihat Hasil
                      </>
                    ) : tryout.progress?.status === 'in_progress' ? (
                      <>
                        Lanjutkan Ujian
                      </>
                    ) : (
                      <>
                        {tryout.is_free ? '🚀 Mulai Gratis' : '🔒 Mulai Tryout'}
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
