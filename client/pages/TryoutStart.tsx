// pages/TryoutStart.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, Calendar, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import SubtestList from '@/components/tryout/SubtestList';
import TargetSelectionModal from '@/components/tryout/TargetSelectionModal';
import { api } from '@/lib/api';
import { useTryoutData } from '@/hooks/useTryoutData';
import { supabase } from '@/lib/supabase';

export default function TryoutStart() {
  const { tryoutId } = useParams<{ tryoutId: string }>();
  const navigate = useNavigate();
  
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [completedKategoris, setCompletedKategoris] = useState<Set<string>>(new Set());
  const [showSubmitAllModal, setShowSubmitAllModal] = useState(false);
  const [isTryoutSubmitted, setIsTryoutSubmitted] = useState(false); // ✅ NEW: Track submit status
  
  const {
    tryout,
    groupedKategoris,
    progressData,
    currentUser,
    targetInfo,
    isLoading,
    refreshData
  } = useTryoutData(tryoutId!);

  // ✅ Check if tryout already submitted
  useEffect(() => {
    const submitStatus = localStorage.getItem(`tryout_${tryoutId}_submitted`);
    if (submitStatus === 'true') {
      setIsTryoutSubmitted(true);
    }
  }, [tryoutId]);

  useEffect(() => {
    if (tryoutId && currentUser) {
      fetchCompletedSessions();
    }
  }, [tryoutId, currentUser]);

  const fetchCompletedSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let userId = null;

      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id')
          .eq('auth_id', session.user.id)
          .single();
        userId = userData?.user_id;
      } else {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.user_id;
        }
      }

      if (!userId) return;

      const { data: sessions, error } = await supabase
        .from('tryout_sessions')
        .select('kategori_id')
        .eq('tryout_id', tryoutId)
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error || !sessions) return;

      const completed = new Set(sessions.map(s => s.kategori_id).filter(Boolean));
      setCompletedKategoris(completed);
    } catch (error) {
      console.error('Error fetching completed sessions:', error);
    }
  };

  useEffect(() => {
    if (!isLoading && !targetInfo && !isTryoutSubmitted) {
      setShowTargetModal(true);
    }
  }, [isLoading, targetInfo, isTryoutSubmitted]);

  useEffect(() => {
    if (!isLoading && tryout) {
      refreshData();
    }
  }, []);

  const handleStartTryout = async (kategoriKode?: string) => {
    // ✅ Block if already submitted
    if (isTryoutSubmitted) {
      toast.error('Tryout sudah di-submit! Lihat hasil untuk review.');
      return;
    }

    if (!targetInfo) {
      toast.error('Pilih kampus dan jurusan terlebih dahulu!');
      setShowTargetModal(true);
      return;
    }

    try {
      setIsStarting(true);

      const sessionResponse = await api.createSession({
        tryout_id: tryoutId!,
        kategori_id: kategoriKode,
        target_kampus: targetInfo.kampusName,
        target_jurusan: targetInfo.prodiName,
      });

      if (!sessionResponse?.session_id) {
        throw new Error('Failed to create session');
      }

      const params = new URLSearchParams();
      params.set('session', sessionResponse.session_id);
      if (kategoriKode) params.set('kategori', kategoriKode);

      navigate(`/tryout/${tryoutId}/exam?${params.toString()}`);
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(err.message || 'Gagal memulai tryout');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitAll = () => {
    if (completedKategoris.size === 0) {
      toast.error('Belum ada subtest yang dikerjakan!');
      return;
    }
    setShowSubmitAllModal(true);
  };

  const confirmSubmitAll = () => {
    localStorage.setItem(`tryout_${tryoutId}_submitted`, 'true');
    setIsTryoutSubmitted(true);
    toast.success('Tryout berhasil di-submit!');
    setShowSubmitAllModal(false);
  };

  // ✅ Navigate to result page
  const handleViewResult = () => {
    navigate(`/tryout/${tryoutId}/result`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b0c7] mx-auto mb-4"></div>
          <p className="text-[#62748e] font-medium">Memuat detail tryout...</p>
        </div>
      </div>
    );
  }

  if (!tryout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <p className="text-lg text-[#1d293d] font-semibold mb-4">Tryout tidak ditemukan</p>
            <button
              onClick={() => navigate('/tryout')}
              className="px-6 py-3 bg-gradient-to-r from-[#295782] to-[#89b0c7] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Kembali ke Daftar Tryout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f3ff] via-[#f8fbff] to-white">
      <Header 
        userName={currentUser?.username || currentUser?.nama_lengkap || 'User'}
        userPhoto={currentUser?.photo_profile}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/tryout')}
          className="flex items-center gap-2 text-[#62748e] hover:text-[#295782] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Kembali ke Daftar Tryout</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1d293d] mb-2">{tryout.nama_tryout}</h1>
          <div className="flex items-center gap-4 text-sm text-[#62748e]">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(tryout.tanggal_ujian), 'd MMMM yyyy', { locale: idLocale })}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {tryout.durasi_menit} menit
            </span>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total soal per subtest
            </span>
          </div>
        </div>

        {/* ✅ UPDATED: Submit All Banner OR View Result Button */}
        {isTryoutSubmitted ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">
                  Tryout sudah selesai dan di-submit
                </p>
              </div>
              <button
                onClick={handleViewResult}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg font-semibold transition-all text-sm"
              >
                <Eye className="w-4 h-4" />
                Lihat Hasil
              </button>
            </div>
          </div>
        ) : completedKategoris.size > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800">
                  {completedKategoris.size} subtest sudah dikerjakan
                </p>
              </div>
              <button
                onClick={handleSubmitAll}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg font-semibold transition-all text-sm"
              >
                Submit All Tryout
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SubtestList
              groupedKategoris={groupedKategoris}
              progressData={progressData}
              onStartSubtest={handleStartTryout}
              canStart={!!targetInfo && !isTryoutSubmitted}  // ✅ Disable if submitted
              isStarting={isStarting}
              completedKategoris={completedKategoris}
              isSubmitted={isTryoutSubmitted}  // ✅ Pass submit status
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#1d293d]">Target Kampus & Jurusan</h2>
                {!isTryoutSubmitted && (
                  <button
                    onClick={() => setShowTargetModal(true)}
                    className="text-xs text-[#295782] hover:underline font-medium"
                  >
                    {targetInfo ? 'Ubah' : 'Pilih'}
                  </button>
                )}
              </div>
              
              {targetInfo ? (
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-[#e6f3ff] to-[#f8fbff] rounded-lg p-3">
                    <p className="text-xs text-[#62748e] mb-1">Kampus Target</p>
                    <p className="text-sm font-semibold text-[#1d293d]">{targetInfo.kampusName}</p>
                  </div>
                  <div className="bg-gradient-to-r from-[#e6f3ff] to-[#f8fbff] rounded-lg p-3">
                    <p className="text-xs text-[#62748e] mb-1">Program Studi</p>
                    <p className="text-sm font-semibold text-[#1d293d]">{targetInfo.prodiName}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-orange-600 font-medium mb-2">⚠️ Belum memilih target</p>
                  {!isTryoutSubmitted && (
                    <button
                      onClick={() => setShowTargetModal(true)}
                      className="text-xs text-orange-600 hover:underline font-medium"
                    >
                      Klik untuk memilih →
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-[#295782] to-[#89b0c7] rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-3">Informasi Penting</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Koneksi internet stabil</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Kerjakan dengan fokus</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Timer otomatis berjalan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#fbbf24]">✓</span>
                  <span>Jawaban tersimpan otomatis</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Target Selection Modal */}
      {!isTryoutSubmitted && (
        <TargetSelectionModal
          show={showTargetModal}
          onClose={() => {
            if (!targetInfo) {
              toast.error('Anda harus memilih target terlebih dahulu');
            } else {
              setShowTargetModal(false);
            }
          }}
          tryoutId={tryoutId!}
          onSuccess={() => {
            setShowTargetModal(false);
            refreshData();
            toast.success('Target berhasil disimpan!');
          }}
        />
      )}

      {/* Submit All Modal */}
      {showSubmitAllModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowSubmitAllModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-[#1d293d] mb-3">Konfirmasi Submit All</h3>
              <p className="text-[#62748e] mb-2">
                Kamu sudah menyelesaikan <span className="font-bold text-[#1d293d]">{completedKategoris.size}</span> subtest.
              </p>
              <p className="text-[#62748e] mb-6">
                Yakin ingin submit seluruh tryout? Setelah submit, semua subtest akan terkunci dan kamu bisa melihat hasil lengkap.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitAllModal(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmSubmitAll}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-lg"
                >
                  Ya, Submit
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
