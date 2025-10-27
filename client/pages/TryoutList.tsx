import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, ChevronDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface Tryout {
  id: string;
  nama_tryout: string;
  tanggal_ujian: string;
  kategori: string;
  status: string;
  durasi_menit: number;
  jumlah_soal: number;
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

  const kategoriOptions = ['Semua', 'SNBT', 'UTBK', 'Saintek', 'Soshum', 'Campuran'];
  const jadwalOptions = ['Semua', 'Hari Ini', 'Minggu Ini', 'Bulan Ini'];
  const statusOptions = ['Semua', 'Belum Dikerjakan', 'Sedang Dikerjakan', 'Selesai'];

  useEffect(() => {
    fetchCurrentUser();
    fetchTryouts();
  }, []);

  useEffect(() => {
    filterTryouts();
  }, [tryouts, selectedKategori, selectedJadwal, selectedStatus, searchQuery]);

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      setCurrentUser(userData);
    }
  };

  const fetchTryouts = async () => {
    try {
      setIsLoading(true);

      const { data: tryoutsData, error: tryoutsError } = await supabase
        .from('tryouts')
        .select('*')
        .eq('status', 'active')
        .order('tanggal_ujian', { ascending: true });

      if (tryoutsError) throw tryoutsError;

      const { data: countsData, error: countsError } = await supabase
        .from('questions')
        .select('tryout_id');

      if (countsError) throw countsError;

      const countMap: Record<string, number> = {};
      countsData?.forEach((q: any) => {
        countMap[q.tryout_id] = (countMap[q.tryout_id] || 0) + 1;
      });

      const { data: { session } } = await supabase.auth.getSession();
      let progressMap: Record<string, TryoutProgress> = {};

      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id')
          .eq('auth_id', session.user.id)
          .single();

        if (userData) {
          const { data: progressData } = await supabase
            .from('tryout_progress')
            .select('*')
            .eq('user_id', userData.user_id);

          progressData?.forEach((p: any) => {
            progressMap[p.tryout_id] = {
              status: p.status,
              questions_answered: p.questions_answered,
              total_questions: p.total_questions,
              score: p.score
            };
          });
        }
      }

      const tryoutsWithData = tryoutsData?.map((tryout: Tryout) => ({
        ...tryout,
        jumlah_soal: countMap[tryout.id] || 0,
        progress: progressMap[tryout.id]
      })) || [];

      setTryouts(tryoutsWithData);
      setFilteredTryouts(tryoutsWithData);
    } catch (error: any) {
      console.error('Error fetching tryouts:', error);
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
        const tryoutDay = new Date(tryoutDate.getFullYear(), tryoutDate.getMonth(), tryoutDate.getDate());
        
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
      filtered = filtered.filter(t => 
        !t.progress ? mappedStatus === 'not_started' : t.progress.status === mappedStatus
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.nama_tryout.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTryouts(filtered);
  };

  const getStatusBadge = (progress?: TryoutProgress) => {
    if (!progress || progress.status === 'not_started') {
      return (
        <div className="bg-yellow-100 px-3 py-2 rounded-lg flex items-center justify-center">
          <span className="text-yellow-700 text-[11px] font-medium leading-[16.5px]">
            Belum Mulai
          </span>
        </div>
      );
    }
    if (progress.status === 'in_progress') {
      return (
        <div className="bg-blue-100 px-3 py-2 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 text-[11px] font-medium leading-[16.5px]">
            Berlangsung
          </span>
        </div>
      );
    }
    return (
      <div className="bg-green-100 px-3 py-2 rounded-lg flex items-center justify-center">
        <span className="text-green-600 text-[11px] font-medium leading-[16.5px]">
          Selesai
        </span>
      </div>
    );
  };

  const getButtonText = (progress?: TryoutProgress) => {
    if (!progress || progress.status === 'not_started') return 'Mulai';
    if (progress.status === 'in_progress') return 'Lanjutkan';
    return 'Review Hasil';
  };

  const handleStartTryout = (tryoutId: string) => {
    navigate(`/tryout/${tryoutId}/start`);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center p-8">
      <div className="w-full max-w-[1363px] h-[845px] bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-white/95 border-b border-gray-200 px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-12 h-12 bg-gradient-to-br from-[#89b0c7] to-[#89b1c7] rounded-2xl flex items-center justify-center shadow-lg">
              <img 
                src="/Kelas-Kampus.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            
            {/* Brand */}
            <div className="flex flex-col">
              <h1 className="text-[#1d293d] font-bold text-base leading-6">
                Kelas Kampus
              </h1>
              <p className="text-[#62748e] text-xs leading-4">
                Tryout Indonesia
              </p>
            </div>
          </div>

          {/* Profile Button */}
          <button className="bg-gradient-to-br from-[#89b0c7] to-[#89b1c7] rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <span className="text-[#89b0c7] text-xs font-semibold">
                {currentUser ? getInitials(currentUser.nama_lengkap || '') : 'U'}
              </span>
            </div>
            <span className="text-white text-sm font-medium">
              {currentUser?.nama_lengkap || 'User'}
            </span>
            <ChevronDown className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-12 py-6 overflow-y-auto">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <div className="flex items-start gap-4">
              {/* Kategori Filter */}
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[#1d293d] text-[13px] font-medium leading-[19.5px]">
                  Kategori
                </label>
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

              {/* Jadwal Filter */}
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[#1d293d] text-[13px] font-medium leading-[19.5px]">
                  Jadwal
                </label>
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

              {/* Status Filter */}
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[#1d293d] text-[13px] font-medium leading-[19.5px]">
                  Status
                </label>
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

              {/* Search */}
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[#1d293d] text-[13px] font-medium leading-[19.5px]">
                  Cari Tryout
                </label>
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

          {/* Tryout Cards Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#62748e]">Memuat tryout...</div>
            </div>
          ) : filteredTryouts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-[#62748e]">Tidak ada tryout yang tersedia</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {filteredTryouts.map((tryout) => (
                <div
                  key={tryout.id}
                  className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  {/* Header with Title and Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-[#1d293d] text-[15px] font-semibold leading-[18px] mb-1.5">
                        {tryout.nama_tryout}
                      </h3>
                      <p className="text-[#62748e] text-[13px] leading-[19.5px]">
                        {tryout.jumlah_soal} Soal • Durasi {tryout.durasi_menit} Menit
                      </p>
                    </div>
                    {getStatusBadge(tryout.progress)}
                  </div>

                  {/* Progress Bar (if in progress) */}
                  {tryout.progress?.status === 'in_progress' && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#62748e]">
                          Progress: {tryout.progress.questions_answered}/{tryout.progress.total_questions} Soal
                        </span>
                        <span className="text-[#1d293d] font-medium">
                          {Math.round((tryout.progress.questions_answered / tryout.progress.total_questions) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-[#89b0c7] h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(tryout.progress.questions_answered / tryout.progress.total_questions) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#62748e]" />
                    <span className="text-[#62748e] text-[11px] leading-[16.5px]">
                      Dibuka {format(new Date(tryout.tanggal_ujian), 'd MMMM yyyy', { locale: idLocale })}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => handleStartTryout(tryout.id)}
                      className="bg-gradient-to-r from-[#295782] to-[#295782] text-white px-4 py-2 rounded-xl text-[13px] font-semibold shadow-lg hover:shadow-xl transition-shadow"
                    >
                      {getButtonText(tryout.progress)}
                    </button>
                    <button className="text-[#89b0c7] text-[11px] font-medium flex items-center gap-1 hover:underline">
                      Detail Tryout
                      <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
