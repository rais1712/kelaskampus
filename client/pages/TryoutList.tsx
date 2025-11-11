// pages/TryoutList.tsx


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

interface Tryout {
  id: string;
  nama_tryout: string;
  tanggal_ujian: string;
  kategori: string;
  status: string;
  durasi_menit: number;
  jumlah_soal: number;
}

export default function TryoutList() {
  const navigate = useNavigate();
  
  const [tryouts, setTryouts] = useState<Tryout[]>([]);
  const [filteredTryouts, setFilteredTryouts] = useState<Tryout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedKategori, setSelectedKategori] = useState('Semua');
  const [selectedJadwal, setSelectedJadwal] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const kategoriOptions = ['Semua', 'SNBT', 'UTBK', 'Saintek', 'Soshum', 'Campuran'];
  const jadwalOptions = ['Semua', 'Hari Ini', 'Minggu Ini', 'Bulan Ini'];

  useEffect(() => {
    fetchCurrentUser();
    fetchTryouts();
  }, []);

  useEffect(() => {
    filterTryouts();
  }, [tryouts, selectedKategori, selectedJadwal, searchQuery]);

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

  // ✅ FIXED: Only fetch tryouts via API
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

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.nama_tryout.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTryouts(filtered);
  };

  // ✅ SIMPLIFIED: No progress status
  const getStatusBadge = () => {
    return (
      <div className="bg-blue-100 px-3 py-2 rounded-lg">
        <span className="text-blue-700 text-[11px] font-medium">Tersedia</span>
      </div>
    );
  };

  const handleStartTryout = async (tryoutId: string) => {
    if (!currentUser?.user_id) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/signin');
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
          <p className="text-[#62748e]">Pilih tryout untuk mulai latihan.</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-3 gap-4">
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

        {/* Empty State */}
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
            {filteredTryouts.map((tryout) => (
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
                  {getStatusBadge()}
                </div>

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
                  Mulai
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
